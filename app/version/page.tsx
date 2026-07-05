export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">AK47DX DEPLOY CHECK</div>
          <h1 className="ak-title">CODM Clan Intelligence</h1>
          <p className="ak-lead">Versione V5.1: import partite sincronizzato con il template salvato, overlay locale completo e tabella mobile senza scroll laterale.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V5_1_TEMPLATE_SYNC_TABLE_MOBILE_OK</div>
          <div className="notice top-gap"><strong>Backend OCR:</strong> usa ancora 2.0.8 V5.0 stabile per Score + K/D/A.</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
            <a href="/calibration">Calibrazione</a>
            <a href="/import/match">Import partite</a>
            <a href="/events">Eventi</a>
            <a href="/ocr-status">OCR Status</a>
          </div>
        </div>
      </section>
    </main>
  );
}
