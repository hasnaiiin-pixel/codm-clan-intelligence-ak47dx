export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">Clan Manager</h1>
          <p className="ak-lead">Versione V6.6: nome app Clan Manager, eventi con 2 partite per riga, codice partita univoco, Telegram ordinato per Partita 1/2/3, pagina Regolamento, import risultato persistente e player registrati inseriti automaticamente nel roster.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V6_6_CLAN_MANAGER_EVENTS_PERSIST_ROSTER_RULES_OK</div>
          <div className="notice top-gap"><strong>Backend OCR consigliato:</strong> 2.0.10-v5-4-fastlane-import-stabile-ak47dx</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
            <a href="/rules">Regolamento</a>
            <a href="/calibration">Calibrazione</a>
            <a href="/import/match">Import partite</a>
            <a href="/import/profile">Import profilo</a>
            <a href="/profile">Mio profilo</a>
            <a href="/events">Eventi</a>
          </div>
        </div>
      </section>
    </main>
  );
}
