'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Conferma account in corso...');

  useEffect(() => {
    async function run() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          try {
            await fetch('/api/auth/sync-roster', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token || ''}` } });
          } catch {}
        }
        setMessage('Account confermato. Profilo e roster sincronizzati. Ti porto alla pagina profilo.');
        setTimeout(() => {
          window.location.href = params.get('next') || '/profile-import';
        }, 900);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Conferma completata. Ora puoi fare login.');
      }
    }
    void run();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-cyan-400/20 bg-slate-900 p-8 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="mt-4 text-3xl font-black">Conferma email</h1>
        <p className="mt-3 text-slate-300">{message}</p>
        <Link href="/login" className="mt-6 inline-flex rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950">Vai al login</Link>
      </section>
    </main>
  );
}
