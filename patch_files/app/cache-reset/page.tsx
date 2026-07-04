'use client';

import { useState } from 'react';

export default function CacheResetPage() {
  const [status, setStatus] = useState('Pronto per pulire cache browser/PWA.');

  async function resetCache() {
    try {
      setStatus('Pulizia cache in corso...');

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }

      try {
        localStorage.setItem('codm_cache_reset_at', new Date().toISOString());
        sessionStorage.clear();
      } catch {
        // ignore storage errors
      }

      setStatus('Cache pulita. Ricarico la app...');
      setTimeout(() => {
        window.location.href = '/version?fresh=' + Date.now();
      }, 900);
    } catch (error) {
      setStatus('Errore reset cache: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-5 py-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-red-500/30 bg-black/40 p-6 shadow-2xl shadow-red-950/30">
        <p className="text-xs uppercase tracking-[0.35em] text-red-300">AK47DX CODM</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Reset cache / PWA</h1>
        <p className="mt-3 text-zinc-300">
          Usa questo pulsante se telefono o browser mostrano ancora la versione vecchia.
        </p>

        <button
          type="button"
          onClick={resetCache}
          className="mt-6 w-full rounded-2xl bg-red-600 px-5 py-4 text-center font-black text-white hover:bg-red-500 sm:w-auto"
        >
          Pulisci cache e aggiorna
        </button>

        <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm text-zinc-100">
          {status}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a className="rounded-2xl border border-zinc-700 px-5 py-3 text-center font-bold text-zinc-100 hover:bg-zinc-900" href="/version">
            Vai a /version
          </a>
          <a className="rounded-2xl border border-zinc-700 px-5 py-3 text-center font-bold text-zinc-100 hover:bg-zinc-900" href="/dashboard">
            Torna alla dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
