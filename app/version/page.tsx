export default function VersionPage() {
  return (
    <main className="ak-login-page"><section className="ak-login-wrap"><div className="ak-login-card">
      <div className="ak-pill">AK47DX · VERIFICA DEPLOYMENT</div>
      <h1 className="ak-title">CODM CLAN MANAGER V14.2 FIX18</h1>
      <p className="ak-lead">Mappe CODM condivise nelle Regole e nel bracket 64, torneo delle armi per categoria, statistiche aggregate e rigenerazione sicura da iscritti.</p>
      <div className="notice top-gap"><strong>Marker pubblicazione:</strong> AK47DX_V14_2_FIX18_MAPPE_ARMI_STATISTICHE_RIGENERA</div>
      <p className="muted">Se qui compare ancora V13 oppure FIX15/FIX16, Vercel non ha pubblicato la FIX18: controlla commit, branch main e deployment Production.</p>
      <div className="ak-quick-links"><a href="/tournament">Tornei</a><a href="/analytics">Statistiche (tutte le stagioni)</a><a href="/cache-reset">Reset cache PWA</a></div>
    </div></section></main>
  );
}
