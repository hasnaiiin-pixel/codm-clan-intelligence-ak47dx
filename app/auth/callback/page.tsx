'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Conferma account in corso...');
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function run() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const errorDescription = params.get('error_description');
        if (errorDescription) throw new Error(errorDescription);

        let accessToken = '';
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          accessToken = data.session?.access_token || '';
        } else {
          const { data } = await supabase.auth.getSession();
          accessToken = data.session?.access_token || '';
        }

        if (accessToken) {
          try {
            await fetch('/api/auth/sync-roster', {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}` }
            });
          } catch {}
        }

        setMessage('Iscrizione confermata. Il tuo account e il profilo giocatore sono pronti.');
        setDone(true);
      } catch (error) {
        setFailed(true);
        setMessage(error instanceof Error ? error.message : 'Il link non è valido o è scaduto. Puoi comunque provare ad accedere.');
      }
    }
    void run();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-cyan-400/20 bg-slate-900 p-8 text-center">
        <div className="text-5xl">{failed ? '⚠️' : done ? '✅' : '⏳'}</div>
        <h1 className="mt-4 text-3xl font-black">{done ? 'Iscrizione confermata' : 'Conferma email'}</h1>
        <p className="mt-3 text-slate-300">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="inline-flex rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950">Vai al login</Link>
          <Link href="/" className="inline-flex rounded-2xl border border-cyan-400/30 px-5 py-3 font-black text-white">Home</Link>
        </div>
      </section>
    </main>
  );
}
