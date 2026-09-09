/**
 * Client-side image compression and normalization.
 * Downscales images proportionally to a maximum dimension of 2048px
 * and compresses them to WebP (or high-quality JPEG) at ~85% quality.
 * Reduces 15MB-25MB mobile photos to ~400KB-700KB in milliseconds.
 */
export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  applyVintagePreset?: boolean;
}

/**
 * Applies an authentic vintage analog film preset to a canvas.
 * Adds warm golden undertones, matte lifted shadows, subtle 35mm film grain,
 * and a soft optical disposable camera lens vignette.
 */
export function applyVintageFilmPreset(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Warm golden analog color shift
    r = r * 1.07 + 10;
    g = g * 1.02 + 5;
    b = b * 0.90 + 2;

    // Matte shadows (lift blacks slightly)
    if (r < 60) r += (60 - r) * 0.22;
    if (g < 60) g += (60 - g) * 0.22;
    if (b < 60) b += (60 - b) * 0.20;

    // Organic film grain
    const grain = (Math.random() - 0.5) * 12;
    data[i] = Math.min(255, Math.max(0, r + grain));
    data[i + 1] = Math.min(255, Math.max(0, g + grain));
    data[i + 2] = Math.min(255, Math.max(0, b + grain));
  }

  ctx.putImageData(imgData, 0, 0);

  // Soft optical lens vignette
  const radius = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    radius * 0.45,
    width / 2,
    height / 2,
    radius
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.75, "rgba(30, 20, 10, 0.07)");
  vignette.addColorStop(1, "rgba(40, 25, 15, 0.25)");

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Client-side image compression and normalization.
 * Downscales images proportionally to a maximum dimension of 2048px
 * and compresses them to WebP (or high-quality JPEG) at ~85% quality.
 * Optionally applies a vintage analog film preset.
 */
export async function compressImage(
  file: File,
  optionsOrMaxDimension: CompressOptions | number = 2048,
  legacyQuality = 0.85
): Promise<{ blob: Blob; width: number; height: number }> {
  const maxDimension =
    typeof optionsOrMaxDimension === "number"
      ? optionsOrMaxDimension
      : optionsOrMaxDimension.maxDimension ?? 2048;
  const quality =
    typeof optionsOrMaxDimension === "object" && optionsOrMaxDimension.quality !== undefined
      ? optionsOrMaxDimension.quality
      : legacyQuality;
  const applyVintagePreset =
    typeof optionsOrMaxDimension === "object" ? Boolean(optionsOrMaxDimension.applyVintagePreset) : false;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image for processing"));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not initialize canvas context"));
          return;
        }

        // Smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Apply vintage film preset if requested
        if (applyVintagePreset) {
          applyVintageFilmPreset(ctx, width, height);
        }

        // Try WebP first, fallback to image/jpeg
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, width, height });
            } else {
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob) {
                    resolve({ blob: jpegBlob, width, height });
                  } else {
                    reject(new Error("Canvas compression failed"));
                  }
                },
                "image/jpeg",
                quality
              );
            }
          },
          "image/webp",
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
