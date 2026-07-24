/**
 * tests/sw.test.js
 * Regressionstest fuer den Service-Worker-Install-Flow.
 */

let passed = 0;
let failed = 0;

function suite(name) {
  console.log(`\n  ${name}`);
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`    ✅  ${name}`);
    passed++;
  } catch (e) {
    console.log(`    ❌  ${name}`);
    console.log(`         → ${e.message}`);
    failed++;
  }
}

function isTrue(value, msg) {
  if (!value) throw new Error(msg || `Erwartet true, erhalten ${value}`);
}

suite('ServiceWorker – install Regression');

await test('install bleibt erfolgreich bei einzelner cache.add-Fehlermeldung', async () => {
  const listeners = {};
  const warnLogs = [];
  let addCalls = 0;

  const originalWarn = console.warn;
  console.warn = (...args) => { warnLogs.push(args.map(String).join(' ')); };

  global.fetch = async () => ({ ok: true });

  global.self = {
    location: { origin: 'https://example.test' },
    addEventListener: (type, handler) => { listeners[type] = handler; },
    skipWaiting: () => {},
    clients: { claim: () => {} }
  };

  global.caches = {
    open: async () => ({
      add: async (asset) => {
        addCalls++;
        if (asset.includes('192x192.png')) {
          throw new Error('404 Not Found');
        }
      }
    }),
    keys: async () => [],
    delete: async () => true,
    match: async () => null
  };

  try {
    await import('../sw.js');

    const installHandler = listeners.install;
    isTrue(typeof installHandler === 'function', 'install-Handler wurde nicht registriert');

    let installPromise = null;
    installHandler({
      waitUntil: (promise) => { installPromise = promise; }
    });

    isTrue(installPromise && typeof installPromise.then === 'function', 'waitUntil erhielt kein Promise');
    await installPromise;

    isTrue(addCalls > 0, 'Es wurden keine Assets zum Cache hinzugefuegt');
    isTrue(warnLogs.some(line => line.includes('Asset konnte nicht gecacht werden')), 'Fehler wurde nicht als Warnung protokolliert');
  } finally {
    console.warn = originalWarn;
  }
});

const total = passed + failed;
console.log(`\n${'─'.repeat(50)}`);
console.log(`  ${total} Tests   ✅ ${passed} bestanden   ❌ ${failed} fehlgeschlagen`);
console.log(`${'─'.repeat(50)}\n`);

if (failed > 0) process.exit(1);


