'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function RegistrationConfirmedPage() {
  const [status, setStatus] = useState('pending');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStatus(params.get('status') || 'pending');
    setEmail(params.get('email') || '');
  }, []);

  const confirmed = status === 'confirmed';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-cyan-400/20 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="text-6xl">{confirmed ? '✅' : '📧'}</div>
        <h1 className="mt-4 text-3xl font-black">
          {confirmed ? 'Iscrizione confermata' : 'Registrazione completata'}
        </h1>
        <p className="mt-4 text-slate-300">
          {confirmed
            ? 'Il tuo account è stato confermato correttamente. Ora puoi entrare nell’app con email e password.'
            : 'Il tuo account è stato creato. Controlla la casella email e premi il link di conferma per attivarlo.'}
        </p>
        {email && <p className="mt-3 font-bold text-cyan-300">{email}</p>}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950">Vai al login</Link>
          <Link href="/" className="rounded-2xl border border-cyan-400/30 px-5 py-3 font-black text-white">Torna alla Home</Link>
        </div>
      </section>
    </main>
  );
}
