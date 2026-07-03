const navItems = [
  { href: '/dashboard', icon: '🎮', label: 'Dashboard' },
  { href: '/import/match', icon: '⚡', label: 'Import' },
  { href: '/matches', icon: '🎞️', label: 'Partite' },
  { href: '/players', icon: '🪖', label: 'Giocatori' },
  { href: '/analytics', icon: '📊', label: 'Stats' },
  { href: '/clan', icon: '🐺', label: 'Clan AK47DX' },
  { href: '/invite', icon: '🔗', label: 'Inviti' },
  { href: '/deploy', icon: '🚀', label: 'Deploy' },
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
          <span className="brand-text">AK47DX CLAN INTELLIGENCE 2.0</span>
          <small>Gaming analytics · OCR hybrid · Clan HQ</small>
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
