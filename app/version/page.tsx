export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">AK47DX DEPLOY CHECK</div>
          <h1 className="ak-title">CODM Clan Intelligence</h1>
          <p className="ak-lead">Versione V5.8: rollback controllato alla base stabile. Import partite riportato a V5.4 FastLane, backend OCR riportato a 2.0.10, profilo non deve più rompere il caricamento risultati.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V5_8_ROLLBACK_IMPORT_STABILE_PROFILE_SAFE_OK</div>
          <div className="notice top-gap"><strong>Backend OCR richiesto:</strong> 2.0.10-v5-4-fastlane-import-stabile-ak47dx</div>
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
