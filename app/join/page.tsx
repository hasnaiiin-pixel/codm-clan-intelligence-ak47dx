'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { loadClanIdentity, clanDisplayName } from '@/lib/clanIdentity';

type ClanRow = { id: string; name?: string | null; tag?: string | null };
async function getFirstClan(): Promise<ClanRow | null> {
  const identity = await loadClanIdentity();
  if (!identity.clanId) return null;
  return { id: identity.clanId, name: identity.clanName, tag: clanDisplayName(identity) };
}

export default function JoinPage() {
  const [code, setCode] = useState('');
  const [clan, setClan] = useState('AK47DX');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [uid, setUid] = useState('');
  const [social, setSocial] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCode(params.get('code') || '');
    const urlClan = params.get('clan');
    setClan(urlClan || 'AK47DX');
    loadClanIdentity().then((identity) => setClan(urlClan || clanDisplayName(identity))).catch(() => undefined);
  }, []);

  async function submit() {
    if (!nickname.trim()) { setMessage('Inserisci almeno il nickname CODM.'); return; }
    const payload = { invite_code: code, clan_tag: clan, full_name: fullName.trim() || null, email: email.trim() || null, nickname: nickname.trim(), uid_codm: uid.trim() || null, social_contact: social.trim() || email.trim() || null, status: 'active' };
    localStorage.setItem(`ak47dx_join_${code || 'manual'}`, JSON.stringify(payload));
    try { await supabase.from('clan_invite_requests').insert(payload); } catch {}
    try {
      const activeClan = await getFirstClan();
      if (activeClan?.id) {
        const { data: existing } = await supabase.from('players').select('id').eq('clan_id', activeClan.id).eq('nickname', nickname.trim()).limit(1);
        const playerPayload = { clan_id: activeClan.id, nickname: nickname.trim(), uid_codm: uid.trim() || null, clan_name: activeClan.tag || activeClan.name || clan, status: 'active', notes: `Creato automaticamente da iscrizione Join Clan Manager · nome=${fullName || '-'} · email=${email || '-'}` };
        if (existing?.[0]?.id) await supabase.from('players').update(playerPayload).eq('id', existing[0].id);
        else await supabase.from('players').insert(playerPayload);
      }
    } catch {}
    setMessage('Iscrizione salvata. Il nome in gioco è stato inserito automaticamente nel roster.');
  }

  return (
    <main className="container">
      <section className="card gaming-panel">
        <p className="eyebrow">🐺 Clan Manager Join</p>
        <h1>Iscrizione clan</h1>
        <p className="muted">Link invito: <b>{code || '-'}</b> · Clan: <b>{clan}</b>. Nome, email e nome in gioco finiscono nel roster automaticamente.</p>
        {message && <div className="notice">{message}</div>}
        <div className="form top-gap">
          <div className="field"><label>Nome</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome e cognome" /></div>
          <div className="field"><label>Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="player@email.com" /></div>
          <div className="field"><label>Nome in gioco CODM</label><input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="MIRZA" /></div>
          <div className="field"><label>UID CODM</label><input className="input" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="UID opzionale" /></div>
          <div className="field"><label>Social / contatto</label><input className="input" value={social} onChange={(e) => setSocial(e.target.value)} placeholder="Discord, WhatsApp, TikTok..." /></div>
          <button className="btn" onClick={submit}>🚀 Iscriviti e aggiungi al roster</button>
        </div>
      </section>
    </main>
  );
}
