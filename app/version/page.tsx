export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">Clan Manager</h1>
          <p className="ak-lead">Versione V7.4 PWA Mobile Event Form Sync: service worker network-first, cache PWA vecchia eliminata, form evento mobile stabile, Team A/Team B salvati correttamente e sync eventi condivisi via API server.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V7_4_PWA_MOBILE_EVENT_FORM_SYNC_OK</div>
          <div className="notice top-gap"><strong>Admin principale:</strong> hasnaiiin@gmail.com</div>
          <div className="notice top-gap"><strong>Icona telefono:</strong> MIRZA · manifest PWA completo · badge notifiche</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
            <a href="/clan">Clan HQ</a>
            <a href="/admin/users">Utenti e permessi</a>
            <a href="/rules">Regolamento</a>
            <a href="/import/match">Import partite</a>
            <a href="/profile">Mio profilo</a>
            <a href="/events">Eventi</a>
          </div>
        </div>
      </section>
    </main>
  );
}
