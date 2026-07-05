export const EXPECTED_OCR_BACKEND_VERSION = '2.0.9-v5-2-template-kda-table-definitivo-ak47dx';
export const ACCEPTED_OCR_BACKEND_VERSIONS = [
  '2.0.9-v5-2-template-kda-table-definitivo-ak47dx',
  '2.0.8-v5-0-import-score-kda-definitivo-ak47dx',
  '2.0.5-v4-6-template-notifications-ak47dx',
  '2.0.4-v4-5-fast-ownteam-ak47dx',
  '2.0.3-v4-4-own-team-fast-ak47dx',
  '2.0.2-v4-3-mobile-ocr-progress-ak47dx',
  '2.0.1-deployable-pwa-yolo-ak47dx',
  '2.0.0-definitive-ak47dx',
];

export function getOcrBackendCandidates() {
  const envUrl = (process.env.NEXT_PUBLIC_OCR_BACKEND_URL || '').trim();
  const candidates: string[] = [];
  if (envUrl) candidates.push(envUrl.replace(/\/$/, ''));

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      candidates.push('http://127.0.0.1:8780', 'http://localhost:8780', 'http://127.0.0.1:8770', 'http://localhost:8770');
    }
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkOcrBackendHealth() {
  const attempts: string[] = [];
  const candidates = getOcrBackendCandidates();
  if (!candidates.length) {
    return {
      ok: false,
      url: '',
      version: '',
      attempts: [],
      hint: 'NEXT_PUBLIC_OCR_BACKEND_URL non è configurato. Su Vercel devi usare un URL Render/Cloud Run HTTPS, non localhost.',
    };
  }

  for (const candidate of candidates) {
    try {
      const response = await fetchWithTimeout(`${candidate}/health`, { cache: 'no-store' }, 90000);
      if (!response.ok) {
        attempts.push(`${candidate} -> HTTP ${response.status}`);
        continue;
      }
      const health = await response.json();
      const version = health?.version || 'unknown';
      const readyForOcr = health?.ready_for_ocr;
      if (!ACCEPTED_OCR_BACKEND_VERSIONS.includes(version)) {
        attempts.push(`${candidate} -> versione ${version}, attese ${ACCEPTED_OCR_BACKEND_VERSIONS.join(', ')}`);
        continue;
      }
      return { ok: true, url: candidate, version, readyForOcr, attempts };
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'timeout 90s, probabile cold start Render o backend bloccato'
        : error instanceof Error ? error.message : 'Failed to fetch';
      attempts.push(`${candidate} -> ${message}`);
    }
  }
  const productionHint = typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'Su Vercel non usare 127.0.0.1: configura NEXT_PUBLIC_OCR_BACKEND_URL con il link pubblico Render e verifica che /health risponda.'
    : 'Avvia backend OCR locale e verifica /health.';
  return { ok: false, url: '', version: '', attempts, hint: productionHint };
}
