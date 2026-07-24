/**
 * tests/mealplan-ui.test.js
 * UI-Regressionstests für MealPlanUI.
 */
import { suite, test, isTrue, summary } from './helpers.js';
import { MealPlanUI } from '../modules/domains/mealplan/ui.js';

function makeWeek(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function makeBaseApp(overrides = {}) {
  const monday = new Date(2026, 5, 15);
  const week = makeWeek(monday);

  const app = {
    mealplan: {
      getMonday: () => monday,
      getWeekDays: () => week,
      getSlot: (date, meal) => {
        if (meal === 'dinner' && dateKey(date) === '2026-06-15') {
          return { recipeId: 'r1', servings: 2, cooked: false, ratings: [] };
        }
        return null;
      },
      getRanking: () => [],
      constructor: { dateKey }
    },
    recipes: {
      getRecipes: () => [{ id: 'r1', name: 'Testgericht', ingredients: [] }],
      getIngredientAvailability: () => ({ available: [], missing: [], ratio: 1, total: 0 })
    },
    escapeHtml: (text) => String(text),
    showDialog: () => {},
    showDialogWithHTML: () => {},
    updateUI: () => {},
    closeDialog: () => {}
  };

  return { ...app, ...overrides };
}

suite('MealPlanUI – render Regression');

test('render crasht nicht, wenn recipes-Manager fehlt', () => {
  const container = { innerHTML: '' };
  global.document = {
    getElementById: (id) => (id === 'mealplanContent' ? container : null)
  };

  const app = makeBaseApp({ recipes: undefined });
  const ui = new MealPlanUI(app);

  ui.render();
  isTrue(container.innerHTML.includes('Rezept nicht gefunden'));
});

test('render zeigt Rezeptnamen, wenn getRecipes verfuegbar ist', () => {
  const container = { innerHTML: '' };
  global.document = {
    getElementById: (id) => (id === 'mealplanContent' ? container : null)
  };

  const app = makeBaseApp();
  const ui = new MealPlanUI(app);

  ui.render();
  isTrue(container.innerHTML.includes('Testgericht'));
});

test('selectRecipe plant ein Rezept im Speiseplan', () => {
  let setSlotArgs = null;
  let dialogArgs = null;
  let inputDialogArgs = null;
  const app = makeBaseApp();
  app.mealplan.setSlot = (...args) => { setSlotArgs = args; };
  app.showDialog = (title, message) => { dialogArgs = { title, message }; };
  app.showInputDialog = (title, message, defaultValue) => {
   inputDialogArgs = { title, message, defaultValue };
   return { then: (resolve) => resolve('6') };
  };
  app.updateUI = () => {};

  const ui = new MealPlanUI(app);
  ui.selectRecipe('2026-06-17', 'dinner', 'r1');

  isTrue(inputDialogArgs?.title === '🍽️ Portionen', 'Eingabedialog fehlt');
  isTrue(Array.isArray(setSlotArgs), 'setSlot wurde nicht aufgerufen');
  isTrue(setSlotArgs[0] instanceof Date, 'erstes Argument ist kein Datum');
  isTrue(setSlotArgs[0].getFullYear() === 2026 && setSlotArgs[0].getMonth() === 5 && setSlotArgs[0].getDate() === 17, 'Datum ist falsch');
  isTrue(setSlotArgs[1] === 'dinner', 'Mahlzeit ist falsch');
  isTrue(setSlotArgs[2] === 'r1', 'Rezept-ID ist falsch');
  isTrue(setSlotArgs[3] === 6, 'Portionen sind falsch');
  isTrue(dialogArgs?.title === '✅ Rezept hinzugefügt', 'Erfolgsmeldung fehlt');
});

test('openRecipeSelector zeigt Suchfeld und sortierte Rezepte', () => {
  const htmlState = { html: '' };
  const app = makeBaseApp({
    recipes: {
      getRecipes: () => ([
        { id: 'r3', name: 'Zucchini', ingredients: [] },
        { id: 'r1', name: 'Apfelkuchen', ingredients: [] },
        { id: 'r2', name: 'Mango', ingredients: [] }
      ]),
      getIngredientAvailability: (recipe) => {
        if (recipe.id === 'r3') return { available: [], missing: ['A'], ratio: 0, total: 1 }; // gar nicht gedeckt
        if (recipe.id === 'r2') return { available: ['A'], missing: ['B'], ratio: 0.5, total: 2 }; // teilweise
        return { available: ['A'], missing: [], ratio: 1, total: 1 }; // voll gedeckt
      }
    }
  });

  const overlay = { classList: { add: () => {}, remove: () => {} }, addEventListener: () => {}, removeEventListener: () => {} };
  const titleEl = {};
  const msgEl = {};
  Object.defineProperty(msgEl, 'innerHTML', {
    set: (value) => { htmlState.html = value; },
    get: () => htmlState.html
  });
  const input = { style: {}, focus: () => {} };
  const btnCancel = { style: {}, textContent: '' };
  const btnOk = { textContent: '', onclick: null };

  global.setTimeout = (fn) => { fn(); return 0; };
  global.document = {
    getElementById: (id) => {
      if (id === 'dialogOverlay') return overlay;
      if (id === 'dialogTitle') return titleEl;
      if (id === 'dialogMessage') return msgEl;
      if (id === 'dialogInput') return input;
      if (id === 'dialogBtnCancel') return btnCancel;
      if (id === 'dialogBtnOk') return btnOk;
      if (id === 'recipeSelectorSearch') return { focus: () => {} };
      if (id === 'recipeSelectorEmpty') return { style: {} };
      return null;
    },
    querySelectorAll: () => []
  };

  const ui = new MealPlanUI(app);
  ui.openRecipeSelector('2026-06-17', 'dinner');

  isTrue(htmlState.html.includes('placeholder="Rezept suchen..."'));
  const apfelIdx = htmlState.html.indexOf('Apfelkuchen');
  const mangoIdx = htmlState.html.indexOf('Mango');
  const zucchiniIdx = htmlState.html.indexOf('Zucchini');
  isTrue(apfelIdx < mangoIdx && mangoIdx < zucchiniIdx, 'Rezepte sind nicht nach Lagerstatus+Alphabet sortiert');
});

test('mobile startet in Tagesansicht', () => {
  const container = { innerHTML: '' };
  global.document = {
    getElementById: (id) => (id === 'mealplanContent' ? container : null)
  };
  global.window = { innerWidth: 420 };
  global.localStorage = { getItem: () => null, setItem: () => {} };

  const ui = new MealPlanUI(makeBaseApp());
  ui.render();

  isTrue(container.innerHTML.includes('Tagesansicht anzeigen') || container.innerHTML.includes('Wochenansicht anzeigen'));
  isTrue(container.innerHTML.includes('Tag →'));
});

test('filterRecipeSelector blendet nicht passende Rezepte aus', () => {
  const items = [
    { dataset: { recipeName: 'Apfelkuchen' }, style: { display: '' } },
    { dataset: { recipeName: 'Mango' }, style: { display: '' } },
    { dataset: { recipeName: 'Zucchini' }, style: { display: '' } }
  ];
  const empty = { style: { display: 'none' } };
  global.document = {
    getElementById: (id) => {
      if (id === 'recipeSelectorSearch') return { value: 'man' };
      if (id === 'recipeSelectorEmpty') return empty;
      return null;
    },
    querySelectorAll: () => items
  };

  const ui = new MealPlanUI(makeBaseApp());
  ui.filterRecipeSelector();

  isTrue(items[0].style.display === 'none');
  isTrue(items[1].style.display === '');
  isTrue(items[2].style.display === 'none');
  isTrue(empty.style.display === 'none');
});

summary();
