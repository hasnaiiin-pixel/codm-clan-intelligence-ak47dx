'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

type ClanRow = { id: string; name?: string | null; tag?: string | null };

async function getFirstClan(): Promise<ClanRow | null> {
  const { data, error } = await supabase
    .from('clans')
    .select('id,name,tag')
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as ClanRow | undefined) || null;
}

async function ensureProfileAndPendingRequest(user: User, displayName: string) {
  const name = displayName.trim() || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Nuovo player';

  await supabase.from('profiles').upsert({
    id: user.id,
    display_name: name,
  });

  const clan = await getFirstClan();
  if (!clan?.id) return;

  await supabase.from('clan_invite_requests').upsert(
    {
      clan_id: clan.id,
      user_id: user.id,
      nickname: name,
      uid_codm: null,
      social_contact: user.email || null,
      status: 'pending',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'clan_id,user_id' }
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) await ensureProfileAndPendingRequest(data.user, displayName);
      window.location.href = '/profile-import';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore login.');
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split('@')[0] },
          emailRedirectTo: `${window.location.origin}/profile-import`,
        },
      });
      if (error) throw error;
      if (data.session && data.user) {
        await ensureProfileAndPendingRequest(data.user, displayName);
        window.location.href = '/profile-import';
        return;
      }
      setMessage('Account creato. Se Supabase richiede conferma email, apri la mail e poi fai login. Dopo il login importa il profilo CODM.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore registrazione.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">AK47DX accesso</p>
        <h1 className="mt-3 text-3xl font-black">{mode === 'login' ? 'Login staff / player' : 'Registrazione player'}</h1>
        <p className="mt-2 text-slate-300">La dashboard è pubblica in sola lettura. Per modificare dati serve ruolo assegnato da admin.</p>

        <div className="mt-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-slate-900/70 p-1">
          <button type="button" onClick={() => setMode('login')} className={`rounded-xl px-4 py-2 font-bold ${mode === 'login' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>Entra</button>
          <button type="button" onClick={() => setMode('register')} className={`rounded-xl px-4 py-2 font-bold ${mode === 'register' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>Registrati</button>
        </div>

        <div className="mt-6 space-y-4">
          {mode === 'register' && (
            <label className="block text-sm font-bold text-slate-200">
              Nome visualizzato
              <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Es. MIRZA" />
            </label>
          )}
          <label className="block text-sm font-bold text-slate-200">
            Email
            <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="player@email.com" autoComplete="email" />
          </label>
          <label className="block text-sm font-bold text-slate-200">
            Password
            <input type="password" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimo 6 caratteri" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
          <button disabled={loading || !email || !password} onClick={mode === 'login' ? signIn : signUp} className="w-full rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950 disabled:opacity-50">
            {loading ? 'Attendere...' : mode === 'login' ? 'Entra' : 'Crea account'}
          </button>
        </div>

        {message && <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm text-slate-200">{message}</div>}

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
          <strong>Flusso player semplice:</strong>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Il player si registra con email.</li>
            <li>Importa profilo CODM da <Link className="text-cyan-300 underline" href="/profile-import">/profile-import</Link>.</li>
            <li>Admin approva e assegna ruolo da /admin/users.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
