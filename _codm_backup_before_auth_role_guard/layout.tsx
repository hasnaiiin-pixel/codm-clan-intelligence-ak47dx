import './globals.css';
import type { Metadata, Viewport } from 'next';
import { MobileSidebar } from '@/components/MobileSidebar';
import { PwaInstaller } from '@/components/PwaInstaller';

export const metadata: Metadata = {
  title: 'CODM Clan Intelligence',
  description: 'AK47DX Clan Intelligence: dashboard pubblica, login player, ruoli admin/staff e import risultati CODM.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'AK47DX', statusBarStyle: 'black-translucent' }
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
        <main className="codm-app-content">{children}</main>
        <PwaInstaller />
      </body>
    </html>
  );
}
