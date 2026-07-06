export default function VersionPage() {
  return (
    <main className="ak-login-page">
      <section className="ak-login-wrap">
        <div className="ak-login-card">
          <div className="ak-pill">CLAN MANAGER DEPLOY CHECK</div>
          <h1 className="ak-title">Clan Manager</h1>
          <p className="ak-lead">Versione V6.8: admin principale impostato su hasnaiiin@gmail.com, ruolo Owner/Admin automatico, endpoint di conferma owner nel database, SQL Supabase per permessi RLS permanenti e clan AK47DX confermato.</p>
          <div className="notice top-gap"><strong>Marker:</strong> V6_8_MAIN_ADMIN_OWNER_FIX_OK</div>
          <div className="notice top-gap"><strong>Admin principale:</strong> hasnaiiin@gmail.com</div>
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
