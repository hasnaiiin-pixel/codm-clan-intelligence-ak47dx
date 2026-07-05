'use client';

import { useEffect, useState } from 'react';
import { checkOcrBackendHealth, EXPECTED_OCR_BACKEND_VERSION, getOcrBackendCandidates } from '@/lib/ocrBackend';

type Status = Awaited<ReturnType<typeof checkOcrBackendHealth>> | null;

export default function OcrStatusPage() {
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      setStatus(await checkOcrBackendHealth());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void run(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-cyan-400/20 bg-slate-900/80 p-6">
        <div className="text-sm font-black uppercase tracking-[0.25em] text-cyan-200">OCR Hybrid 2.0</div>
        <h1 className="mt-2 text-3xl font-black">Stato backend OCR</h1>
        <p className="mt-3 text-slate-300">Versione attesa: <b>{EXPECTED_OCR_BACKEND_VERSION}</b></p>
        <button onClick={() => void run()} className="mt-5 rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950">{loading ? 'Controllo...' : 'Ricontrolla OCR'}</button>
        <div className={`mt-6 rounded-2xl border p-4 ${status?.ok ? 'border-emerald-300/30 bg-emerald-300/10' : 'border-amber-300/30 bg-amber-300/10'}`}>
          {status?.ok ? (
            <p className="text-emerald-100">✅ Backend raggiungibile: {status.url} — version {status.version}</p>
          ) : (
            <div className="text-amber-100">
              <p>⚠️ Backend OCR non raggiungibile o non allineato.</p>
              <p className="mt-2 text-sm">{status?.hint || 'Configura NEXT_PUBLIC_OCR_BACKEND_URL oppure avvia il backend locale.'}</p>
            </div>
          )}
        </div>
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950 p-4">
          <h2 className="font-black">URL controllati</h2>
          <pre className="mt-3 overflow-auto text-xs text-slate-300">{JSON.stringify({ candidates: getOcrBackendCandidates(), attempts: status?.attempts || [] }, null, 2)}</pre>
        </div>
        <div className="mt-6 text-sm text-slate-300">
          <p><b>Locale:</b> avvia backend e apri http://127.0.0.1:8780/health.</p>
          <p><b>Vercel:</b> pubblica il backend su Render/Cloud Run e metti NEXT_PUBLIC_OCR_BACKEND_URL con URL https pubblico.</p>
        </div>
      </section>
    </main>
  );
}
