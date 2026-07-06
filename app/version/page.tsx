export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">AK47DX DEPLOY CHECK</div>
          <h1 className="ak-title">CODM Clan Intelligence</h1>
          <p className="ak-lead">Versione V6.3: planner eventi con cover/loghi caricabili, partite aggiungi/togli, template telefono+nome corretto, profilo con statistiche e home con eventi futuri.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V6_3_EVENT_PLANNER_TEMPLATE_FIX_OK</div>
          <div className="notice top-gap"><strong>Backend OCR consigliato:</strong> 2.0.10-v5-4-fastlane-import-stabile-ak47dx</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
            <a href="/calibration">Calibrazione</a>
            <a href="/import/match">Import partite</a>
            <a href="/import/profile">Import profilo</a>
            <a href="/profile">Profilo</a>
            <a href="/events">Eventi</a>
          </div>
        </div>
      </section>
    </main>
  );
}
