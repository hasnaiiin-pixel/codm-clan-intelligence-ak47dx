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
  if (!auth.canManageUsers) {
    return <main className="container"><section className="card"><p className="eyebrow">🤖 OCR</p><h1>Stato OCR riservato</h1><p className="muted">Questa pagina è visibile solo ad Admin/Owner.</p></section></main>;
  }

  return (
    <main className="container wide ak-page-compact">
      <section className="card ak-section-head">
        <div className="eyebrow">OCR Hybrid 2.0</div>
        <h1>Stato backend OCR</h1>
        <p className="muted">Versione attesa/accettata: <b>{EXPECTED_OCR_BACKEND_VERSION}</b></p>
        <button onClick={() => void run()} className="btn top-gap">{loading ? 'Controllo...' : 'Ricontrolla OCR'}</button>
        <div className={`notice top-gap ${status?.ok ? 'ok' : ''}`}>
          {status?.ok ? <p>✅ Backend raggiungibile: {status.url} — version {status.version}</p> : <div><p>⚠️ Backend OCR non raggiungibile o non allineato.</p><p className="muted">{status?.hint || 'Configura NEXT_PUBLIC_OCR_BACKEND_URL oppure avvia il backend locale.'}</p></div>}
        </div>
        <details className="top-gap"><summary>URL controllati</summary><pre className="raw-box">{JSON.stringify({ candidates: getOcrBackendCandidates(), attempts: status?.attempts || [] }, null, 2)}</pre></details>
      </section>
    </main>
  );
}
