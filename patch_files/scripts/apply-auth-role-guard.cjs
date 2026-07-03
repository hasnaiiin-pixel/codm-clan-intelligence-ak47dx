const fs = require('fs');
const path = require('path');

const root = process.cwd();
const protectedPages = [
  'app/import/match/page.tsx',
  'app/invite/page.tsx',
  'app/deploy/page.tsx',
  'app/yolo/page.tsx',
  'app/calibration/page.tsx'
];

function backup(file) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) return;
  const backupDir = path.join(root, '_codm_backup_before_auth_role_guard');
  const dst = path.join(backupDir, file);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (!fs.existsSync(dst)) fs.copyFileSync(abs, dst);
}

function addImport(text) {
  const importLine = "import { useCodmAuth } from '@/lib/authRoles';\nimport { WriteAccessBlock } from '@/components/WriteAccessBlock';\n";
  if (text.includes("@/lib/authRoles") || text.includes('useCodmAuth')) return text;
  if (text.trimStart().startsWith("'use client';")) {
    return text.replace("'use client';", "'use client';\n" + importLine);
  }
  if (text.trimStart().startsWith('"use client";')) {
    return text.replace('"use client";', '"use client";\n' + importLine);
  }
  return "'use client';\n" + importLine + text;
}

function addGuard(text, file) {
  if (text.includes('CODM_AUTH_ROLE_GUARD_INSERTED')) return text;
  const guard = `\n  // CODM_AUTH_ROLE_GUARD_INSERTED\n  const codmAuth = useCodmAuth();\n  if (codmAuth.loading) return <WriteAccessBlock loading />;\n  if (!codmAuth.canWrite) return <WriteAccessBlock role={codmAuth.role} />;\n`;
  const match = text.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/);
  if (!match) {
    console.warn(`[SKIP] Non trovo export default function in ${file}`);
    return text;
  }
  const idx = text.indexOf(match[0]);
  const insertAt = idx + match[0].length;
  return text.slice(0, insertAt) + guard + text.slice(insertAt);
}

for (const file of protectedPages) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) {
    console.log(`[INFO] ${file} non esiste, salto.`);
    continue;
  }
  backup(file);
  let text = fs.readFileSync(abs, 'utf8');
  text = addImport(text);
  text = addGuard(text, file);
  fs.writeFileSync(abs, text, 'utf8');
  console.log(`[OK] guard inserito in ${file}`);
}

console.log('\nAuth Role Guard applicato. Backup in _codm_backup_before_auth_role_guard');
