export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">Clan Manager</h1>
          <p className="ak-lead">Versione V8.0 SINGLE DATABASE EVENTS FINAL: eventi centralizzati solo via Vercel API + Supabase service role. Nessun evento locale, nessun clan_id dal client, nessun fallback RLS per eventi.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V8_0_SINGLE_DATABASE_EVENTS_OK</div>
          <div className="notice top-gap"><strong>Admin principale:</strong> hasnaiiin@gmail.com</div>
          <div className="notice top-gap"><strong>Eventi:</strong> public.codm_events via API server unica · service role obbligatoria · browser e PWA stesso endpoint</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
            <a href="/events-health">Health eventi</a>
            <a href="/clan">Clan HQ</a>
            <a href="/admin/users">Utenti e permessi</a>
            <a href="/rules">Regolamento</a>
            <a href="/import/match">Import partite</a>
            <a href="/import/profile">Import giocatori</a>
            <a href="/profile">Mio profilo</a>
            <a href="/events">Eventi</a>
          </div>
        </div>
      </section>
    </main>
  );
}
