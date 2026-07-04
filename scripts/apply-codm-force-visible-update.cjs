const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = process.cwd();
const now = new Date().toISOString();
let commit = 'local-not-committed-yet';
try { commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch {}
const versionCode = `CODM_AUTH_ROLE_MOBILE_UPDATE_${now.replace(/[-:.TZ]/g, '').slice(0,14)}`;

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function write(file, content) { ensureDir(path.dirname(file)); fs.writeFileSync(file, content, 'utf8'); console.log(' scritto:', path.relative(root, file)); }

const deployJson = {
  app: 'CODM Clan Intelligence AK47DX',
  version: versionCode,
  generatedAt: now,
  gitCommitAtPatchTime: commit,
  note: 'Se vedi questo file su Vercel, stai aprendo la versione nuova del deploy.'
};
write(path.join(root, 'public', 'deploy-version.json'), JSON.stringify(deployJson, null, 2));

write(path.join(root, 'app', 'version', 'page.tsx'), `export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function VersionPage() {
  const version = ${JSON.stringify(versionCode)};
  const generatedAt = ${JSON.stringify(now)};
  const commit = ${JSON.stringify(commit)};
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
`);

write(path.join(root, 'app', 'cache-reset', 'page.tsx'), `'use client';

import { useState } from 'react';

export default function CacheResetPage() {
  const [status, setStatus] = useState('Pronto per pulire cache e service worker.');

  async function resetCache() {
    try {
      setStatus('Pulizia in corso...');
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
      try { localStorage.setItem('codm_cache_reset_at', new Date().toISOString()); } catch {}
      setStatus('Cache pulita. Ricarico la pagina...');
      setTimeout(() => {
        window.location.href = '/?fresh=' + Date.now();
      }, 900);
    } catch (err) {
      setStatus('Errore durante pulizia cache: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: 24, fontFamily: 'system-ui, Arial', background: '#060914', color: '#f8fafc' }}>
      <section style={{ maxWidth: 760, margin: '0 auto', border: '1px solid rgba(148,163,184,.25)', borderRadius: 18, padding: 24, background: 'rgba(15,23,42,.72)' }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>AK47DX CODM - Reset Cache/PWA</h1>
        <p style={{ opacity: .85 }}>Usa questo pulsante se sul telefono o browser vedi ancora la versione vecchia.</p>
        <button onClick={resetCache} style={{ marginTop: 18, padding: '12px 18px', borderRadius: 12, border: 0, fontWeight: 800, cursor: 'pointer' }}>
          Pulisci cache e aggiorna
        </button>
        <p style={{ marginTop: 18 }}>{status}</p>
        <p style={{ marginTop: 18 }}>Poi riapri <a href="/version" style={{ color: '#67e8f9' }}>/version</a>.</p>
      </section>
    </main>
  );
}
`);

console.log('\nPatch versione visibile completata.');
console.log('Versione:', versionCode);
