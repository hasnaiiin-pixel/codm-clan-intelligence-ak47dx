export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">CLAN MANAGER</h1>
          <p className="ak-lead">Release completa V11.0A: Torneo Pro con iscrizioni prima delle squadre, bracket grafico, classifica gruppi, click partita per risultato, eliminazione torneo, import Excel, template profilo/import unificato e fix npm registry pubblico.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V11_0A_COMPLETE_TOURNAMENT_PRO_EXCEL_SQL_NPM_PUBLIC_OK</div>
          <div className="notice top-gap"><strong>Torneo:</strong> generazione dopo iscrizioni, formato modificabile, armi permesse/vietate, bracket verde/rosso e statistiche separate solo nella pagina Torneo.</div>
          <div className="notice top-gap"><strong>Import:</strong> screenshot OCR oppure Excel ufficiale con risultato, mappa, player e K/D/A.</div>
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
