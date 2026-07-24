/**
 * tests/sync.test.js
 * Tests für SyncManager.merge: Shopping-Liste, User-Punkte, Locations.
 */
import { suite, test, eq, isTrue, isFalse, summary } from './helpers.js';

// Stubs für Browser-APIs die sync.js beim Konstruieren nutzt
if (typeof window === 'undefined') {
  global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    app: null,
  };
}
if (typeof navigator === 'undefined') {
  global.navigator = { onLine: true };
}
if (typeof document === 'undefined') {
  global.document = { activeElement: null };
}

import { SyncManager } from '../modules/core/sync.js';
import { createInitialState } from '../modules/core/config.js';

// SyncManager braucht Storage nur für merge() – leichter Stub reicht.
function makeSyncMgr() {
  const storage = { data: createInitialState(), saveLocal: () => {} };
  return new SyncManager(storage);
}

function baseState(overrides = {}) {
  return { ...createInitialState(), ...overrides };
}

// ── merge – Shopping ──────────────────────────────────────────────────────────
suite('SyncManager.merge – ShoppingList');

test('neuere Cloud-Version eines Items gewinnt', () => {
  const mgr = makeSyncMgr();
  const t0 = 1000, t1 = 2000;
  const local = baseState({ shoppingList: [
    { id: 'i1', name: 'Lokal',  status: 'offen', updatedAt: t0, _deleted: false }
  ]});
  const cloud = baseState({ shoppingList: [
    { id: 'i1', name: 'Cloud',  status: 'gekauft', updatedAt: t1, _deleted: false }
  ]});
  const merged = mgr.merge(local, cloud);
  eq(merged.shoppingList.find(i => i.id === 'i1').name, 'Cloud');
  eq(merged.shoppingList.find(i => i.id === 'i1').status, 'gekauft');
});

test('neuere lokale Version eines Items gewinnt', () => {
  const mgr = makeSyncMgr();
  const local = baseState({ shoppingList: [
    { id: 'i1', name: 'Lokal-Neu', status: 'offen', updatedAt: 3000, _deleted: false }
  ]});
  const cloud = baseState({ shoppingList: [
    { id: 'i1', name: 'Cloud-Alt', status: 'offen', updatedAt: 1000, _deleted: false }
  ]});
  const merged = mgr.merge(local, cloud);
  eq(merged.shoppingList.find(i => i.id === 'i1').name, 'Lokal-Neu');
});

test('Cloud-only Item wird hinzugefügt', () => {
  const mgr = makeSyncMgr();
  const local = baseState({ shoppingList: [] });
  const cloud = baseState({ shoppingList: [
    { id: 'cloud1', name: 'NurCloud', status: 'offen', updatedAt: 1000, _deleted: false }
  ]});
  const merged = mgr.merge(local, cloud);
  isTrue(merged.shoppingList.some(i => i.id === 'cloud1'));
});

test('gelöschtes Cloud-only Item wird nicht hinzugefügt', () => {
  const mgr = makeSyncMgr();
  const local = baseState({ shoppingList: [] });
  const cloud = baseState({ shoppingList: [
    { id: 'del1', name: 'Gelöscht', status: 'offen', updatedAt: 1000, _deleted: true }
  ]});
  const merged = mgr.merge(local, cloud);
  isFalse(merged.shoppingList.some(i => i.id === 'del1'));
});

test('merged.version ist Maximum beider Versionen', () => {
  const mgr = makeSyncMgr();
  const local = baseState({ version: 5  });
  const cloud = baseState({ version: 12 });
  const merged = mgr.merge(local, cloud);
  eq(merged.version, 12);
});

suite('SyncManager.merge – ShoppingCategories');

test('Cloud-only Kategorie wird übernommen', () => {
  const mgr = makeSyncMgr();
  const local = baseState({ shoppingCategories: [{ id: 'produce', label: 'Obst', updatedAt: 100, _deleted: false }] });
  const cloud = baseState({
    shoppingCategories: [
      { id: 'produce', label: 'Obst', updatedAt: 100, _deleted: false },
      { id: 'cat-backwaren', label: 'Backwaren', updatedAt: 200, _deleted: false }
    ]
  });
  const merged = mgr.merge(local, cloud);
  isTrue(merged.shoppingCategories.some(c => c.id === 'cat-backwaren'));
});

// ── merge – Users ─────────────────────────────────────────────────────────────
suite('SyncManager.merge – Users');

test('neuere Cloud-User-Version gewinnt', () => {
  const mgr = makeSyncMgr();
  const local = baseState();
  const cloud = baseState();
  cloud.users = cloud.users.map(u =>
    u.id === 'julia' ? { ...u, points: 42, updatedAt: 9999 } : { ...u, updatedAt: 1 }
  );
  local.users = local.users.map(u => ({ ...u, updatedAt: 1 }));
  const merged = mgr.merge(local, cloud);
  eq(merged.users.find(u => u.id === 'julia').points, 42);
});

// ── merge – Home / Rewards ─────────────────────────────────────────────────────
suite('SyncManager.merge – Home/Rewards');

test('homeName wird anhand homeUpdatedAt korrekt uebernommen', () => {
  const mgr = makeSyncMgr();
  const local = baseState({ homeName: 'Alt', homeUpdatedAt: 100 });
  const cloud = baseState({ homeName: 'Neu', homeUpdatedAt: 200 });
  const merged = mgr.merge(local, cloud);
  eq(merged.homeName, 'Neu');
  eq(merged.homeUpdatedAt, 200);
});

test('reward aus Cloud wird uebernommen', () => {
  const mgr = makeSyncMgr();
  const local = baseState({ rewards: [] });
  const cloud = baseState({
    rewards: [{ id: 'reward-1', title: 'Pizzaabend', cost: 50, updatedAt: 100, _deleted: false }]
  });
  const merged = mgr.merge(local, cloud);
  isTrue(Array.isArray(merged.rewards));
  isTrue(merged.rewards.some(r => r.id === 'reward-1'));
});

test('neuere geloeschte Reward-Version gewinnt', () => {
  const mgr = makeSyncMgr();
  const local = baseState({
    rewards: [{ id: 'reward-1', title: 'Pizzaabend', cost: 50, updatedAt: 200, _deleted: true }]
  });
  const cloud = baseState({
    rewards: [{ id: 'reward-1', title: 'Pizzaabend', cost: 50, updatedAt: 100, _deleted: false }]
  });
  const merged = mgr.merge(local, cloud);
  isTrue(!!merged.rewards.find(r => r.id === 'reward-1')._deleted);
});

test('merge bleibt robust bei ungueltigen Cloud-Daten', () => {
  const mgr = makeSyncMgr();
  const local = baseState();
  const merged = mgr.merge(local, null);
  isTrue(!!merged);
  isTrue(Array.isArray(merged.users));
  isTrue(typeof merged.locations === 'object');
});

// ── merge – Aufgaben/Quests (Adressierung + Prioritaet) ───────────────────────
suite('SyncManager.merge – Quests Task-Felder');

test('neuere Cloud-Quest-Version gewinnt inkl. target/reporter/priority', () => {
  const mgr = makeSyncMgr();
  const local = baseState({
    quests: [{
      id: 'q-task-1',
      title: 'Loch stopfen',
      points: 10,
      completed: false,
      repeatable: true,
      targetUserId: 'all',
      reporterUserId: 'julia',
      priority: 2,
      updatedAt: 100,
      createdAt: 50
    }]
  });
  const cloud = baseState({
    quests: [{
      id: 'q-task-1',
      title: 'Loch stopfen',
      points: 10,
      completed: false,
      repeatable: true,
      targetUserId: 'helena',
      reporterUserId: 'christian',
      priority: 4,
      updatedAt: 200,
      createdAt: 50
    }]
  });

  const merged = mgr.merge(local, cloud);
  const q = merged.quests.find(x => x.id === 'q-task-1');
  eq(q.targetUserId, 'helena');
  eq(q.reporterUserId, 'christian');
  eq(q.priority, 4);
});

test('neuere lokale Quest-Version gewinnt inkl. target/reporter/priority', () => {
  const mgr = makeSyncMgr();
  const local = baseState({
    quests: [{
      id: 'q-task-2',
      title: 'Bett beziehen',
      points: 8,
      completed: false,
      repeatable: true,
      targetUserId: 'julia',
      reporterUserId: 'helena',
      priority: 3,
      updatedAt: 400,
      createdAt: 50
    }]
  });
  const cloud = baseState({
    quests: [{
      id: 'q-task-2',
      title: 'Bett beziehen',
      points: 8,
      completed: false,
      repeatable: true,
      targetUserId: 'all',
      reporterUserId: 'elisabeth',
      priority: 1,
      updatedAt: 200,
      createdAt: 50
    }]
  });

  const merged = mgr.merge(local, cloud);
  const q = merged.quests.find(x => x.id === 'q-task-2');
  eq(q.targetUserId, 'julia');
  eq(q.reporterUserId, 'helena');
  eq(q.priority, 3);
});

// ── merge – Locations ─────────────────────────────────────────────────────────
suite('SyncManager.merge – Locations');

test('Cloud-only Location-Item wird hinzugefügt', () => {
  const mgr = makeSyncMgr();
  const local = baseState();
  const cloud = baseState();
  cloud.locations['fridge'].items = [{ id: 'itm1', name: 'Joghurt', addedAt: 1000, updatedAt: 1000 }];
  const merged = mgr.merge(local, cloud);
  isTrue(merged.locations['fridge'].items.some(i => i.id === 'itm1'));
});

test('vorhandene lokale Location-Items bleiben erhalten', () => {
  const mgr = makeSyncMgr();
  const local = baseState();
  const cloud = baseState();
  local.locations['fridge'].items = [{ id: 'local1', name: 'Milch', addedAt: 500 }];
  cloud.locations['fridge'].items = [{ id: 'cloud1', name: 'Käse', addedAt: 600 }];
  const merged = mgr.merge(local, cloud);
  isTrue(merged.locations['fridge'].items.some(i => i.id === 'local1'));
  isTrue(merged.locations['fridge'].items.some(i => i.id === 'cloud1'));
});

test('neuere Cloud-Version eines bestehenden Location-Items gewinnt', () => {
  const mgr = makeSyncMgr();
  const local = baseState();
  const cloud = baseState();
  local.locations['fridge'].items = [{ id: 'i1', name: 'Milch', amount: '1 L', updatedAt: 100, _deleted: false }];
  cloud.locations['fridge'].items = [{ id: 'i1', name: 'Milch', amount: '2 L', updatedAt: 200, _deleted: false }];
  const merged = mgr.merge(local, cloud);
  eq(merged.locations['fridge'].items.find(i => i.id === 'i1').amount, '2 L');
});

test('neuere geloeschte Location-Item-Version bleibt geloescht', () => {
  const mgr = makeSyncMgr();
  const local = baseState();
  const cloud = baseState();
  local.locations['fridge'].items = [{ id: 'i1', name: 'Milch', updatedAt: 200, _deleted: true }];
  cloud.locations['fridge'].items = [{ id: 'i1', name: 'Milch', updatedAt: 100, _deleted: false }];
  const merged = mgr.merge(local, cloud);
  isTrue(!!merged.locations['fridge'].items.find(i => i.id === 'i1')._deleted);
});

test('unbekannte Cloud-Location wird eingefügt', () => {
  const mgr = makeSyncMgr();
  const local = baseState();
  const cloud = baseState();
  cloud.locations['keller'] = { id: 'keller', name: '🏚 Keller', items: [] };
  const merged = mgr.merge(local, cloud);
  isTrue('keller' in merged.locations);
});

test('neuere Cloud-Location-Metadaten gewinnen (name/maxAgeDays)', () => {
  const mgr = makeSyncMgr();
  const local = baseState();
  const cloud = baseState();

  local.locations['fridge'] = {
    ...local.locations['fridge'],
    name: '🧊 Alter Name',
    maxAgeDays: 90,
    updatedAt: 100
  };
  cloud.locations['fridge'] = {
    ...cloud.locations['fridge'],
    name: '🧊 Neuer Name',
    maxAgeDays: 120,
    updatedAt: 200
  };

  const merged = mgr.merge(local, cloud);
  eq(merged.locations['fridge'].name, '🧊 Neuer Name');
  eq(merged.locations['fridge'].maxAgeDays, 120);
});

test('neuere Cloud-Location-Loeschung gewinnt (_deleted)', () => {
  const mgr = makeSyncMgr();
  const local = baseState();
  const cloud = baseState();

  local.locations['cabinet'] = {
    ...local.locations['cabinet'],
    _deleted: false,
    updatedAt: 100
  };
  cloud.locations['cabinet'] = {
    ...cloud.locations['cabinet'],
    _deleted: true,
    updatedAt: 200
  };

  const merged = mgr.merge(local, cloud);
  isTrue(!!merged.locations['cabinet']._deleted);
});

// ── merge – Rezepte & Mealplan ───────────────────────────────────────────────
suite('SyncManager.merge – Recipes/MealPlan');

test('Cloud-only Rezept wird übernommen', () => {
  const mgr = makeSyncMgr();
  const local = baseState({ recipes: [] });
  const cloud = baseState({
    recipes: [{ id: 'recipe-1', name: 'Cloud-Rezept', ingredients: ['Nudeln'], createdAt: 10, updatedAt: 10 }]
  });
  const merged = mgr.merge(local, cloud);
  isTrue(Array.isArray(merged.recipes));
  isTrue(merged.recipes.some(r => r.id === 'recipe-1'));
});

test('neueres lokal gelöschtes Rezept bleibt gelöscht', () => {
  const mgr = makeSyncMgr();
  const local = baseState({
    recipes: [{ id: 'recipe-1', name: 'Alt', ingredients: ['Nudeln'], _deleted: true, updatedAt: 200 }]
  });
  const cloud = baseState({
    recipes: [{ id: 'recipe-1', name: 'Alt', ingredients: ['Nudeln'], _deleted: false, updatedAt: 100 }]
  });
  const merged = mgr.merge(local, cloud);
  isTrue(!!merged.recipes.find(r => r.id === 'recipe-1')._deleted);
});

test('Mealplan mit neuerem updatedAt gewinnt', () => {
  const mgr = makeSyncMgr();
  const local = baseState({ mealPlan: { updatedAt: 100, weekOffset: 0, slots: { '2026-03-16:lunchbox': { recipeId: 'a' } } } });
  const cloud = baseState({ mealPlan: { updatedAt: 200, weekOffset: 0, slots: { '2026-03-16:dinner': { recipeId: 'b' } } } });
  const merged = mgr.merge(local, cloud);
  isTrue(!!merged.mealPlan.slots['2026-03-16:dinner']);
  isFalse(!!merged.mealPlan.slots['2026-03-16:lunchbox']);
});

// ── merge – Reisekasse ────────────────────────────────────────────────────────
suite('SyncManager.merge – Reisekasse');

test('Cloud-only Reisekasse-Transaktion wird übernommen', () => {
  const mgr = makeSyncMgr();
  const local = baseState({
    reisekasse: { rules: [], transactions: [], weeklyStatements: [], updatedAt: 10 }
  });
  const cloud = baseState({
    reisekasse: {
      rules: [],
      transactions: [{ id: 'rk-tx-1', userId: 'julia', amountCents: 500, reason: 'A', occurredAt: 100, updatedAt: 100 }],
      weeklyStatements: [],
      updatedAt: 20
    }
  });
  const merged = mgr.merge(local, cloud);
  isTrue(Array.isArray(merged.reisekasse.transactions));
  isTrue(merged.reisekasse.transactions.some(t => t.id === 'rk-tx-1'));
});

test('Neuere lokale Regel gewinnt gegen aeltere Cloud-Regel', () => {
  const mgr = makeSyncMgr();
  const local = baseState({
    reisekasse: {
      rules: [{ id: 'r1', title: 'Lokal', amountCents: 200, updatedAt: 200 }],
      transactions: [],
      weeklyStatements: [],
      updatedAt: 200
    }
  });
  const cloud = baseState({
    reisekasse: {
      rules: [{ id: 'r1', title: 'Cloud', amountCents: 500, updatedAt: 100 }],
      transactions: [],
      weeklyStatements: [],
      updatedAt: 100
    }
  });
  const merged = mgr.merge(local, cloud);
  eq(merged.reisekasse.rules.find(r => r.id === 'r1').title, 'Lokal');
  eq(merged.reisekasse.rules.find(r => r.id === 'r1').amountCents, 200);
});

summary();
