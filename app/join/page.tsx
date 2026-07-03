'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function JoinPage() {
  const [code, setCode] = useState('');
  const [clan, setClan] = useState('AK47DX');
  const [nickname, setNickname] = useState('');
  const [uid, setUid] = useState('');
  const [social, setSocial] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCode(params.get('code') || '');
    setClan(params.get('clan') || 'AK47DX');
  }, []);

  async function submit() {
    if (!nickname.trim()) { setMessage('Inserisci almeno il nickname CODM.'); return; }
    const payload = { invite_code: code, clan_tag: clan, nickname: nickname.trim(), uid_codm: uid.trim() || null, social_contact: social.trim() || null, status: 'pending' };
    localStorage.setItem(`ak47dx_join_${code || 'manual'}`, JSON.stringify(payload));
    try { await supabase.from('clan_invite_requests').insert(payload); } catch {}
    setMessage('Richiesta inviata/salvata. Admin potrà approvare e collegare le statistiche manuali al tuo profilo.');
  }

  return (
    <main className="container">
      <section className="card gaming-panel">
        <p className="eyebrow">🐺 AK47DX Join</p>
        <h1>Iscrizione clan</h1>
        <p className="muted">Link invito: <b>{code || '-'}</b> · Clan: <b>{clan}</b></p>
        {message && <div className="notice">{message}</div>}
        <div className="form top-gap">
          <div className="field"><label>Nickname CODM</label><input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="AKঐMIRZA" /></div>
          <div className="field"><label>UID CODM</label><input className="input" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="UID opzionale" /></div>
          <div className="field"><label>Social / contatto</label><input className="input" value={social} onChange={(e) => setSocial(e.target.value)} placeholder="Discord, WhatsApp, TikTok..." /></div>
          <button className="btn" onClick={submit}>🚀 Invia richiesta</button>
        </div>
      </section>
    </main>
  );
}
