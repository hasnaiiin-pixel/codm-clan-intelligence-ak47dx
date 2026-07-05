export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">AK47DX DEPLOY CHECK</div>
          <h1 className="ak-title">CODM Clan Intelligence</h1>
          <p className="ak-lead">Versione V5.0: import definitivo con motore stabile V4.6 + lettura SCORE player e K/D/A da template-priority leggero.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V5_0_IMPORT_SCORE_KDA_DEFINITIVO_OK</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache</a>
            <a href="/login">Login</a>
            <a href="/events">Eventi</a>
            <a href="/import/match">Import partite</a>
            <a href="/ocr-status">OCR Status</a>
            <a href="/api/telegram/status">Telegram status</a>
          </div>
        </div>
      </section>
    </main>
  );
}
