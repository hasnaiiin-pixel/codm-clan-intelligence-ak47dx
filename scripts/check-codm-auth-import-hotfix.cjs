const fs = require('fs');
const required = [
  'app/login/page.tsx',
  'app/admin/users/page.tsx',
  'app/profile-import/page.tsx',
  'src/components/WriteAccessBlock.tsx',
  'scripts/fix-codm-import-match-hooks.cjs',
  'supabase/05_auth_profiles_admin_approval.sql',
];
let ok = true;
for (const f of required) {
  if (!fs.existsSync(f)) {
    console.error('❌ Mancante:', f);
    ok = false;
  } else {
    console.log('✅', f);
  }
}
if (fs.existsSync('patch_files')) {
  console.error('❌ patch_files è ancora presente. Deve essere rimosso.');
  ok = false;
}
const importMatch = fs.existsSync('app/import/match/page.tsx') ? fs.readFileSync('app/import/match/page.tsx','utf8') : '';
if (!importMatch.includes('function ImportMatchEditor()')) {
  console.error('❌ Import match non è hook-safe: manca function ImportMatchEditor().');
  ok = false;
} else {
  console.log('✅ Import match hook-safe presente.');
}
process.exit(ok ? 0 : 1);
