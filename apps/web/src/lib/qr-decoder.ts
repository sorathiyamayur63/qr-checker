/**
 * qr-decoder.ts — Client-side QR code decoding from image data.
 *
 * Uses jsQR to decode from a canvas ImageData buffer. Handles:
 * - File / drag-and-drop uploads (png, jpg, jpeg, gif, webp, bmp)
 * - Clipboard paste (image/png from screenshots)
 * - Camera frame capture (called per-frame by the camera hook)
 */

import jsQR from 'jsqr';

export type DecodeResult =
  | { success: true; data: string }
  | { success: false; error: string };

/**
 * Decode a QR code from an HTMLImageElement (already loaded).
 * Draws it to an offscreen canvas and passes pixel data to jsQR.
 */
export function decodeFromImage(img: HTMLImageElement): DecodeResult {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { success: false, error: 'Cannot create canvas rendering context.' };

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);

  if (code) {
    return { success: true, data: code.data };
  }
  return { success: false, error: 'No QR code detected in the image. Try a clearer or higher-resolution image.' };
}

/**
 * Decode a QR code from raw ImageData (e.g. from a camera frame or canvas).
 */
export function decodeFromImageData(imageData: ImageData): DecodeResult {
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  if (code) {
    return { success: true, data: code.data };
  }
  return { success: false, error: 'No QR code detected in this frame.' };
}

/**
 * Read a File (Blob) as an Image, then decode.
 */
export function decodeFromFile(file: File): Promise<DecodeResult> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({ success: false, error: `Unsupported file type: ${file.type}. Please upload a PNG, JPG, or similar image.` });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(decodeFromImage(img));
      img.onerror = () => resolve({ success: false, error: 'Failed to load the image. The file may be corrupt.' });
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve({ success: false, error: 'Failed to read the file.' });
    reader.readAsDataURL(file);
  });
}
