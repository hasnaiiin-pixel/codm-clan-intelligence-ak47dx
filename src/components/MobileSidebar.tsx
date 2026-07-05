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
      <button aria-label="Apri menu" onClick={() => setOpen((value) => !value)} className="fixed left-3 top-3 z-50 rounded-2xl border border-cyan-300/30 bg-slate-950/90 px-4 py-3 text-2xl font-black text-cyan-200 shadow-xl shadow-cyan-950/40 backdrop-blur md:left-5 md:top-5">
        {open ? '×' : '☰'}
      </button>
      {open && <button aria-label="Chiudi menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />}
      <aside className={`fixed left-0 top-0 z-50 h-screen w-[86vw] max-w-sm transform border-r border-cyan-400/20 bg-slate-950 p-5 pt-20 text-white shadow-2xl shadow-cyan-950/60 transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-5">
          <div className="text-2xl font-black text-cyan-200">AK47DX</div>
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">CODM Intelligence</div>
        </div>
        <nav className="h-[calc(100vh-9rem)] overflow-y-auto pr-1">
          <NavGroup title="Pubblico" items={navItems.filter((x) => x.group === 'public')} pathname={pathname} />
          <NavGroup title="Player" items={navItems.filter((x) => x.group === 'player')} pathname={pathname} />
          <NavGroup title="Admin" items={navItems.filter((x) => x.group === 'admin')} pathname={pathname} />
          <NavGroup title="Sistema" items={navItems.filter((x) => x.group === 'system')} pathname={pathname} />
          <Link href="/login" className="mt-4 flex rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 font-black text-cyan-100">🔑 Login / Registrati</Link>
        </nav>
      </aside>
    </>
  );
}

function NavGroup({ title, items, pathname }: { title: string; items: NavItem[]; pathname: string }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500">{title}</div>
      <div className="grid gap-2">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-cyan-400 text-slate-950' : 'bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'}`}>
              <span className="mr-2">{item.emoji}</span>{item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
