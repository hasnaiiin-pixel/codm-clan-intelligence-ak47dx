export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">CLAN MANAGER V13.11.2</h1>
          <p className="ak-lead">Ordinamento touch delle tabelle, selezioni grafico annullabili e condivisioni WhatsApp ordinate senza link dell’app.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V13_11_2_TOUCH_SORT_CHART_WHATSAPP_OK</div>
          <div className="notice top-gap"><strong>Statistiche:</strong> Excel filtrato/completo, riepilogo WhatsApp e immagine condivisibile.</div>
          <div className="notice top-gap"><strong>Admin:</strong> visite, visitatori unici, PWA, mobile, andamento giornaliero e pagine più viste.</div>
          <div className="notice top-gap"><strong>Fondo:</strong> quote mensili, preferenza arma, Leggendaria/Mitica, estrazione casuale e blocco vincitore fino a giro completo.</div>
          <div className="notice top-gap"><strong>SQL:</strong> eseguire supabase/UPDATE_V13_11_SHARE_VISITORS_FUND.sql.</div>
          <div className="ak-quick-links">
            <a href="/analytics">Statistiche</a>
            <a href="/admin/visitors">Visitatori sito</a>
            <a href="/fund">Fondo estrazioni</a>
            <a href="/events">Eventi</a>
            <a href="/cache-reset">Reset cache sicuro</a>
          </div>
        </div>
      </section>
    </main>
  );
}
