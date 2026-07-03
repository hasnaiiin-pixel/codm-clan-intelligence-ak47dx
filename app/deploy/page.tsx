export default function DeployPage() {
  return (
    <main className="container wide">
      <section className="clan-hero gaming-panel">
        <div>
          <p className="eyebrow">🚀 Distribuzione clan</p>
          <h1>AK47DX online + PWA mobile</h1>
          <p className="clan-motto">Questa pagina guida il passaggio da locale a link condivisibile: Vercel per il frontend, Supabase per login/storage/database, Render o Cloud Run per OCR.</p>
          <div className="hero-actions">
            <a className="btn" href="/invite">🔗 Crea link invito</a>
            <a className="btn secondary" href="/join">📲 Pagina iscrizione</a>
            <a className="btn secondary" href="/yolo">🧬 Dataset YOLO</a>
          </div>
        </div>
        <div className="mobile-preview-frame">
          <img src="/assets/ak47dx-logo.jpeg" alt="AK47DX mobile" style={{ width: '100%', borderRadius: 20 }} />
          <div className="notice" style={{ marginTop: 12 }}>Installa da browser: Aggiungi a schermata Home.</div>
        </div>
      </section>

      <section className="grid grid-3 top-gap">
        <div className="card deploy-option-card">
          <p className="eyebrow">1 · Gratis consigliato</p>
          <h2>Vercel + Supabase + Render Free</h2>
          <p className="muted">Soluzione rapida per dare subito un link al clan. Render Free può andare in sleep: va bene per test e uso iniziale.</p>
          <ul className="muted"><li>Frontend: Vercel</li><li>Database/Auth/Storage: Supabase</li><li>OCR FastAPI: Render Free</li></ul>
        </div>
        <div className="card deploy-option-card">
          <p className="eyebrow">2 · Migliore tecnico</p>
          <h2>Vercel + Supabase + Cloud Run</h2>
          <p className="muted">Più stabile per OCR Python, Docker, Tesseract e OpenCV. Richiede configurazione Google Cloud e billing/free tier.</p>
          <ul className="muted"><li>Backend Docker</li><li>HTTPS pubblico</li><li>Google Vision pronto</li></ul>
        </div>
        <div className="card deploy-option-card">
          <p className="eyebrow">3 · Zero cloud backend</p>
          <h2>Frontend online + OCR locale admin</h2>
          <p className="muted">Transizione temporanea: player consultano online, solo admin importa risultati quando il PC OCR è acceso.</p>
          <ul className="muted"><li>Più semplice</li><li>Meno stabile</li><li>Non consigliato come definitivo</li></ul>
        </div>
      </section>

      <section className="grid grid-2 top-gap">
        <div className="card">
          <h2>Checklist pubblicazione</h2>
          <ol className="muted">
            <li>Esegui migrazione Supabase 2.0 deployment.</li>
            <li>Crea bucket Storage per screenshot e dataset.</li>
            <li>Carica repo su GitHub.</li>
            <li>Deploy frontend su Vercel.</li>
            <li>Deploy backend OCR con Docker.</li>
            <li>Imposta variabili ambiente production.</li>
            <li>Testa /health backend e /invite frontend.</li>
            <li>Invia QR o link ai player.</li>
          </ol>
        </div>
        <div className="card">
          <h2>Variabili produzione</h2>
          <pre className="code-block">{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_OCR_BACKEND_URL=https://...
NEXT_PUBLIC_APP_URL=https://...
GOOGLE_APPLICATION_CREDENTIALS=/secrets/google-vision.json`}</pre>
        </div>
      </section>
    </main>
  );
}
