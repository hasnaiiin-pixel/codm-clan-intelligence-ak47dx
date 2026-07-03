import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

if (!exists('package.json')) errors.push('package.json non trovato');
if (!exists('.npmrc')) warnings.push('.npmrc non trovato');
if (!exists('vercel.json')) warnings.push('vercel.json non trovato');

let pkg = null;
if (exists('package.json')) {
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  } catch {
    errors.push('package.json non è JSON valido');
  }
}

if (pkg) {
  if (!pkg.engines?.node) warnings.push('engines.node non impostato in package.json');
  if (pkg.engines?.node && pkg.engines.node !== '20.x') warnings.push(`engines.node è ${pkg.engines.node}, consigliato 20.x`);
  if (!pkg.packageManager) warnings.push('packageManager non impostato in package.json');
  if (!pkg.scripts?.build) errors.push('script npm "build" non trovato');
  if (!pkg.dependencies?.next && !pkg.devDependencies?.next) warnings.push('dipendenza next non trovata: controlla se il progetto è davvero Next.js');
}

if (!exists('package-lock.json')) warnings.push('package-lock.json non trovato: dopo npm install verrà generato');

console.log('\n=== CODM Vercel readiness check ===');
if (errors.length === 0 && warnings.length === 0) {
  console.log('OK: configurazione pronta per deploy Vercel.');
} else {
  if (errors.length) {
    console.log('\nERRORI:');
    for (const e of errors) console.log(`- ${e}`);
  }
  if (warnings.length) {
    console.log('\nAVVISI:');
    for (const w of warnings) console.log(`- ${w}`);
  }
}
console.log('===================================\n');
process.exit(errors.length ? 1 : 0);
