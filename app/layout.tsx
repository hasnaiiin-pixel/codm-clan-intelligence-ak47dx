import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/Header';
import { PwaInstaller } from '@/components/PwaInstaller';

export const metadata: Metadata = {
  title: 'CODM Clan Intelligence',
  description: 'AK47DX Clan Intelligence 2.0: app gaming PWA con OCR, inviti player, clan analytics e dataset YOLO-ready.',
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
        <div className="page-shell">
          <Header />
          <PwaInstaller />
          {children}
        </div>
      </body>
    </html>
  );
}
