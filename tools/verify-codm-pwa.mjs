import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/offline.html',
  'public/icons/icon-192.png',
  'public/icons/icon-512.png',
  'src/components/mobile/MobileBottomNav.jsx',
  'src/services/codmEventRepository.js',
  'src/styles/codm-pwa-clean.css'
];

let failed = 0;
function pass(message) { console.log(`✅ ${message}`); }
function warn(message) { console.log(`⚠️  ${message}`); }
function fail(message) { failed += 1; console.log(`❌ ${message}`); }

for (const file of required) {
  if (fs.existsSync(path.join(root, file))) pass(`${file} presente`);
  else fail(`${file} mancante`);
}

const manifestPath = path.join(root, 'public/manifest.webmanifest');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.display === 'standalone') pass('manifest display standalone'); else fail('manifest display non standalone');
    if (manifest.icons?.some((icon) => String(icon.purpose || '').includes('maskable'))) pass('manifest contiene icona maskable'); else warn('manifest senza icona maskable');
    if (manifest.start_url) pass('manifest start_url configurato'); else fail('manifest start_url mancante');
  } catch (error) {
    fail(`manifest non valido: ${error.message}`);
  }
}

const repoPath = path.join(root, 'src/services/codmEventRepository.js');
if (fs.existsSync(repoPath)) {
  const source = fs.readFileSync(repoPath, 'utf8');
  if (source.includes('delete output.id') || source.includes('removeInvalidUuidFieldsForSupabase')) pass('repository rimuove id locali prima di Supabase');
  else fail('repository non sembra rimuovere id locali');
  if (source.includes("onConflict: 'local_id'")) pass('sync Supabase usa onConflict local_id');
  else warn('onConflict local_id non trovato');
}

const appCandidates = ['src/main.jsx', 'src/main.tsx', 'src/App.jsx', 'src/App.tsx'];
const appContent = appCandidates
  .filter((file) => fs.existsSync(path.join(root, file)))
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');

if (appContent.includes('MobileBottomNav')) pass('MobileBottomNav collegato nel layout principale');
else warn('MobileBottomNav non trovato nei file principali: collegarlo manualmente nel layout');

if (appContent.includes('codm-pwa-clean.css')) pass('CSS PWA importato');
else warn('CSS PWA non importato nei file principali');

if (failed) {
  console.log(`\nVerifica finita con ${failed} errore/i.`);
  process.exit(1);
}

console.log('\nVerifica base completata. Ora testare da telefono: crea evento, menu Statistiche, niente hamburger mobile.');
