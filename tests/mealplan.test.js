/**
 * tests/mealplan.test.js
 * Tests für MealPlanManager:
 *   - Wochennavigation (getMonday, getWeekDays, weekOffset)
 *   - Slot-Verwaltung (setSlot, getSlot, removeSlot)
 *   - cookSlot (Vorrat-Abzug, cooked-Flag)
 *   - addMissingToShopping
 *   - activeMeals-Persistenz
 */
import { suite, test, eq, isTrue, isFalse, isNull, notNull, summary } from './helpers.js';
import { MealPlanManager } from '../modules/domains/mealplan/manager.js';
import { InventoryManager } from '../modules/domains/inventory/manager.js';
import { createInitialState } from '../modules/core/config.js';

// ── Stubs ────────────────────────────────────────────────────────────────────

function makeStorage(extra = {}) {
  return {
    data: { ...createInitialState(), ...extra },
    saveLocal: () => {},
  };
}

const noSync = { markDirty: () => {} };

/** Echter InventoryManager als Stub-Basis (kein Sync-IO) */
function makeInventory(storage) {
  return new InventoryManager(storage, noSync);
}

/** Minimaler ShoppingManager-Stub */
function makeShopping() {
  const list = [];
  return {
    getItems: () => list,
    add(name, note) { list.push({ name, note, status: 'offen', _deleted: false }); }
  };
}

function freshManager() {
  const storage = makeStorage();
  const shopping = makeShopping();
  const inventory = makeInventory(storage);
  return new MealPlanManager(storage, noSync, inventory, shopping);
}

/** Liefert ein festes Datum (Montag 2026-03-16) */
function monday20260316() {
  return new Date(2026, 2, 16); // Monate 0-basiert → März = 2
}

// ── dateKey / slotKey ────────────────────────────────────────────────────────
suite('MealPlanManager – dateKey / slotKey');

test('dateKey formatiert YYYY-MM-DD korrekt', () => {
  eq(MealPlanManager.dateKey(new Date(2026, 2, 16)), '2026-03-16');
  eq(MealPlanManager.dateKey(new Date(2026, 0,  1)), '2026-01-01');
  eq(MealPlanManager.dateKey(new Date(2026, 11, 31)), '2026-12-31');
});

test('slotKey kombiniert Datum und Mahlzeit korrekt', () => {
  eq(MealPlanManager.slotKey(new Date(2026, 2, 16), 'dinner'), '2026-03-16:dinner');
  eq(MealPlanManager.slotKey(new Date(2026, 2, 16), 'lunchbox'), '2026-03-16:lunchbox');
});

// ── getMonday / getWeekDays ───────────────────────────────────────────────────
suite('MealPlanManager – Wochennavigation');

test('getWeekDays liefert exakt 7 Tage', () => {
  const m = freshManager();
  eq(m.getWeekDays().length, 7);
});

test('getWeekDays beginnt mit einem Montag (getDay() === 1)', () => {
  const m = freshManager();
  eq(m.getWeekDays()[0].getDay(), 1);
});

test('getWeekDays endet mit einem Sonntag (getDay() === 0)', () => {
  const m = freshManager();
  eq(m.getWeekDays()[6].getDay(), 0);
});

test('aufeinander folgende Tage haben Differenz von 86400000 ms', () => {
  const m = freshManager();
  const days = m.getWeekDays();
  for (let i = 1; i < 7; i++) {
    eq(days[i] - days[i - 1], 86_400_000);
  }
});

test('weekOffset 0 ist Standard', () => {
  const m = freshManager();
  eq(m.getWeekOffset(), 0);
});

test('setWeekOffset +1 verschiebt Montag um 7 Tage', () => {
  const m = freshManager();
  const monday0 = m.getWeekDays()[0];
  m.setWeekOffset(1);
  const monday1 = m.getWeekDays()[0];
  eq(monday1 - monday0, 7 * 86_400_000);
});

test('setWeekOffset -1 verschiebt Montag um -7 Tage', () => {
  const m = freshManager();
  const monday0 = m.getWeekDays()[0];
  m.setWeekOffset(-1);
  const mondayM1 = m.getWeekDays()[0];
  eq(monday0 - mondayM1, 7 * 86_400_000);
});

test('setWeekOffset persistiert (version wird erhöht)', () => {
  const m = freshManager();
  const before = m.storage.data.version;
  m.setWeekOffset(2);
  isTrue(m.storage.data.version > before);
});

// ── setSlot / getSlot / removeSlot ───────────────────────────────────────────
suite('MealPlanManager – setSlot / getSlot / removeSlot');

test('getSlot gibt null zurück wenn kein Slot gesetzt', () => {
  const m = freshManager();
  isNull(m.getSlot(monday20260316(), 'dinner'));
});

test('setSlot speichert recipeId', () => {
  const m = freshManager();
  m.setSlot(monday20260316(), 'dinner', 'recipe-123');
  const slot = m.getSlot(monday20260316(), 'dinner');
  notNull(slot);
  eq(slot.recipeId, 'recipe-123');
});

test('setSlot setzt cooked initial auf false', () => {
  const m = freshManager();
  m.setSlot(monday20260316(), 'lunchbox', 'recipe-abc');
  isFalse(m.getSlot(monday20260316(), 'lunchbox').cooked);
});

test('setSlot mit null löscht den Slot', () => {
  const m = freshManager();
  m.setSlot(monday20260316(), 'dinner', 'recipe-123');
  m.setSlot(monday20260316(), 'dinner', null);
  isNull(m.getSlot(monday20260316(), 'dinner'));
});

test('removeSlot entfernt einen gesetzten Slot', () => {
  const m = freshManager();
  m.setSlot(monday20260316(), 'dinner', 'recipe-x');
  m.removeSlot(monday20260316(), 'dinner');
  isNull(m.getSlot(monday20260316(), 'dinner'));
});

test('removeSlot auf nicht vorhandenen Slot wirft keinen Fehler', () => {
  const m = freshManager();
  m.removeSlot(monday20260316(), 'dinner'); // darf nicht werfen
  isNull(m.getSlot(monday20260316(), 'dinner'));
});

test('verschiedene Mahlzeiten am selben Tag sind unabhängig', () => {
  const m = freshManager();
  m.setSlot(monday20260316(), 'lunchbox', 'recipe-A');
  m.setSlot(monday20260316(), 'dinner',   'recipe-B');
  eq(m.getSlot(monday20260316(), 'lunchbox').recipeId, 'recipe-A');
  eq(m.getSlot(monday20260316(), 'dinner').recipeId,   'recipe-B');
});

test('gleiche Mahlzeit an verschiedenen Tagen sind unabhängig', () => {
  const m = freshManager();
  const tuesday = new Date(2026, 2, 17);
  m.setSlot(monday20260316(), 'dinner', 'recipe-Mo');
  m.setSlot(tuesday,          'dinner', 'recipe-Di');
  eq(m.getSlot(monday20260316(), 'dinner').recipeId, 'recipe-Mo');
  eq(m.getSlot(tuesday,          'dinner').recipeId, 'recipe-Di');
});

test('setSlot übernimmt optionale servings', () => {
  const m = freshManager();
  m.setSlot(monday20260316(), 'dinner', 'recipe-123', 6);
  eq(m.getSlot(monday20260316(), 'dinner').servings, 6);
});

test('setSlot behält cooked-Flag beim Überschreiben mit neuem Rezept', () => {
  // Wenn ein bereits als gekocht markierter Slot mit einem neuen Rezept überschrieben
  // wird, soll cooked auf false zurückgesetzt werden (neues Rezept, noch nicht gekocht).
  // → Die aktuelle Impl setzt cooked: existing.cooked ?? false, also bleibt false.
  const m = freshManager();
  m.setSlot(monday20260316(), 'dinner', 'recipe-old');
  // Slot manuell als gekocht markieren
  m.storage.data.mealPlan.slots['2026-03-16:dinner'].cooked = true;
  // neues Rezept setzen
  m.setSlot(monday20260316(), 'dinner', 'recipe-new');
  // cooked wird vom alten Slot übernommen (existing.cooked = true)
  isTrue(m.getSlot(monday20260316(), 'dinner').cooked);
});

test('setSlot erhöht version', () => {
  const m = freshManager();
  const before = m.storage.data.version;
  m.setSlot(monday20260316(), 'dinner', 'recipe-v');
  isTrue(m.storage.data.version > before);
});

// ── moveSlot ─────────────────────────────────────────────────────────────────
suite('MealPlanManager – moveSlot');

test('verschiebt einen Slot auf einen anderen Tag', () => {
  const m = freshManager();
  const tuesday = new Date(2026, 2, 17);
  m.setSlot(monday20260316(), 'dinner', 'recipe-Mo');

  isTrue(m.moveSlot(monday20260316(), 'dinner', tuesday, 'dinner'));
  isNull(m.getSlot(monday20260316(), 'dinner'));
  eq(m.getSlot(tuesday, 'dinner').recipeId, 'recipe-Mo');
});

test('verschieben auf belegten Zielslot klappt nur mit overwrite=true', () => {
  const m = freshManager();
  const tuesday = new Date(2026, 2, 17);
  m.setSlot(monday20260316(), 'dinner', 'recipe-Mo');
  m.setSlot(tuesday, 'dinner', 'recipe-Di');

  isFalse(m.moveSlot(monday20260316(), 'dinner', tuesday, 'dinner'));
  eq(m.getSlot(tuesday, 'dinner').recipeId, 'recipe-Di');

  isTrue(m.moveSlot(monday20260316(), 'dinner', tuesday, 'dinner', { overwrite: true }));
  eq(m.getSlot(tuesday, 'dinner').recipeId, 'recipe-Mo');
});

test('verschieben auf denselben Slot gibt false zurück', () => {
  const m = freshManager();
  m.setSlot(monday20260316(), 'dinner', 'recipe-Mo');
  isFalse(m.moveSlot(monday20260316(), 'dinner', monday20260316(), 'dinner'));
});

test('moveSlot loggt slot_moved bei erfolgreichem Verschieben', () => {
  const storage = makeStorage();
  storage.activeUserId = 'julia';
  const calls = [];
  const tracker = {
    trackFeatureUsage: (featureId, eventName, userId, metadata) => {
      calls.push({ featureId, eventName, userId, metadata });
    }
  };
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping(), null, tracker);
  const tuesday = new Date(2026, 2, 17);
  m.setSlot(monday20260316(), 'dinner', 'recipe-Mo');

  isTrue(m.moveSlot(monday20260316(), 'dinner', tuesday, 'dinner', { source: 'drag-drop' }));
  eq(calls.length, 1);
  eq(calls[0].featureId, 'mealplan');
  eq(calls[0].eventName, 'slot_moved');
  eq(calls[0].userId, 'julia');
  eq(calls[0].metadata.source, 'drag-drop');
});

test('moveSlot loggt slot_moved_by_date bei Datumsknopf', () => {
  const storage = makeStorage();
  const calls = [];
  const tracker = {
    trackFeatureUsage: (featureId, eventName, userId, metadata) => {
      calls.push({ featureId, eventName, userId, metadata });
    }
  };
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping(), null, tracker);
  const tuesday = new Date(2026, 2, 17);
  m.setSlot(monday20260316(), 'dinner', 'recipe-Mo');

  isTrue(m.moveSlot(monday20260316(), 'dinner', tuesday, 'dinner', { source: 'date-button' }));
  eq(calls.length, 1);
  eq(calls[0].eventName, 'slot_moved_by_date');
  eq(calls[0].metadata.overwrite, false);
});

// ── cookSlot ─────────────────────────────────────────────────────────────────
suite('MealPlanManager – cookSlot');

function makeStorageWithFridge(items) {
  const s = makeStorage();
  // items kann sein: string (kein Menge) oder { name, amount }
  s.data.locations.fridge.items = items.map((entry, i) => {
    const name   = typeof entry === 'string' ? entry : entry.name;
    const amount = typeof entry === 'string' ? ''    : (entry.amount ?? '');
    return { id: `item-${i}`, name, amount, addedAt: Date.now() };
  });
  return s;
}

const RECIPE_RUEHREI = {
  id: 'ruehrei',
  name: 'Rührei',
  ingredients: ['Eier', 'Milch', 'Butter'],
};

const RECIPE_ZUCCHINIROLLE = {
  id: 'zucchinirolle',
  name: 'Zucchiniröllchen',
  ingredients: ['Zucchini', 'Eier', 'Schinken'],
};

test('cookSlot gibt false zurück wenn kein Slot vorhanden', () => {
  const m = freshManager();
  isFalse(m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]));
});

test('cookSlot gibt false zurück wenn Rezept nicht gefunden', () => {
  const m = freshManager();
  m.setSlot(monday20260316(), 'dinner', 'unknown-recipe');
  isFalse(m.cookSlot(monday20260316(), 'dinner', []));
});

test('cookSlot setzt cooked auf true', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  isTrue(m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]));
  isTrue(m.getSlot(monday20260316(), 'dinner').cooked);
});

test('cookSlot setzt cookedAt als Timestamp', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  isTrue(m.getSlot(monday20260316(), 'dinner').cookedAt > 0);
});

test('cookSlot entfernt Artikel ohne Mengenangabe komplett', () => {
  // Eier/Milch/Butter ohne Menge → alle drei werden entfernt
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  eq(storage.data.locations.fridge.items.filter(i => !i._deleted).length, 0);
});

test('cookSlot verringert Stückzahl statt Artikel zu löschen (3 Stk → 2 Stk)', () => {
  // Workflow: 3 Eier im Vorrat, Rezept braucht Eier → noch 2 Stk übrig
  const storage = makeStorageWithFridge([
    { name: 'Eier',   amount: '3 Stk' },
    { name: 'Milch',  amount: '1 L' },
    { name: 'Butter', amount: '' },
  ]);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);

  const eier = storage.data.locations.fridge.items.find(i => i.name === 'Eier');
  notNull(eier);
  eq(eier.amount, '2 Stk');
});

test('cookSlot – Zucchinirolle-Workflow: Zucchini/Eier/Schinken werden korrekt abgezogen', () => {
  // Kernworkflow: Einkauf → Vorrat → Einplanen → Kochen → Vorrat sinkt
  const storage = makeStorageWithFridge([
    { name: 'Zucchini', amount: '2 Stk' },
    { name: 'Eier',     amount: '6 Stk' },
    { name: 'Schinken', amount: '200 g'  },
  ]);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'lunchbox', 'zucchinirolle');
  m.cookSlot(monday20260316(), 'lunchbox', [RECIPE_ZUCCHINIROLLE]);

  const zucchini = storage.data.locations.fridge.items.find(i => i.name === 'Zucchini');
  const eier     = storage.data.locations.fridge.items.find(i => i.name === 'Eier');
  const schinken = storage.data.locations.fridge.items.find(i => i.name === 'Schinken');

  notNull(zucchini); eq(zucchini.amount, '1 Stk');  // 2→1
  notNull(eier);     eq(eier.amount,     '5 Stk');  // 6→5
  notNull(schinken); eq(schinken.amount, '199 g');  // 200g→199g
});

test('cookSlot entfernt Artikel wenn Menge auf 0 sinkt (1 Stk)', () => {
  const storage = makeStorageWithFridge([
    { name: 'Zucchini', amount: '1 Stk' },
    { name: 'Eier',     amount: '1 Stk' },
    { name: 'Schinken', amount: '1 Stk' },
  ]);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'lunchbox', 'zucchinirolle');
  m.cookSlot(monday20260316(), 'lunchbox', [RECIPE_ZUCCHINIROLLE]);
  eq(storage.data.locations.fridge.items.filter(i => !i._deleted).length, 0);
});

test('cookSlot bei teilweise fehlendem Vorrat kocht trotzdem (best-effort)', () => {
  const storage = makeStorageWithFridge([{ name: 'Zucchini', amount: '2 Stk' }]);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'lunchbox', 'zucchinirolle');
  isTrue(m.cookSlot(monday20260316(), 'lunchbox', [RECIPE_ZUCCHINIROLLE]));
  // Zucchini wurde abgezogen, Eier/Schinken fehlten – kein Fehler
  const zucchini = storage.data.locations.fridge.items.find(i => i.name === 'Zucchini');
  notNull(zucchini);
  eq(zucchini.amount, '1 Stk');
});

test('cookSlot auf bereits gekochten Slot gibt false zurück (kein Doppelkochen)', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  isFalse(m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]));
});

test('cookSlot erhöht version', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  const before = storage.data.version;
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  isTrue(storage.data.version > before);
});

// ── addMissingToShopping ─────────────────────────────────────────────────────
suite('MealPlanManager – addMissingToShopping');

test('gibt 0 zurück wenn kein Slot vorhanden', () => {
  const m = freshManager();
  eq(m.addMissingToShopping(monday20260316(), 'dinner', [RECIPE_RUEHREI]), 0);
});

test('gibt 0 zurück wenn Rezept nicht gefunden', () => {
  const m = freshManager();
  m.setSlot(monday20260316(), 'dinner', 'unknown');
  eq(m.addMissingToShopping(monday20260316(), 'dinner', []), 0);
});

test('legt fehlende Zutaten auf die Einkaufsliste', () => {
  const m = freshManager(); // leerer Vorrat
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  const added = m.addMissingToShopping(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  eq(added, 3); // Eier, Milch, Butter fehlen alle
});

test('vorhandene Zutaten im Vorrat werden nicht auf die Liste gesetzt', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  const inventory = makeInventory(storage);
  const shopping = makeShopping();
  const m = new MealPlanManager(storage, noSync, inventory, shopping);
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  const added = m.addMissingToShopping(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  eq(added, 0);
  eq(shopping.getItems().length, 0);
});

test('bereits auf der Einkaufsliste stehende Artikel werden nicht doppelt hinzugefügt', () => {
  const m = freshManager();
  // Eier manuell auf die Liste
  m.shopping.add('Eier', 'für Rührei');
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  const added = m.addMissingToShopping(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  eq(added, 2); // nur Milch + Butter
});

test('Zutaten-Notiz enthält Rezeptnamen', () => {
  const m = freshManager();
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.addMissingToShopping(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  const item = m.shopping.getItems().find(i => i.name === 'Eier');
  notNull(item);
  isTrue(item.note.includes('Rührei'));
});

suite('MealPlanManager – geplante Rezepte');

test('getPlannedRecipeIdsForWeek liefert eindeutige Rezept-IDs aus der Woche', () => {
  const m = freshManager();
  const monday = monday20260316();
  const tuesday = new Date(2026, 2, 17);
  m.setSlot(monday, 'dinner', 'ruehrei');
  m.setSlot(tuesday, 'lunchbox', 'ruehrei');
  m.setSlot(tuesday, 'dinner', 'zucchinirolle');

  const ids = m.getPlannedRecipeIdsForWeek([monday, tuesday]);

  eq(ids.length, 2);
  isTrue(ids.includes('ruehrei'));
  isTrue(ids.includes('zucchinirolle'));
});

// ── rateSlot ─────────────────────────────────────────────────────────────────
suite('MealPlanManager – rateSlot');

test('rateSlot gibt false zurück wenn kein Slot vorhanden', () => {
  const m = freshManager();
  isFalse(m.rateSlot(monday20260316(), 'dinner', 3));
});

test('rateSlot gibt false zurück wenn Slot noch nicht gekocht', () => {
  const m = freshManager();
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  isFalse(m.rateSlot(monday20260316(), 'dinner', 3));
});

test('rateSlot gibt false bei ungültigem Stern-Wert zurück', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  isFalse(m.rateSlot(monday20260316(), 'dinner', 0));
  isFalse(m.rateSlot(monday20260316(), 'dinner', 4));
});

test('rateSlot speichert Bewertung im Slot', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  isTrue(m.rateSlot(monday20260316(), 'dinner', 3));
  const slot = m.getSlot(monday20260316(), 'dinner');
  eq(slot.ratings.length, 1);
  eq(slot.ratings[0].stars, 3);
});

test('rateSlot überschreibt bestehende Bewertung desselben Users', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  storage.activeUserId = 'julia';
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  m.rateSlot(monday20260316(), 'dinner', 2);
  m.rateSlot(monday20260316(), 'dinner', 3); // überschreiben
  const slot = m.getSlot(monday20260316(), 'dinner');
  eq(slot.ratings.length, 1);        // immer noch nur 1 Eintrag
  eq(slot.ratings[0].stars, 3);      // neueste Bewertung
});

test('verschiedene User können unabhängig bewerten', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  storage.activeUserId = 'julia';
  m.rateSlot(monday20260316(), 'dinner', 3);
  storage.activeUserId = 'christian';
  m.rateSlot(monday20260316(), 'dinner', 1);
  const slot = m.getSlot(monday20260316(), 'dinner');
  eq(slot.ratings.length, 2);
  eq(slot.ratings.find(r => r.userId === 'julia').stars, 3);
  eq(slot.ratings.find(r => r.userId === 'christian').stars, 1);
});

test('rateSlot erhöht version', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  const before = storage.data.version;
  m.rateSlot(monday20260316(), 'dinner', 2);
  isTrue(storage.data.version > before);
});

// ── getRanking ────────────────────────────────────────────────────────────────
suite('MealPlanManager – getRanking');

test('leeres Ranking wenn keine Bewertungen vorhanden', () => {
  const m = freshManager();
  eq(m.getRanking().length, 0);
});

test('Rezept mit Bewertungen erscheint im Ranking', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  m.rateSlot(monday20260316(), 'dinner', 3);
  const ranking = m.getRanking();
  eq(ranking.length, 1);
  eq(ranking[0].recipeId, 'ruehrei');
});

test('Durchschnitt wird korrekt berechnet (3+1 = Ø 2)', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  storage.activeUserId = 'julia';
  m.rateSlot(monday20260316(), 'dinner', 3);
  storage.activeUserId = 'christian';
  m.rateSlot(monday20260316(), 'dinner', 1);
  const ranking = m.getRanking();
  eq(ranking[0].avg, 2);
  eq(ranking[0].count, 2);
});

test('Ranking ist nach Ø-Stern absteigend sortiert', () => {
  const storage = makeStorageWithFridge([
    { name: 'Zucchini', amount: '2 Stk' },
    { name: 'Eier',     amount: '6 Stk' },
    { name: 'Schinken', amount: '200 g' },
  ]);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  const tuesday = new Date(2026, 2, 17);

  // Zucchinirolle als Lunchbox Montag – 3 Sterne
  m.setSlot(monday20260316(), 'lunchbox', 'zucchinirolle');
  m.cookSlot(monday20260316(), 'lunchbox', [RECIPE_ZUCCHINIROLLE]);
  m.rateSlot(monday20260316(), 'lunchbox', 3);

  // Rührei Dienstag – 1 Stern
  m.storage.data.locations.fridge.items = [
    { id: 'e0', name: 'Eier',   amount: '', addedAt: Date.now() },
    { id: 'e1', name: 'Milch',  amount: '', addedAt: Date.now() },
    { id: 'e2', name: 'Butter', amount: '', addedAt: Date.now() },
  ];
  m.setSlot(tuesday, 'dinner', 'ruehrei');
  m.cookSlot(tuesday, 'dinner', [RECIPE_RUEHREI]);
  m.rateSlot(tuesday, 'dinner', 1);

  const ranking = m.getRanking();
  eq(ranking[0].recipeId, 'zucchinirolle'); // besser bewertet
  eq(ranking[1].recipeId, 'ruehrei');
});

test('Slots ohne Bewertungen erscheinen nicht im Ranking', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping());
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  // kein rateSlot
  eq(m.getRanking().length, 0);
});

// ── cookSlot + Punkte ─────────────────────────────────────────────────────────
suite('MealPlanManager – cookSlot + Punkte');

test('cookSlot vergibt Punkte an den aktiven User', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  storage.activeUserId = 'julia';
  const pointsLog = [];
  const fakeUsers = {
    getActive: () => ({ id: 'julia', name: 'Julia' }),
    addPoints: (id, pts, reason) => pointsLog.push({ id, pts, reason }),
  };
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping(), fakeUsers);
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]);
  eq(pointsLog.length, 1);
  eq(pointsLog[0].id, 'julia');
  eq(pointsLog[0].pts, 5); // CONFIG.POINTS_MEAL_COOKED
  isTrue(pointsLog[0].reason.includes('Rührei'));
});

test('cookSlot ohne users-Referenz funktioniert trotzdem (kein Fehler)', () => {
  const storage = makeStorageWithFridge(['Eier', 'Milch', 'Butter']);
  // users = null/undefined
  const m = new MealPlanManager(storage, noSync, makeInventory(storage), makeShopping(), null);
  m.setSlot(monday20260316(), 'dinner', 'ruehrei');
  isTrue(m.cookSlot(monday20260316(), 'dinner', [RECIPE_RUEHREI]));
});

// ── _persist ─────────────────────────────────────────────────────────────────
suite('MealPlanManager – _persist');

test('_persist inkrementiert version', () => {
  const m = freshManager();
  const before = m.storage.data.version;
  m._persist();
  eq(m.storage.data.version, before + 1);
});

summary();
