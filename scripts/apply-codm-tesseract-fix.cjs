const fs = require('fs');
const path = require('path');

const packagePath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packagePath)) {
  console.error('ERRORE: package.json non trovato. Esegui questo script dalla root del progetto CODM.');
  process.exit(1);
}

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
} catch (err) {
  console.error('ERRORE: package.json non è JSON valido. Dettaglio:', err.message);
  process.exit(1);
}

// Manteniamo compatibilità con next.config.cjs/CommonJS.
if (Object.prototype.hasOwnProperty.call(pkg, 'type')) {
  delete pkg.type;
}

pkg.engines = pkg.engines || {};
pkg.engines.node = '24.x';

pkg.dependencies = pkg.dependencies || {};
pkg.dependencies['tesseract.js'] = '^7.0.0';

pkg.scripts = pkg.scripts || {};
if (!pkg.scripts.build) pkg.scripts.build = 'next build';
if (!pkg.scripts.dev) pkg.scripts.dev = 'next dev';
if (!pkg.scripts.start) pkg.scripts.start = 'next start';

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

console.log('OK: package.json aggiornato');
console.log('- dependency aggiunta: tesseract.js ^7.0.0');
console.log('- Node impostato: 24.x');
console.log('- type: module rimosso se presente');
