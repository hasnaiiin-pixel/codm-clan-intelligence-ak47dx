const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mustExist = ['package.json', 'tsconfig.json', 'app'];
for (const item of mustExist) {
  if (!fs.existsSync(path.join(root, item))) {
    console.error(`ERRORE: non sono nella root del progetto CODM. Manca: ${item}`);
    process.exit(1);
  }
}

const patchDir = path.join(root, 'patch_files');
if (fs.existsSync(patchDir)) {
  fs.rmSync(patchDir, { recursive: true, force: true });
  console.log('✅ Rimossa cartella patch_files: non deve essere compilata da Next/TypeScript.');
} else {
  console.log('ℹ️ patch_files non presente: ok.');
}

const gitignorePath = path.join(root, '.gitignore');
let gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
const rules = [
  '',
  '# CODM temporary patch/update artifacts - do not deploy',
  'patch_files/',
  '*.bak_*',
  '*.tmp',
  'codm_*_fix/',
  'CODM_*_FIX*/'
];
for (const rule of rules) {
  if (rule && !gitignore.split(/\r?\n/).includes(rule)) {
    gitignore += (gitignore.endsWith('\n') || gitignore.length === 0 ? '' : '\n') + rule + '\n';
  }
}
fs.writeFileSync(gitignorePath, gitignore, 'utf8');
console.log('✅ Aggiornato .gitignore per non includere patch_files e backup temporanei.');

const tsconfigPath = path.join(root, 'tsconfig.json');
let raw = fs.readFileSync(tsconfigPath, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
let tsconfig;
try {
  tsconfig = JSON.parse(raw);
} catch (err) {
  console.error('ERRORE: tsconfig.json non è JSON valido. Correggilo prima.');
  console.error(err.message);
  process.exit(1);
}
if (!Array.isArray(tsconfig.exclude)) tsconfig.exclude = [];
const excludes = ['node_modules', 'patch_files', 'patch_files/**/*', '**/*.bak_*'];
for (const ex of excludes) {
  if (!tsconfig.exclude.includes(ex)) tsconfig.exclude.push(ex);
}
fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
console.log('✅ Aggiornato tsconfig.json: patch_files esclusa dalla compilazione.');

const adminPage = path.join(root, 'app', 'admin', 'users', 'page.tsx');
if (fs.existsSync(adminPage)) {
  const adminText = fs.readFileSync(adminPage, 'utf8');
  if (adminText.includes('setMembers((memberData || []) as Member[])')) {
    console.warn('⚠️ Attenzione: app/admin/users/page.tsx contiene ancora il vecchio cast TypeScript.');
    console.warn('   Se la build segnala questo file, serve riapplicare il fix admin-users sul file reale, non su patch_files.');
  } else {
    console.log('✅ app/admin/users/page.tsx non contiene il vecchio errore setMembers diretto.');
  }
} else {
  console.warn('⚠️ app/admin/users/page.tsx non trovato. Se vuoi la pagina admin utenti, bisogna aggiungerla di nuovo nel percorso reale app/admin/users/page.tsx.');
}

console.log('\nOK cleanup completato. Ora eseguo build dal BAT.');
