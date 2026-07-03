const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packagePath = path.join(root, 'package.json');
const nextConfigJs = path.join(root, 'next.config.js');
const nextConfigCjs = path.join(root, 'next.config.cjs');

function fail(msg) {
  console.error('\n❌ ' + msg);
  process.exit(1);
}

if (!fs.existsSync(packagePath)) fail('package.json non trovato. Avvia questo script dalla root del progetto CODM.');

let pkgRaw = fs.readFileSync(packagePath, 'utf8');
let pkg;
try {
  pkg = JSON.parse(pkgRaw);
} catch (err) {
  fail('package.json non valido: ' + err.message);
}

// Fix principale: il progetto Next usa next.config.js CommonJS con module.exports.
// Con "type": "module", Node tratta next.config.js come ES module e module.exports va in errore.
if (pkg.type === 'module') {
  delete pkg.type;
}

pkg.engines = pkg.engines || {};
pkg.engines.node = '24.x';
pkg.packageManager = pkg.packageManager || 'npm@10.8.2';

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

// Se qualcuno ha creato next.config.cjs per prova, non lo tocchiamo.
// Se esiste next.config.js, verifichiamo solo che sia presente.
if (!fs.existsSync(nextConfigJs) && !fs.existsSync(nextConfigCjs)) {
  const defaultConfig = `/** @type {import('next').NextConfig} */\nconst nextConfig = {\n  reactStrictMode: true\n};\n\nmodule.exports = nextConfig;\n`;
  fs.writeFileSync(nextConfigJs, defaultConfig);
  console.log('ℹ️ next.config.js non esisteva: creato file base CommonJS.');
}

// Validazione JSON
try {
  JSON.parse(fs.readFileSync(packagePath, 'utf8'));
} catch (err) {
  fail('package.json risulta ancora non valido: ' + err.message);
}

console.log('\n✅ Fix applicato.');
console.log('✅ Rimosso "type": "module" da package.json, se presente.');
console.log('✅ Node impostato a 24.x.');
console.log('✅ package.json valido.');
console.log('\nOra esegui:');
console.log('  npm install --legacy-peer-deps');
console.log('  npm run build');
