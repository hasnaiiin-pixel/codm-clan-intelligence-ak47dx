const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'app', 'import', 'match', 'page.tsx');
if (!fs.existsSync(file)) {
  console.error('ERRORE: app/import/match/page.tsx non trovato.');
  process.exit(1);
}

let src = fs.readFileSync(file, 'utf8');
if (src.includes('function ImportMatchEditor()')) {
  console.log('✅ Import match già patchato con wrapper hook-safe.');
  process.exit(0);
}

const fn = 'export default function ImportMatchPage() {';
const start = src.indexOf(fn);
if (start < 0) {
  console.error('ERRORE: export default function ImportMatchPage() non trovato.');
  process.exit(1);
}

const rosterMarker = 'const [roster, setRoster]';
const rosterIndex = src.indexOf(rosterMarker, start);
if (rosterIndex < 0) {
  console.error('ERRORE: marker const [roster, setRoster] non trovato.');
  process.exit(1);
}

const before = src.slice(0, start);
const after = src.slice(rosterIndex);
const replacement = `export default function ImportMatchPage() {\n  const codmAuth = useCodmAuth();\n\n  if (codmAuth.loading) return <WriteAccessBlock loading />;\n\n  if (!codmAuth.canWrite) {\n    return (\n      <WriteAccessBlock\n        role={codmAuth.role}\n        title=\"Solo Staff, Coach o Owner può caricare risultati\"\n        description=\"La dashboard resta pubblica in sola lettura. Per importare partite e screenshot serve un ruolo autorizzato dall'admin.\"\n      />\n    );\n  }\n\n  return <ImportMatchEditor />;\n}\n\nfunction ImportMatchEditor() {\n  `;

src = before + replacement + after;
fs.writeFileSync(file, src, 'utf8');
console.log('✅ app/import/match/page.tsx patchato: guard permessi spostato fuori dagli hook React.');
