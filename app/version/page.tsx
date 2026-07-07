export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">CLAN MANAGER</h1>
          <p className="ak-lead">Versione V8.2C: import risultati pulito, template semplificato, overlay senza Vittoria/Punteggio/Impatto e Telegram cancellazione evidenziata.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V8_2C_IMPORT_CLEAN_TEMPLATE_TELEGRAM_DELETE_FIX_OK</div>
          <div className="notice top-gap"><strong>Import:</strong> stessa geometria calibrazione/import · template unico default/salvato · menu dentro pagina</div>
          <div className="notice top-gap"><strong>Eventi:</strong> link solo manuali · Telegram cancellazione evidenziata · Vercel Hobby compatibile</div>
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
