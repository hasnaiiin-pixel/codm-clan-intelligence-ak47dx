'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { roleLabel, useCodmAuth } from '@/lib/authRoles';
import { useLocalNotificationBadge } from '@/lib/clientNotifications';

type NavAudience = 'public' | 'player' | 'write' | 'owner' | 'system';
type NavItem = { href: string; label: string; emoji: string; group: string; audience: NavAudience };

const navItems: NavItem[] = [
  { href: '/', label: 'Home', emoji: '🏠', group: 'Pubblico', audience: 'public' },
  { href: '/dashboard', label: 'Dashboard', emoji: '📊', group: 'Pubblico', audience: 'public' },
  { href: '/matches', label: 'Partite', emoji: '🎮', group: 'Pubblico', audience: 'public' },
  { href: '/players', label: 'Roster', emoji: '👥', group: 'Pubblico', audience: 'public' },
  { href: '/analytics', label: 'Statistiche', emoji: '📈', group: 'Pubblico', audience: 'public' },
  { href: '/clan', label: 'Clan HQ', emoji: '🛡️', group: 'Pubblico', audience: 'public' },
  { href: '/rules', label: 'Regolamento', emoji: '📜', group: 'Pubblico', audience: 'public' },
  { href: '/events', label: 'Eventi', emoji: '📅', group: 'Pubblico', audience: 'public' },
  { href: '/loadouts', label: 'Loadout', emoji: '🔫', group: 'Pubblico', audience: 'public' },
  { href: '/notifications', label: 'Notifiche', emoji: '🔔', group: 'Player', audience: 'player' },
  { href: '/profile', label: 'Mio profilo', emoji: '🪪', group: 'Player', audience: 'player' },
  { href: '/import/profile', label: 'Importa profilo', emoji: '🖼️', group: 'Player', audience: 'player' },
  { href: '/import/match', label: 'Carica risultato', emoji: '🏆', group: 'Staff / Coach', audience: 'write' },
  { href: '/invite', label: 'Inviti', emoji: '📨', group: 'Staff / Coach', audience: 'write' },
  { href: '/calibration', label: 'Calibrazione OCR', emoji: '🎯', group: 'Staff / Coach', audience: 'write' },
  { href: '/admin/users', label: 'Gestione utenti', emoji: '🔐', group: 'Owner', audience: 'owner' },
  { href: '/deploy', label: 'Deploy', emoji: '🚀', group: 'Owner', audience: 'owner' },
  { href: '/ocr-status', label: 'Stato OCR', emoji: '🤖', group: 'Owner', audience: 'owner' },
  { href: '/version', label: 'Versione', emoji: '✅', group: 'Sistema', audience: 'system' },
  { href: '/cache-reset', label: 'Reset cache', emoji: '🧹', group: 'Sistema', audience: 'system' },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const auth = useCodmAuth();
  const [open, setOpen] = useState(false);
  const { count: notificationCount } = useLocalNotificationBadge();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('ak-sidebar-open', open);
    document.body.classList.toggle('ak-sidebar-open', open);
    return () => {
      document.documentElement.classList.remove('ak-sidebar-open');
      document.body.classList.remove('ak-sidebar-open');
    };
  }, [open]);

  const visibleItems = useMemo(() => {
    return navItems.filter((item) => {
      if (item.audience === 'public') return true;
      if (item.audience === 'player') return !!auth.user;
      if (item.audience === 'write') return auth.canWrite;
      if (item.audience === 'owner') return auth.canManageUsers;
      if (item.audience === 'system') return auth.canWrite || auth.canManageUsers;
      return false;
    });
  }, [auth.user, auth.canWrite, auth.canManageUsers]);

  const groups = useMemo(() => {
    const ordered: string[] = [];
    const byGroup = new Map<string, NavItem[]>();
    for (const item of visibleItems) {
      if (!byGroup.has(item.group)) {
        byGroup.set(item.group, []);
        ordered.push(item.group);
      }
      byGroup.get(item.group)!.push(item);
    }
    return ordered.map((group) => ({ group, items: byGroup.get(group)! }));
  }, [visibleItems]);

  return (
    <>
      <button aria-label={open ? 'Chiudi menu AK47DX' : 'Apri menu AK47DX'} onClick={() => setOpen((value) => !value)} className="ak-menu-button">
        {open ? '×' : '☰'}
      </button>
      {open && <button aria-label="Chiudi menu" onClick={() => setOpen(false)} className="ak-sidebar-backdrop" />}
      <aside className={`ak-sidebar ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="ak-sidebar-brand">
          <div>
            <div className="ak-sidebar-title">Clan Manager</div>
            <div className="ak-sidebar-subtitle">CODM AK47DX</div>
          </div>
        </div>

        <div className="ak-sidebar-user-card">
          <span>Accesso corrente</span>
          <strong>{auth.loading ? 'Verifica ruolo...' : roleLabel(auth.role)}</strong>
          {auth.user?.email && <small>{auth.user.email}</small>}
        </div>

        <nav>
          {groups.map(({ group, items }) => <NavGroup key={group} title={group} items={items} pathname={pathname} />)}
          {!auth.user ? (
            <Link href="/login" className="ak-login-link">🔑 Login / Registrati</Link>
          ) : (
            <button type="button" className="ak-login-link ak-logout-button" onClick={() => void auth.signOut()}>🚪 Logout</button>
          )}
        </nav>
      </aside>
      <BottomMobileNav pathname={pathname} canSeeNotifications={!!auth.user} notificationCount={notificationCount} onOpenMenu={() => setOpen(true)} />
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
              <span>{item.emoji}</span><span>{item.label}</span>{item.href === '/notifications' && <NotificationBadge />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}


function NotificationBadge() {
  const { count } = useLocalNotificationBadge();
  if (!count) return null;
  return <b className="ak-nav-badge" aria-label={`${count} notifiche non lette`}>{count > 99 ? '99+' : count}</b>;
}

function BottomMobileNav({ pathname, canSeeNotifications, notificationCount, onOpenMenu }: { pathname: string; canSeeNotifications: boolean; notificationCount: number; onOpenMenu: () => void }) {
  const items = [
    { href: '/', label: 'Home', emoji: '🏠' },
    { href: '/events', label: 'Eventi', emoji: '📅' },
    { href: '/matches', label: 'Partite', emoji: '🎮' },
    { href: canSeeNotifications ? '/notifications' : '/login', label: canSeeNotifications ? 'Notifiche' : 'Login', emoji: canSeeNotifications ? '🔔' : '🔐', badge: notificationCount },
  ];
  return (
    <nav className="ak-bottom-nav" aria-label="Menu mobile rapido">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
            <span>{item.emoji}</span>
            <small>{item.label}</small>
            {!!item.badge && <b>{item.badge > 99 ? '99+' : item.badge}</b>}
          </Link>
        );
      })}
      <button type="button" onClick={onOpenMenu} aria-label="Apri menu completo">
        <span>☰</span>
        <small>Altro</small>
      </button>
    </nav>
  );
}
