export default function HomePage() {
  return (
    <main className="container wide">
      <section className="ak-hero card gaming-panel">
        <div>
          <p className="eyebrow">🐺 AK47DX · Versione definitiva</p>
          <h1>CODM Clan Intelligence 2.0</h1>
          <p className="clan-motto">Una sola piattaforma: import risultati, Action Panel con screenshot prova, inviti player, Clan HQ, statistiche, ranking Gold/Silver/Bronze e OCR Hybrid.</p>
          <div className="hero-actions">
            <a className="btn import-main-btn" href="/dashboard">🎮 Entra in dashboard</a>
            <a className="btn secondary" href="/import/match">⚡ Importa risultati</a>
            <a className="btn secondary" href="/invite">🔗 Invita giocatori</a>
          </div>
        </div>
        <div className="operator-showcase">
          <img src="/assets/ak47dx-logo.jpeg" alt="AK47DX logo" />
          <div className="weapon-silhouette">╾━╤デ╦︻</div>
          <small>Screenshot proof · Clan analytics · OCR 2.0</small>
        </div>
      </section>
      <section className="grid grid-4 top-gap">
        <div className="card"><h2>🎞️ Action Panel</h2><p className="muted">Lo screenshot della partita resta visibile dentro il pannello azione, senza aprire nuove pagine.</p></div>
        <div className="card"><h2>🔗 Inviti</h2><p className="muted">Genera link e QR per iscrizione player, trial, vice o staff.</p></div>
        <div className="card"><h2>🐺 Clan HQ</h2><p className="muted">Storia, capi clan, vice, social, avvisi e statistiche per clan.</p></div>
        <div className="card"><h2>🏆 Ranking</h2><p className="muted">1° Gold/MVP, 2° Silver, 3° Bronze, posizione media con decimali.</p></div>
      </section>
    </main>
  );
}
