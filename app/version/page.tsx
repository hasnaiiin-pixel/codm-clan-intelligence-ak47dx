export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">CLAN MANAGER</h1>
          <p className="ak-lead">Versione V8.2E: fix cache PWA, risultato partita attivo, punteggio player escluso, dashboard pulita ed eventi scaduti tra precedenti.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V8_2E_PWA_CACHE_RESULT_SCORE_TEMPLATE_DASHBOARD_FIX_OK</div>
          <div className="notice top-gap"><strong>Import:</strong> risultato partita attivo; esclusi Vittoria, riquadri grandi team, Impatto e punteggio player. Nick e K/D/A restano attivi.</div>
          <div className="notice top-gap"><strong>Dashboard/Eventi:</strong> home pulita · evento passa nei precedenti quando termina l'orario.</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
            <a href="/events-health">Health eventi</a>
            <a href="/events">Eventi</a>
            <a href="/calibration">Calibrazione</a>
            <a href="/import/match">Import partite</a>
          </div>
        </div>
      </section>
    </main>
  );
}
