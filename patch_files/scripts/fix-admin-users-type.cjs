const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'app', 'admin', 'users', 'page.tsx');
let s = fs.readFileSync(file, 'utf8');

const backup = file + '.bak_admin_users_type_fix';
if (!fs.existsSync(backup)) fs.writeFileSync(backup, s, 'utf8');

const oldLine = `setMembers((memberData || []) as Member[]);`;
const newBlock = `const normalizedMembers = (memberData || []).map((m: any) => ({\n      ...m,\n      profiles: Array.isArray(m.profiles) ? (m.profiles[0] || null) : (m.profiles || null),\n    }));\n    setMembers(normalizedMembers as Member[]);`;

if (s.includes(oldLine)) {
  s = s.replace(oldLine, newBlock);
} else if (!s.includes('normalizedMembers')) {
  // More tolerant fallback for formatted files.
  s = s.replace(/setMembers\(\(memberData \|\| \[\]\) as Member\[\]\);/g, newBlock);
}

// If a previous patch made profiles an array, keep Member compatible with object normalized above.
s = s.replace(
  /profiles\?:\s*\{\s*display_name:\s*string\s*\|\s*null\s*\}\[\]\s*\|\s*null\s*;/g,
  'profiles?: { display_name: string | null } | null;'
);

fs.writeFileSync(file, s, 'utf8');
console.log('✅ app/admin/users/page.tsx aggiornato: Supabase profiles[] normalizzato in profiles oggetto singolo.');
