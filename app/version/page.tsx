export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">Clan Manager</h1>
          <p className="ak-lead">Versione V7.6 DATABASE ONLY EVENTS FINAL: eventi letti, creati, aggiornati e cancellati solo dal database Supabase tramite API server. La PWA elimina i vecchi eventi locali e non fa più merge con localStorage.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V7_6_DATABASE_ONLY_EVENTS_OK</div>
          <div className="notice top-gap"><strong>Admin principale:</strong> hasnaiiin@gmail.com</div>
          <div className="notice top-gap"><strong>Eventi:</strong> database unico public.codm_events · niente eventi locali PWA · niente cache eventi locale</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
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
