export default function VersionPage() {
  return (
    <main className="ak-login-page"><section className="ak-login-wrap"><div className="ak-login-card">
      <div className="ak-pill">AK47DX · VERIFICA DEPLOYMENT</div>
      <h1 className="ak-title">CODM CLAN MANAGER V14.2 FIX23</h1>
      <p className="ak-lead">Tabellone compatto Winners e Losers insieme, Grand Final a destra. Nomi incontri W1/L1/GF, vista panoramica/dettaglio, centratura di squadre, calendario, gironi e risultati. Eredita FIX22.</p>
      <div className="notice top-gap"><strong>Marker pubblicazione:</strong> AK47DX_V14_2_FIX23_COMPACT_UNIFIED_BRACKET</div>
      <p className="muted">Se qui non compare FIX23, Vercel non sta servendo la nuova build: controlla il commit e il deployment Production, poi esegui cache-reset.</p>
      <div className="ak-quick-links"><a href="/tournament">Tornei</a><a href="/analytics">Statistiche (tutte le stagioni)</a><a href="/cache-reset">Reset cache PWA</a></div>
    </div></section></main>
  );
}
