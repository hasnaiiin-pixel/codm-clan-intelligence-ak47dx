export default function VersionPage() {
  return (
    <main className="ak-login-page"><section className="ak-login-wrap"><div className="ak-login-card">
      <div className="ak-pill">AK47DX · VERIFICA DEPLOYMENT</div>
      <h1 className="ak-title">CODM CLAN MANAGER V14.2 FIX31C</h1>
      <p className="muted">Base FIX30 Rubrica Pro · FIX31C: nomi CODM completi con tag AK + simboli, abbinamento corretto</p>
      <p className="ak-lead">FIX31C corregge il confronto dei nickname con tag AK e il salvataggio del nome completo proposto. Mantiene mappa e protezioni FIX31B.</p>
      <div className="notice top-gap"><strong>Marker pubblicazione:</strong> AK47DX_V14_2_FIX31C_NOMI_CODM_COMPLETI</div>
      <p className="muted">Se qui non compare FIX31C, Vercel non sta servendo la nuova build: controlla il commit e il deployment Production, poi esegui cache-reset.</p>
      <div className="ak-quick-links"><a href="/tournament">Tornei</a><a href="/analytics">Statistiche (tutte le stagioni)</a><a href="/cache-reset">Reset cache PWA</a></div>
    </div></section></main>
  );
}
