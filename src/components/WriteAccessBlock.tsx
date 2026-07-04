'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { roleLabel, type CodmRole } from '@/lib/authRoles';

type Props = {
  loading?: boolean;
  role?: CodmRole | string | null;
  title?: string;
  description?: string;
  children?: ReactNode;
};

export function WriteAccessBlock({
  loading = false,
  role = 'anon',
  title = 'Accesso modifica bloccato',
  description = 'Puoi visualizzare la dashboard pubblica, ma per caricare risultati o modificare dati serve un ruolo autorizzato: Staff, Coach o Owner.',
  children,
}: Props) {
  if (loading) {
    return (
      <main className="codm-page-shell">
        <section className="codm-access-card">
          <div className="codm-access-icon">⏳</div>
          <h1>Controllo permessi...</h1>
          <p>Sto verificando il tuo login e il livello di accesso.</p>
        </section>
      </main>
    );
  }

  const safeRole = String(role || 'anon') as CodmRole;

  return (
    <main className="codm-page-shell">
      <section className="codm-access-card">
        <div className="codm-access-icon">🔒</div>
        <p className="codm-kicker">AK47DX Clan Intelligence</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <p className="codm-role-line">
          Ruolo attuale: <strong>{roleLabel(safeRole)}</strong>
        </p>
        {children}
        <div className="codm-access-actions">
          <Link href="/dashboard" className="codm-btn secondary">Dashboard pubblica</Link>
          <Link href="/login" className="codm-btn primary">Login / Registrati</Link>
        </div>
      </section>
    </main>
  );
}

export default WriteAccessBlock;
