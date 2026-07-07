export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">CLAN MANAGER</h1>
          <p className="ak-lead">Versione V8.2F: risultato partita manuale ripristinato in Import, template non resta più default e calibrazione PWA con comandi touch.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V8_2F_PWA_CALIBRATION_TOUCH_TEMPLATE_IMPORT_RESULT_FIX_OK</div>
          <div className="notice top-gap"><strong>Import:</strong> campi risultato nostro/avversario ripristinati; nick e K/D/A restano attivi; punteggio player escluso.</div>
          <div className="notice top-gap"><strong>Calibrazione/PWA:</strong> handle più grandi e tasti touch per muovere/allargare/ridurre i riquadri.</div>
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
