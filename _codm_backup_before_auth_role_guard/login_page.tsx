'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMessage(error.message);
    window.location.href = '/dashboard';
  }

  async function signUp() {
    setLoading(true);
    setMessage('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split('@')[0] },
        emailRedirectTo: `${window.location.origin}/profile-import`
      }
    });
    if (!error && data.user?.id) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        display_name: displayName || email.split('@')[0]
      });
    }
    setLoading(false);
    if (error) return setMessage(error.message);
    setMessage('Account creato. Se Supabase richiede conferma, controlla la email. Dopo il login importa il profilo CODM e attendi approvazione admin.');
  }

  return (
    <main className="page-shell login-page">
      <section className="login-card">
        <p className="eyebrow">AK47DX accesso</p>
        <h1>{mode === 'login' ? 'Login staff / player' : 'Registrazione player'}</h1>
        <p className="muted">
          La dashboard è pubblica in sola lettura. Per modificare dati serve un ruolo assegnato da admin.
        </p>

        <div className="mode-switch">
          <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => setMode('login')}>Entra</button>
          <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => setMode('register')}>Registrati</button>
        </div>

        {mode === 'register' && (
          <label>
            Nome visualizzato
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Es. MIRZA" />
          </label>
        )}

        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="player@email.com" autoComplete="email" />
        </label>

        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimo 6 caratteri" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>

        <button className="btn full" disabled={loading || !email || !password} onClick={mode === 'login' ? signIn : signUp}>
          {loading ? 'Attendere...' : mode === 'login' ? 'Entra' : 'Crea account'}
        </button>

        {message && <div className="notice top-gap">{message}</div>}

        <div className="login-help">
          <strong>Flusso player semplice:</strong>
          <ol>
            <li>Il player si registra con email.</li>
            <li>Importa profilo CODM da /profile-import.</li>
            <li>Admin approva e assegna ruolo da /admin/users.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
