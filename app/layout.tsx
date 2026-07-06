import './globals.css';
import type { Metadata, Viewport } from 'next';
import { MobileSidebar } from '@/components/MobileSidebar';
import { PwaInstaller } from '@/components/PwaInstaller';

export const metadata: Metadata = {
  title: 'Clan Manager',
  description: 'Clan Manager: eventi, roster, risultati, regolamento e statistiche CODM.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Clan Manager', statusBarStyle: 'black-translucent' }
};

export const viewport: Viewport = {
  themeColor: '#ff2a2a',
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
        <PwaInstaller />
      </body>
    </html>
  );
}
