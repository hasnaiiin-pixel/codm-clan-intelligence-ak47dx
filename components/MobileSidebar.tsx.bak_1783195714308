'use client';

import { useState } from 'react';
import { roleLabel, useCodmAuth } from '@/lib/authRoles';

const publicLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/matches', label: 'Partite', icon: '🎮' },
  { href: '/players', label: 'Roster', icon: '👥' },
  { href: '/analytics', label: 'Statistiche', icon: '📈' },
  { href: '/clan', label: 'Clan HQ', icon: '🏰' },
];

const staffLinks = [
  { href: '/import/match', label: 'Carica risultati', icon: '⚡' },
  { href: '/invite', label: 'Inviti', icon: '🔗' },
  { href: '/loadouts', label: 'Loadout', icon: '🔫' },
  { href: '/calibration', label: 'Calibrazione', icon: '🎯' },
  { href: '/yolo', label: 'Dataset OCR/YOLO', icon: '🤖' },
];

const profileLinks = [
  { href: '/profile-import', label: 'Importa profilo', icon: '🪪' },
  { href: '/join', label: 'Richiedi accesso', icon: '📝' },
];

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const auth = useCodmAuth();

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="mobile-sidebar-tab"
        aria-label="Apri menu AK47DX"
        onClick={() => setOpen(true)}
      >
        ☰
      </button>
      {open && <button type="button" aria-label="Chiudi menu" className="sidebar-backdrop" onClick={close} />}
      <aside className={`mobile-sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">AK</div>
          <div>
            <strong>AK47DX</strong>
            <span>Clan Intelligence</span>
          </div>
          <button type="button" className="sidebar-close" onClick={close}>×</button>
        </div>

        <div className="sidebar-user-card">
          <span>{auth.user?.email || 'Visitatore pubblico'}</span>
          <strong>{auth.loading ? 'Controllo...' : roleLabel(auth.role)}</strong>
        </div>

        <nav className="sidebar-nav" onClick={close}>
          <p>Pubblico</p>
          {publicLinks.map((item) => <a key={item.href} href={item.href}><span>{item.icon}</span>{item.label}</a>)}

          <p>Profilo player</p>
          {profileLinks.map((item) => <a key={item.href} href={item.href}><span>{item.icon}</span>{item.label}</a>)}

          {auth.canWrite && (
            <>
              <p>Staff / Admin</p>
              {staffLinks.map((item) => <a key={item.href} href={item.href}><span>{item.icon}</span>{item.label}</a>)}
            </>
          )}

          {auth.canManageUsers && (
            <>
              <p>Owner</p>
              <a href="/admin/users"><span>🛡️</span>Utenti e permessi</a>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {auth.user ? (
            <button type="button" className="btn secondary full" onClick={() => void auth.signOut()}>Logout</button>
          ) : (
            <a className="btn full" href="/login" onClick={close}>Login / Registrati</a>
          )}
        </div>
      </aside>
    </>
  );
}
