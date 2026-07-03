import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packagePath = path.join(root, 'package.json');

if (!fs.existsSync(packagePath)) {
  console.error('ERRORE: package.json non trovato. Esegui questo script dalla root del progetto CODM.');
  process.exit(1);
}

const raw = fs.readFileSync(packagePath, 'utf8');
let pkg;
try {
  pkg = JSON.parse(raw);
} catch (err) {
  console.error('ERRORE: package.json non è JSON valido. Controlla virgole o parentesi.');
  console.error(err.message);
  process.exit(1);
}

const backupPath = path.join(root, `package.backup-before-vercel-fix.${Date.now()}.json`);
fs.writeFileSync(backupPath, raw, 'utf8');

pkg.engines = {
  ...(pkg.engines || {}),
  node: '20.x'
};

pkg.packageManager = 'npm@10.8.2';

pkg.scripts = {
  ...(pkg.scripts || {})
};

if (!pkg.scripts.build) pkg.scripts.build = 'next build';
if (!pkg.scripts.dev) pkg.scripts.dev = 'next dev';
if (!pkg.scripts.start) pkg.scripts.start = 'next start';
if (!pkg.scripts.lint) pkg.scripts.lint = 'next lint';

fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

console.log('OK: package.json aggiornato per Vercel/CODM.');
console.log(`Backup creato: ${path.basename(backupPath)}`);
console.log('Aggiunto/impostato: engines.node = 20.x');
console.log('Aggiunto/impostato: packageManager = npm@10.8.2');
console.log('Script build/dev/start/lint verificati.');
