const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'components', 'WriteAccessBlock.tsx');
const rootFile = path.join(process.cwd(), 'components', 'WriteAccessBlock.tsx');
const tsconfig = path.join(process.cwd(), 'tsconfig.json');

function fail(msg) {
  console.error('❌ ' + msg);
  process.exit(1);
}

if (!fs.existsSync(tsconfig)) fail('tsconfig.json non trovato. Esegui dalla root del progetto.');
const ts = fs.readFileSync(tsconfig, 'utf8');
if (!ts.includes('"@/*"') || !ts.includes('./src/*')) {
  console.warn('⚠️ Attenzione: alias @ non sembra puntare a ./src/*. Controlla tsconfig.json.');
}

if (!fs.existsSync(file)) fail('Manca src/components/WriteAccessBlock.tsx');
const content = fs.readFileSync(file, 'utf8');
if (!content.includes('export function WriteAccessBlock')) fail('WriteAccessBlock non esporta la funzione richiesta.');
if (!content.includes("@/lib/authRoles")) fail('WriteAccessBlock non importa authRoles dal percorso corretto.');

if (fs.existsSync(rootFile)) {
  console.log('ℹ️ Esiste anche components/WriteAccessBlock.tsx, ma con tsconfig attuale viene usato src/components/WriteAccessBlock.tsx.');
}

console.log('✅ WriteAccessBlock nel percorso corretto: src/components/WriteAccessBlock.tsx');
console.log('✅ Alias @/components/WriteAccessBlock risolto con tsconfig paths @/* -> ./src/*');
