export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">CLAN MANAGER</h1>
          <p className="ak-lead">Versione V8.1C: fix client UUID pagina Eventi. Modifica/cancellazione usano UUID validi e conferma server Supabase/Vercel; zero eventi locali PWA.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V8_1C_CLIENT_UUID_DELETE_EDIT_FIX_OK</div>
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
