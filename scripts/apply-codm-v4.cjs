const fs = require('fs');
const path = require('path');

const root = process.cwd();
const source = path.join(root, '__codm_v4_source');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function removeIfExists(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function updateJson(file, mutator) {
  if (!fs.existsSync(file)) return;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutator(data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function patchOcrBackendCandidates() {
  const file = path.join(root, 'app', 'import', 'profile', 'page.tsx');
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  const newBlock = `const EXPECTED_BACKEND_VERSION = '2.0.0-definitive-ak47dx';\nconst ENV_BACKEND_URL = process.env.NEXT_PUBLIC_OCR_BACKEND_URL || '';\nfunction backendCandidates() {\n  const urls: string[] = [];\n  const envUrl = ENV_BACKEND_URL.trim().replace(/\\/$/, '');\n  if (envUrl) urls.push(envUrl);\n  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {\n    urls.push('http://127.0.0.1:8780', 'http://localhost:8780', 'http://127.0.0.1:8770', 'http://localhost:8770');\n  }\n  return Array.from(new Set(urls.filter(Boolean)));\n}\n`;

  const pattern = /const EXPECTED_BACKEND_VERSION = '2\.0\.0-definitive-ak47dx';[\s\S]*?function backendCandidates\(\) \{[\s\S]*?return Array\.from\(new Set\(urls\)\); \}/;
  if (pattern.test(text)) {
    text = text.replace(pattern, newBlock.trim());
  }
  const oldMsg = "if (!backendUrl) throw new Error(`Backend OCR 2.0 non raggiungibile/allineato.\\nVerifica http://127.0.0.1:8780/health = ${EXPECTED_BACKEND_VERSION}.\\nTentativi: ${attempts.join(' | ')}`);";
  const newMsg = "if (!backendUrl) throw new Error(`Backend OCR Hybrid 2.0 non raggiungibile o non allineato. Su Vercel devi impostare NEXT_PUBLIC_OCR_BACKEND_URL con un URL https pubblico. In locale verifica http://127.0.0.1:8780/health e che risponda version ${EXPECTED_BACKEND_VERSION}. Tentativi: ${attempts.join(' | ') || 'nessun URL configurato'}`);";
  text = text.replace(oldMsg, newMsg);
  fs.writeFileSync(file, text);
}

function patchGitignore() {
  const file = path.join(root, '.gitignore');
  let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = ['patch_files/', '__codm_v4_source/', 'components/*.bak_*'];
  for (const line of lines) if (!text.includes(line)) text += (text.endsWith('\n') || text.length === 0 ? '' : '\n') + line + '\n';
  fs.writeFileSync(file, text);
}

function patchTsconfig() {
  const file = path.join(root, 'tsconfig.json');
  updateJson(file, (json) => {
    json.exclude = Array.from(new Set([...(json.exclude || []), 'node_modules', 'patch_files', '__codm_v4_source', 'components/*.bak_*']));
  });
}

function verify() {
  const required = [
    'app/login/page.tsx',
    'app/auth/callback/page.tsx',
    'app/admin/users/page.tsx',
    'app/events/page.tsx',
    'app/api/telegram/reminders/route.ts',
    'app/ocr-status/page.tsx',
    'src/components/MobileSidebar.tsx',
    'src/lib/googleCalendar.ts',
    'src/lib/ocrBackend.ts',
    'supabase/06_auth_events_telegram_ocr_v4.sql',
  ];
  const missing = required.filter((f) => !fs.existsSync(path.join(root, f)));
  if (missing.length) throw new Error(`File mancanti dopo patch: ${missing.join(', ')}`);
}

removeIfExists(path.join(root, 'patch_files'));
copyDir(source, root);
patchOcrBackendCandidates();
patchGitignore();
patchTsconfig();
verify();
console.log('✅ CODM V4 patch applicata: login, admin users, eventi, OCR status, Telegram reminders.');
