export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">CLAN MANAGER</h1>
          <p className="ak-lead">Release completa V10.0: Torneo separato, iscrizione dal profilo, squadre dopo iscrizioni, armi permesse, tipo/formato modificabile, statistiche torneo isolate e template OCR professionale.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V10_0_COMPLETE_TOURNAMENT_TEMPLATE_PRO_OK</div>
          <div className="notice top-gap"><strong>Torneo:</strong> iscrizioni player dal profilo, gestione staff, regolamento con armi permesse/vietate, classifica, partite e statistiche solo dentro Torneo.</div>
          <div className="notice top-gap"><strong>Template OCR:</strong> menu a tendina reale, salvataggio con nome libero e registro globale letto da Import partita.</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
            <a href="/events-health">Health eventi</a>
            <a href="/tournament">Torneo</a>
            <a href="/profile">Mio profilo</a>
            <a href="/calibration">Calibrazione</a>
            <a href="/import/match">Import partite</a>
          </div>
        </div>
      </section>
    </main>
  );
}
