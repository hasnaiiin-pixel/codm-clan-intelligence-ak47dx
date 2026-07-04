const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mobile = path.join(root, 'src', 'components', 'MobileSidebar.tsx');
const pwa = path.join(root, 'src', 'components', 'PwaInstaller.tsx');

let ok = true;
for (const file of [mobile, pwa]) {
  if (!fs.existsSync(file)) {
    console.error('❌ File mancante:', path.relative(root, file));
    ok = false;
  } else {
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('export function')) {
      console.error('❌ Export function non trovato in:', path.relative(root, file));
      ok = false;
    }
  }
}

if (!ok) process.exit(1);
console.log('✅ MobileSidebar e PwaInstaller presenti in src/components e compatibili con alias @/* -> ./src/*');
