'use client';

import { useEffect, useState } from 'react';
import { useCodmAuth } from '@/lib/authRoles';
import { checkOcrBackendHealth, EXPECTED_OCR_BACKEND_VERSION, getOcrBackendCandidates } from '@/lib/ocrBackend';

type Status = Awaited<ReturnType<typeof checkOcrBackendHealth>> | null;

export default function OcrStatusPage() {
  const auth = useCodmAuth();
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!auth.canManageUsers) return;
    setLoading(true);
    try { setStatus(await checkOcrBackendHealth()); } finally { setLoading(false); }
  }

  useEffect(() => { if (auth.canManageUsers) void run(); }, [auth.canManageUsers]);

  if (auth.loading) return <main className="container"><div className="card">Verifica permessi...</div></main>;
  if (!auth.canManageUsers) return <main className="container"><section className="card"><h1>OCR operativo</h1><p className="muted">Lo stato tecnico OCR è riservato agli admin.</p></section></main>;

  return (
    <main className="container wide ak-page-compact">
      <section className="card ak-section-head">
        <p className="eyebrow">🤖 OCR</p>
        <h1>Stato OCR</h1>
        <div className={`notice top-gap ${status?.ok ? 'ok' : 'warn'}`}>
          {status?.ok ? <p>✅ Backend OCR raggiungibile: <b>{status.url}</b> · versione {status.version}</p> : <p>⚠️ OCR backend non attivo. Puoi comunque usare inserimento manuale/tabella; per OCR automatico configura il backend.</p>}
        </div>
        <div className="grid grid-3 top-gap">
          <div className="kpi"><span>Versione attesa</span><strong>{EXPECTED_OCR_BACKEND_VERSION}</strong></div>
          <div className="kpi"><span>Stato</span><strong>{status?.ok ? 'Online' : 'Offline'}</strong></div>
          <div className="kpi"><span>Fallback</span><strong>Manuale / Tabella</strong></div>
        </div>
        <button onClick={() => void run()} className="btn top-gap">{loading ? 'Controllo...' : 'Ricontrolla OCR'}</button>
        <details className="top-gap"><summary>Dettagli tecnici admin</summary><pre className="raw-box">{JSON.stringify({ candidates: getOcrBackendCandidates(), attempts: status?.attempts || [] }, null, 2)}</pre></details>
      </section>
    </main>
  );
}
