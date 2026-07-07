'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function EventsHealthPage() {
  const [status, setStatus] = useState('Premi controllo per verificare database eventi, service role e clan risolto dal server.');
  const [json, setJson] = useState<any>(null);

  async function checkHealth() {
    try {
      setStatus('Controllo eventi V8.2 in corso...');
      const { data: sessionData } = await supabase.auth.getSession();
      let token = sessionData.session?.access_token;
      if (!token) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        token = refreshed.session?.access_token;
      }
      if (!token) throw new Error('Login richiesto: fai login e riprova.');
      const response = await fetch('/api/events/health', {
        method: 'GET',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache' }
      });
      const data = await response.json().catch(() => null);
      setJson(data);
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Health eventi non OK.');
      setStatus(String(data.mode || '').includes('service-role')
        ? `OK: service-role attiva, clan=${data.resolvedClanId || '-'}, eventi=${data.eventsCount ?? '-'}.`
        : 'ATTENZIONE: service role non attiva. Eventi non affidabili.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Errore health eventi.');
    }
  }

  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">EVENTI V8.2 HEALTH</div>
          <h1 className="ak-title">Controllo database unico eventi</h1>
          <p className="ak-lead">Verifica che PWA e browser usino lo stesso endpoint Vercel API + Supabase service role.</p>
          <button className="btn" type="button" onClick={checkHealth}>Controlla eventi</button>
          <div className="notice top-gap"><strong>Stato:</strong> {status}</div>
          {json && <pre className="notice top-gap" style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{JSON.stringify(json, null, 2)}</pre>}
          <div className="ak-quick-links"><a href="/events">Eventi</a><a href="/cache-reset">Reset cache</a><a href="/version">Versione</a></div>
        </div>
      </section>
    </main>
  );
}
