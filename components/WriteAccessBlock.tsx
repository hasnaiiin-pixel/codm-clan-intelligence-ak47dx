'use client';

import { roleLabel, type CodmRole } from '@/lib/authRoles';

export function WriteAccessBlock({
  role = 'anon',
  title = 'Accesso modifiche bloccato',
  description = 'Puoi vedere la dashboard pubblica, ma per caricare risultati, modificare roster, descrizione clan o cancellare dati serve un ruolo autorizzato.',
  loading = false
}: {
  role?: CodmRole;
  title?: string;
  description?: string;
  loading?: boolean;
}) {
  return (
    <main className="page-shell auth-block-page">
      <section className="codm-auth-block">
        <div className="auth-lock-icon">🔒</div>
        <p className="eyebrow">AK47DX sicurezza</p>
        <h1>{loading ? 'Controllo permessi...' : title}</h1>
        <p>{loading ? 'Verifico sessione e ruolo utente.' : description}</p>
        {!loading && <p className="muted">Ruolo attuale: <strong>{roleLabel(role)}</strong></p>}
        <div className="auth-block-actions">
          <a className="btn" href="/login">Login / Registrazione</a>
          <a className="btn secondary" href="/dashboard">Dashboard pubblica</a>
        </div>
        <div className="notice top-gap">
          Solo <strong>Owner</strong>, <strong>Coach</strong> e <strong>Staff</strong> possono salvare dati. I player registrati possono inviare profilo/richiesta, ma non modificare risultati.
        </div>
      </section>
    </main>
  );
}
