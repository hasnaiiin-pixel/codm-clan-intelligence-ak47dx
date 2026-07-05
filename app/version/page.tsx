export const dynamic = 'force-static';

const release = {
  name: 'AK47DX CODM Clan Intelligence',
  version: 'CODM_AK47DX_V4_1_UI_TELEGRAM_OCR_ALLINEATO',
  marker: 'V4_1_UI_TAILWIND_TELEGRAM_OCR_OK',
  note: 'Se vedi questa pagina, Vercel sta servendo la versione V4.1 con grafica Tailwind, Telegram API e OCR Render allineato.',
};

export default function VersionPage() {
  return (
    <main style={{ minHeight: '100vh', padding: 24, background: '#06070d', color: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      <section style={{ maxWidth: 820, margin: '0 auto', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 20, padding: 24, background: 'linear-gradient(135deg, rgba(220,38,38,0.18), rgba(15,23,42,0.95))' }}>
        <p style={{ color: '#fb7185', fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>AK47DX DEPLOY CHECK</p>
        <h1 style={{ fontSize: 34, lineHeight: 1.1, margin: '0 0 16px' }}>{release.name}</h1>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 14, background: 'rgba(0,0,0,0.28)' }}>
            <strong>Versione:</strong>
            <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0', color: '#86efac' }}>{release.version}</pre>
          </div>
          <div style={{ padding: 16, borderRadius: 14, background: 'rgba(0,0,0,0.28)' }}>
            <strong>Marker:</strong>
            <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0', color: '#93c5fd' }}>{release.marker}</pre>
          </div>
          <p style={{ color: '#cbd5e1', margin: 0 }}>{release.note}</p>
          <a href="/dashboard" style={{ display: 'inline-flex', width: 'fit-content', marginTop: 12, padding: '12px 16px', borderRadius: 12, background: '#dc2626', color: 'white', textDecoration: 'none', fontWeight: 800 }}>
            Apri Dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
