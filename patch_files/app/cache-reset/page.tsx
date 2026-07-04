'use client';

import { useState } from 'react';

export default function CacheResetPage() {
  const [status, setStatus] = useState('Pronto per pulire cache/PWA.');

  async function resetCache() {
    try {
      setStatus('Pulizia cache in corso...');

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        // ignore storage errors
      }

      setStatus('Cache pulita. Reindirizzo alla dashboard aggiornata...');
      window.setTimeout(() => {
        window.location.href = `/dashboard?fresh=${Date.now()}`;
      }, 800);
    } catch (error) {
      setStatus(`Errore pulizia cache: ${error instanceof Error ? error.message : 'errore sconosciuto'}`);
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#06070d', color: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      <section style={{ maxWidth: 760, margin: '0 auto', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 20, padding: 24, background: 'linear-gradient(135deg, rgba(234,88,12,0.18), rgba(15,23,42,0.95))' }}>
        <p style={{ color: '#f97316', fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>AK47DX CACHE RESET</p>
        <h1 style={{ fontSize: 32, lineHeight: 1.1, margin: '0 0 16px' }}>Pulisci versione vecchia</h1>
        <p style={{ color: '#cbd5e1' }}>
          Usa questo pulsante se il telefono o la PWA continua a mostrare una versione vecchia dell'app CODM.
        </p>
        <button
          type="button"
          onClick={resetCache}
          style={{ marginTop: 12, padding: '14px 18px', borderRadius: 12, border: 0, background: '#dc2626', color: 'white', fontWeight: 900, cursor: 'pointer' }}
        >
          Pulisci cache e aggiorna
        </button>
        <pre style={{ marginTop: 18, padding: 14, borderRadius: 12, background: 'rgba(0,0,0,0.32)', color: '#86efac', whiteSpace: 'pre-wrap' }}>{status}</pre>
      </section>
    </main>
  );
}
