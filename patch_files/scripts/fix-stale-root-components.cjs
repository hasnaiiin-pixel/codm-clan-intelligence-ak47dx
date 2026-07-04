const fs = require('fs');
const path = require('path');

const root = process.cwd();
const staleFiles = [
  'components/WriteAccessBlock.tsx',
  'components/MobileSidebar.tsx',
  'components/PwaInstaller.tsx',
];

for (const rel of staleFiles) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    const backup = `${abs}.bak_${Date.now()}`;
    fs.renameSync(abs, backup);
    console.log(`Archiviato duplicato root: ${rel} -> ${path.relative(root, backup)}`);
  }
}

const srcComponent = path.join(root, 'src/components/WriteAccessBlock.tsx');
if (!fs.existsSync(srcComponent)) {
  throw new Error('Manca src/components/WriteAccessBlock.tsx');
}

let text = fs.readFileSync(srcComponent, 'utf8');
text = text.replaceAll('@/src/lib/supabaseClient', '@/lib/supabaseClient');
text = text.replaceAll('"@/src/lib/supabaseClient"', '"@/lib/supabaseClient"');
text = text.replaceAll("'@/src/lib/supabaseClient'", "'@/lib/supabaseClient'");
fs.writeFileSync(srcComponent, text);

if (text.includes('@/src/')) {
  throw new Error('Trovato ancora import errato con @/src/ in src/components/WriteAccessBlock.tsx');
}

console.log('✅ Duplicati root rimossi/archiviati e WriteAccessBlock usa @/lib/supabaseClient');
