'use client';

import { useEffect, useMemo, useState } from 'react';
import { requestCodmNotificationPermission, setCodmAppBadge, useLocalNotificationBadge } from '@/lib/clientNotifications';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function isiOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function canUseNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function PwaInstaller() {
  const { count } = useLocalNotificationBadge();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [notificationState, setNotificationState] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [swReady, setSwReady] = useState(false);

  const isIOS = useMemo(() => isiOSDevice(), []);

  useEffect(() => {
    setStandalone(isStandaloneMode());
    if (canUseNotifications()) setNotificationState(Notification.permission as 'default' | 'granted' | 'denied');
    else setNotificationState('unsupported');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(async (registration) => {
          setSwReady(true);
          registration.update().catch(() => undefined);
          await navigator.serviceWorker.ready.catch(() => undefined);
        })
        .catch(() => setSwReady(false));
    }
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setShowInstallHelp(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    void setCodmAppBadge(count);
  }, [count]);

  if (standalone) {
    return <div className="pwa-status-chip" aria-label="PWA installata">📱 PWA attiva{count > 0 ? <b>{count}</b> : null}</div>;
  }

  const showIOSHelp = isIOS && showInstallHelp;
  const showAndroidInstall = !!installEvent && showInstallHelp;

  if (!showIOSHelp && !showAndroidInstall) {
    return (
      <button type="button" className="pwa-mini-install" onClick={() => setShowInstallHelp(true)}>
        📲 Installa app
      </button>
    );
  }

  return (
    <div className="pwa-install-panel" role="status" aria-live="polite">
      <div>
        <strong>Installa CODM sul telefono</strong>
        {showIOSHelp ? (
          <p>Su iPhone: Safari → Condividi → <b>Aggiungi a schermata Home</b>. Dopo installazione l’icona MIRZA si apre come app.</p>
        ) : (
          <p>Android/Chrome: installa la PWA con icona MIRZA. Service worker: {swReady ? 'attivo' : 'in verifica'}.</p>
        )}
        <small>Badge notifiche: {count > 0 ? `${count} non lette` : 'nessuna non letta'}</small>
      </div>
      <div className="pwa-install-actions">
        {showAndroidInstall && (
          <button
            type="button"
            className="btn small"
            onClick={async () => {
              await installEvent.prompt();
              setShowInstallHelp(false);
            }}
          >
            Installa
          </button>
        )}
        {notificationState === 'default' && (
          <button
            type="button"
            className="btn small secondary"
            onClick={async () => {
              const result = await requestCodmNotificationPermission();
              setNotificationState(result === 'unsupported' ? 'unsupported' : result as 'default' | 'granted' | 'denied');
            }}
          >
            Attiva notifiche
          </button>
        )}
        <button type="button" className="pwa-close" onClick={() => setShowInstallHelp(false)} aria-label="Chiudi installazione PWA">×</button>
      </div>
    </div>
  );
}
