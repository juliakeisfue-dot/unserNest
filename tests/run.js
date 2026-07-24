/**
 * tests/run.js
 * Führt alle Test-Dateien sequentiell aus und bricht bei Fehlern ab.
 *
 * Verwendung (im Projektordner):
 *   node --experimental-vm-modules tests/run.js
 *   oder kürzer:
 *   node tests/run.js
 */
import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = readdirSync(__dirname)
  .filter(f => f.endsWith('.test.js'))
  .sort();

const sep = '═'.repeat(52);
console.log(`\n${sep}`);
console.log('  🧪  unserNest – lokale Test-Suite');
console.log(`${sep}`);

let totalPassed = 0;
let totalFailed = 0;
let anyFailed   = false;

for (const file of files) {
  const label = file.replace('.test.js', '');
  const filePath = path.join(__dirname, file);

  try {
    const out = execSync(
      `node "${filePath}"`,
      { encoding: 'utf8', cwd: path.join(__dirname, '..') }
    );
    process.stdout.write(out);

    // Auslesen der Zeile mit "Tests   ✅ X bestanden   ❌ Y"
    const m = out.match(/✅\s+(\d+)\s+bestanden\s+❌\s+(\d+)/);
    if (m) {
      totalPassed += parseInt(m[1], 10);
      totalFailed += parseInt(m[2], 10);
      if (parseInt(m[2], 10) > 0) anyFailed = true;
    }
  } catch (err) {
    console.log(`\n  ❌  ${label}  →  Ausführungsfehler:`);
    console.log(err.stdout || err.message);
    anyFailed = true;
  }
}

console.log(`\n${sep}`);
console.log(`  Gesamt:  ✅ ${totalPassed} bestanden   ❌ ${totalFailed} fehlgeschlagen`);
console.log(`${sep}\n`);

if (anyFailed) process.exit(1);

