export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-card" style={{ maxWidth: 760, margin: '0 auto' }}>
        <div className="ak-pill">AK47DX DEPLOY CHECK</div>
        <h1 className="ak-title">CODM V4.3</h1>
        <p className="ak-lead">Versione unica allineata: layout mobile, menu permessi, OCR progress, Telegram test, eventi e Render OCR.</p>
        <div className="ak-message">
          <b>Marker:</b> V4_3_MOBILE_PERMESSI_OCR_PROGRESS_OK<br />
          Se vedi questa pagina, Vercel sta servendo la V4.3 e non una vecchia cache.
        </div>
        <div className="ak-quick-links">
          <a href="/cache-reset">Reset cache</a>
          <a href="/api/health">API health</a>
          <a href="/api/telegram/status">Telegram status</a>
          <a href="/login">Login</a>
        </div>
      </section>
    </main>
  );
}
