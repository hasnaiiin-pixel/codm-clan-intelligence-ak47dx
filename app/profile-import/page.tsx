'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useCodmAuth } from '@/lib/authRoles';
import { loadClanIdentity, clanDisplayName } from '@/lib/clanIdentity';

type ClanRow = { id: string; name?: string | null; tag?: string | null };

async function getFirstClan(): Promise<ClanRow | null> {
  const identity = await loadClanIdentity();
  if (!identity.clanId) return null;
  return { id: identity.clanId, name: identity.clanName, tag: clanDisplayName(identity) };
}

async function ensureRosterPlayer(clan: ClanRow, userId: string, nickname: string, uidCodm: string, email?: string | null) {
  const cleanNickname = nickname.trim();
  const { data: existing } = await supabase.from('players').select('id').eq('clan_id', clan.id).eq('nickname', cleanNickname).limit(1);
  const payload = {
    clan_id: clan.id,
    nickname: cleanNickname,
    uid_codm: uidCodm.trim() || null,
    clan_name: clan.tag || clan.name || 'AK47DX',
    status: 'active',
    notes: `Creato/aggiornato automaticamente da profilo registrato Clan Manager · email=${email || '-'} · user_id=${userId}`
  };
  if (existing?.[0]?.id) await supabase.from('players').update(payload).eq('id', existing[0].id);
  else await supabase.from('players').insert(payload);
}

export default function ProfileImportPage() {
  const auth = useCodmAuth();
  const [nickname, setNickname] = useState('');
  const [uidCodm, setUidCodm] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const name = auth.user?.user_metadata?.display_name || auth.user?.email?.split('@')[0] || '';
    setNickname((current) => current || name);
    setContact((current) => current || auth.user?.email || '');
  }, [auth.user]);

  async function saveProfileRequest() {
    if (!auth.user?.id) return setMessage('Prima devi fare login.');
    if (!nickname.trim()) return setMessage('Inserisci nickname CODM.');
    setSaving(true);
    setMessage('');
    try {
      const clan = await getFirstClan();
      if (!clan?.id) throw new Error('Clan non trovato. Prima crea/configura il clan AK47DX.');

      const displayName = nickname.trim();
      await supabase.from('profiles').upsert({
        id: auth.user.id,
        display_name: displayName,
        player_nickname: displayName,
        codm_uid: uidCodm.trim() || null,
        updated_at: new Date().toISOString(),
      });

      await ensureRosterPlayer(clan, auth.user.id, displayName, uidCodm, auth.user.email);
      setMessage('Profilo salvato. Il nome in gioco è stato inserito/aggiornato automaticamente nel roster.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore salvataggio profilo.');
    } finally {
      setSaving(false);
    }
  }

  if (auth.loading) {
    return <main className="min-h-screen bg-slate-950 p-6 text-white">Caricamento sessione...</main>;
  }

  if (!auth.user) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-3xl font-black">Import profilo CODM</h1>
          <p className="mt-3 text-slate-300">Devi registrarti o fare login prima di inviare il profilo.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950">Login / Registrati</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">AK47DX player</p>
        <h1 className="mt-3 text-3xl font-black">Importa profilo CODM</h1>
        <p className="mt-2 text-slate-300">Inserisci nickname e UID. Il nome in gioco viene aggiornato nel roster automaticamente.</p>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-bold text-slate-200">
            Nickname CODM
            <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Nickname esatto in gioco" />
          </label>
          <label className="block text-sm font-bold text-slate-200">
            UID CODM
            <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" value={uidCodm} onChange={(e) => setUidCodm(e.target.value)} placeholder="UID giocatore" />
          </label>
          <label className="block text-sm font-bold text-slate-200">
            Contatto / email
            <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="email o contatto" />
          </label>
          <button disabled={saving} onClick={saveProfileRequest} className="w-full rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950 disabled:opacity-50">
            {saving ? 'Salvataggio in corso...' : 'Salva profilo e aggiorna roster'}
          </button>
        </div>

        {message && <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm text-slate-200">{message}</div>}
      </section>
    </main>
  );
}
