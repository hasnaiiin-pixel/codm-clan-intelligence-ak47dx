export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">AK47DX DEPLOY CHECK</div>
          <h1 className="ak-title">CODM Clan Intelligence</h1>
          <p className="ak-lead">Versione V5.9: import partite stabile V5.4 mantenuto, profilo reso safe con un solo tasto, progress percentuale, selezione telefono/template e allineamento manuale frame senza toccare il motore partite funzionante.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V5_9_STABLE_IMPORT_PROFILE_TEMPLATES_OK</div>
          <div className="notice top-gap"><strong>Backend OCR consigliato:</strong> 2.0.10-v5-4-fastlane-import-stabile-ak47dx</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
            <a href="/calibration">Calibrazione</a>
            <a href="/import/match">Import partite</a>
            <a href="/import/profile">Import profilo</a>
            <a href="/events">Eventi</a>
            <a href="/ocr-status">OCR Status</a>
          </div>
        </div>
      </section>
    </main>
  );
}
