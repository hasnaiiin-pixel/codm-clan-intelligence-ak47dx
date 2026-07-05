'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

type Mode = 'login' | 'register';
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

async function ensureProfileAndPendingRequest(user: User, input: { displayName: string; nickname: string; uid: string }) {
  const displayName = input.displayName.trim() || input.nickname.trim() || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Nuovo player';
  const nickname = input.nickname.trim() || user.user_metadata?.player_nickname || displayName;
  const uid = input.uid.trim() || user.user_metadata?.codm_uid || null;

  await supabase.from('profiles').upsert({
    id: user.id,
    display_name: displayName,
    player_nickname: nickname,
    codm_uid: uid,
    updated_at: new Date().toISOString(),
  });

  const clan = await getFirstClan();
  if (!clan?.id) return;

  const { data: existing } = await supabase
    .from('clan_invite_requests')
    .select('id,status')
    .eq('clan_id', clan.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const payload = {
    clan_id: clan.id,
    user_id: user.id,
    nickname,
    uid_codm: uid,
    social_contact: user.email || null,
    status: existing?.status === 'approved' ? 'approved' : 'pending',
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await supabase.from('clan_invite_requests').update(payload).eq('id', existing.id);
  } else {
    await supabase.from('clan_invite_requests').insert(payload);
  }
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const [uid, setUid] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (data.user) await ensureProfileAndPendingRequest(data.user, { displayName, nickname, uid });
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
      const cleanEmail = email.trim();
      const cleanNickname = nickname.trim() || displayName.trim() || cleanEmail.split('@')[0];
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: displayName.trim() || cleanNickname,
            player_nickname: cleanNickname,
            codm_uid: uid.trim() || null,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile-import`,
        },
      });
      if (error) throw error;
      if (data.session && data.user) {
        await ensureProfileAndPendingRequest(data.user, { displayName, nickname: cleanNickname, uid });
        window.location.href = '/profile-import';
        return;
      }
      setMessage('Account creato. Controlla la mail di conferma. Dopo la conferma verrai rimandato alla app e il tuo profilo comparirà nella lista admin.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore registrazione.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !loading;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#152244,#050914_55%,#020617)] px-4 py-8 text-white">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/80 p-6 shadow-2xl shadow-cyan-950/40 md:p-8">
          <div className="mb-6 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-black uppercase tracking-[0.25em] text-cyan-200">
            AK47DX Clan Intelligence
          </div>
          <h1 className="text-3xl font-black md:text-5xl">Accesso player e staff</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            La dashboard resta pubblica in sola lettura. Registrazione, profilo CODM, eventi, upload risultati e modifiche sono gestiti con ruoli approvati da admin.
          </p>

          <div className="mt-8 flex rounded-2xl border border-white/10 bg-slate-900/80 p-1">
            <button onClick={() => setMode('login')} className={`flex-1 rounded-xl px-4 py-3 font-black ${mode === 'login' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>Login</button>
            <button onClick={() => setMode('register')} className={`flex-1 rounded-xl px-4 py-3 font-black ${mode === 'register' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>Registrati</button>
          </div>

          <div className="mt-6 grid gap-4">
            {mode === 'register' && (
              <>
                <label className="grid gap-2 text-sm font-bold text-slate-200">
                  Nome
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-300" placeholder="Es. Hasnain Mirza" />
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-200">
                  Nome giocatore CODM
                  <input value={nickname} onChange={(e) => setNickname(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-300" placeholder="Es. AKঐMIRZA" />
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-200">
                  UID CODM opzionale
                  <input value={uid} onChange={(e) => setUid(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-300" placeholder="UID se disponibile" />
                </label>
              </>
            )}
            <label className="grid gap-2 text-sm font-bold text-slate-200">
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-300" placeholder="player@email.com" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-200">
              Password
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-300" placeholder="Minimo 6 caratteri" />
            </label>
            <button disabled={!canSubmit} onClick={mode === 'login' ? signIn : signUp} className="rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Attendere...' : mode === 'login' ? 'Entra nella app' : 'Crea account player'}
            </button>
          </div>

          {message && <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">{message}</div>}
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
            <Link href="/dashboard" className="rounded-full border border-white/10 px-4 py-2 hover:border-cyan-300">Dashboard pubblica</Link>
            <Link href="/events" className="rounded-full border border-white/10 px-4 py-2 hover:border-cyan-300">Calendario eventi</Link>
            <Link href="/ocr-status" className="rounded-full border border-white/10 px-4 py-2 hover:border-cyan-300">Stato OCR</Link>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-black text-cyan-200">Flusso corretto</h2>
          <ol className="mt-4 space-y-4 text-sm text-slate-300">
            <li><b className="text-white">1.</b> Il player si registra con email, nome e nickname CODM.</li>
            <li><b className="text-white">2.</b> Dopo conferma email, viene aperta la app su `/profile-import`.</li>
            <li><b className="text-white">3.</b> Il player è subito visibile in `/admin/users` come pending.</li>
            <li><b className="text-white">4.</b> Tu assegni ruolo: viewer, player, staff, coach oppure owner.</li>
          </ol>
        </aside>
      </section>
    </main>
  );
}
