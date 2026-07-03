export type CropRegion = {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  scale?: number;
  threshold?: number;
  invertLightText?: boolean;
  contrast?: number;
  padding?: number;
  mode?: 'text' | 'number' | 'kda' | 'time' | 'header' | 'nickname';
  psm?: string;
  whitelist?: string;
  variants?: Array<'binary' | 'gray' | 'sharp' | 'digits'>;
};

export type OcrImageVariant = {
  name: string;
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  notes: string;
  psm?: string;
  whitelist?: string;
  mode?: CropRegion['mode'];
};

export type PreprocessOptions = {
  name: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  scale?: number;
  threshold?: number;
  invertLightText?: boolean;
  contrast?: number;
  padding?: number;
  mode?: CropRegion['mode'];
  psm?: string;
  whitelist?: string;
  variant?: 'binary' | 'gray' | 'sharp' | 'digits';
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Impossibile convertire canvas in immagine OCR.'));
    }, type, quality);
  });
}

function readAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Impossibile leggere immagine.'));
    reader.readAsDataURL(file);
  });
}

export async function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  const src = await readAsDataUrl(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Immagine non valida.'));
    image.src = src;
  });
}

function numericWhitelist(kind?: CropRegion['mode']) {
  if (kind === 'kda') return '0123456789/:|IlSBGOZ';
  if (kind === 'time') return '0123456789:';
  if (kind === 'number') return '0123456789.,:%SBGOZ';
  if (kind === 'header') return '0123456789:-/ VITTORIAVICTORYSCONFITTADEFEATCERCAEDISTRUGGISEARCHDESTROYHARDPOINTPOSTAZIONEDOMINIOFRONTLINEPRIMALINEASUMMITTUNISIACOASTALSTANDOFFFIRINGRANGE';
  return undefined;
}

function psmFor(kind?: CropRegion['mode']) {
  if (kind === 'number' || kind === 'kda' || kind === 'time') return '7';
  if (kind === 'nickname') return '7';
  if (kind === 'header') return '6';
  return '6';
}

export function scoreboardRegions(): CropRegion[] {
  const regions: CropRegion[] = [
    { name: 'SCOREBOARD_RESULT_LABEL', x: 0.004, y: 0.022, w: 0.150, h: 0.090, scale: 6.0, threshold: 145, invertLightText: true, contrast: 2.10, mode: 'header', psm: '7', variants: ['gray', 'sharp', 'binary'] },
    { name: 'SCOREBOARD_SCORE_BLUE', x: 0.118, y: 0.040, w: 0.060, h: 0.070, scale: 8.0, threshold: 156, invertLightText: true, contrast: 2.35, mode: 'number', psm: '10', whitelist: '0123456789', variants: ['digits', 'binary', 'gray'] },
    { name: 'SCOREBOARD_SCORE_COLON', x: 0.176, y: 0.043, w: 0.018, h: 0.060, scale: 8.0, threshold: 150, invertLightText: true, contrast: 2.25, mode: 'number', psm: '10', whitelist: ':', variants: ['gray', 'binary'] },
    { name: 'SCOREBOARD_SCORE_RED', x: 0.190, y: 0.040, w: 0.060, h: 0.070, scale: 8.0, threshold: 156, invertLightText: true, contrast: 2.35, mode: 'number', psm: '10', whitelist: '0123456789', variants: ['digits', 'binary', 'gray'] },
    { name: 'SCOREBOARD_RESULT_FULL', x: 0.000, y: 0.015, w: 0.300, h: 0.120, scale: 5.5, threshold: 145, invertLightText: true, contrast: 2.05, mode: 'header', psm: '6', variants: ['gray', 'sharp', 'binary'] },
    { name: 'SCOREBOARD_MATCH_DATETIME', x: 0.004, y: 0.104, w: 0.260, h: 0.038, scale: 6.0, threshold: 145, invertLightText: true, contrast: 2.00, mode: 'header', psm: '7', variants: ['gray', 'sharp', 'binary'] },
    { name: 'SCOREBOARD_MODE_MAP', x: 0.000, y: 0.136, w: 0.330, h: 0.075, scale: 5.8, threshold: 145, invertLightText: true, contrast: 2.10, mode: 'header', psm: '7', variants: ['gray', 'sharp', 'binary'] },
    { name: 'TEAM_BLUE_TABLE_FULL', x: 0.000, y: 0.225, w: 0.500, h: 0.585, scale: 3.7, threshold: 142, invertLightText: true, contrast: 1.95, mode: 'text', psm: '6', variants: ['gray', 'sharp', 'binary'] },
    { name: 'TEAM_RED_TABLE_FULL', x: 0.500, y: 0.225, w: 0.500, h: 0.585, scale: 3.7, threshold: 142, invertLightText: true, contrast: 1.95, mode: 'text', psm: '6', variants: ['gray', 'sharp', 'binary'] }
  ];

  const rowTop = 0.303;
  const rowH = 0.096;
  const blue = { x: 0.000, w: 0.500 };
  const red = { x: 0.500, w: 0.500 };

  const cell = (side: 'BLUE' | 'RED', row: number, name: string, relX: number, relW: number, mode: CropRegion['mode'], extra: Partial<CropRegion> = {}) => {
    const base = side === 'BLUE' ? blue : red;
    regions.push({
      name: `${side}_R${row}_${name}`,
      x: base.x + relX * base.w,
      y: rowTop + (row - 1) * rowH,
      w: relW * base.w,
      h: rowH,
      scale: mode === 'nickname' ? 7.2 : 7.0,
      threshold: mode === 'nickname' ? 144 : 152,
      invertLightText: true,
      contrast: mode === 'nickname' ? 2.15 : 2.30,
      padding: 0.0012,
      mode,
      psm: psmFor(mode),
      whitelist: numericWhitelist(mode),
      variants: mode === 'nickname' ? ['gray', 'sharp', 'binary'] : ['digits', 'binary', 'gray'],
      ...extra
    });
  };

  for (let r = 1; r <= 5; r += 1) {
    cell('BLUE', r, 'NICK', 0.118, 0.265, 'nickname', { scale: 7.5, psm: '7', variants: ['gray', 'sharp', 'binary'] });
    cell('BLUE', r, 'SCORE', 0.440, 0.105, 'number', { psm: '10', scale: 8.2 });
    cell('BLUE', r, 'KDA', 0.612, 0.135, 'kda', { scale: 8.2, psm: '7' });
    cell('BLUE', r, 'OBJECTIVE', 0.744, 0.108, 'time', { scale: 7.8, psm: '7' });
    cell('BLUE', r, 'IMPACT', 0.864, 0.095, 'number', { psm: '10', scale: 8.2 });
    cell('BLUE', r, 'ROW_FULL', 0.000, 0.985, 'text', { scale: 4.8, psm: '6', variants: ['gray', 'sharp', 'binary'] });

    cell('RED', r, 'NICK', 0.118, 0.258, 'nickname', { scale: 7.5, psm: '7', variants: ['gray', 'sharp', 'binary'] });
    cell('RED', r, 'SCORE', 0.442, 0.105, 'number', { psm: '10', scale: 8.2 });
    cell('RED', r, 'KDA', 0.618, 0.126, 'kda', { scale: 8.2, psm: '7' });
    cell('RED', r, 'OBJECTIVE', 0.744, 0.108, 'time', { scale: 7.8, psm: '7' });
    cell('RED', r, 'IMPACT', 0.865, 0.095, 'number', { psm: '10', scale: 8.2 });
    cell('RED', r, 'ROW_FULL', 0.000, 0.985, 'text', { scale: 4.8, psm: '6', variants: ['gray', 'sharp', 'binary'] });
  }

  return regions;
}

export function profileRegions(): CropRegion[] {
  return [
    { name: 'PROFILE_BASE_CARD', x: 0.155, y: 0.080, w: 0.370, h: 0.420, scale: 3.5, threshold: 142, invertLightText: true, contrast: 1.75, variants: ['gray', 'binary'] },
    { name: 'PROFILE_BASE_NICKNAME', x: 0.242, y: 0.120, w: 0.190, h: 0.075, scale: 8.0, threshold: 145, invertLightText: true, contrast: 2.15, mode: 'nickname', psm: '7', variants: ['gray', 'sharp', 'binary'] },
    { name: 'PROFILE_BASE_LEVEL', x: 0.242, y: 0.182, w: 0.105, h: 0.060, scale: 7.5, threshold: 150, invertLightText: true, contrast: 2.20, mode: 'number', psm: '7', whitelist: '0123456789', variants: ['digits', 'binary', 'gray'] },
    { name: 'PROFILE_BASE_UID', x: 0.190, y: 0.350, w: 0.180, h: 0.058, scale: 7.5, threshold: 148, invertLightText: true, contrast: 2.15, mode: 'number', psm: '7', whitelist: '0123456789', variants: ['digits', 'binary', 'gray'] },
    { name: 'PROFILE_BASE_LIKES', x: 0.220, y: 0.645, w: 0.165, h: 0.070, scale: 7.2, threshold: 150, invertLightText: true, contrast: 2.10, mode: 'number', psm: '7', whitelist: '0123456789', variants: ['digits', 'binary', 'gray'] },
    { name: 'PROFILE_BASE_RANKS', x: 0.210, y: 0.735, w: 0.310, h: 0.155, scale: 4.2, threshold: 144, invertLightText: true, contrast: 1.85, mode: 'text', psm: '6', variants: ['gray', 'binary'] },
    // Numeri Leggendario vicino alle icone MG/BR/DMZ/ZOMBIE. Sono volutamente piccoli e calibrabili:
    // il valore preciso dipende molto da telefono, crop WhatsApp e lingua CODM.
    { name: 'PROFILE_LEGENDARY_MG_COUNT', x: 0.545, y: 0.238, w: 0.072, h: 0.050, scale: 9.0, threshold: 150, invertLightText: true, contrast: 2.35, mode: 'number', psm: '7', whitelist: '0123456789', variants: ['digits', 'binary', 'gray', 'sharp'] },
    { name: 'PROFILE_LEGENDARY_BR_COUNT', x: 0.545, y: 0.340, w: 0.072, h: 0.050, scale: 9.0, threshold: 150, invertLightText: true, contrast: 2.35, mode: 'number', psm: '7', whitelist: '0123456789', variants: ['digits', 'binary', 'gray', 'sharp'] },
    { name: 'PROFILE_LEGENDARY_DMZ_COUNT', x: 0.545, y: 0.442, w: 0.072, h: 0.050, scale: 9.0, threshold: 150, invertLightText: true, contrast: 2.35, mode: 'number', psm: '7', whitelist: '0123456789', variants: ['digits', 'binary', 'gray', 'sharp'] },
    { name: 'PROFILE_LEGENDARY_ZOMBIE_COUNT', x: 0.545, y: 0.544, w: 0.072, h: 0.050, scale: 9.0, threshold: 150, invertLightText: true, contrast: 2.35, mode: 'number', psm: '7', whitelist: '0123456789', variants: ['digits', 'binary', 'gray', 'sharp'] },
    { name: 'PROFILE_STATS_PANEL', x: 0.195, y: 0.100, w: 0.690, h: 0.790, scale: 3.2, threshold: 145, invertLightText: true, contrast: 1.65, variants: ['gray', 'binary'] },
    { name: 'PROFILE_STATS_NUMBERS', x: 0.210, y: 0.250, w: 0.670, h: 0.500, scale: 3.8, threshold: 142, invertLightText: true, contrast: 1.75, variants: ['digits', 'binary', 'gray'] }
  ];
}

export function loadoutRegions(): CropRegion[] {
  return [
    { name: 'loadout_full_clean', x: 0.00, y: 0.00, w: 1.00, h: 1.00, scale: 2.0, threshold: 145, invertLightText: true, contrast: 1.45, variants: ['gray', 'binary'] },
    { name: 'loadout_right_panel', x: 0.52, y: 0.08, w: 0.45, h: 0.82, scale: 3.0, threshold: 145, invertLightText: true, contrast: 1.55, variants: ['gray', 'binary'] },
    { name: 'loadout_name_weapons', x: 0.52, y: 0.07, w: 0.45, h: 0.25, scale: 3.4, threshold: 142, invertLightText: true, contrast: 1.65, variants: ['gray', 'binary'] },
    { name: 'gunsmith_stats', x: 0.70, y: 0.08, w: 0.29, h: 0.46, scale: 3.8, threshold: 142, invertLightText: true, contrast: 1.7, variants: ['digits', 'binary', 'gray'] },
    { name: 'gunsmith_attachments', x: 0.05, y: 0.05, w: 0.66, h: 0.83, scale: 3.2, threshold: 142, invertLightText: true, contrast: 1.65, variants: ['gray', 'binary'] }
  ];
}

export async function createProcessedVariant(file: File | Blob, options: PreprocessOptions): Promise<OcrImageVariant> {
  const image = await loadImage(file);
  const scale = options.scale ?? 2.5;
  const pad = options.padding ?? 0;
  const sx = clamp((options.x ?? 0) - pad, 0, 1) * image.naturalWidth;
  const sy = clamp((options.y ?? 0) - pad, 0, 1) * image.naturalHeight;
  const sw = clamp((options.w ?? 1) + pad * 2, 0.01, 1) * image.naturalWidth;
  const sh = clamp((options.h ?? 1) + pad * 2, 0.01, 1) * image.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas non disponibile per OCR.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const contrast = options.contrast ?? 1.35;
  const invertLightText = options.invertLightText ?? true;
  const variant = options.variant ?? 'binary';

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    gray = clamp((gray - 128) * contrast + 128, 0, 255);

    if (variant === 'sharp') {
      const boosted = gray > 165 ? 255 : gray < 105 ? 0 : gray;
      gray = invertLightText ? 255 - boosted : boosted;
    } else if (variant === 'gray') {
      gray = invertLightText ? 255 - gray : gray;
    } else {
      const threshold = options.threshold ?? (variant === 'digits' ? 160 : 145);
      const isLight = gray >= threshold;
      gray = invertLightText ? (isLight ? 0 : 255) : (isLight ? 255 : 0);
    }

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  const blob = await canvasToBlob(canvas);
  return {
    name: `${options.name}${options.variant ? `__${options.variant}` : ''}`,
    blob,
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    psm: options.psm ?? psmFor(options.mode),
    whitelist: options.whitelist ?? numericWhitelist(options.mode),
    mode: options.mode,
    notes: `crop=${options.x ?? 0},${options.y ?? 0},${options.w ?? 1},${options.h ?? 1} scale=${scale} variant=${variant} psm=${options.psm ?? psmFor(options.mode)}`
  };
}

export async function createOcrVariants(file: File, regions: CropRegion[], includeFull = true): Promise<OcrImageVariant[]> {
  const variants: OcrImageVariant[] = [];
  if (includeFull) {
    variants.push(await createProcessedVariant(file, {
      name: 'full_high_contrast',
      scale: 2.0,
      threshold: 145,
      invertLightText: true,
      contrast: 1.45,
      variant: 'gray',
      psm: '11'
    }));
  }

  for (const region of regions) {
    const modes = region.variants ?? ['binary'];
    for (const variant of modes) {
      variants.push(await createProcessedVariant(file, { ...region, variant }));
    }
  }
  return variants;
}
