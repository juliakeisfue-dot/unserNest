/**
 * tests/google-tasks.test.js
 * Tests fuer Google-Tasks-Helfer (ohne Netzwerk/OAuth).
 */
import { suite, test, eq, isTrue, summary } from './helpers.js';
import { buildOpenShoppingTasks, buildShoppingListTitle, getIsoWeekInfo } from '../modules/core/googleTasks.js';

suite('GoogleTasks helper');

test('buildShoppingListTitle erzeugt KW-Titel', () => {
  const title = buildShoppingListTitle(new Date('2026-03-19T10:00:00.000Z'));
  eq(title, 'Einkauf KW 12/2026');
});

test('getIsoWeekInfo liefert Woche/Jahr', () => {
  const info = getIsoWeekInfo(new Date('2026-12-24T00:00:00.000Z'));
  eq(info.week, 52);
  eq(info.year, 2026);
});

test('buildOpenShoppingTasks exportiert nur offene gueltige Artikel', () => {
  const tasks = buildOpenShoppingTasks([
    { id: 'a', name: 'Milch', note: '2L', status: 'offen', _deleted: false },
    { id: 'b', name: 'Brot', status: 'gekauft', _deleted: false },
    { id: 'c', name: '   ', status: 'offen', _deleted: false },
    { id: 'd', name: 'Eier', status: 'offen', _deleted: true },
    { id: 'e', name: 'Butter', note: '', status: 'offen', _deleted: false }
  ]);

  eq(tasks.length, 2);
  eq(tasks[0].title, 'Milch');
  eq(tasks[0].notes, '2L');
  eq(tasks[1].title, 'Butter');
  isTrue(tasks[1].notes === undefined);
});

summary();

