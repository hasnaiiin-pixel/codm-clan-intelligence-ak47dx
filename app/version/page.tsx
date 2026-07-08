export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">CLAN MANAGER</h1>
          <p className="ak-lead">Release definitiva V12.0: Import risultati CODM con Excel + foto allegate + SQL Supabase staging. Mantiene anche import diretto da foto/OCR.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V12_0_DEFINITIVE_EXCEL_PHOTO_SQL_IMPORT_OK</div>
          <div className="notice top-gap"><strong>Import:</strong> carichi Excel, selezioni ID_PARTITA se ci sono più partite, alleghi foto subito o dopo e salvi su Supabase.</div>
          <div className="notice top-gap"><strong>SQL:</strong> incluso script supabase/IMPORT_RISULTATI_EXCEL_STAGING_V12.sql per caricamento staging/import batch.</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
            <a href="/events-health">Health eventi</a>
            <a href="/tournament">Torneo</a>
            <a href="/profile">Mio profilo</a>
            <a href="/calibration">Calibrazione</a>
            <a href="/import/match">Import partite</a>
            <a href="/import/profile">Import profilo</a>
          </div>
        </div>
      </section>
    </main>
  );
}
