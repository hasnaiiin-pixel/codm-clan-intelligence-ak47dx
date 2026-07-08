export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">CLAN MANAGER</h1>
          <p className="ak-lead">Release definitiva V12.1: Excel + foto prova allegabile subito o dopo, import senza OCR e collegamento giocatori ai profili reali registrati.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V12_1_EXCEL_PHOTO_PROOF_PLAYER_LINK_OK</div>
          <div className="notice top-gap"><strong>Import:</strong> carichi Excel, selezioni ID_PARTITA, alleghi foto prova accanto alla tabella oppure dopo dalla partita registrata, colleghi player al profilo reale e salvi su Supabase.</div>
          <div className="notice top-gap"><strong>SQL:</strong> inclusi SQL V12.1 per import staging e supporto foto/profili.</div>
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
