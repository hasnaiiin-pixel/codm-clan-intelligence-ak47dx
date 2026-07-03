'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function OnboardingPage() {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('AK');
  const [message, setMessage] = useState('');

  async function createClan() {
    setMessage('');
    const { data: session } = await supabase.auth.getUser();
    const userId = session.user?.id;
    if (!userId) return setMessage('Devi fare login prima di creare il clan.');

    const { error } = await supabase.from('clans').insert({ name, tag, owner_user_id: userId });
    if (error) return setMessage(error.message);
    setMessage('Clan creato. Ora puoi andare in Player e Partite.');
  }

  return (
    <main className="container">
      <section className="card" style={{ maxWidth: 680, margin: '0 auto' }}>
        <h1>Crea il tuo clan</h1>
        <p className="muted">Questa schermata crea il primo clan. Il trigger SQL aggiunge automaticamente il creatore come owner.</p>
        <div className="form">
          <div className="field"><label>Nome clan</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="AK Clan" /></div>
          <div className="field"><label>Tag</label><input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="AK" /></div>
          <button className="btn" onClick={createClan}>Crea clan</button>
          {message && <div className="notice">{message}</div>}
        </div>
      </section>
    </main>
  );
}
