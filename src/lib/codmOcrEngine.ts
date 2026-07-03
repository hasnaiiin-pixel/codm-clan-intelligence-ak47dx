import { createOcrVariants, loadoutRegions, profileRegions, scoreboardRegions, type CropRegion, type OcrImageVariant } from './imagePreprocess';

export type CodmOcrKind = 'profile' | 'scoreboard' | 'loadout';

export type CodmOcrProgress = {
  stage: string;
  current?: number;
  total?: number;
  variantName?: string;
  progress?: number;
};

export type CodmOcrResult = {
  rawText: string;
  variants: Array<{ name: string; text: string; confidence: number; width: number; height: number; notes: string }>;
  debugImages: Array<{ name: string; dataUrl: string; notes: string }>;
};

function getRegions(kind: CodmOcrKind) {
  if (kind === 'scoreboard') return scoreboardRegions();
  if (kind === 'loadout') return loadoutRegions();
  return profileRegions();
}

function languageFor(kind: CodmOcrKind) {
  // CODM può essere italiano o inglese. eng+ita migliora le etichette come VITTORIA, PUNTEGGIO, POSTAZIONE.
  return kind === 'scoreboard' || kind === 'profile' ? 'eng+ita' : 'eng+ita';
}

function psmForVariant(variantName: string, fallback?: string) {
  if (fallback) return fallback;
  if (/_KDA|_SCORE|_IMPACT|_OBJECTIVE/i.test(variantName)) return '7';
  if (/ROW_|NICK/i.test(variantName)) return '7';
  if (/RESULT|MODE|header|stats|identity|numbers/i.test(variantName)) return '6';
  return '6';
}

export async function recognizeCodmImage(
  file: File,
  kind: CodmOcrKind,
  onProgress?: (progress: CodmOcrProgress) => void,
  customRegions?: CropRegion[]
): Promise<CodmOcrResult> {
  onProgress?.({ stage: 'preprocess' });
  const variants: OcrImageVariant[] = await createOcrVariants(file, customRegions?.length ? customRegions : getRegions(kind), true);
  const Tesseract = await import('tesseract.js');
  const language = languageFor(kind);
  const recognized: CodmOcrResult['variants'] = [];

  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];
    onProgress?.({ stage: 'ocr', current: index + 1, total: variants.length, variantName: variant.name, progress: 0 });

    const result = await Tesseract.recognize(variant.blob, language, {
      logger: (m: { status?: string; progress?: number }) => {
        if (m.status === 'recognizing text') {
          onProgress?.({ stage: 'ocr', current: index + 1, total: variants.length, variantName: variant.name, progress: m.progress });
        }
      },
      tessedit_pageseg_mode: psmForVariant(variant.name, variant.psm),
      preserve_interword_spaces: '1',
      ...(variant.whitelist ? { tessedit_char_whitelist: variant.whitelist } : {})
    } as Record<string, unknown>);

    recognized.push({
      name: variant.name,
      text: result.data.text || '',
      confidence: result.data.confidence || 0,
      width: variant.width,
      height: variant.height,
      notes: variant.notes
    });
  }

  const rawText = recognized
    .map((part) => `\n=== OCR_VARIANT ${part.name} CONF ${Math.round(part.confidence)} ===\n${part.text.trim()}`)
    .join('\n')
    .trim();

  onProgress?.({ stage: 'done', current: variants.length, total: variants.length, progress: 1 });

  return {
    rawText,
    variants: recognized,
    debugImages: variants.filter((variant) => /SCOREBOARD_RESULT|SCOREBOARD_SCORE_BLUE|SCOREBOARD_SCORE_RED|MODE_MAP|TEAM_BLUE_TABLE_FULL|TEAM_RED_TABLE_FULL|BLUE_R1_|RED_R1_|BLUE_R2_|RED_R2_|BLUE_R3_|RED_R3_|PROFILE_BASE_|PROFILE_STATS_/i.test(variant.name)).slice(0, 32).map((variant) => ({ name: variant.name, dataUrl: variant.dataUrl, notes: variant.notes }))
  };
}
