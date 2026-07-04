const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'app', 'admin', 'users', 'page.tsx');
const s = fs.readFileSync(file, 'utf8');
if (!s.includes('normalizedMembers')) {
  console.error('❌ normalizedMembers non trovato in app/admin/users/page.tsx');
  process.exit(1);
}
if (!s.includes('Array.isArray(m.profiles)')) {
  console.error('❌ normalizzazione profiles array non trovata.');
  process.exit(1);
}
console.log('✅ Fix TypeScript admin utenti presente.');
