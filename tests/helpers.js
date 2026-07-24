/**
 * tests/helpers.js
 * Minimales Test-Framework + Stubs für Browser-APIs (kein npm nötig).
 */

// ── Mini-Test-Runner ────────────────────────────────────────────────────────

let _passed = 0;
let _failed = 0;
let _currentSuite = '';

export function suite(name) {
  _currentSuite = name;
  console.log(`\n  ${name}`);
}

export function test(name, fn) {
  try {
    fn();
    console.log(`    ✅  ${name}`);
    _passed++;
  } catch (e) {
    console.log(`    ❌  ${name}`);
    console.log(`         → ${e.message}`);
    _failed++;
  }
}

export function summary() {
  const total = _passed + _failed;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${total} Tests   ✅ ${_passed} bestanden   ❌ ${_failed} fehlgeschlagen`);
  console.log(`${'─'.repeat(50)}\n`);
  if (_failed > 0) process.exit(1);
}

// ── Assertions ──────────────────────────────────────────────────────────────

export function eq(actual, expected, msg) {
  if (actual !== expected)
    throw new Error(msg || `Erwartet ${JSON.stringify(expected)}, erhalten ${JSON.stringify(actual)}`);
}

export function deepEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b)
    throw new Error(msg || `Erwartet ${b}, erhalten ${a}`);
}

export function isTrue(val, msg) {
  if (!val) throw new Error(msg || `Erwartet true, erhalten ${val}`);
}

export function isFalse(val, msg) {
  if (val) throw new Error(msg || `Erwartet false, erhalten ${val}`);
}

export function isNull(val, msg) {
  if (val !== null) throw new Error(msg || `Erwartet null, erhalten ${JSON.stringify(val)}`);
}

export function notNull(val, msg) {
  if (val == null) throw new Error(msg || `Erwartet nicht-null`);
}

export function throws(fn, msgContains, label) {
  let threw = false;
  try { fn(); } catch (e) {
    threw = true;
    if (msgContains && !e.message.includes(msgContains))
      throw new Error(`${label || ''} Falscher Fehlertext: "${e.message}", erwartet enthält "${msgContains}"`);
  }
  if (!threw) throw new Error(label || 'Erwartet einen Fehler, keiner wurde geworfen');
}

// ── Browser-Stubs für Node.js ───────────────────────────────────────────────

/** Minimales localStorage-Stub (in-memory). */
export function makeLocalStorage() {
  const store = {};
  return {
    getItem: k => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

global.localStorage = makeLocalStorage();

