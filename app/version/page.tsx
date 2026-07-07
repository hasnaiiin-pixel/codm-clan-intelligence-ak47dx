export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">CLAN MANAGER</h1>
          <p className="ak-lead">Versione V8.2A: Telegram professionale, reminder selezionabili, messaggio evento iniziato, template/calibrazione/import più coerenti e layout eventi compatto.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V8_2A_HOBBY_CRON_EXTERNAL_OK</div>
          <div className="notice top-gap"><strong>Eventi:</strong> public.codm_events via API Vercel unica · service role obbligatoria · zero eventi locali PWA</div>
          <div className="notice top-gap"><strong>Telegram:</strong> riepilogo completo evento, partite, BAN, titolari/riserve, reminder cron e messaggio evento iniziato</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
            <a href="/events-health">Health eventi</a>
            <a href="/events">Eventi</a>
            <a href="/calibration">Calibrazione</a>
            <a href="/import/match">Import partite</a>
            <a href="/admin/users">Utenti e permessi</a>
          </div>
        </div>
      </section>
    </main>
  );
}
