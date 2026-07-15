import './globals.css';
import type { Metadata, Viewport } from 'next';
import { MobileSidebar } from '@/components/MobileSidebar';
import { PwaInstaller } from '@/components/PwaInstaller';
import { GlobalTableSorter } from '@/components/GlobalTableSorter';

export const metadata: Metadata = {
  title: 'CLAN MANAGER',
  description: 'CLAN MANAGER by MIRZA: eventi, roster, calendario, notifiche, risultati e statistiche CODM.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'CLAN MANAGER', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/assets/mirza-app-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/assets/mirza-app-icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/assets/mirza-apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  }
};

export const viewport: Viewport = {
  themeColor: '#05070d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <MobileSidebar />
        <a className="mirza-dev-badge mirza-dev-top" href="/dashboard" aria-label="Sviluppatore MIRZA">
          <img src="/assets/mirza-developer-logo.png" alt="MIRZA developer logo" />
          <span>Developed by <strong>MIRZA</strong></span>
        </a>
        <main className="codm-app-content">{children}</main>
        <footer className="mirza-dev-footer">
          <div className="mirza-dev-footer-inner">
            <img src="/assets/mirza-developer-logo.png" alt="MIRZA developer logo" />
            <span>Clan Manager · sviluppato da <strong>MIRZA</strong></span>
          </div>
        </footer>
        <GlobalTableSorter />
        <PwaInstaller />
      </body>
    </html>
  );
}
