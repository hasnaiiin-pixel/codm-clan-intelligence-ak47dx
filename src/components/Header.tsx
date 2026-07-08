const navItems = [
  { href: '/import/match', icon: '⚡', label: 'Import' },
  { href: '/matches', icon: '🎞️', label: 'Partite' },
  { href: '/players', icon: '🪖', label: 'Giocatori' },
  { href: '/tournament', icon: '🏆', label: 'Torneo' },
  { href: '/analytics', icon: '📊', label: 'Stats' },
  { href: '/clan', icon: '🐺', label: 'Clan HQ' },
  { href: '/invite', icon: '🔗', label: 'Inviti' },
  { href: '/yolo', icon: '🧬', label: 'Dataset' },
  { href: '/import/profile', icon: '🪪', label: 'Profili' },
  { href: '/calibration', icon: '🎯', label: 'OCR 2.0' },
  { href: '/login', icon: '🔐', label: 'Login' }
];

export function Header() {
  return (
    <header className="header codm-topbar">
      <a className="brand ak-brand" href="/dashboard">
        <span className="logo-mark ak-logo-mark"><img src="/assets/ak47dx-logo.jpeg" alt="AK47DX logo" /></span>
        <span className="brand-copy">
          <span className="brand-text">CLAN MANAGER</span>
          <small>Eventi · Giocatori · Tornei · Risultati</small>
        </span>
      </a>
      <nav className="nav gaming-nav" aria-label="Menu principale">
        {navItems.map((item) => (
          <a href={item.href} key={item.href} className="nav-link gaming-nav-link">
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </header>
  );
}
