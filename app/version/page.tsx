export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">Clan Manager</h1>
          <p className="ak-lead">Versione V6.7: Clan HQ diventa sorgente ufficiale per nome/TAG clan, roster usa AK47DX dal Clan HQ, menu mappa CODM corretto, BAN in italiano, regolamento preformattato con loghi/immagini e import risultato persistente senza perdere la bozza.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V6_7_CLAN_HQ_RULES_MAP_BAN_FLOW_OK</div>
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
