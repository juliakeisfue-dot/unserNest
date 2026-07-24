/**
 * tests/backup.test.js
 * Tests für Konfig-Backups (Bundle + Teil-Dateien).
 */
import { suite, test, eq, isTrue, isFalse, deepEq, summary } from './helpers.js';
import { createInitialState } from '../modules/core/config.js';
import {
  createBundle,
  createParts,
  createSummary,
  importFromDocuments,
  BACKUP_KIND_BUNDLE,
  BACKUP_KIND_PART
} from '../modules/core/backup.js';

// Fester Referenzzeitpunkt: Montag 2026-03-16 (diese Woche)
const NOW = new Date('2026-03-19T10:00:00.000Z'); // Donnerstag

suite('Backup - Bundle und Teilimporte');

function makeState() {
  const state = createInitialState();
  state.homeName = 'TestNest';
  state.version = 12;
  state.chronicle = [
    { id: 'chr-1', emoji: '💸', text: 'Geldstrafe Test', timestamp: 1, date: 'Mo, 10:00', metadata: { questId: 'q1' } }
  ];
  state.reisekasse = {
    rules: [{ id: 'rk-rule-1', title: 'Bad zu spaet', amountCents: 200, _deleted: false }],
    transactions: [{ id: 'rk-tx-1', userId: 'helena', userName: 'Helena', amountCents: 200, reason: 'Geldstrafe', _deleted: false }],
    weeklyStatements: [],
    updatedAt: 123
  };
  state.recipes = [
    { id: 'r1', name: 'Testrezept', ingredients: ['Ei'], _deleted: false },
    { id: 'r2', name: 'Gelöscht', ingredients: ['Mehl'], _deleted: true }
  ];
  state.shoppingList = [
    { id: 's1', name: 'Milch', status: 'offen', amountValue: 200, amountUnit: 'g', recipeSources: [{ recipeId: 'r1', recipeName: 'R1' }], _deleted: false },
    { id: 's2', name: 'Brot', status: 'eingeräumt', _deleted: false },   // soll nicht im Backup
    { id: 's3', name: 'Käse', status: 'gekauft', _deleted: false }
  ];
  state.shoppingCategories = [
    { id: 'produce', label: '🥕 Frisches Obst & Gemüse', _deleted: false },
    { id: 'cat-backwaren', label: 'Backwaren', _deleted: false }
  ];
  state.mealPlan = {
    weekOffset: 0,
    updatedAt: Date.now(),
    activeMeals: ['lunchbox', 'dinner'],
    slots: {
      '2026-03-20:lunchbox': { recipeId: 'r1', cooked: false, ratings: [] },       // diese Woche → behalten
      '2026-03-17:dinner':   { recipeId: 'r1', cooked: false, ratings: [] },        // letzte Woche, kein Rating → behalten (14-Tage-Fenster)
      '2025-12-01:dinner':   { recipeId: 'r1', cooked: true,  ratings: [] },        // alt (>14 Tage), kein Rating → wegwerfen
      '2025-12-01:lunchbox': { recipeId: 'r1', cooked: true,  ratings: [{ userId: 'julia', stars: 3 }] } // alt, bewertet → behalten
    }
  };
  return state;
}

test('createBundle erzeugt erwartetes Format', () => {
  const state = makeState();
  const bundle = createBundle(state, 'julia', NOW);

  eq(bundle.kind, BACKUP_KIND_BUNDLE);
  eq(bundle.schemaVersion, 2);
  eq(bundle.activeUserId, 'julia');
  eq(bundle.sections.core.homeName, 'TestNest');
});

test('createBundle enthält keine gelöschten Rezepte', () => {
  const state = makeState();
  const bundle = createBundle(state, 'julia', NOW);
  isFalse(bundle.sections.recipes.some(r => r._deleted), 'Gelöschtes Rezept darf nicht im Bundle sein');
  eq(bundle.sections.recipes.length, 1);
});

test('createBundle filtert eingeräumte Einkaufsartikel heraus', () => {
  const state = makeState();
  const bundle = createBundle(state, 'julia', NOW);
  isFalse(bundle.sections.shoppingList.some(i => i.status === 'eingeräumt'), 'eingeräumte Artikel nicht im Bundle');
  eq(bundle.sections.shoppingList.length, 2); // offen + gekauft
});

test('createBundle enthält Einkaufskategorien und Rezept-Metadaten', () => {
  const state = makeState();
  const bundle = createBundle(state, 'julia', NOW);
  isTrue(Array.isArray(bundle.sections.shoppingCategories));
  isTrue(bundle.sections.shoppingCategories.some(c => c.id === 'cat-backwaren'));
  eq(bundle.sections.shoppingList[0].amountValue, 200);
  eq(bundle.sections.shoppingList[0].amountUnit, 'g');
  eq(bundle.sections.shoppingList[0].recipeSources.length, 1);
});

test('createBundle enthält keine Kassenbons', () => {
  const state = makeState();
  const bundle = createBundle(state, 'julia', NOW);
  eq(bundle.sections.bills, undefined, 'bills darf nicht im Bundle sein');
});

test('createBundle enthält keinen changelog-Bereich', () => {
  const state = makeState();
  const bundle = createBundle(state, 'julia', NOW);
  eq(bundle.sections.changelog, undefined, 'changelog darf nicht im Bundle sein');
});

test('createBundle enthält Reisekasse und Chronik', () => {
  const state = makeState();
  const bundle = createBundle(state, 'julia', NOW);
  eq(bundle.sections.reisekasse.transactions.length, 1);
  eq(bundle.sections.chronicle.length, 1);
  eq(bundle.sections.chronicle[0].text, 'Geldstrafe Test');
});

test('createBundle enthaelt Aufgaben-Metadaten (target/reporter/priority)', () => {
  const state = makeState();
  state.quests = [{
    id: 'custom-task-1',
    title: 'Loch stopfen',
    points: 10,
    completed: false,
    repeatable: true,
    targetUserId: 'julia',
    reporterUserId: 'helena',
    priority: 4,
    createdAt: 1,
    updatedAt: 2
  }];
  const bundle = createBundle(state, 'julia', NOW);
  const q = bundle.sections.quests[0];
  eq(q.targetUserId, 'julia');
  eq(q.reporterUserId, 'helena');
  eq(q.priority, 4);
});

test('Speiseplan: alter Slot ohne Bewertung wird herausgefiltert', () => {
  const state = makeState();
  const bundle = createBundle(state, 'julia', NOW);
  const slots = bundle.sections.mealPlan.slots;
  isFalse(Object.prototype.hasOwnProperty.call(slots, '2025-12-01:dinner'), 'Alter Slot (>14 Tage) ohne Bewertung muss raus');
});

test('Speiseplan: Slot der letzten Woche bleibt erhalten (14-Tage-Fenster)', () => {
  const state = makeState();
  const bundle = createBundle(state, 'julia', NOW);
  const slots = bundle.sections.mealPlan.slots;
  isTrue(Object.prototype.hasOwnProperty.call(slots, '2026-03-17:dinner'), 'Slot der letzten Woche muss im 14-Tage-Fenster bleiben');
});

test('Speiseplan: alter bewerteter Slot bleibt erhalten', () => {
  const state = makeState();
  const bundle = createBundle(state, 'julia', NOW);
  const slots = bundle.sections.mealPlan.slots;
  isTrue(Object.prototype.hasOwnProperty.call(slots, '2025-12-01:lunchbox'), 'Bewerteter alter Slot muss bleiben');
});

test('Speiseplan: Slot dieser Woche bleibt erhalten', () => {
  const state = makeState();
  const bundle = createBundle(state, 'julia', NOW);
  const slots = bundle.sections.mealPlan.slots;
  isTrue(Object.prototype.hasOwnProperty.call(slots, '2026-03-20:lunchbox'), 'Slot dieser Woche muss bleiben');
});

test('createSummary enthält alle Sektionen', () => {
  const state = makeState();
  const sum = createSummary(state, NOW);
  isTrue(sum.some(s => s.key === 'recipes'));
  isTrue(sum.some(s => s.key === 'mealPlan'));
  isTrue(sum.some(s => s.key === 'quests'));
  isTrue(sum.some(s => s.key === 'reisekasse'));
  isTrue(sum.some(s => s.key === 'chronicle'));
  isTrue(sum.every(s => typeof s.label === 'string'));
});

test('createParts erzeugt mehrere Konfig-Dateien', () => {
  const state = makeState();
  const parts = createParts(state, 'helena', NOW);
  isTrue(parts.length >= 7, 'Zu wenige Teil-Dateien');
  isTrue(parts.every(p => p.kind === BACKUP_KIND_PART));
  isTrue(parts.every(p => p.schemaVersion === 2));
  isTrue(parts.some(p => p.section === 'mealPlan'));
  isFalse(parts.some(p => p.section === 'changelog'));
});

test('importFromDocuments importiert Bundle', () => {
  const state = makeState();
  const bundle = createBundle(state, 'christian', NOW);
  const out = importFromDocuments([bundle], createInitialState());

  eq(out.activeUserId, 'christian');
  eq(out.state.homeName, 'TestNest');
  eq(out.state.reisekasse.transactions.length, 1);
  eq(out.state.chronicle.length, 1);
});

test('importFromDocuments patched mit Teil-Datei in bestehende Daten', () => {
  const current = makeState();
  current.homeName = 'Alt';
  const parts = createParts(makeState(), 'elisabeth', NOW);
  const mealPlanPart = parts.find(p => p.section === 'mealPlan');

  const out = importFromDocuments([mealPlanPart], current);

  eq(out.state.homeName, 'Alt');
  eq(out.state.mealPlan.weekOffset, 0);
  eq(out.activeUserId, 'elisabeth');
});

summary();


