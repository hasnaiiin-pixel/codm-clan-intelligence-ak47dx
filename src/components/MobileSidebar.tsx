'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type NavItem = { href: string; label: string; emoji: string; group: 'public' | 'player' | 'admin' | 'system' };

const navItems: NavItem[] = [
  { href: '/', label: 'Home', emoji: '🏠', group: 'public' },
  { href: '/dashboard', label: 'Dashboard', emoji: '📊', group: 'public' },
  { href: '/matches', label: 'Partite', emoji: '🎮', group: 'public' },
  { href: '/players', label: 'Roster', emoji: '👥', group: 'public' },
  { href: '/analytics', label: 'Statistiche', emoji: '📈', group: 'public' },
  { href: '/clan', label: 'Clan HQ', emoji: '🛡️', group: 'public' },
  { href: '/events', label: 'Eventi', emoji: '📅', group: 'public' },
  { href: '/loadouts', label: 'Loadout', emoji: '🔫', group: 'public' },
  { href: '/join', label: 'Entra nel clan', emoji: '➕', group: 'player' },
  { href: '/profile-import', label: 'Profilo player', emoji: '🪪', group: 'player' },
  { href: '/import/profile', label: 'Importa profilo', emoji: '🖼️', group: 'player' },
  { href: '/import/match', label: 'Carica risultato', emoji: '🏆', group: 'admin' },
  { href: '/invite', label: 'Inviti', emoji: '📨', group: 'admin' },
  { href: '/admin/users', label: 'Gestione utenti', emoji: '🔐', group: 'admin' },
  { href: '/calibration', label: 'Calibrazione OCR', emoji: '🎯', group: 'admin' },
  { href: '/deploy', label: 'Deploy', emoji: '🚀', group: 'admin' },
  { href: '/ocr-status', label: 'Stato OCR', emoji: '🤖', group: 'system' },
  { href: '/version', label: 'Versione', emoji: '✅', group: 'system' },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button aria-label="Apri menu AK47DX" onClick={() => setOpen((value) => !value)} className="ak-menu-button">
        {open ? '×' : '☰'}
      </button>
      {open && <button aria-label="Chiudi menu" onClick={() => setOpen(false)} className="ak-sidebar-backdrop" />}
      <aside className={`ak-sidebar ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="ak-sidebar-brand">
          <div className="ak-sidebar-title">AK47DX</div>
          <div className="ak-sidebar-subtitle">CODM Intelligence</div>
        </div>
        <nav>
          <NavGroup title="Pubblico" items={navItems.filter((x) => x.group === 'public')} pathname={pathname} />
          <NavGroup title="Player" items={navItems.filter((x) => x.group === 'player')} pathname={pathname} />
          <NavGroup title="Admin" items={navItems.filter((x) => x.group === 'admin')} pathname={pathname} />
          <NavGroup title="Sistema" items={navItems.filter((x) => x.group === 'system')} pathname={pathname} />
          <Link href="/login" className="ak-login-link">🔑 Login / Registrati</Link>
        </nav>
      </aside>
    </>
  );
}

function NavGroup({ title, items, pathname }: { title: string; items: NavItem[]; pathname: string }) {
  return (
    <div className="ak-sidebar-group">
      <div className="ak-sidebar-group-title">{title}</div>
      <div className="ak-sidebar-links">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`ak-sidebar-link ${active ? 'active' : ''}`}>
              <span>{item.emoji}</span><span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
