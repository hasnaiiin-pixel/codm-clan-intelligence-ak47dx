export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">CLAN MANAGER</h1>
          <p className="ak-lead">Release completa V9.0: Home pulita, menu semplificato, Torneo, import risultati da tabella, template OCR, gestione utenti e layout professionale.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V9_0_COMPLETE_PRO_TOURNAMENT_IMPORT_UI_OK</div>
          <div className="notice top-gap"><strong>Torneo:</strong> dashboard, gestione, squadre/player, regolamento, classifica/tabellone, partite e archivio.</div>
          <div className="notice top-gap"><strong>Import:</strong> risultato da screenshot o tabella, mappe/modalità CODM, modifica partite salvate e niente messaggi debug per utenti.</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
            <a href="/events-health">Health eventi</a>
            <a href="/events">Eventi</a>
            <a href="/tournament">Torneo</a>
            <a href="/calibration">Calibrazione</a>
            <a href="/import/match">Import partite</a>
          </div>
        </div>
      </section>
    </main>
  );
}
