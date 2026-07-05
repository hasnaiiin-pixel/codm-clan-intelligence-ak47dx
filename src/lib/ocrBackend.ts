export const EXPECTED_OCR_BACKEND_VERSION = '2.0.0-definitive-ak47dx';

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

export async function checkOcrBackendHealth() {
  const attempts: string[] = [];
  for (const candidate of getOcrBackendCandidates()) {
    try {
      const response = await fetch(`${candidate}/health`, { cache: 'no-store' });
      if (!response.ok) {
        attempts.push(`${candidate} -> HTTP ${response.status}`);
        continue;
      }
      const health = await response.json();
      const version = health?.version || 'unknown';
      if (version !== EXPECTED_OCR_BACKEND_VERSION) {
        attempts.push(`${candidate} -> versione ${version}, attesa ${EXPECTED_OCR_BACKEND_VERSION}`);
        continue;
      }
      return { ok: true, url: candidate, version, attempts };
    } catch (error) {
      attempts.push(`${candidate} -> ${error instanceof Error ? error.message : 'Failed to fetch'}`);
    }
  }
  const productionHint = typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'Su Vercel non usare 127.0.0.1: devi pubblicare il backend OCR e impostare NEXT_PUBLIC_OCR_BACKEND_URL.'
    : 'Avvia backend OCR locale e verifica /health.';
  return { ok: false, url: '', version: '', attempts, hint: productionHint };
}
