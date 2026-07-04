'use client';

import { useState } from 'react';

export default function CacheResetPage() {
  const [status, setStatus] = useState('Pronto per pulire cache e service worker.');

  async function resetCache() {
    try {
      setStatus('Pulizia in corso...');
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
      try { localStorage.setItem('codm_cache_reset_at', new Date().toISOString()); } catch {}
      setStatus('Cache pulita. Ricarico la pagina...');
      setTimeout(() => {
        window.location.href = '/?fresh=' + Date.now();
      }, 900);
    } catch (err) {
      setStatus('Errore durante pulizia cache: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: 24, fontFamily: 'system-ui, Arial', background: '#060914', color: '#f8fafc' }}>
      <section style={{ maxWidth: 760, margin: '0 auto', border: '1px solid rgba(148,163,184,.25)', borderRadius: 18, padding: 24, background: 'rgba(15,23,42,.72)' }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>AK47DX CODM - Reset Cache/PWA</h1>
        <p style={{ opacity: .85 }}>Usa questo pulsante se sul telefono o browser vedi ancora la versione vecchia.</p>
        <button onClick={resetCache} style={{ marginTop: 18, padding: '12px 18px', borderRadius: 12, border: 0, fontWeight: 800, cursor: 'pointer' }}>
          Pulisci cache e aggiorna
        </button>
        <p style={{ marginTop: 18 }}>{status}</p>
        <p style={{ marginTop: 18 }}>Poi riapri <a href="/version" style={{ color: '#67e8f9' }}>/version</a>.</p>
      </section>
    </main>
  );
}
