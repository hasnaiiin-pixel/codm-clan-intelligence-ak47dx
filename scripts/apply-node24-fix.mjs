import fs from 'fs';
import path from 'path';

const pkgPath = path.resolve(process.cwd(), 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error('ERRORE: package.json non trovato nella cartella corrente. Esegui questo script dalla root del progetto CODM.');
  process.exit(1);
}

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
} catch (err) {
  console.error('ERRORE: package.json non è JSON valido:');
  console.error(err.message);
  process.exit(1);
}

pkg.engines = pkg.engines || {};
pkg.engines.node = '24.x';

// Mantengo npm stabile. Non tocco scripts, dependencies o devDependencies.
if (!pkg.packageManager) {
  pkg.packageManager = 'npm@10.8.2';
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('OK: package.json aggiornato con engines.node = 24.x');
console.log('Non sono state modificate dependencies/devDependencies.');
