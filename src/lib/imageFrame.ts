export type ImageContentFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
  reason: string;
};

export const FULL_IMAGE_FRAME: ImageContentFrame = { x: 0, y: 0, w: 1, h: 1, confidence: 1, reason: 'full_image' };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function readImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Impossibile analizzare immagine per content frame.'));
    img.src = src;
  });
}

export async function detectImageContentFrameFromUrl(src: string): Promise<ImageContentFrame> {
  if (!src) return FULL_IMAGE_FRAME;
  try {
    const image = await readImage(src);
    const maxEdge = 720;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const w = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const h = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return FULL_IMAGE_FRAME;
    ctx.drawImage(image, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    let count = 0;
    // Campionamento veloce: ignora bordi neri/letterbox e zone quasi uniformi.
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const saturationLike = max - min;
        const isUseful = lum > 14 && (lum > 35 || saturationLike > 18);
        if (!isUseful) continue;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        count += 1;
      }
    }
    if (maxX <= minX || maxY <= minY || count < 200) return FULL_IMAGE_FRAME;
    const padX = Math.round(w * 0.003);
    const padY = Math.round(h * 0.003);
    const x0 = clamp(minX - padX, 0, w);
    const y0 = clamp(minY - padY, 0, h);
    const x1 = clamp(maxX + padX, 0, w);
    const y1 = clamp(maxY + padY, 0, h);
    const fw = (x1 - x0) / w;
    const fh = (y1 - y0) / h;
    // Se il frame è quasi tutto pieno non forziamo correzioni inutili.
    if (fw > 0.985 && fh > 0.985) return FULL_IMAGE_FRAME;
    if (fw < 0.55 || fh < 0.55) return FULL_IMAGE_FRAME;
    return {
      x: x0 / w,
      y: y0 / h,
      w: fw,
      h: fh,
      confidence: Math.min(0.99, Math.max(0.55, count / ((w * h) / 4))),
      reason: 'detected_non_black_content_frame'
    };
  } catch {
    return FULL_IMAGE_FRAME;
  }
}

export function frameToStyle(frame: ImageContentFrame) {
  return {
    left: `${frame.x * 100}%`,
    top: `${frame.y * 100}%`,
    width: `${frame.w * 100}%`,
    height: `${frame.h * 100}%`
  };
}

export function regionToImageStyle(region: { x: number; y: number; w: number; h: number }, frame: ImageContentFrame) {
  return {
    left: `${(frame.x + region.x * frame.w) * 100}%`,
    top: `${(frame.y + region.y * frame.h) * 100}%`,
    width: `${region.w * frame.w * 100}%`,
    height: `${region.h * frame.h * 100}%`
  };
}

export function imagePointToFrameNorm(x: number, y: number, frame: ImageContentFrame) {
  return {
    x: clamp((x - frame.x) / frame.w, 0, 1),
    y: clamp((y - frame.y) / frame.h, 0, 1)
  };
}
