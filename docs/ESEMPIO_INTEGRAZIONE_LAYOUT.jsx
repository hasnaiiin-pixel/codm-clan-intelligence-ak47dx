import React, { useEffect, useState } from 'react';
import MobileBottomNav from '../src/components/mobile/MobileBottomNav';
import CreateEventModal from '../src/components/events/CreateEventModal';
import { useCodmMobile } from '../src/hooks/useCodmMobile';
import { retryPendingCodmEvents } from '../src/services/codmEventRepository';
import { registerCodmServiceWorker } from '../src/pwa/registerCodmServiceWorker';
import '../src/styles/codm-pwa-clean.css';

export default function CodmLayoutExample({ supabase }) {
  const { isPwaMobile } = useCodmMobile();
  const [page, setPage] = useState('home');
  const [createEventOpen, setCreateEventOpen] = useState(false);

  useEffect(() => {
    registerCodmServiceWorker();
    const retry = () => retryPendingCodmEvents({ supabase, tableName: 'events' });
    window.addEventListener('online', retry);
    retry();
    return () => window.removeEventListener('online', retry);
  }, [supabase]);

  return (
    <div className="codm-app-shell">
      <header className={isPwaMobile ? 'codm-desktop-header-menu' : ''}>
        {/* qui resta il tuo header desktop con hamburger/tre linee */}
      </header>

      <main>
        {page === 'home' && <div>Home</div>}
        {page === 'events' && <button onClick={() => setCreateEventOpen(true)}>Crea evento</button>}
        {page === 'calendar' && <div>Calendario</div>}
        {page === 'statistics' && <div>Statistiche</div>}
        {page === 'more' && <div>Altro</div>}
      </main>

      {isPwaMobile && (
        <MobileBottomNav
          activeKey={page}
          unreadCount={0}
          onNavigate={(key) => setPage(key)}
        />
      )}

      <CreateEventModal
        open={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
        supabase={supabase}
        tableName="events"
      />
    </div>
  );
}
