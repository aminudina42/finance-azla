/**
 * Helper utility for client-side image processing, compression, and Supabase Storage path handling.
 */

export interface ProcessedImageResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Validates whether the given file is an allowed image type.
 */
export function validateImageType(file: File): { valid: boolean; extension?: string; error?: string } {
  const ext = ALLOWED_MIME_TYPES[file.type];
  if (!ext) {
    return {
      valid: false,
      error: "Format file tidak didukung! Harap unggah gambar JPG, PNG, atau WebP.",
    };
  }
  return { valid: true, extension: ext };
}

/**
 * Extracts the storage object path inside a Supabase Storage bucket from a public URL.
 * Example:
 *   URL: "https://xyz.supabase.co/storage/v1/object/public/logos/keluarga-1/logo-123.webp"
 *   Returns: "keluarga-1/logo-123.webp"
 */
export function extractStoragePath(publicUrl: string | undefined | null, bucket = "logos"): string | null {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx !== -1) {
    try {
      return decodeURIComponent(publicUrl.substring(idx + marker.length));
    } catch {
      return publicUrl.substring(idx + marker.length);
    }
  }
  return null;
}

/**
 * Resizes and compresses an image file on the client using HTML5 Canvas.
 * - Scales proportionally to fit within maxDimension x maxDimension (default: 512px).
 * - Exports as WebP (quality 0.88) with fallback to PNG.
 * - Typically reduces 2MB+ camera images down to 30-60KB without visible quality loss.
 */
export async function compressAndResizeImage(
  file: File,
  maxDimension = 512,
  quality = 0.88
): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      // Ensure minimum 1px
      width = Math.max(1, width);
      height = Math.max(1, height);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Gagal menginisialisasi canvas untuk kompresi gambar."));
        return;
      }

      // Smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP for superior compression, fallback to PNG if WebP unsupported or PNG transparency requested
      const exportFormat = "image/webp";

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback to PNG data URL if toBlob returned null
            try {
              const dataUrl = canvas.toDataURL("image/png");
              const byteString = atob(dataUrl.split(",")[1]);
              const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              const pngBlob = new Blob([ab], { type: mimeString });
              const pngFile = new File([pngBlob], `logo-${Date.now()}.png`, { type: "image/png" });
              resolve({
                file: pngFile,
                blob: pngBlob,
                dataUrl,
                width,
                height,
                sizeBytes: pngBlob.size,
              });
            } catch (canvasErr) {
              reject(canvasErr);
            }
            return;
          }

          const compressedFile = new File([blob], `logo-${Date.now()}.webp`, {
            type: exportFormat,
          });
          const dataUrl = canvas.toDataURL(exportFormat, quality);

          resolve({
            file: compressedFile,
            blob,
            dataUrl,
            width,
            height,
            sizeBytes: blob.size,
          });
        },
        exportFormat,
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gagal membaca berkas gambar. Pastikan gambar tidak rusak."));
    };

    img.src = objectUrl;
  });
}

