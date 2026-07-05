export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">AK47DX DEPLOY CHECK</div>
          <h1 className="ak-title">CODM Clan Intelligence</h1>
          <p className="ak-lead">Versione V4.6: import usa davvero il template salvato, frame frontend allineato, notifiche in-app/Telegram personalizzabili e utenti collegabili a player.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V4_7_TEMPLATE_PRIORITY_IMPORT_OK</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache</a>
            <a href="/login">Login</a>
            <a href="/notifications">Notifiche</a>
            <a href="/events">Eventi</a>
            <a href="/ocr-status">OCR Status</a>
            <a href="/api/telegram/status">Telegram status</a>
          </div>
        </div>
      </section>
    </main>
  );
}
