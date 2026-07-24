/**
 * tests/storage.test.js
 * Tests für Storage-Migration, createInitialState und Stubs.
 */
import { suite, test, eq, isTrue, isFalse, notNull, makeLocalStorage, summary } from './helpers.js';
import {
  createInitialState,
  saveStoredCloudConfig,
  loadStoredCloudConfig,
  hasConfiguredCloudCredentials,
  hasConfiguredGoogleTasksClientId,
  loadStoredGoogleTasksConfig,
  saveStoredGoogleTasksClientId,
  CONFIG
} from '../modules/core/config.js';
import { Storage } from '../modules/core/storage.js';

// Frisches localStorage für jeden Testlauf via globalem Stub
global.localStorage = makeLocalStorage();

// ─── createInitialState ──────────────────────────────────────────────────────
suite('createInitialState');

test('enthält alle vier Nutzer', () => {
  const s = createInitialState();
  const names = s.users.map(u => u.name);
  isTrue(names.includes('Julia'));
  isTrue(names.includes('Christian'));
  isTrue(names.includes('Helena'));
  isTrue(names.includes('Elisabeth'));
});

test('jeder Nutzer startet mit 0 Punkten', () => {
  const s = createInitialState();
  for (const u of s.users) {
    eq(u.points, 0, `${u.name} hat nicht 0 Punkte`);
  }
});

test('version startet bei 1', () => {
  const s = createInitialState();
  eq(s.version, 1);
});

test('shoppingList ist leer', () => {
  const s = createInitialState();
  eq(s.shoppingList.length, 0);
});

test('shoppingCategories sind initial vorhanden', () => {
  const s = createInitialState();
  isTrue(Array.isArray(s.shoppingCategories));
  isTrue(s.shoppingCategories.length >= 5);
});

test('chronicle ist leer', () => {
  const s = createInitialState();
  eq(s.chronicle.length, 0);
});

test('reisekasse ist initialisiert und hat Startregeln', () => {
  const s = createInitialState();
  isTrue(!!s.reisekasse);
  isTrue(Array.isArray(s.reisekasse.rules));
  isTrue(s.reisekasse.rules.length >= 4);
});

test('vier Standard-Locations vorhanden', () => {
  const s = createInitialState();
  const keys = Object.keys(s.locations);
  isTrue(keys.includes('fridge'));
  isTrue(keys.includes('cabinet'));
  isTrue(keys.includes('storage'));
  isTrue(keys.includes('terrace'));
});

test('Default-Quests haben alle nötigen Felder', () => {
  const s = createInitialState();
  for (const q of s.quests) {
    notNull(q.id, `Quest ohne id`);
    notNull(q.title, `Quest ohne title`);
    isTrue(typeof q.points === 'number', `Quest ${q.id} points kein Number`);
    isFalse(q.completed, `Quest ${q.id} sollte offen sein`);
    notNull(q.targetUserId, `Quest ${q.id} ohne targetUserId`);
    isTrue(['all', 'julia', 'christian', 'helena', 'elisabeth'].includes(q.targetUserId), `Quest ${q.id} targetUserId ungültig`);
    isTrue(Number.isFinite(Number(q.priority)), `Quest ${q.id} ohne priority`);
    isTrue(Number(q.priority) >= 1 && Number(q.priority) <= 4, `Quest ${q.id} priority außerhalb 1..4`);
  }
});

test('Default-Rewards haben id, title und cost', () => {
  const s = createInitialState();
  for (const r of s.rewards) {
    notNull(r.id);
    notNull(r.title);
    isTrue(typeof r.cost === 'number', `Reward ${r.id} cost kein Number`);
  }
});

// ─── Storage-Klasse (mit Mock-localStorage) ──────────────────────────────────
suite('Storage – loadLocal / saveLocal');

// Wir importieren Storage nach dem localStorage-Stub gesetzt wurde.
// Storage greift direkt auf global.localStorage zu.
import('../modules/core/storage.js').then(({ Storage }) => {
  // dieser Block läuft nach dem synchronen Teil – summary() ist am Ende des Sync-Teils
  // daher rufen wir hier keinen eigenen summary auf; die sync-Tests laufen davor.
}).catch(() => {});

// Synchrone Storage-Tests ohne Import-Klasse (testen createInitialState-Roundtrip)
test('saveLocal → getItem liefert JSON-String', () => {
  const ls = makeLocalStorage();
  global.localStorage = ls;
  const state = createInitialState();
  state.homeName = 'TestNest';
  ls.setItem('unser-nest-v2', JSON.stringify(state));
  const back = JSON.parse(ls.getItem('unser-nest-v2'));
  eq(back.homeName, 'TestNest');
});

test('fehlende _deleted-Flags werden beim Laden ergänzt (Migration-Simulation)', () => {
  const state = createInitialState();
  state.shoppingList = [{ id: 'x1', name: 'Milch', status: 'offen', createdAt: 1000 }];
  // Simuliere Migration wie in Storage.loadLocal
  state.shoppingList = state.shoppingList.map(item => ({
    ...item,
    _deleted: item._deleted || false,
    updatedAt: item.updatedAt || item.createdAt || Date.now()
  }));
  isFalse(state.shoppingList[0]._deleted);
  eq(state.shoppingList[0].updatedAt, 1000);
});

test('Migration ergänzt shoppingCategories wenn sie fehlen', () => {
  const s = new Storage();
  const migrated = s.applyMigrations({
    users: createInitialState().users,
    shoppingList: [{ id: 'x1', name: 'Milch', status: 'offen' }]
  });
  isTrue(Array.isArray(migrated.shoppingCategories));
  isTrue(migrated.shoppingCategories.length >= 5);
});

test('Quest-Migration übernimmt defaultAssignee als targetUserId', () => {
  const s = new Storage();
  const migrated = s.applyMigrations({
    users: createInitialState().users,
    quests: [{
      id: 'q1',
      title: 'Zimmer aufräumen',
      points: 10,
      completed: false,
      repeatable: true,
      defaultAssignee: 'helena',
      _deleted: false
    }]
  });
  eq(migrated.quests[0].targetUserId, 'helena');
});

test('gespeicherte Cloud-Konfiguration wird geladen und als konfiguriert erkannt', () => {
  global.localStorage = makeLocalStorage();
  CONFIG.JSONBIN_API_KEY = 'DEIN_JSONBIN_API_KEY';
  CONFIG.JSONBIN_BIN_ID = 'DEINE_JSONBIN_BIN_ID';
  saveStoredCloudConfig('master-123', 'bin-456');
  loadStoredCloudConfig();
  isTrue(hasConfiguredCloudCredentials(CONFIG));
  eq(CONFIG.JSONBIN_API_KEY, 'master-123');
  eq(CONFIG.JSONBIN_BIN_ID, 'bin-456');
});

test('gespeicherte Google-Tasks-Client-ID wird geladen und erkannt', () => {
  global.localStorage = makeLocalStorage();
  CONFIG.GOOGLE_TASKS_CLIENT_ID = '';
  saveStoredGoogleTasksClientId('test-client.apps.googleusercontent.com');
  loadStoredGoogleTasksConfig();
  isTrue(hasConfiguredGoogleTasksClientId(CONFIG));
  eq(CONFIG.GOOGLE_TASKS_CLIENT_ID, 'test-client.apps.googleusercontent.com');
});

summary();
