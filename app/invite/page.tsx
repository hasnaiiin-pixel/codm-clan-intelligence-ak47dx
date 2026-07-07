'use client';
import { useCodmAuth } from '@/lib/authRoles';
import { WriteAccessBlock } from '@/components/WriteAccessBlock';


import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getEphemeralValue, setEphemeralValue } from '@/lib/ephemeralStore';

function makeCode() {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AK47DX-${part}`;
}


export default function InvitePage() {
  const codmAuth = useCodmAuth();
  if (codmAuth.loading) return <WriteAccessBlock loading />;
  if (!codmAuth.canWrite) return <WriteAccessBlock role={codmAuth.role} title="Solo Staff, Coach o Owner può gestire inviti" description="I visitatori e i player possono usare la pagina Join/Login, ma la creazione degli inviti resta riservata allo staff." />;
  return <InviteEditor />;
}

function InviteEditor() {
  const [origin, setOrigin] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState('player');
  const [clanTag, setClanTag] = useState('AK47DX');
  const [message, setMessage] = useState('');
  const inviteLink = useMemo(() => `${origin || 'http://localhost:3000'}/join?code=${encodeURIComponent(code || 'AK47DX-DEMO')}&clan=${encodeURIComponent(clanTag)}`, [origin, code, clanTag]);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(inviteLink)}`;

  useEffect(() => {
    setOrigin(window.location.origin);
    const saved = getEphemeralValue<string>('ak47dx_last_invite');
    if (saved) setCode(saved); else {
      const c = makeCode();
      setCode(c);
      setEphemeralValue('ak47dx_last_invite', c);
    }
  }, []);

  async function createInvite() {
    const newCode = makeCode();
    setCode(newCode);
    setEphemeralValue('ak47dx_last_invite', newCode);
    setMessage('Link invito creato. Puoi copiarlo e mandarlo su WhatsApp, Discord o social.');
    try {
      await supabase.from('clan_invites').insert({ invite_code: newCode, clan_tag: clanTag, target_role: role, status: 'active' });
    } catch {
      // fallback locale: la migrazione Supabase può essere eseguita dopo.
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setMessage('Link copiato negli appunti.');
  }

  return (
    <main className="container wide">
      <section className="clan-hero">
        <div>
          <p className="eyebrow">🔗 Invita giocatori</p>
          <h1>Iscrizione semplice AK47DX</h1>
          <p className="clan-motto">Crea un link, mandalo al player, lui entra e compila il profilo. Admin lo approva e assegna ruolo/clan.</p>
          <div className="hero-actions"><button className="btn" onClick={createInvite}>⚡ Genera nuovo link</button><button className="btn secondary" onClick={copyLink}>📋 Copia link</button></div>
        </div>
        <div className="clan-emblem invite-emblem"><img src="/assets/ak47dx-logo.jpeg" alt="AK47DX" /></div>
      </section>

      {message && <div className="notice top-gap">{message}</div>}

      <section className="grid grid-2 top-gap">
        <div className="card gaming-panel">
          <h2>Procedura invito</h2>
          <div className="form">
            <div className="grid grid-2">
              <div className="field"><label>Clan / tag</label><input className="input" value={clanTag} onChange={(e) => setClanTag(e.target.value)} /></div>
              <div className="field"><label>Ruolo iniziale</label><select className="select" value={role} onChange={(e) => setRole(e.target.value)}><option value="player">Player</option><option value="tryout">Trial</option><option value="vice">Vice / staff</option><option value="viewer">Viewer</option></select></div>
            </div>
            <div className="invite-link-box"><span>{inviteLink}</span><button className="btn small" onClick={copyLink}>Copia</button></div>
            <ol className="muted">
              <li>Admin genera link invito.</li>
              <li>Player apre link e inserisce nickname, UID e social.</li>
              <li>Admin conferma iscrizione e collega eventuali statistiche manuali già presenti.</li>
            </ol>
          </div>
        </div>
        <div className="card stat-pie-card">
          <h2>QR invito</h2>
          <img className="qr-card" src={qrUrl} alt="QR invito AK47DX" />
          <p className="muted">Il QR usa il link sopra. In produzione potrà essere collegato a Supabase Auth e ruoli reali.</p>
        </div>
      </section>
    </main>
  );
}
