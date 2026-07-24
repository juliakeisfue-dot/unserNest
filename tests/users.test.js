/**
 * tests/users.test.js
 * Tests für UserManager: Punkte vergeben, ausgeben, Chronik-Limit.
 */
import { suite, test, eq, isTrue, isFalse, summary } from './helpers.js';
import { UserManager } from '../modules/core/users.js';
import { createInitialState } from '../modules/core/config.js';

function makeStorage() {
  const data = createInitialState();
  data.activeUserId = 'julia'; // Hilfseigenschaft für Tests
  return {
    data,
    activeUserId: 'julia',
    saveLocal: () => {},
    getActiveUser: function () {
      return this.data.users.find(u => u.id === this.activeUserId);
    },
  };
}

const noSync = { markDirty: () => {} };

// ── addPoints ─────────────────────────────────────────────────────────────────
suite('UserManager.addPoints');

test('erhöht Punktestand', () => {
  const s = makeStorage();
  const um = new UserManager(s, noSync);
  um.addPoints('julia', 10, 'Test');
  eq(s.data.users.find(u => u.id === 'julia').points, 10);
});

test('legt Chronik-Eintrag an', () => {
  const s = makeStorage();
  const um = new UserManager(s, noSync);
  um.addPoints('julia', 5, 'Küche');
  isTrue(s.data.chronicle.length > 0);
  isTrue(s.data.chronicle[0].text.includes('Julia'));
  isTrue(s.data.chronicle[0].text.includes('+5'));
});

test('addPoints erhöht version', () => {
  const s = makeStorage();
  const um = new UserManager(s, noSync);
  const before = s.data.version;
  um.addPoints('julia', 5, 'Küche');
  isTrue(s.data.version > before);
});

test('unbekannter User ändert nichts', () => {
  const s = makeStorage();
  const um = new UserManager(s, noSync);
  um.addPoints('niemand', 99, 'x');
  eq(s.data.chronicle.length, 0);
});

test('Chronik wird auf 200 Einträge begrenzt', () => {
  const s = makeStorage();
  const um = new UserManager(s, noSync);
  for (let i = 0; i < 260; i++) um.addPoints('julia', 1, `Runde ${i}`);
  isTrue(s.data.chronicle.length <= 200,
    `Chronik hat ${s.data.chronicle.length} Einträge (max. 200)`);
});

// ── spendPoints ───────────────────────────────────────────────────────────────
suite('UserManager.spendPoints');

test('zieht Punkte ab und gibt true zurück', () => {
  const s = makeStorage();
  const um = new UserManager(s, noSync);
  um.addPoints('julia', 50, 'Sammeln');
  isTrue(um.spendPoints('julia', 30, 'Belohnung'));
  eq(s.data.users.find(u => u.id === 'julia').points, 20);
});

test('spendPoints erhöht version', () => {
  const s = makeStorage();
  const um = new UserManager(s, noSync);
  um.addPoints('julia', 50, 'Sammeln');
  const before = s.data.version;
  um.spendPoints('julia', 30, 'Belohnung');
  isTrue(s.data.version > before);
});

test('legt negativen Chronik-Eintrag an', () => {
  const s = makeStorage();
  const um = new UserManager(s, noSync);
  um.addPoints('julia', 50, 'Sammeln');
  um.spendPoints('julia', 30, 'Kino');
  const entry = s.data.chronicle.find(e => e.text.includes('-30'));
  isTrue(!!entry, 'Kein negativer Chronik-Eintrag gefunden');
});

test('zu wenig Punkte gibt false zurück und ändert nichts', () => {
  const s = makeStorage();
  const um = new UserManager(s, noSync);
  isFalse(um.spendPoints('julia', 999, 'Zu teuer'));
  eq(s.data.users.find(u => u.id === 'julia').points, 0);
});

test('unbekannter User gibt false', () => {
  const s = makeStorage();
  const um = new UserManager(s, noSync);
  isFalse(um.spendPoints('niemand', 10, 'x'));
});

summary();
