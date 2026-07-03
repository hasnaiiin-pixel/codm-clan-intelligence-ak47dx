'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMessage(error.message);
    window.location.href = '/dashboard';
  }

  async function signUp() {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    setMessage(error ? error.message : 'Account creato. Controlla email se Supabase richiede conferma.');
  }

  return (
    <main className="container">
      <section className="card" style={{ maxWidth: 540, margin: '0 auto' }}>
        <h1>Login</h1>
        <p className="muted">Accesso cloud tramite Supabase Auth. Prima crea il progetto Supabase e compila .env.local.</p>
        <div className="form">
          <div className="field">
            <label>Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@clan.it" />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimo 6 caratteri" />
          </div>
          <button className="btn" onClick={signIn} disabled={loading}>Entra</button>
          <button className="btn secondary" onClick={signUp} disabled={loading}>Crea account</button>
          {message && <div className="notice">{message}</div>}
        </div>
      </section>
    </main>
  );
}
