'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PwaInstaller() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  if (!visible || !installEvent) return null;

  return (
    <div style={styles.wrapper}>
      <span style={styles.text}>Installa AK47DX sul telefono</span>
      <button
        type="button"
        style={styles.install}
        onClick={async () => {
          await installEvent.prompt();
          setVisible(false);
        }}
      >
        Installa
      </button>
      <button type="button" style={styles.close} onClick={() => setVisible(false)} aria-label="Chiudi installazione PWA">
        ×
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'fixed',
    left: 76,
    right: 14,
    bottom: 14,
    zIndex: 9990,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 16,
    background: 'rgba(10,10,16,0.94)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: '#fff',
    boxShadow: '0 16px 34px rgba(0,0,0,0.4)',
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: 800,
  },
  install: {
    border: 0,
    borderRadius: 12,
    padding: '9px 12px',
    background: '#ff2a2a',
    color: '#fff',
    fontWeight: 900,
    cursor: 'pointer',
  },
  close: {
    border: 0,
    background: 'transparent',
    color: '#fff',
    fontSize: 22,
    cursor: 'pointer',
  },
};
