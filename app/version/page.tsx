export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">AK47DX DEPLOY CHECK</div>
          <h1 className="ak-title">CODM Clan Intelligence</h1>
          <p className="ak-lead">Versione V5.7.0-profile-template-frame-ocr: Import partite V5.4 mantenuto stabile, Import profilo corretto con frame frontend, OCR numerico robusto e fallback template.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V5_7_PROFILE_TEMPLATE_FRAME_OCR_OK</div>
          <div className="notice top-gap"><strong>Backend OCR:</strong> 2.0.12-v5-7-profile-template-frame-ocr-ak47dx</div>
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
