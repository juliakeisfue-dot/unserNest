/**
 * tests/quests.test.js
 * Tests für QuestManager: Verfügbarkeit, Abhängigkeiten, Punkte, Soft-Delete.
 */
import { suite, test, eq, isTrue, isFalse, notNull, summary } from './helpers.js';
import { QuestManager } from '../modules/domains/quests/manager.js';
import { createInitialState } from '../modules/core/config.js';

// ── Stubs ─────────────────────────────────────────────────────────────────────
function makeStorage(extra = {}) {
  const data = { ...createInitialState(), ...extra };
  return {
    data,
    activeUserId: 'julia',
    saveLocal: () => {},
  };
}

const noSync = { markDirty: () => {} };

function makeUsers(storage) {
  return {
    getActive: () => storage.data.users.find(u => u.id === storage.activeUserId),
    addPoints: (uid, pts, reason) => {
      const u = storage.data.users.find(u => u.id === uid);
      if (u) { u.points = (u.points || 0) + pts; }
      storage.data.chronicle.push({ text: `${uid} +${pts}: ${reason}`, time: Date.now() });
    },
  };
}

function freshManager() {
  const storage = makeStorage();
  const users   = makeUsers(storage);
  return { m: new QuestManager(storage, noSync, users), storage, users };
}

// ── isQuestAvailable ──────────────────────────────────────────────────────────
suite('QuestManager.isQuestAvailable');

test('offene Quest ist verfügbar', () => {
  const { m } = freshManager();
  const q = m.getQuests()[0];
  isTrue(m.isQuestAvailable(q));
});

test('gelöschte Quest ist nicht verfügbar', () => {
  const { m } = freshManager();
  const q = m.getQuests()[0];
  q._deleted = true;
  isFalse(m.isQuestAvailable(q));
});

test('einmalige erledigte Quest ist nicht verfügbar', () => {
  const { m } = freshManager();
  const q = { id: 'q1', completed: true, repeatable: false, _deleted: false };
  isFalse(m.isQuestAvailable(q));
});

test('wiederholbare erledigte Quest bleibt verfügbar', () => {
  const { m } = freshManager();
  const q = { id: 'q1', completed: true, repeatable: true, _deleted: false };
  isTrue(m.isQuestAvailable(q));
});

test('Quest mit nicht-erfüllter Abhängigkeit ist gesperrt', () => {
  const { m } = freshManager();
  const parent = { id: 'parent', completed: false, repeatable: true, _deleted: false };
  const child  = { id: 'child',  completed: false, repeatable: true, _deleted: false, dependsOn: 'parent' };
  m.storage.data.quests = [parent, child];
  isFalse(m.isQuestAvailable(child));
});

test('Quest mit erfüllter Abhängigkeit ist verfügbar', () => {
  const { m } = freshManager();
  const parent = { id: 'parent', completed: true, repeatable: true, _deleted: false };
  const child  = { id: 'child',  completed: false, repeatable: true, _deleted: false, dependsOn: 'parent' };
  m.storage.data.quests = [parent, child];
  isTrue(m.isQuestAvailable(child));
});

// ── completeQuest ─────────────────────────────────────────────────────────────
suite('QuestManager.completeQuest');

test('Quest wird als erledigt markiert', () => {
  const { m } = freshManager();
  const q = m.getQuests()[0];
  const ok = m.completeQuest(q.id);
  isTrue(ok);
  isTrue(m.storage.data.quests.find(x => x.id === q.id).completed);
});

test('Punkte werden dem aktiven Nutzer gutgeschrieben', () => {
  const { m, storage } = freshManager();
  const q = m.getQuests()[0];
  const before = storage.data.users.find(u => u.id === 'julia').points;
  m.completeQuest(q.id);
  const after = storage.data.users.find(u => u.id === 'julia').points;
  isTrue(after > before, `Punkte nicht erhöht: ${before} → ${after}`);
  eq(after - before, q.points);
});

test('Chronik-Eintrag wird angelegt', () => {
  const { m, storage } = freshManager();
  const q = m.getQuests()[0];
  m.completeQuest(q.id);
  isTrue(storage.data.chronicle.length > 0);
});

test('completedBy wird gesetzt', () => {
  const { m, storage } = freshManager();
  const q = m.getQuests()[0];
  m.completeQuest(q.id);
  eq(storage.data.quests.find(x => x.id === q.id).completedBy, 'julia');
});

test('unbekannte id gibt false', () => {
  const { m } = freshManager();
  isFalse(m.completeQuest('nope'));
});

// ── addCustomQuest ────────────────────────────────────────────────────────────
suite('QuestManager.addCustomQuest');

test('Quest wird angelegt und hat alle Pflichtfelder', () => {
  const { m } = freshManager();
  const q = m.addCustomQuest('Küche putzen', 'Alles abwischen', 15);
  notNull(q.id);
  eq(q.title, 'Küche putzen');
  eq(q.points, 15);
  isFalse(q.completed);
  isFalse(q._deleted);
  eq(q.targetUserId, 'all');
  eq(q.priority, 3);
});

test('Quest erscheint in getQuests()', () => {
  const { m } = freshManager();
  m.addCustomQuest('Fenster putzen', '', 10);
  isTrue(m.getQuests().some(q => q.title === 'Fenster putzen'));
});

suite('QuestManager.targetingAndRanking');

test('getQuestsForUser liefert nur fuer User oder alle', () => {
  const { m } = freshManager();
  m.storage.data.quests = [
    { id: 'a', title: 'A', completed: false, repeatable: true, _deleted: false, targetUserId: 'all', priority: 2, updatedAt: 1 },
    { id: 'b', title: 'B', completed: false, repeatable: true, _deleted: false, targetUserId: 'helena', priority: 4, updatedAt: 2 },
    { id: 'c', title: 'C', completed: false, repeatable: true, _deleted: false, targetUserId: 'julia', priority: 1, updatedAt: 3 },
  ];
  const helena = m.getQuestsForUser('helena').map(q => q.id);
  isTrue(helena.includes('a'));
  isTrue(helena.includes('b'));
  isFalse(helena.includes('c'));
});

test('sortByPriorityAndDue sortiert nach Prioritaet und Faelligkeit', () => {
  const { m } = freshManager();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const sorted = m.sortByPriorityAndDue([
    { id: 'x', priority: 2, dueDate: nextWeek.toISOString().split('T')[0], updatedAt: 10 },
    { id: 'y', priority: 4, dueDate: tomorrow.toISOString().split('T')[0], updatedAt: 9 },
    { id: 'z', priority: 3, dueDate: null, updatedAt: 11 }
  ]);
  eq(sorted[0].id, 'y');
});

test('getQuestsForUser faellt auf alle Aufgaben zurueck wenn nichts matched', () => {
  const { m } = freshManager();
  m.storage.data.quests = [
    { id: 'a', title: 'A', completed: false, repeatable: true, _deleted: false, targetUserId: 'helena', updatedAt: 1 },
    { id: 'b', title: 'B', completed: false, repeatable: true, _deleted: false, targetUserId: 'elisabeth', updatedAt: 1 }
  ];
  const juliaView = m.getQuestsForUser('julia').map(q => q.id);
  isTrue(juliaView.includes('a'));
  isTrue(juliaView.includes('b'));
});

test('addCustomQuest initialisiert quests-Array wenn es fehlt', () => {
  const { m } = freshManager();
  m.storage.data.quests = null;
  const q = m.addCustomQuest('Test', '', 5);
  eq(q.title, 'Test');
  isTrue(Array.isArray(m.storage.data.quests));
  isTrue(m.storage.data.quests.some(x => x.id === q.id));
});

test('getQuestItems und getTaskItems trennen sauber nach kind', () => {
  const { m } = freshManager();
  m.storage.data.quests = [
    { id: 'q1', title: 'Quest', completed: false, repeatable: true, _deleted: false, kind: 'quest' },
    { id: 't1', title: 'Task', completed: false, repeatable: true, _deleted: false, kind: 'task' }
  ];
  eq(m.getQuestItems().length, 1);
  eq(m.getTaskItems().length, 1);
  eq(m.getQuestItems()[0].id, 'q1');
  eq(m.getTaskItems()[0].id, 't1');
});

test('addCustomQuest setzt kind quest als Standard', () => {
  const { m } = freshManager();
  const q = m.addCustomQuest('Standard', '', 5);
  eq(q.kind, 'quest');
});

// ── deleteQuest ───────────────────────────────────────────────────────────────
suite('QuestManager.deleteQuest');

test('setzt _deleted auf true (Soft-Delete)', () => {
  const { m } = freshManager();
  const q = m.getQuests()[0];
  isTrue(m.deleteQuest(q.id));
  isTrue(m.storage.data.quests.find(x => x.id === q.id)._deleted);
});

test('löst Abhängigkeit bei abhängigen Quests', () => {
  const { m } = freshManager();
  const parent = m.addCustomQuest('Eltern-Quest', '', 5);
  const child  = m.addCustomQuest('Kind-Quest', '', 5, { dependsOn: parent.id });
  m.deleteQuest(parent.id);
  const updatedChild = m.storage.data.quests.find(q => q.id === child.id);
  eq(updatedChild.dependsOn, null);
});

// ── resetQuest ────────────────────────────────────────────────────────────────
suite('QuestManager.resetQuest');

test('wiederholbare Quest kann zurückgesetzt werden', () => {
  const { m } = freshManager();
  const q = m.addCustomQuest('Test', '', 5, { repeatable: true });
  m.completeQuest(q.id);
  isTrue(m.storage.data.quests.find(x => x.id === q.id).completed);
  isTrue(m.resetQuest(q.id));
  isFalse(m.storage.data.quests.find(x => x.id === q.id).completed);
});

test('einmalige Quest kann nicht zurückgesetzt werden', () => {
  const { m } = freshManager();
  const q = m.addCustomQuest('Einmalig', '', 5, { repeatable: false });
  isFalse(m.resetQuest(q.id));
});

suite('QuestManager.rotation');

test('rotierende Badputz-Quest ist in Initialdaten vorhanden', () => {
  const { m } = freshManager();
  isTrue(m.getQuests().some(q => q.id === 'bad-putzen-rotation'));
});

test('Rotation wandert beim Abschluss weiter und Quest bleibt offen', () => {
  const { m } = freshManager();
  const q = m.getQuests().find(x => x.id === 'bad-putzen-rotation');
  const before = m.getRotationInfo(q);

  isTrue(m.completeQuest(q.id));
  const updated = m.getQuests().find(x => x.id === q.id);
  const after = m.getRotationInfo(updated);

  isFalse(updated.completed);
  isTrue(after.currentAssigneeId !== before.currentAssigneeId);
  eq(updated.rotation.lastCompletedBy, 'julia');
});

test('setRotationAssignee setzt die zustaendige Person gezielt', () => {
  const { m } = freshManager();
  const q = m.getQuests().find(x => x.id === 'bad-putzen-rotation');

  isTrue(m.setRotationAssignee(q.id, 'elisabeth'));
  const info = m.getRotationInfo(q.id);
  eq(info.currentAssigneeId, 'elisabeth');
});

test('setRotationAssignee gibt false bei ungueltiger Person', () => {
  const { m } = freshManager();
  const q = m.getQuests().find(x => x.id === 'bad-putzen-rotation');
  isFalse(m.setRotationAssignee(q.id, 'unknown-user'));
});

test('setRotationAssignee loggt rotation_assignee_switched', () => {
  const storage = makeStorage();
  const calls = [];
  const tracker = {
    trackFeatureUsage: (featureId, eventName, userId, metadata) => {
      calls.push({ featureId, eventName, userId, metadata });
    }
  };
  const m = new QuestManager(storage, noSync, makeUsers(storage), tracker);
  const q = m.getQuests().find(x => x.id === 'bad-putzen-rotation');

  isTrue(m.setRotationAssignee(q.id, 'elisabeth'));
  eq(calls.length, 1);
  eq(calls[0].featureId, 'quests');
  eq(calls[0].eventName, 'rotation_assignee_switched');
  eq(calls[0].metadata.toUserId, 'elisabeth');
});

test('completeQuest loggt rotation_completed_by_other_user', () => {
  const storage = makeStorage();
  storage.activeUserId = 'elisabeth';
  const calls = [];
  const tracker = {
    trackFeatureUsage: (featureId, eventName, userId, metadata) => {
      calls.push({ featureId, eventName, userId, metadata });
    }
  };
  const m = new QuestManager(storage, noSync, makeUsers(storage), tracker);
  const q = m.getQuests().find(x => x.id === 'bad-putzen-rotation');
  q.rotation.currentIndex = 1; // helena ist geplant

  isTrue(m.completeQuest(q.id));
  const evt = calls.find(c => c.eventName === 'rotation_completed_by_other_user');
  isTrue(!!evt);
  eq(evt.metadata.assignedTo, 'helena');
  eq(evt.metadata.completedBy, 'elisabeth');
});

// ── applyPenalty (NEU: Geldstrafen) ───────────────────────────────────────

suite('QuestManager.applyPenalty');

test('Strafe kann auf überfällige Quest angewendet werden', () => {
  const { m, storage } = freshManager();

  // Quest mit Strafe erstellen (überfällig)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const questWithPenalty = {
    id: 'test-penalty',
    title: 'Bad putzen',
    completed: false,
    _deleted: false,
    _penaltyApplied: false,
    dueDate: yesterday.toISOString().split('T')[0],
    penaltyAmountCents: 200,
    penaltyDescription: 'Nicht rechtzeitig gereinigt',
    repeatable: true,
    rotation: {
      enabled: true,
      userIds: ['helena'],
      currentIndex: 0,
      lastCompletedBy: null
    }
  };

  storage.data.quests = [questWithPenalty];
  storage.data.reisekasse = { rules: [], transactions: [], weeklyStatements: [] };

  // Strafe anwenden
  isTrue(m.applyPenalty('test-penalty', 'helena'));

  // Transaktion wurde erstellt
  isTrue(storage.data.reisekasse.transactions.length > 0);
  const tx = storage.data.reisekasse.transactions[0];
  eq(tx.userId, 'helena');
  eq(tx.amountCents, 200);
});

test('Strafe erstellt Chronik-Eintrag', () => {
  const { m, storage } = freshManager();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const questWithPenalty = {
    id: 'test-penalty-2',
    title: 'Zimmer aufräumen',
    completed: false,
    _deleted: false,
    _penaltyApplied: false,
    dueDate: yesterday.toISOString().split('T')[0],
    penaltyAmountCents: 300,
    penaltyDescription: 'Nicht ordentlich',
    repeatable: true,
    rotation: { enabled: true, userIds: ['julia'], currentIndex: 0, lastCompletedBy: null }
  };

  storage.data.quests = [questWithPenalty];
  storage.data.reisekasse = { rules: [], transactions: [], weeklyStatements: [] };
  storage.data.chronicle = []; // Chronik zurücksetzen für sauberen Test

  m.applyPenalty('test-penalty-2', 'julia');

  isTrue(storage.data.chronicle.length > 0, 'Chronik-Eintrag nicht erstellt');
  const entry = storage.data.chronicle[0];
  eq(entry.emoji, '💸');
  isTrue(entry.text.includes('Julia'), `Text enthält "Julia" nicht: ${entry.text}`);
  isTrue(entry.text.includes('3.00'), `Text enthält "3.00" nicht: ${entry.text}`);
});

test('Strafe setzt _penaltyApplied Flag', () => {
  const { m, storage } = freshManager();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const quest = {
    id: 'test-penalty-3',
    title: 'Test',
    completed: false,
    _deleted: false,
    _penaltyApplied: false,
    dueDate: yesterday.toISOString().split('T')[0],
    penaltyAmountCents: 100,
    penaltyDescription: 'Test',
    repeatable: true,
    rotation: { enabled: true, userIds: ['helena'], currentIndex: 0, lastCompletedBy: null }
  };

  storage.data.quests = [quest];
  storage.data.reisekasse = { rules: [], transactions: [], weeklyStatements: [] };

  m.applyPenalty('test-penalty-3', 'helena');

  const updatedQuest = storage.data.quests.find(q => q.id === 'test-penalty-3');
  isTrue(updatedQuest._penaltyApplied);
});

test('Strafe kann nicht zweimal angewendet werden', () => {
  const { m, storage } = freshManager();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const quest = {
    id: 'test-penalty-4',
    title: 'Test',
    completed: false,
    _deleted: false,
    _penaltyApplied: false,
    dueDate: yesterday.toISOString().split('T')[0],
    penaltyAmountCents: 150,
    penaltyDescription: 'Test',
    repeatable: true,
    rotation: { enabled: true, userIds: ['julia'], currentIndex: 0, lastCompletedBy: null }
  };

  storage.data.quests = [quest];
  storage.data.reisekasse = { rules: [], transactions: [], weeklyStatements: [] };

  m.applyPenalty('test-penalty-4', 'julia');

  // Zweiter Versuch sollte Fehler werfen
  let thrown = false;
  try {
    m.applyPenalty('test-penalty-4', 'julia');
  } catch (e) {
    thrown = true;
    isTrue(e.message.includes('bereits angewendet'));
  }
  isTrue(thrown, 'Fehler wurde nicht geworfen');
});

test('Strafe wird verweigert wenn Quest bereits erledigt', () => {
  const { m, storage } = freshManager();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const quest = {
    id: 'test-penalty-5',
    title: 'Test',
    completed: true,
    _deleted: false,
    _penaltyApplied: false,
    dueDate: yesterday.toISOString().split('T')[0],
    penaltyAmountCents: 200,
    penaltyDescription: 'Test',
    repeatable: true,
    rotation: { enabled: true, userIds: ['helena'], currentIndex: 0, lastCompletedBy: null }
  };

  storage.data.quests = [quest];
  storage.data.reisekasse = { rules: [], transactions: [], weeklyStatements: [] };

  let thrown = false;
  try {
    m.applyPenalty('test-penalty-5', 'helena');
  } catch (e) {
    thrown = true;
    isTrue(e.message.includes('bereits erledigt'));
  }
  isTrue(thrown);
});

summary();
