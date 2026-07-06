export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">Clan Manager</h1>
          <p className="ak-lead">Versione V6.9 ufficiale stabile: gestione utenti reale da Supabase Auth, sync automatico registrati → profili → roster, ruoli Owner/Admin, ottimizzazione bozza Eventi con debounce e icona PWA MIRZA per telefono.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V6_9_OFFICIAL_STABLE_USERS_PERFORMANCE_MIRZA_PWA_OK</div>
          <div className="notice top-gap"><strong>Admin principale:</strong> hasnaiiin@gmail.com</div>
          <div className="notice top-gap"><strong>Icona telefono:</strong> MIRZA · manifest PWA aggiornato</div>
          <div className="ak-quick-links">
            <a href="/cache-reset">Reset cache sicuro</a>
            <a href="/clan">Clan HQ</a>
            <a href="/admin/users">Utenti e permessi</a>
            <a href="/rules">Regolamento</a>
            <a href="/import/match">Import partite</a>
            <a href="/profile">Mio profilo</a>
            <a href="/events">Eventi</a>
          </div>
        </div>
      </section>
    </main>
  );
}
