import fs from 'node:fs';

const file = 'package.json';
try {
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = JSON.parse(raw);
  console.log('✅ package.json valido');
  console.log(`name: ${parsed.name}`);
  console.log(`node: ${parsed.engines?.node ?? 'non impostato'}`);
  console.log(`packageManager: ${parsed.packageManager ?? 'non impostato'}`);
} catch (error) {
  console.error('❌ package.json NON valido');
  console.error(error.message);
  process.exit(1);
}
