import fs from "fs";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";

export interface StoredFile {
  body: Readable;
  /** Bytes in this response (the slice size for ranged reads). */
  contentLength?: number;
  /** Total object size, when known. */
  totalSize?: number;
  /** Set for ranged reads, e.g. "bytes 0-1023/4096". */
  contentRange?: string;
}

export interface StorageProvider {
  uploadFile(buffer: Buffer, key: string, contentType: string): Promise<{ storagePath: string; url: string }>;
  getFile(storagePath: string, range?: string | null): Promise<StoredFile>;
  getFileStream(storagePath: string): Promise<Readable>;
  deleteFile(storagePath: string): Promise<void>;
  getFileSize(storagePath: string): Promise<number | null>;
  /** Reads the first `length` bytes of a file (used for magic-byte validation). */
  readFileHead(storagePath: string, length: number): Promise<Buffer>;
  getPublicUrl(storagePath: string): string;
  /**
   * Presigned PUT URL so browsers upload straight to object storage,
   * bypassing the serverless function body limit (~4.5MB on Vercel).
   * Absent on providers that only support server-side uploads.
   */
  createUploadUrl?(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;
}

/** Parses a single "bytes=start-end" range header against a known size. */
function parseRange(range: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  let start: number;
  let end: number;
  if (rawStart === "") {
    const suffix = Number(rawEnd);
    if (!suffix) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (start > end || start >= size) return null;
  return { start, end };
}

/**
 * Local filesystem storage provider (zero-config for development)
 */
class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), "public", "uploads");
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getSafePath(key: string): string {
    // Prevent path traversal attacks using path.basename and boundary check
    const safeFilename = path.basename(key);
    const resolved = path.resolve(this.baseDir, safeFilename);
    const boundaryWithSlash = this.baseDir.endsWith(path.sep) ? this.baseDir : this.baseDir + path.sep;
    if (!resolved.startsWith(boundaryWithSlash) && resolved !== this.baseDir) {
      throw new Error("Invalid storage path: directory traversal detected");
    }
    return resolved;
  }

  async uploadFile(buffer: Buffer, key: string): Promise<{ storagePath: string; url: string }> {
    const safePath = this.getSafePath(key);
    await fs.promises.writeFile(safePath, buffer);
    const filename = path.basename(safePath);
    return {
      storagePath: filename,
      url: this.getPublicUrl(filename),
    };
  }

  async getFile(storagePath: string, range?: string | null): Promise<StoredFile> {
    const safePath = this.getSafePath(storagePath);
    if (!fs.existsSync(safePath)) {
      throw new Error(`File not found: ${storagePath}`);
    }
    const { size } = await fs.promises.stat(safePath);
    const parsed = range ? parseRange(range, size) : null;
    if (parsed) {
      return {
        body: fs.createReadStream(safePath, { start: parsed.start, end: parsed.end }),
        contentLength: parsed.end - parsed.start + 1,
        totalSize: size,
        contentRange: `bytes ${parsed.start}-${parsed.end}/${size}`,
      };
    }
    return { body: fs.createReadStream(safePath), contentLength: size, totalSize: size };
  }

  async getFileStream(storagePath: string): Promise<Readable> {
    return (await this.getFile(storagePath)).body;
  }

  async deleteFile(storagePath: string): Promise<void> {
    const safePath = this.getSafePath(storagePath);
    if (fs.existsSync(safePath)) {
      await fs.promises.unlink(safePath);
    }
  }

  async getFileSize(storagePath: string): Promise<number | null> {
    try {
      const { size } = await fs.promises.stat(this.getSafePath(storagePath));
      return size;
    } catch {
      return null;
    }
  }

  async readFileHead(storagePath: string, length: number): Promise<Buffer> {
    const handle = await fs.promises.open(this.getSafePath(storagePath), "r");
    try {
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, 0);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  getPublicUrl(storagePath: string): string {
    return `/uploads/${path.basename(storagePath)}`;
  }
}

/**
 * S3-compatible Cloudflare R2 storage provider (for production)
 */
class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicUrlBase: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
    this.bucket = process.env.R2_BUCKET_NAME || "photo-party";
    this.publicUrlBase = process.env.R2_PUBLIC_URL || "";

    const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<{ storagePath: string; url: string }> {
    const safeKey = path.basename(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return {
      storagePath: safeKey,
      url: this.getPublicUrl(safeKey),
    };
  }

  async getFile(storagePath: string, range?: string | null): Promise<StoredFile> {
    const safeKey = path.basename(storagePath);
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
        Range: range || undefined,
      })
    );

    if (!response.Body) {
      throw new Error(`Empty body for key: ${safeKey}`);
    }

    const totalFromRange = response.ContentRange?.split("/")[1];
    return {
      body: response.Body as Readable,
      contentLength: response.ContentLength,
      totalSize: totalFromRange ? Number(totalFromRange) : response.ContentLength,
      contentRange: response.ContentRange,
    };
  }

  async getFileStream(storagePath: string): Promise<Readable> {
    return (await this.getFile(storagePath)).body;
  }

  async deleteFile(storagePath: string): Promise<void> {
    const safeKey = path.basename(storagePath);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
      })
    );
  }

  async getFileSize(storagePath: string): Promise<number | null> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: path.basename(storagePath) })
      );
      return head.ContentLength ?? null;
    } catch {
      return null;
    }
  }

  async readFileHead(storagePath: string, length: number): Promise<Buffer> {
    const { body } = await this.getFile(storagePath, `bytes=0-${length - 1}`);
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).subarray(0, length);
  }

  getPublicUrl(storagePath: string): string {
    const safeKey = path.basename(storagePath);
    return this.publicUrlBase
      ? `${this.publicUrlBase.replace(/\/$/, "")}/${safeKey}`
      : `/api/photos/view/${safeKey}`;
  }

  async createUploadUrl(key: string, contentType: string, expiresInSeconds = 600): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: path.basename(key),
        ContentType: contentType,
      }),
      { expiresIn: expiresInSeconds }
    );
  }
}

let cachedProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cachedProvider) return cachedProvider;

  const hasR2Credentials =
    Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && (process.env.R2_ACCOUNT_ID || process.env.R2_ENDPOINT));

  if (hasR2Credentials) {
    cachedProvider = new R2StorageProvider();
  } else {
    cachedProvider = new LocalStorageProvider();
  }

  return cachedProvider;
}
