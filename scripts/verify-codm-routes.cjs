const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [
  'app/version/page.tsx',
  'app/cache-reset/page.tsx',
  'public/codm-release.json',
];

let ok = true;
for (const file of files) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) {
    console.error(`❌ Mancante: ${file}`);
    ok = false;
    continue;
  }
  const txt = fs.readFileSync(p, 'utf8');
  if (file.endsWith('.tsx') && txt.includes('# AK47DX')) {
    console.error(`❌ File ancora in formato markdown/non JSX: ${file}`);
    ok = false;
  }
  if (file === 'app/version/page.tsx' && !txt.includes('VERSION_ROUTE_OK_B2_FIX')) {
    console.error(`❌ Marker versione non trovato in: ${file}`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log('✅ Route /version e /cache-reset presenti e valide.');
console.log('✅ Dopo npm run build, nella lista route devono comparire: /version e /cache-reset');
