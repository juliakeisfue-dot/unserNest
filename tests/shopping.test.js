/**
 * tests/shopping.test.js
 * Tests für ShoppingManager: add, markBought, markStored, undo, remove.
 */
import { suite, test, eq, isTrue, isFalse, summary } from './helpers.js';
import { ShoppingManager } from '../modules/domains/shopping/manager.js';
import { createInitialState } from '../modules/core/config.js';

// ── Stubs ─────────────────────────────────────────────────────────────────────
const _log   = console.log;
const _error = console.error;
function silentConsole()  { console.log = () => {}; console.error = () => {}; }
function restoreConsole() { console.log = _log;     console.error = _error; }

function makeStorage() {
  const data = createInitialState();
  return {
    data,
    saveLocal: () => {},
  };
}

const noSync  = { markDirty: () => {} };
const noUsers = { getActive: () => null, addPoints: () => {} };

function freshManager() {
  return new ShoppingManager(makeStorage(), noSync, noUsers);
}

// ── add ───────────────────────────────────────────────────────────────────────
suite('ShoppingManager.add');

test('fügt Artikel hinzu und gibt true zurück', () => {
  const m = freshManager();
  isTrue(m.add('Milch'));
  eq(m.getItems().length, 1);
});

test('neuer Artikel hat Status offen und _deleted false', () => {
  const m = freshManager();
  m.add('Butter');
  const item = m.getItems()[0];
  eq(item.status, 'offen');
  isFalse(item._deleted);
});

test('speichert Notiz', () => {
  const m = freshManager();
  m.add('Eier', '10 Stück');
  eq(m.getItems()[0].note, '10 Stück');
});

test('leerer Name wird abgelehnt', () => {
  const m = freshManager();
  isFalse(m.add(''));
  eq(m.getItems().length, 0);
});

test('nur-Leerzeichen-Name wird abgelehnt', () => {
  const m = freshManager();
  isFalse(m.add('   '));
});

test('trimmt Artikelnamen', () => {
  const m = freshManager();
  m.add('  Käse  ');
  eq(m.getItems()[0].name, 'Käse');
});

test('ordnet neue Artikel automatisch einer Kategorie zu', () => {
  const m = freshManager();
  m.add('Milch');
  eq(m.getItems()[0].categoryId, 'chilled');
});

test('neue Kategorie kann angelegt und verwendet werden', () => {
  const m = freshManager();
  const created = m.addCategory('Backwaren');
  isTrue(!!created);
  isTrue(m.getCategoryDefinitions().some(c => c.id === created.id));
  m.add('Baguette', '', created.id);
  eq(m.getItems()[0].categoryId, created.id);
});

test('erhöht version', () => {
  const m = freshManager();
  const before = m.storage.data.version;
  m.add('Brot');
  eq(m.storage.data.version, before + 1);
});

// ── markBought ────────────────────────────────────────────────────────────────
suite('ShoppingManager.markBought');

test('Status wechselt zu gekauft', () => {
  const m = freshManager();
  m.add('Milch');
  const id = m.getItems()[0].id;
  isTrue(m.markBought(id));
  eq(m.storage.data.shoppingList.find(i => i.id === id).status, 'gekauft');
});

test('doppeltes markBought gibt false zurück', () => {
  const m = freshManager();
  m.add('Milch');
  const id = m.getItems()[0].id;
  m.markBought(id);
  isFalse(m.markBought(id));
});

test('unbekannte id gibt false', () => {
  const m = freshManager();
  isFalse(m.markBought('nicht-vorhanden'));
});

// ── undo ──────────────────────────────────────────────────────────────────────
suite('ShoppingManager.undo');

test('Status geht zurück auf offen', () => {
  const m = freshManager();
  m.add('Butter');
  const id = m.getItems()[0].id;
  m.markBought(id);
  isTrue(m.undo(id));
  eq(m.storage.data.shoppingList.find(i => i.id === id).status, 'offen');
});

test('undo auf offenem Artikel gibt false', () => {
  const m = freshManager();
  m.add('Butter');
  const id = m.getItems()[0].id;
  isFalse(m.undo(id));
});

// ── updateItem ────────────────────────────────────────────────────────────────
suite('ShoppingManager.updateItem');

test('bearbeitet Namen und Notiz eines offenen Artikels', () => {
  const m = freshManager();
  m.add('Tomaten', '2 Stk');
  const id = m.getItems()[0].id;
  isTrue(m.updateItem(id, { name: 'Bio-Tomaten', note: '4 Stk' }));
  const item = m.getItems()[0];
  eq(item.name, 'Bio-Tomaten');
  eq(item.note, '4 Stk');
});

test('leerer Name wird abgelehnt', () => {
  const m = freshManager();
  m.add('Milch');
  const id = m.getItems()[0].id;
  isFalse(m.updateItem(id, { name: '   ' }));
  eq(m.getItems()[0].name, 'Milch');
});

test('auch gekaufte Artikel koennen bearbeitet werden', () => {
  const m = freshManager();
  m.add('Joghurt', '1 Becher');
  const id = m.getItems()[0].id;
  m.markBought(id);
  isTrue(m.updateItem(id, { note: '2 Becher' }));
  eq(m.storage.data.shoppingList.find(i => i.id === id).note, '2 Becher');
});

test('Kategorie kann beim Bearbeiten geändert werden', () => {
  const m = freshManager();
  m.add('Bohnen');
  const id = m.getItems()[0].id;
  isTrue(m.updateItem(id, { categoryId: 'canned' }));
  eq(m.storage.data.shoppingList.find(i => i.id === id).categoryId, 'canned');
});

suite('ShoppingManager – Rezept-Zutaten Summen');

test('addOrMergeRecipeIngredient summiert gleiche Zutat mit gleicher Einheit', () => {
  const m = freshManager();
  const recipeA = { id: 'r1', name: 'Korean glazed Potatoes' };
  const recipeB = { id: 'r2', name: 'Würzige Hühnerbrust' };

  isTrue(m.addOrMergeRecipeIngredient('100 g Mayonnaise', recipeA));
  isTrue(m.addOrMergeRecipeIngredient('100 g Mayonnaise', recipeB));

  eq(m.getItems().length, 1);
  const mayo = m.getItems()[0];
  eq(mayo.name, 'Mayonnaise');
  eq(mayo.amountValue, 200);
  eq(mayo.amountUnit, 'g');
  eq(mayo.recipeSources.length, 2);
});

test('addOrMergeRecipeIngredient fügt unstrukturierte Mengen ohne Summe zusammen', () => {
  const m = freshManager();
  const recipeA = { id: 'r1', name: 'A' };
  const recipeB = { id: 'r2', name: 'B' };

  isTrue(m.addOrMergeRecipeIngredient('Mayo', recipeA));
  isTrue(m.addOrMergeRecipeIngredient('Mayo', recipeB));

  eq(m.getItems().length, 1);
  const item = m.getItems()[0];
  eq(item.name, 'Mayo');
  eq(item.amountValue, null);
  eq(item.recipeSources.length, 2);
});

// ── remove ────────────────────────────────────────────────────────────────────
suite('ShoppingManager.remove');

test('setzt _deleted auf true', () => {
  const m = freshManager();
  m.add('Zucker');
  const id = m.getItems()[0].id;
  isTrue(m.remove(id));
  isFalse(m.getItems().some(i => i.id === id), 'Artikel erscheint noch in getItems()');
  isTrue(m.storage.data.shoppingList.find(i => i.id === id)._deleted, 'Soft-Delete fehlt');
});

test('unbekannte id gibt false', () => {
  const m = freshManager();
  isFalse(m.remove('xyz'));
});

// ── markStored ────────────────────────────────────────────────────────────────
suite('ShoppingManager.markStored');

test('fügt Artikel zur Location hinzu und entfernt aus Liste', () => {
  const m = freshManager();
  m.add('Käse');
  const id = m.getItems()[0].id;
  m.markBought(id);
  silentConsole();
  const result = m.markStored(id, 'fridge');
  restoreConsole();
  isTrue(result);
  const fridge = m.storage.data.locations['fridge'];
  isTrue(fridge.items.some(i => i.name === 'Käse'));
  isFalse(m.getItems().some(i => i.id === id));
});

test('markStored ohne vorheriges kaufen gibt false', () => {
  const m = freshManager();
  m.add('Käse');
  const id = m.getItems()[0].id;
  silentConsole();
  const result = m.markStored(id, 'fridge');
  restoreConsole();
  isFalse(result);
});

test('markStored mit ungültiger locationId gibt false', () => {
  const m = freshManager();
  m.add('Käse');
  const id = m.getItems()[0].id;
  m.markBought(id);
  silentConsole();
  const result = m.markStored(id, 'nicht-vorhanden');
  restoreConsole();
  isFalse(result);
});

// ── cleanupDeleted ────────────────────────────────────────────────────────────
suite('ShoppingManager.cleanupDeleted');

test('entfernt alte gelöschte Einträge (>7 Tage)', () => {
  const m = freshManager();
  const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
  m.storage.data.shoppingList = [
    { id: 'old', name: 'Alt', _deleted: true, updatedAt: old },
    { id: 'new', name: 'Neu', _deleted: false, updatedAt: Date.now() },
  ];
  m.cleanupDeleted();
  isFalse(m.storage.data.shoppingList.some(i => i.id === 'old'));
  isTrue(m.storage.data.shoppingList.some(i => i.id === 'new'));
});

// ── markAllStoredToLocation (NEU: Massenraum-Funktion) ────────────────────

suite('ShoppingManager.markAllStoredToLocation');

test('mehrere gekaufte Artikel können in einen Raum geräumt werden', () => {
  const m = freshManager();

  // Mehrere Artikel hinzufügen und als gekauft markieren
  m.add('Butter');
  m.add('Eier');
  m.add('Käse');

  const items = m.getItems();
  items.forEach(item => m.markBought(item.id));

  // Alle zu Kühlschrank räumen
  silentConsole();
  let stored = 0;
  items.forEach(item => {
    if (m.markStored(item.id, 'fridge')) stored++;
  });
  restoreConsole();

  eq(stored, 3, 'Nicht alle 3 Artikel wurden geräumt');
  const fridge = m.storage.data.locations['fridge'];
  eq(fridge.items.filter(i => ['Butter', 'Eier', 'Käse'].includes(i.name)).length, 3);
});

test('alle Artikel aus Einkaufsliste werden entfernt nach Massenraum', () => {
  const m = freshManager();
  m.add('Butter');
  m.add('Milch');
  m.add('Zucker');

  const items = m.getItems();
  items.forEach(item => m.markBought(item.id));

  silentConsole();
  items.forEach(item => m.markStored(item.id, 'fridge'));
  restoreConsole();

  eq(m.getItems().length, 0, 'Einkaufsliste sollte leer sein');
});

test('Massenraum funktioniert mit benutzerdefinierten Räumen', () => {
  const m = freshManager();
  m.add('Paprika');
  m.add('Tomaten');

  const items = m.getItems();
  items.forEach(item => m.markBought(item.id));

  // In benutzerdefinierten Raum räumen
  silentConsole();
  let result = true;
  items.forEach(item => {
    if (!m.markStored(item.id, 'storage')) result = false;
  });
  restoreConsole();

  isTrue(result);
  const storage = m.storage.data.locations['storage'];
  isTrue(storage.items.some(i => i.name === 'Paprika'));
  isTrue(storage.items.some(i => i.name === 'Tomaten'));
});

summary();
