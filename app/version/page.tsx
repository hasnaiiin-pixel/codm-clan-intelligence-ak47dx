export default function VersionPage() {
  return (
    <main className="ak-login-page"><section className="ak-login-wrap"><div className="ak-login-card">
      <div className="ak-pill">AK47DX · VERIFICA DEPLOYMENT</div>
      <h1 className="ak-title">CODM CLAN MANAGER V14.2 FIX31A</h1>
      <p className="muted">Base FIX30 Rubrica Pro · FIX31A: gaming, organigramma, permessi membri e import nomi screenshot</p>
      <p className="ak-lead">FIX31A integra la rubrica precedente: profili con nickname CODM, gerarchia, ruoli aggiuntivi, accessi minimi e associazione assistita dei nomi.</p>
      <div className="notice top-gap"><strong>Marker pubblicazione:</strong> AK47DX_V14_2_FIX31A_RUBRICA_GAMING</div>
      <p className="muted">Se qui non compare FIX31A, Vercel non sta servendo la nuova build: controlla il commit e il deployment Production, poi esegui cache-reset.</p>
      <div className="ak-quick-links"><a href="/tournament">Tornei</a><a href="/analytics">Statistiche (tutte le stagioni)</a><a href="/cache-reset">Reset cache PWA</a></div>
    </div></section></main>
  );
}
