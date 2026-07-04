const fs = require('fs');
const path = require('path');

const root = process.cwd();
const patchRoot = path.join(root, 'patch_files');
const backupRoot = path.join(root, 'backup_visible_routes_' + new Date().toISOString().replace(/[:.]/g, '-'));

const files = [
  ['app/version/page.tsx', 'patch_files/app/version/page.tsx'],
  ['app/cache-reset/page.tsx', 'patch_files/app/cache-reset/page.tsx'],
];

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

for (const [targetRel, sourceRel] of files) {
  const source = path.join(root, sourceRel);
  const target = path.join(root, targetRel);
  if (!fs.existsSync(source)) {
    throw new Error(`File patch mancante: ${sourceRel}`);
  }
  if (fs.existsSync(target)) {
    const backup = path.join(backupRoot, targetRel);
    ensureDir(backup);
    fs.copyFileSync(target, backup);
  }
  ensureDir(target);
  fs.copyFileSync(source, target);
  console.log(`OK aggiornato: ${targetRel}`);
}

console.log('\nPatch visible routes applicata. Ora eseguo un controllo sintassi TSX tramite next build nel BAT.');
