export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function VersionPage() {
  const version = "CODM_AUTH_ROLE_MOBILE_UPDATE_20260704193756";
  const generatedAt = "2026-07-04T19:37:56.484Z";
  const commit = "1dd5952";
  return (
    <main style={{ minHeight: '100vh', padding: 24, fontFamily: 'system-ui, Arial', background: '#060914', color: '#f8fafc' }}>
      <section style={{ maxWidth: 760, margin: '0 auto', border: '1px solid rgba(148,163,184,.25)', borderRadius: 18, padding: 24, background: 'rgba(15,23,42,.72)' }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>AK47DX CODM - Deploy Version</h1>
        <p style={{ opacity: .85 }}>Se questa pagina mostra il codice sotto, Vercel sta servendo la versione aggiornata.</p>
        <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid rgba(34,211,238,.35)' }}>
          <p><b>Versione:</b> {version}</p>
          <p><b>Generato:</b> {generatedAt}</p>
          <p><b>Commit quando patch applicata:</b> {commit}</p>
        </div>
        <p style={{ marginTop: 18 }}>Dopo il deploy, apri anche <a href="/cache-reset" style={{ color: '#67e8f9' }}>/cache-reset</a> dal telefono per pulire cache/PWA.</p>
      </section>
    </main>
  );
}
