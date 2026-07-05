'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

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

function getAppUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && envUrl.startsWith('http')) return envUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (!email.trim() || password.length < 6) return false;
    if (mode === 'register' && (!displayName.trim() || !nickname.trim())) return false;
    return true;
  }, [loading, email, password, mode, displayName, nickname]);

  async function signIn() {
    if (!canSubmit) return;
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) throw error;
      setMessage('Login riuscito. Apertura dashboard...');
      window.location.href = '/dashboard';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore login. Controlla email e password.');
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    if (!canSubmit) return;
    setLoading(true);
    setMessage('');
    try {
      const appUrl = getAppUrl();
      const emailRedirectTo = `${appUrl}/auth/callback?next=/profile-import`;
      const clan = await getFirstClan().catch(() => null);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo,
          data: {
            display_name: displayName.trim(),
            player_nickname: nickname.trim(),
            codm_uid: uid.trim() || null,
            preferred_clan_id: clan?.id || null,
            preferred_clan_tag: clan?.tag || clan?.name || 'AK47DX'
          }
        }
      });

      if (error) throw error;

      if (data.session) {
        setMessage('Registrazione completata. Ti porto al profilo CODM.');
        window.location.href = '/profile-import';
        return;
      }

      setMessage('Registrazione inviata. Controlla la tua email, conferma account e poi torna nella app. Il tuo profilo sarà visibile in Gestione utenti.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore registrazione. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">AK47DX Clan Intelligence</div>
          <h1 className="ak-title">Accesso player e staff</h1>
          <p className="ak-lead">
            La dashboard resta pubblica in sola lettura. Registrazione, profilo CODM, eventi, upload risultati e modifiche sono gestiti con ruoli approvati da admin.
          </p>

          <div className="ak-mode-switch" role="tablist" aria-label="Selezione modalità accesso">
            <button type="button" onClick={() => setMode('login')} className={mode === 'login' ? 'active' : ''}>Login</button>
            <button type="button" onClick={() => setMode('register')} className={mode === 'register' ? 'active' : ''}>Registrati</button>
          </div>

          <div className="ak-form">
            {mode === 'register' && (
              <>
                <label className="ak-field">
                  Nome
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="ak-input" placeholder="Es. Hasnain Mirza" />
                </label>
                <label className="ak-field">
                  Nome giocatore CODM
                  <input value={nickname} onChange={(e) => setNickname(e.target.value)} className="ak-input" placeholder="Es. AKঐMIRZA" />
                </label>
                <label className="ak-field">
                  UID CODM opzionale
                  <input value={uid} onChange={(e) => setUid(e.target.value)} className="ak-input" placeholder="UID se disponibile" />
                </label>
              </>
            )}

            <label className="ak-field">
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="ak-input" placeholder="player@email.com" />
            </label>
            <label className="ak-field">
              Password
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="ak-input" placeholder="Minimo 6 caratteri" />
            </label>

            <button type="button" disabled={!canSubmit} onClick={mode === 'login' ? signIn : signUp} className="ak-submit">
              {loading ? 'Attendere...' : mode === 'login' ? 'Entra nella app' : 'Crea account player'}
            </button>
          </div>

          {message && <div className="ak-message">{message}</div>}

          <div className="ak-quick-links">
            <Link href="/dashboard">Dashboard pubblica</Link>
            <Link href="/events">Calendario eventi</Link>
            <Link href="/ocr-status">Stato OCR</Link>
          </div>
        </div>

        <aside className="ak-info-card">
          <h2>Flusso corretto</h2>
          <ol className="ak-flow">
            <li><b>1.</b> Il player si registra con email, nome e nickname CODM.</li>
            <li><b>2.</b> Dopo conferma email, viene aperta la app su <b>/profile-import</b>.</li>
            <li><b>3.</b> Il player è subito visibile in <b>/admin/users</b> come pending.</li>
            <li><b>4.</b> Tu assegni ruolo: viewer, player, staff, coach oppure owner.</li>
          </ol>
          <div className="ak-warning">
            Se la grafica sembra ancora vecchia, apri <b>/cache-reset</b>, premi reset cache e ricarica la pagina.
          </div>
        </aside>
      </section>
    </main>
  );
}
