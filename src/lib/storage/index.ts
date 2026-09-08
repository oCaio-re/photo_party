import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

export interface StorageProvider {
  uploadFile(buffer: Buffer, key: string, contentType: string): Promise<{ storagePath: string; url: string }>;
  getFileStream(storagePath: string): Promise<Readable>;
  deleteFile(storagePath: string): Promise<void>;
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

  async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<{ storagePath: string; url: string }> {
    const safePath = this.getSafePath(key);
    await fs.promises.writeFile(safePath, buffer);
    const filename = path.basename(safePath);
    return {
      storagePath: filename,
      url: `/uploads/${filename}`,
    };
  }

  async getFileStream(storagePath: string): Promise<Readable> {
    const safePath = this.getSafePath(storagePath);
    if (!fs.existsSync(safePath)) {
      throw new Error(`File not found: ${storagePath}`);
    }
    return fs.createReadStream(safePath);
  }

  async deleteFile(storagePath: string): Promise<void> {
    const safePath = this.getSafePath(storagePath);
    if (fs.existsSync(safePath)) {
      await fs.promises.unlink(safePath);
    }
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

    const url = this.publicUrlBase
      ? `${this.publicUrlBase.replace(/\/$/, "")}/${safeKey}`
      : `/api/photos/view/${safeKey}`;

    return {
      storagePath: safeKey,
      url,
    };
  }

  async getFileStream(storagePath: string): Promise<Readable> {
    const safeKey = path.basename(storagePath);
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
      })
    );

    if (!response.Body) {
      throw new Error(`Empty body for key: ${safeKey}`);
    }

    return response.Body as Readable;
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
