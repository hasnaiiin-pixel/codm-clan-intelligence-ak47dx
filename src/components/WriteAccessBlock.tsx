'use client';

import Link from 'next/link';
import { roleLabel, type CodmRole } from '@/lib/authRoles';

type Props = {
  loading?: boolean;
  role?: CodmRole | string;
  title?: string;
  description?: string;
};

export function WriteAccessBlock({
  loading = false,
  role = 'anon',
  title = 'Accesso modifica bloccato',
  description = 'Puoi vedere la dashboard pubblica, ma per modificare dati, caricare risultati o gestire il clan serve un ruolo Staff, Coach o Owner.',
}: Props) {
  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-white shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">AK47DX</p>
          <h1 className="mt-3 text-2xl font-black">Controllo permessi...</h1>
          <p className="mt-2 text-slate-300">Verifico sessione e ruolo utente.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <section className="rounded-3xl border border-red-500/30 bg-slate-950/90 p-6 text-white shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-red-300">Permessi richiesti</p>
        <h1 className="mt-3 text-2xl font-black">{title}</h1>
        <p className="mt-3 text-slate-300">{description}</p>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          Ruolo attuale: <strong>{roleLabel(role as CodmRole)}</strong>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-2xl bg-cyan-500 px-4 py-2 font-bold text-slate-950">Vai alla dashboard</Link>
          <Link href="/login" className="rounded-2xl border border-white/20 px-4 py-2 font-bold text-white">Login / Registrati</Link>
          <Link href="/profile-import" className="rounded-2xl border border-white/20 px-4 py-2 font-bold text-white">Importa profilo</Link>
        </div>
      </section>
    </main>
  );
}
