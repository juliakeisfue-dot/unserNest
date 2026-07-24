/**
 * tests/recipes.test.js
 * Tests für RecipeManager: Zutaten-Normalisierung, Bearbeiten, Soft-Delete.
 */
import { suite, test, eq, isTrue, isFalse, summary } from './helpers.js';
import { RecipeManager } from '../modules/domains/recipes/manager.js';
import { ShoppingManager } from '../modules/domains/shopping/manager.js';
import { createInitialState } from '../modules/core/config.js';

function makeManager(initialRecipes = []) {
  const data = createInitialState();
  data.recipes = initialRecipes;

  const storage = {
    data,
    loadLocal: () => true,
    saveLocal: () => true
  };

  const shopping = {
    getItems: () => [],
    add: () => {}
  };

  const sync = {
    dirty: false,
    markDirty() {
      this.dirty = true;
    }
  };

  const mgr = new RecipeManager(storage, shopping, sync);
  return { mgr, storage, sync };
}

function oneRecipeState() {
  return [{ id: 'r-test', name: 'Basis', ingredients: ['Eier'], createdAt: 1, updatedAt: 1, _deleted: false }];
}

suite('RecipeManager – Zutaten Parsing');

test('ignoriert Kommas in Klammern und entfernt Vorbereitungswörter', () => {
  const { mgr } = makeManager();
  const parsed = mgr.parseIngredients('Nudeln, Zwiebeln (gewürfelt, gedünstet), Gemüsereste(Paprika, Möhren [vorher in der Microwelle gedünstet])');

  isTrue(parsed.includes('Nudeln'));
  isTrue(parsed.includes('Zwiebeln'));
  isTrue(parsed.includes('Gemüsereste'));
  isFalse(parsed.some(i => i.toLowerCase() === 'gedünstet'));
});

test('akzeptiert Zeilenumbrüche und Semikolon als Trenner', () => {
  const { mgr } = makeManager();
  const parsed = mgr.parseIngredients('Eier\nMilch; Butter');
  eq(parsed.length, 3);
  isTrue(parsed.includes('Eier'));
  isTrue(parsed.includes('Milch'));
  isTrue(parsed.includes('Butter'));
});

suite('RecipeManager – Verfügbarkeit');

test('Teilbestand wird als verfügbar/missing Verhältnis erkannt', () => {
  const data = createInitialState();
  data.locations.fridge.items = [{ id: 'i1', name: 'Eier' }];
  const storage = { data, loadLocal: () => true, saveLocal: () => true };
  const mgr = new RecipeManager(storage, { getItems: () => [], add: () => {} }, { markDirty: () => {} });

  const a = mgr.getIngredientAvailability({ ingredients: ['Eier', 'Schinken', 'Zucchini'] });
  eq(a.total, 3);
  eq(a.available.length, 1);
  eq(a.missing.length, 2);
  isFalse(mgr.isCookable({ ingredients: ['Eier', 'Schinken', 'Zucchini'] }));
});

suite('RecipeManager – Sortierung');

test('getRecipesSorted sortiert alphabetisch nach Name', () => {
  const initial = [
    { id: 'r3', name: 'Zucchiniauflauf', ingredients: ['Zucchini'], _deleted: false },
    { id: 'r1', name: 'Apfelkuchen', ingredients: ['Apfel'], _deleted: false },
    { id: 'r2', name: 'Bolognese', ingredients: ['Tomate'], _deleted: false }
  ];
  const { mgr } = makeManager(initial);
  const sorted = mgr.getRecipesSorted().map(r => r.name);
  eq(sorted.join('|'), 'Apfelkuchen|Bolognese|Zucchiniauflauf');
});

suite('RecipeManager – Speichern/Sync');

test('addRecipe setzt Timestamps und markiert Sync pending', () => {
  const { mgr, storage, sync } = makeManager(oneRecipeState());
  const before = storage.data.recipes.length;
  const recipe = mgr.addRecipe({
    name: 'Nudel-Wurst-Rettungsaktion',
    ingredients: 'Nudeln, Wurstreste, Zwiebeln (gedünstet)',
    link: '',
    difficulty: 'einfach',
    time: '20 Min',
    servings: 4
  });

  isTrue(!!recipe.createdAt);
  isTrue(!!recipe.updatedAt);
  isTrue(sync.dirty);
  eq(storage.data.recipes.length, before + 1);
});

test('deleteRecipe macht Soft-Delete und blendet Rezept in getRecipes aus', () => {
  const { mgr, storage } = makeManager(oneRecipeState());
  const recipe = mgr.addRecipe({ name: 'Test', ingredients: 'Eier', link: '' });

  const deleted = mgr.deleteRecipe(recipe.id);
  isTrue(deleted);

  const raw = storage.data.recipes.find(r => r.id === recipe.id);
  isTrue(!!raw._deleted);
  isFalse(mgr.getRecipes().some(r => r.id === recipe.id));
});

suite('RecipeManager – Mehrfachauswahl Einkaufsliste');

test('addMissingToShoppingListForRecipes summiert fehlende Zutaten über mehrere Rezepte', () => {
  const data = createInitialState();
  data.locations.fridge.items = [{ id: 'i1', name: 'Eier' }];
  data.recipes = [
    { id: 'r1', name: 'R1', ingredients: ['Eier', 'Schinken'], _deleted: false },
    { id: 'r2', name: 'R2', ingredients: ['Schinken', 'Käse'], _deleted: false }
  ];

  const list = [];
  const shopping = {
    getItems: () => list,
    add: (name) => list.push({ id: `s-${list.length + 1}`, name, status: 'offen', _deleted: false })
  };
  const storage = { data, loadLocal: () => true, saveLocal: () => true };
  const mgr = new RecipeManager(storage, shopping, { markDirty: () => {} });

  const added = mgr.addMissingToShoppingListForRecipes(['r1', 'r2']);

  eq(added, 2);
  isTrue(list.some(i => i.name === 'Schinken'));
  isTrue(list.some(i => i.name === 'Käse'));
});

suite('RecipeManager – Zutaten direkt auf Einkaufsliste');

test('addIngredientsToShoppingList legt alle Rezeptzutaten auf die Einkaufsliste', () => {
  const data = createInitialState();
  data.recipes = [
    { id: 'r1', name: 'R1', ingredients: ['Eier', 'Milch'], _deleted: false }
  ];
  const list = [];
  const shopping = {
    getItems: () => list,
    add: (name, note) => list.push({ id: `s-${list.length + 1}`, name, note, status: 'offen', _deleted: false })
  };
  const mgr = new RecipeManager({ data, loadLocal: () => true, saveLocal: () => true }, shopping, { markDirty: () => {} });

  const added = mgr.addIngredientsToShoppingList('r1');

  eq(added, 2);
  isTrue(list.some(i => i.name === 'Eier'));
  isTrue(list.some(i => i.name === 'Milch'));
});

test('addIngredientsToShoppingList vermeidet Duplikate zu offenen Einkaufsartikeln', () => {
  const data = createInitialState();
  data.recipes = [
    { id: 'r1', name: 'R1', ingredients: ['Eier', 'Milch'], _deleted: false }
  ];
  const list = [{ id: 's1', name: 'Eier', status: 'offen', _deleted: false }];
  const shopping = {
    getItems: () => list,
    add: (name, note) => list.push({ id: `s-${list.length + 1}`, name, note, status: 'offen', _deleted: false })
  };
  const mgr = new RecipeManager({ data, loadLocal: () => true, saveLocal: () => true }, shopping, { markDirty: () => {} });

  const added = mgr.addIngredientsToShoppingList('r1');

  eq(added, 1);
  eq(list.filter(i => i.name === 'Eier').length, 1);
  isTrue(list.some(i => i.name === 'Milch'));
});

test('addIngredientsToShoppingListForRecipes summiert über mehrere Rezepte', () => {
  const data = createInitialState();
  data.recipes = [
    { id: 'r1', name: 'R1', ingredients: ['Eier', 'Milch'], _deleted: false },
    { id: 'r2', name: 'R2', ingredients: ['Milch', 'Butter'], _deleted: false }
  ];
  const list = [];
  const shopping = {
    getItems: () => list,
    add: (name, note) => list.push({ id: `s-${list.length + 1}`, name, note, status: 'offen', _deleted: false })
  };
  const mgr = new RecipeManager({ data, loadLocal: () => true, saveLocal: () => true }, shopping, { markDirty: () => {} });

  const added = mgr.addIngredientsToShoppingListForRecipes(['r1', 'r2']);

  eq(added, 3);
  isTrue(list.some(i => i.name === 'Eier'));
  isTrue(list.some(i => i.name === 'Milch'));
  isTrue(list.some(i => i.name === 'Butter'));
});

test('addIngredientsToShoppingList führt gleiche Rezept-Zutaten mit Mengenangabe zusammen', () => {
  const data = createInitialState();
  data.recipes = [
    { id: 'r1', name: 'Korean glazed Potatoes', ingredients: ['100 g Mayonnaise'], _deleted: false },
    { id: 'r2', name: 'Würzige Hühnerbrust', ingredients: ['100 g Mayonnaise'], _deleted: false }
  ];
  const storage = { data, loadLocal: () => true, saveLocal: () => true };
  const shopping = new ShoppingManager(storage, { markDirty: () => {} }, { getActive: () => null, addPoints: () => {} });
  const mgr = new RecipeManager(storage, shopping, { markDirty: () => {} });

  const added = mgr.addIngredientsToShoppingListForRecipes(['r1', 'r2']);
  const items = shopping.getItems();

  eq(added, 2);
  eq(items.length, 1);
  eq(items[0].name, 'Mayonnaise');
  eq(items[0].amountValue, 200);
  eq(items[0].amountUnit, 'g');
  eq(items[0].recipeSources.length, 2);
});

suite('RecipeManager – OCR Entwurf');

test('buildRecipeDraftFromOCRText extrahiert Titel, Zutaten, Zeit und Portionen', () => {
  const { mgr } = makeManager();
  const text = [
    'HelloFresh',
    'Cremige Pasta mit Spinat',
    'Zutaten:',
    '250 g Pasta, 1 Zwiebel, 200 g Spinat',
    '2 Portionen',
    '25 Minuten',
    'Zubereitung',
    'Alles kochen'
  ].join('\n');

  const draft = mgr.buildRecipeDraftFromOCRText(text);
  eq(draft.name, 'Cremige Pasta mit Spinat');
  isTrue(draft.ingredients.some(i => i.toLowerCase().includes('pasta')));
  isTrue(draft.ingredients.some(i => i.toLowerCase().includes('zwiebel')));
  eq(draft.time, '25 Min');
  eq(draft.servings, 2);
});

test('buildRecipeDraftFromOCRTexts kombiniert Vorder-/Rueckseite zu einem Entwurf', () => {
  const { mgr } = makeManager();
  const front = [
    'HelloFresh',
    'Scharfe Paprika-Pasta',
    '2 Portionen',
    '30 Minuten'
  ].join('\n');
  const back = [
    'Zutaten:',
    '250 g Pasta',
    '1 Paprika, 1 Zwiebel, 200 ml Sahne',
    'Zubereitung',
    'Alles in einer Pfanne garen'
  ].join('\n');

  const draft = mgr.buildRecipeDraftFromOCRTexts([front, back]);

  eq(draft.name, 'Scharfe Paprika-Pasta');
  isTrue(draft.ingredients.some(i => i.toLowerCase().includes('pasta')));
  isTrue(draft.ingredients.some(i => i.toLowerCase().includes('paprika')));
  eq(draft.time, '30 Min');
  eq(draft.servings, 2);
});

suite('RecipeManager – Titelbasierte Suche');

test('buildTitleSearchUrl erzeugt HelloFresh-Google-Suche', () => {
  const { mgr } = makeManager();
  const url = mgr.buildTitleSearchUrl('Yaki Udon Japanische Noodle Bowl mit Rindfleisch');

  isTrue(url.includes('google.com/search?q='));
  isTrue(url.includes(encodeURIComponent('site:hellofresh.de Yaki Udon Japanische Noodle Bowl mit Rindfleisch')));
});

test('buildTitleSearchUrl erzeugt Chefkoch-Suche', () => {
  const { mgr } = makeManager();
  const url = mgr.buildTitleSearchUrl('Rührei', 'chefkoch');

  eq(url, 'https://www.chefkoch.de/rs/s0/R%C3%BChrei/Rezepte.html');
});

suite('RecipeManager – Importierter Rezepttext');

test('buildRecipeDraftFromPastedText extrahiert Chefkoch-Titel, Zutaten, Zeit und Portionen', () => {
  const { mgr } = makeManager();
  const text = [
    'Käsespätzle',
    'Schwäbische Kasspatzen',
    'Zutaten',
    'Für 4 Portionen',
    '500 g',
    'Mehl',
    '1 EL',
    'Öl',
    '250 ml',
    'Wasser',
    '4 TL',
    'Salz',
    '6',
    'Ei(er)',
    '3 m.-große',
    'Zwiebel(n)',
    '300 g',
    'Käse, geriebener',
    'Allgäuer Emmentaler',
    'Zubereitung',
    '35 Min.',
    'Gesamtzeit',
    '35 Min.'
  ].join('\n');

  const draft = mgr.buildRecipeDraftFromPastedText(text);

  eq(draft.name, 'Käsespätzle');
  eq(draft.servings, 4);
  eq(draft.time, '35 Min');
  isTrue(draft.ingredients.some(i => i.toLowerCase().includes('mehl')));
  isTrue(draft.ingredients.some(i => i.toLowerCase().includes('wasser')));
  isTrue(draft.ingredients.some(i => i.toLowerCase().includes('eier')));
  isTrue(draft.ingredients.some(i => i.toLowerCase().includes('zwiebeln')));
  isTrue(draft.ingredients.some(i => i.toLowerCase().includes('emmentaler')) || draft.ingredients.some(i => i.toLowerCase().includes('käse')));
});

summary();
