export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">AK47DX DEPLOY CHECK</div>
          <h1 className="ak-title">CODM Clan Intelligence</h1>
          <p className="ak-lead">Versione V6.2: home clan con riepilogo reale, eventi match card con roster/round, template telefono+nome corretti, profilo esteso, OCR status solo admin e import partite stabile mantenuto.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V6_2_HOME_EVENTI_TEMPLATE_PROFILO_OK</div>
          <div className="notice top-gap"><strong>Backend OCR consigliato:</strong> 2.0.10-v5-4-fastlane-import-stabile-ak47dx</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
            <a href="/calibration">Calibrazione</a>
            <a href="/import/match">Import partite</a>
            <a href="/import/profile">Import profilo</a>
            <a href="/profile">Profilo</a>
            <a href="/events">Eventi</a>
            <a href="/ocr-status">OCR Status</a>
          </div>
        </div>
      </section>
    </main>
  );
}
