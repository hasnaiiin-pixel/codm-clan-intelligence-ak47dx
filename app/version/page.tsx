export default function VersionPage() {
  return (
    <main className="ak-login-page"><section className="ak-login-wrap"><div className="ak-login-card">
      <div className="ak-pill">AK47DX · VERIFICA DEPLOYMENT</div>
      <h1 className="ak-title">CODM CLAN MANAGER V14.2 FIX29</h1>
      <p className="muted">Base FIX28 · FIX29 calendario e risultati + add-on Rubrica privata con popup e social</p>
      <p className="ak-lead">Da FIX23 a FIX29: Tornei Live: armi visibili, tabellone generato, giocatori nei gironi, griglia 2×2 e calendario con card uniformi.</p>
      <div className="notice top-gap"><strong>Marker pubblicazione:</strong> AK47DX_V14_2_FIX29_MATCH_POPUP_SAFE_MAPS_WEAPONS · AK47DX_V14_2_FIX29_RUBRICA_POPUP_SOCIAL_PRIVATE</div>
      <p className="muted">Se qui non compare FIX29, Vercel non sta servendo la nuova build: controlla il commit e il deployment Production, poi esegui cache-reset.</p>
      <div className="ak-quick-links"><a href="/tournament">Tornei</a><a href="/analytics">Statistiche (tutte le stagioni)</a><a href="/cache-reset">Reset cache PWA</a></div>
    </div></section></main>
  );
}
