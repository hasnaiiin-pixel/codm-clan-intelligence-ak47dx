'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCodmAuth } from '@/lib/authRoles';

export default function ProfileImportPage() {
  const auth = useCodmAuth();
  const [nickname, setNickname] = useState('');
  const [uidCodm, setUidCodm] = useState('');
  const [socialContact, setSocialContact] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (auth.user?.user_metadata?.display_name && !nickname) {
      setNickname(auth.user.user_metadata.display_name);
    }
  }, [auth.user, nickname]);

  async function submitRequest() {
    if (!auth.user) return setMessage('Fai prima login o registrazione.');
    if (!nickname.trim()) return setMessage('Inserisci nickname CODM.');
    setSaving(true);
    setMessage('');

    const { error } = await supabase.from('clan_invite_requests').insert({
      clan_tag: auth.clanName || 'AK47DX',
      nickname: nickname.trim(),
      uid_codm: uidCodm.trim() || null,
      social_contact: socialContact.trim() || auth.user.email || null,
      status: 'pending'
    });

    await supabase.from('profiles').upsert({
      id: auth.user.id,
      display_name: nickname.trim()
    });

    setSaving(false);
    if (error) return setMessage(error.message);
    setMessage('Richiesta inviata. Admin/Owner può approvare e assegnare livello accesso da Utenti e permessi.');
    setNotes('');
  }

  if (!auth.loading && !auth.user) {
    return (
      <main className="page-shell">
        <section className="login-card">
          <p className="eyebrow">Profilo player</p>
          <h1>Registrati prima</h1>
          <p className="muted">Per importare il profilo serve un account email.</p>
          <a className="btn" href="/login">Login / Registrati</a>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="login-card wide">
        <p className="eyebrow">Player onboarding</p>
        <h1>Importa profilo CODM</h1>
        <p className="muted">Questa richiesta non ti dà permessi di modifica. L'admin decide se sei player, viewer, staff, coach o owner.</p>

        <label>Nickname CODM<input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Nome in gioco" /></label>
        <label>UID CODM<input value={uidCodm} onChange={(e) => setUidCodm(e.target.value)} placeholder="UID se disponibile" /></label>
        <label>WhatsApp / Discord / contatto<input value={socialContact} onChange={(e) => setSocialContact(e.target.value)} placeholder="Contatto per approvazione" /></label>
        <label>Note profilo<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ruolo, armi preferite, disponibilità, ecc." /></label>

        <button className="btn full" disabled={saving || auth.loading} onClick={submitRequest}>{saving ? 'Invio...' : 'Invia richiesta profilo'}</button>
        {message && <div className="notice top-gap">{message}</div>}
      </section>
    </main>
  );
}
