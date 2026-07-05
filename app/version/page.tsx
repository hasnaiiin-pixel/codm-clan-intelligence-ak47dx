export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">AK47DX DEPLOY CHECK</div>
          <h1 className="ak-title">CODM Clan Intelligence</h1>
          <p className="ak-lead">Versione V4.5: layout mobile stabilizzato, menu permessi, eventi con convocati, Telegram test, OCR solo nostro team.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V4_5_IMPORT_FAST_EVENTS_REMINDERS_OK</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache</a>
            <a href="/login">Login</a>
            <a href="/events">Eventi</a>
            <a href="/ocr-status">OCR Status</a>
            <a href="/api/telegram/status">Telegram status</a>
          </div>
        </div>
      </section>
    </main>
  );
}
