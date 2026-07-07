'use client';

import { useState } from 'react';
import { calibrationStorageKeysToPreserve } from '@/lib/calibration';

export default function CacheResetPage() {
  const [status, setStatus] = useState('Pronto per pulire cache/PWA. Gli eventi non vengono più conservati localmente: restano solo quelli nel database Supabase.');

  async function resetCache() {
    try {
      setStatus('Pulizia cache in corso. Salvo temporaneamente i template OCR; eventi/cache eventi locali vengono eliminati definitivamente...');

      const preservedEntries: Array<[string, string]> = [];
      try {
        for (const key of calibrationStorageKeysToPreserve()) {
          const value = window.localStorage.getItem(key);
          if (value !== null) preservedEntries.push([key, value]);
        }
      } catch {
        // ignore storage errors
      }

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
        for (const [key, value] of preservedEntries) window.localStorage.setItem(key, value);
      } catch {
        // ignore storage errors
      }

      setStatus(`Cache pulita. Template OCR preservati: ${preservedEntries.length}. Eventi locali rimossi: ora la PWA usa solo Supabase. Reindirizzo alla dashboard aggiornata...`);
      window.setTimeout(() => {
        window.location.href = `/dashboard?fresh=${Date.now()}`;
      }, 900);
    } catch (error) {
      setStatus(`Errore pulizia cache: ${error instanceof Error ? error.message : 'errore sconosciuto'}`);
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#06070d', color: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      <section style={{ maxWidth: 760, margin: '0 auto', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 20, padding: 24, background: 'linear-gradient(135deg, rgba(34,211,238,0.16), rgba(15,23,42,0.95))' }}>
        <p style={{ color: '#22d3ee', fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>AK47DX CACHE RESET SICURO</p>
        <h1 style={{ fontSize: 32, lineHeight: 1.1, margin: '0 0 16px' }}>Pulisci versione vecchia senza perdere calibrazione</h1>
        <p style={{ color: '#cbd5e1' }}>
          Usa questo pulsante se telefono o PWA continua a mostrare eventi vecchi o una versione precedente. Da V8.1 gli eventi locali vengono cancellati e la PWA legge solo Supabase; i template OCR salvati restano conservati.
        </p>
        <button
          type="button"
          onClick={resetCache}
          style={{ marginTop: 12, padding: '14px 18px', borderRadius: 12, border: 0, background: '#0891b2', color: 'white', fontWeight: 900, cursor: 'pointer' }}
        >
          Pulisci cache, elimina eventi locali e conserva template OCR
        </button>
        <pre style={{ marginTop: 18, padding: 14, borderRadius: 12, background: 'rgba(0,0,0,0.32)', color: '#86efac', whiteSpace: 'pre-wrap' }}>{status}</pre>
      </section>
    </main>
  );
}
