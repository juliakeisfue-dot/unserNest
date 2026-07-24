/**
 * tests/inventory.test.js
 * Tests fuer InventoryManager: add, update, move, remove.
 */
import { suite, test, eq, isTrue, isFalse, throws, summary } from './helpers.js';
import { InventoryManager } from '../modules/domains/inventory/manager.js';
import { createInitialState } from '../modules/core/config.js';

function makeStorage() {
  return {
    data: createInitialState(),
    saveLocal: () => {},
  };
}

const noSync = { markDirty: () => {} };

function freshManager() {
  return new InventoryManager(makeStorage(), noSync);
}

suite('InventoryManager.addItem');

test('fuegt Artikel an gueltigem Ort hinzu', () => {
  const m = freshManager();
  isTrue(m.addItem('fridge', 'Milch', '1L'));
  eq(m.getLocation('fridge').items.length, 1);
  eq(m.getLocation('fridge').items[0].name, 'Milch');
});

test('ungueltiger Ort gibt false', () => {
  const m = freshManager();
  isFalse(m.addItem('unknown', 'Milch'));
});

test('gleicher Artikel am selben Ort wird zusammengefuehrt (keine Duplikate)', () => {
  const m = freshManager();
  isTrue(m.addItem('fridge', 'Milch', '1L'));
  isTrue(m.addItem('fridge', 'milch', '500ml'));
  eq(m.getLocation('fridge').items.length, 1);
  eq(m.getLocation('fridge').items[0].amount, '1.5 L');
});

test('summiert Gewichtsangaben (kg + g)', () => {
  const m = freshManager();
  isTrue(m.addItem('fridge', 'Kartoffeln', '1kg'));
  isTrue(m.addItem('fridge', 'kartoffeln', '250g'));
  eq(m.getLocation('fridge').items[0].amount, '1.25 kg');
});

test('summiert Stueckzahlen', () => {
  const m = freshManager();
  isTrue(m.addItem('fridge', 'Eier', '3 Stk'));
  isTrue(m.addItem('fridge', 'eier', '2x'));
  eq(m.getLocation('fridge').items[0].amount, '5 Stk');
});

test('normalisiert Mengen-Eingaben mit Leerzeichen/Komma', () => {
  const m = freshManager();
  isTrue(m.addItem('fridge', 'Saft', '500 ml'));
  isTrue(m.addItem('fridge', 'saft', '1,5 l'));
  eq(m.getLocation('fridge').items[0].amount, '2 L');
});

test('setzt expiresAt fuer Kuehlschrank auf Kaufdatum + 90 Tage', () => {
  const m = freshManager();
  isTrue(m.addItem('fridge', 'Joghurt', '2 Stk | 2026-03-14'));
  const item = m.getLocation('fridge').items[0];
  const d = new Date(item.expiresAt);
  eq(d.getFullYear(), 2026);
  eq(d.getMonth(), 5); // Juni (0-basiert)
  eq(d.getDate(), 12);
});

test('setzt expiresAt fuer andere Orte standardmaessig auf 730 Tage', () => {
  const m = freshManager();
  isTrue(m.addItem('storage', 'Dose', '1 Stk | 2026-03-14'));
  const item = m.getLocation('storage').items[0];
  const d = new Date(item.expiresAt);
  eq(d.getFullYear(), 2028);
  eq(d.getMonth(), 2); // Maerz
  eq(d.getDate(), 13);
});

suite('InventoryManager.updateItem');

test('aktualisiert Name und Menge', () => {
  const m = freshManager();
  m.addItem('fridge', 'Milch', '1L');
  const item = m.getLocation('fridge').items[0];
  isTrue(m.updateItem('fridge', item.id, { name: 'Hafermilch', amount: '2L' }));
  eq(m.getLocation('fridge').items[0].name, 'Hafermilch');
  eq(m.getLocation('fridge').items[0].amount, '2 L');
});

test('update normalisiert Stueckzahl-Eingaben', () => {
  const m = freshManager();
  m.addItem('fridge', 'Eier', '1 Stk');
  const item = m.getLocation('fridge').items[0];
  isTrue(m.updateItem('fridge', item.id, { amount: '2 x' }));
  eq(m.getLocation('fridge').items[0].amount, '2 Stk');
});

test('leerer Name wird abgelehnt', () => {
  const m = freshManager();
  m.addItem('fridge', 'Milch', '1L');
  const item = m.getLocation('fridge').items[0];
  isFalse(m.updateItem('fridge', item.id, { name: '   ' }));
});

test('unbekannter Artikel gibt false', () => {
  const m = freshManager();
  isFalse(m.updateItem('fridge', 'x', { name: 'Neu' }));
});

suite('InventoryManager.moveItem');

test('verschiebt Artikel in anderen Ort', () => {
  const m = freshManager();
  m.addItem('fridge', 'Milch', '1L');
  const item = m.getLocation('fridge').items[0];
  isTrue(m.moveItem('fridge', 'cabinet', item.id));
  eq(m.getLocation('fridge').items.length, 0);
  eq(m.getLocation('cabinet').items.length, 1);
  eq(m.getLocation('cabinet').items[0].name, 'Milch');
});

test('ungueltige Ziel-Location gibt false', () => {
  const m = freshManager();
  m.addItem('fridge', 'Milch', '1L');
  const item = m.getLocation('fridge').items[0];
  isFalse(m.moveItem('fridge', 'unknown', item.id));
});

test('verschieben auf Ort mit gleichem Artikel fuehrt zusammen', () => {
  const m = freshManager();
  m.addItem('fridge', 'Milch', '1L');
  m.addItem('cabinet', 'MILCH', '500ml');
  const item = m.getLocation('fridge').items[0];

  isTrue(m.moveItem('fridge', 'cabinet', item.id));
  eq(m.getLocation('fridge').items.length, 0);
  eq(m.getLocation('cabinet').items.length, 1);
  eq(m.getLocation('cabinet').items[0].amount, '1.5 L');
});

suite('InventoryManager.removeLocation');

test('entfernt leeren Ort', () => {
  const m = freshManager();
  const id = m.addLocation('Keller', '📦');
  isTrue(m.removeLocation(id));
  isFalse(m.getLocations().some(l => l.id === id));
});

test('wirft Fehler bei nicht-leerem Ort', () => {
  const m = freshManager();
  const id = m.addLocation('Keller', '📦');
  m.addItem(id, 'Dose', '1x');
  throws(() => m.removeLocation(id), 'nicht leer');
});

suite('InventoryManager.removeItem');

test('markiert Artikel als geloescht (Tombstone) fuer Sync', () => {
  const m = freshManager();
  m.addItem('fridge', 'Milch', '1L');
  const visible = m.getLocation('fridge').items[0];
  isTrue(m.removeItem('fridge', visible.id));
  eq(m.getLocation('fridge').items.length, 0);
  const raw = m.storage.data.locations.fridge.items.find(i => i.id === visible.id);
  isTrue(!!raw._deleted);
});

suite('InventoryManager.addLocation');

test('neuer Ort uebernimmt konfigurierte Haltbarkeitstage', () => {
  const m = freshManager();
  const id = m.addLocation('Gefrierschrank', '🧊', 1095);
  eq(m.getLocation(id).maxAgeDays, 1095);
});

suite('InventoryManager.consumeItem');

test('Artikel ohne Menge wird komplett entfernt', () => {
  const m = freshManager();
  m.addItem('fridge', 'Butter');
  const item = m.getLocation('fridge').items[0];
  eq(m.consumeItem('fridge', item.id), 'removed');
  eq(m.getLocation('fridge').items.length, 0);
});

test('Stückzahl 3 Stk wird auf 2 Stk reduziert', () => {
  const m = freshManager();
  m.addItem('fridge', 'Eier', '3 Stk');
  const item = m.getLocation('fridge').items[0];
  eq(m.consumeItem('fridge', item.id), 'reduced');
  eq(m.getLocation('fridge').items[0].amount, '2 Stk');
});

test('Stückzahl 1 Stk wird zu 0 → Artikel entfernt', () => {
  const m = freshManager();
  m.addItem('fridge', 'Zucchini', '1 Stk');
  const item = m.getLocation('fridge').items[0];
  eq(m.consumeItem('fridge', item.id), 'removed');
  eq(m.getLocation('fridge').items.length, 0);
});

test('Gewicht 200 g wird auf 199 g reduziert', () => {
  const m = freshManager();
  m.addItem('fridge', 'Schinken', '200 g');
  const item = m.getLocation('fridge').items[0];
  eq(m.consumeItem('fridge', item.id), 'reduced');
  eq(m.getLocation('fridge').items[0].amount, '199 g');
});

test('Gewicht 1 g wird zu 0 → Artikel entfernt', () => {
  const m = freshManager();
  m.addItem('fridge', 'Salz', '1 g');
  const item = m.getLocation('fridge').items[0];
  eq(m.consumeItem('fridge', item.id), 'removed');
  eq(m.getLocation('fridge').items.length, 0);
});

test('Volumen 500 ml wird auf 499 ml reduziert', () => {
  const m = freshManager();
  m.addItem('fridge', 'Milch', '500 ml');
  const item = m.getLocation('fridge').items[0];
  eq(m.consumeItem('fridge', item.id), 'reduced');
  eq(m.getLocation('fridge').items[0].amount, '499 ml');
});

test('unbekannte Item-ID gibt false zurück', () => {
  const m = freshManager();
  isFalse(m.consumeItem('fridge', 'gibts-nicht'));
});

test('unbekannte Location gibt false zurück', () => {
  const m = freshManager();
  isFalse(m.consumeItem('nirgends', 'egal'));
});

test('consumeItem erhöht version', () => {
  const m = freshManager();
  m.addItem('fridge', 'Eier', '3 Stk');
  const item = m.getLocation('fridge').items[0];
  const before = m.storage.data.version;
  m.consumeItem('fridge', item.id);
  isTrue(m.storage.data.version > before);
});

summary();
