'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  emoji: string;
  group: 'public' | 'player' | 'admin';
};

const navItems: NavItem[] = [
  { href: '/', label: 'Home', emoji: '🏠', group: 'public' },
  { href: '/dashboard', label: 'Dashboard', emoji: '📊', group: 'public' },
  { href: '/matches', label: 'Partite', emoji: '🎮', group: 'public' },
  { href: '/players', label: 'Roster', emoji: '👥', group: 'public' },
  { href: '/analytics', label: 'Statistiche', emoji: '📈', group: 'public' },
  { href: '/clan', label: 'Clan HQ', emoji: '🛡️', group: 'public' },
  { href: '/loadouts', label: 'Loadout', emoji: '🔫', group: 'public' },
  { href: '/join', label: 'Entra nel clan', emoji: '➕', group: 'player' },
  { href: '/import/profile', label: 'Importa profilo', emoji: '🪪', group: 'player' },
  { href: '/import/match', label: 'Carica risultato', emoji: '📸', group: 'admin' },
  { href: '/invite', label: 'Inviti', emoji: '🔗', group: 'admin' },
  { href: '/admin/users', label: 'Gestione utenti', emoji: '🔐', group: 'admin' },
  { href: '/calibration', label: 'Calibrazione OCR', emoji: '🎯', group: 'admin' },
  { href: '/deploy', label: 'Deploy', emoji: '🚀', group: 'admin' },
  { href: '/version', label: 'Versione', emoji: '✅', group: 'public' },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const grouped = {
    public: navItems.filter((item) => item.group === 'public'),
    player: navItems.filter((item) => item.group === 'player'),
    admin: navItems.filter((item) => item.group === 'admin'),
  };

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Chiudi menu AK47DX' : 'Apri menu AK47DX'}
        onClick={() => setOpen((value) => !value)}
        style={styles.floatingButton}
      >
        {open ? '×' : '☰'}
      </button>

      {open && <button type="button" aria-label="Chiudi menu" onClick={() => setOpen(false)} style={styles.backdrop} />}

      <aside style={{ ...styles.sidebar, transform: open ? 'translateX(0)' : 'translateX(-110%)' }}>
        <div style={styles.header}>
          <div>
            <div style={styles.brand}>AK47DX</div>
            <div style={styles.subtitle}>CODM Clan Intelligence</div>
          </div>
          <button type="button" aria-label="Chiudi menu" onClick={() => setOpen(false)} style={styles.closeButton}>
            ×
          </button>
        </div>

        <NavGroup title="Pubblico" items={grouped.public} pathname={pathname} />
        <NavGroup title="Player" items={grouped.player} pathname={pathname} />
        <NavGroup title="Admin / Staff" items={grouped.admin} pathname={pathname} />

        <div style={styles.footer}>
          <Link href="/login" style={styles.loginButton}>
            🔑 Login / Registrati
          </Link>
        </div>
      </aside>
    </>
  );
}

function NavGroup({ title, items, pathname }: { title: string; items: NavItem[]; pathname: string }) {
  return (
    <section style={styles.group}>
      <div style={styles.groupTitle}>{title}</div>
      <div style={styles.linkList}>
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} style={{ ...styles.link, ...(active ? styles.activeLink : {}) }}>
              <span style={styles.emoji}>{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  floatingButton: {
    position: 'fixed',
    left: 14,
    top: 14,
    zIndex: 10020,
    width: 48,
    height: 48,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'linear-gradient(135deg, rgba(255,42,42,0.95), rgba(20,20,30,0.95))',
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 900,
    boxShadow: '0 14px 35px rgba(0,0,0,0.45)',
    cursor: 'pointer',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    border: 0,
    background: 'rgba(0,0,0,0.58)',
    cursor: 'pointer',
  },
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10010,
    width: 'min(86vw, 360px)',
    padding: '20px 16px',
    overflowY: 'auto',
    background: 'linear-gradient(180deg, #080911 0%, #12121b 55%, #09090e 100%)',
    color: '#ffffff',
    boxShadow: '20px 0 55px rgba(0,0,0,0.55)',
    transition: 'transform 180ms ease',
    borderRight: '1px solid rgba(255,255,255,0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 4px 18px',
    marginBottom: 10,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  brand: {
    fontSize: 24,
    fontWeight: 1000,
    letterSpacing: 1.4,
    color: '#ff3434',
    textShadow: '0 0 18px rgba(255,42,42,0.5)',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255,255,255,0.68)',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: 24,
    cursor: 'pointer',
  },
  group: {
    margin: '16px 0',
  },
  groupTitle: {
    margin: '0 0 8px 6px',
    fontSize: 11,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.46)',
  },
  linkList: {
    display: 'grid',
    gap: 8,
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 12px',
    borderRadius: 14,
    color: 'rgba(255,255,255,0.86)',
    textDecoration: 'none',
    background: 'rgba(255,255,255,0.055)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontWeight: 750,
  },
  activeLink: {
    background: 'rgba(255,42,42,0.18)',
    border: '1px solid rgba(255,42,42,0.42)',
    color: '#ffffff',
  },
  emoji: {
    width: 24,
    textAlign: 'center',
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  loginButton: {
    display: 'block',
    padding: '13px 14px',
    borderRadius: 14,
    color: '#ffffff',
    textDecoration: 'none',
    textAlign: 'center',
    fontWeight: 900,
    background: 'linear-gradient(135deg, rgba(255,42,42,0.95), rgba(255,130,42,0.8))',
    boxShadow: '0 12px 28px rgba(255,42,42,0.22)',
  },
};
