const fs = require('fs');
const path = require('path');

const target = path.join(process.cwd(), 'components', 'WriteAccessBlock.tsx');
if (!fs.existsSync(target)) {
  console.error('ERRORE: components/WriteAccessBlock.tsx non trovato.');
  process.exit(1);
}
const txt = fs.readFileSync(target, 'utf8');
for (const required of ['export function WriteAccessBlock', 'export default WriteAccessBlock', 'supabase.auth.getSession']) {
  if (!txt.includes(required)) {
    console.error(`ERRORE: componente incompleto, manca: ${required}`);
    process.exit(1);
  }
}
console.log('✅ WriteAccessBlock presente e valido.');
