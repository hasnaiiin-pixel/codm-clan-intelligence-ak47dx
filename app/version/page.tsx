export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">AK47DX DEPLOY CHECK</div>
          <h1 className="ak-title">CODM Clan Intelligence</h1>
          <p className="ak-lead">Versione V5.2: fix definitivo template salvato, K/D/A, score player e tabella import a larghezza piena.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V5_2_TEMPLATE_KDA_TABLE_DEFINITIVO_OK</div>
          <div className="notice top-gap"><strong>Backend OCR:</strong> 2.0.9-v5-2-template-kda-table-definitivo-ak47dx.</div>
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
