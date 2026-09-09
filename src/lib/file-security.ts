/**
 * Security helper to validate image file types and magic bytes.
 */

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export function validateImageBuffer(buffer: Buffer): { valid: boolean; extension: string; mime: string } {
  if (buffer.length < 12) {
    return { valid: false, extension: "", mime: "" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, extension: "jpg", mime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, extension: "png", mime: "image/png" };
  }

  // WebP: RIFF ... WEBP
  // bytes 0-3: 'RIFF', bytes 8-11: 'WEBP'
  const riff = buffer.subarray(0, 4).toString("ascii");
  const webp = buffer.subarray(8, 12).toString("ascii");
  if (riff === "RIFF" && webp === "WEBP") {
    return { valid: true, extension: "webp", mime: "image/webp" };
  }

  // HEIC/HEIF: offset 4 ftypheic or similar
  const ftyp = buffer.subarray(4, 8).toString("ascii");
  if (ftyp === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (["heic", "heix", "mif1", "msf1", "hevc"].includes(brand)) {
      return { valid: true, extension: "heic", mime: "image/heic" };
    }
  }

  return { valid: false, extension: "", mime: "" };
}

export function validateMediaBuffer(buffer: Buffer): {
  valid: boolean;
  mediaType: "photo" | "video";
  extension: string;
  mime: string;
} {
  if (buffer.length < 12) {
    return { valid: false, mediaType: "photo", extension: "", mime: "" };
  }

  // Check image first
  const img = validateImageBuffer(buffer);
  if (img.valid) {
    return { valid: true, mediaType: "photo", extension: img.extension, mime: img.mime };
  }

  // MP4 / MOV (ISO Base Media File Format)
  const ftyp = buffer.subarray(4, 8).toString("ascii");
  if (ftyp === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand.startsWith("qt")) {
      return { valid: true, mediaType: "video", extension: "mov", mime: "video/quicktime" };
    }
    return { valid: true, mediaType: "video", extension: "mp4", mime: "video/mp4" };
  }

  // WebM: starts with 0x1A 0x45 0xDF 0xA3
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { valid: true, mediaType: "video", extension: "webm", mime: "video/webm" };
  }

  return { valid: false, mediaType: "photo", extension: "", mime: "" };
}

export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.has(mime.toLowerCase());
}
