/**
 * tests/reisekasse.test.js
 * Tests fuer ReisekasseManager: Regeln, Zahlungen, Wochenabrechnung.
 */
import { suite, test, eq, isTrue, isFalse, notNull, summary } from './helpers.js';
import { createInitialState } from '../modules/core/config.js';
import { ReisekasseManager } from '../modules/domains/reisekasse/manager.js';

function makeStorage() {
  return {
    data: createInitialState(),
    saveLocal: () => {}
  };
}

function makeMgr() {
  return new ReisekasseManager(makeStorage(), { markDirty: () => {} });
}

suite('ReisekasseManager.rules');

test('Default-Regeln sind vorhanden', () => {
  const m = makeMgr();
  isTrue(m.getRules().length >= 4);
});

test('Neue Regel kann angelegt werden', () => {
  const m = makeMgr();
  const before = m.getRules().length;
  const ok = m.addRule({ title: 'Testregel', amount: 3.5, userIds: ['julia'] });
  isTrue(ok);
  eq(m.getRules().length, before + 1);
});

test('Regel kann bearbeitet werden', () => {
  const m = makeMgr();
  const rule = m.getRules()[0];
  const ok = m.updateRule(rule.id, { amount: 7, title: 'Neu' });
  isTrue(ok);
  const after = m.getRules().find(r => r.id === rule.id);
  eq(after.title, 'Neu');
  eq(after.amountCents, 700);
});

suite('ReisekasseManager.transactions');

test('Zahlung wird gespeichert', () => {
  const m = makeMgr();
  const tx = m.addPayment({ userId: 'julia', amount: 5, reason: 'Handy am Tisch' });
  notNull(tx);
  eq(m.getTransactions().length, 1);
  eq(m.getTransactions()[0].amountCents, 500);
});

test('Ungueltige Zahlung wird abgelehnt', () => {
  const m = makeMgr();
  isFalse(!!m.addPayment({ userId: 'julia', amount: 0, reason: 'x' }));
  eq(m.getTransactions().length, 0);
});

test('Offene Wochen-Summe wird pro Nutzer aggregiert', () => {
  const m = makeMgr();
  m.addPayment({ userId: 'julia', amount: 5, reason: 'A' });
  m.addPayment({ userId: 'julia', amount: 2, reason: 'B' });
  m.addPayment({ userId: 'christian', amount: 3, reason: 'C' });
  const s = m.getOpenWeeklySummary();
  eq(s.totalsByUser.julia, 700);
  eq(s.totalsByUser.christian, 300);
  eq(s.totalCents, 1000);
});

suite('ReisekasseManager.weeklyStatement');

test('Wochenabrechnung markiert offene Buchungen als abgerechnet', () => {
  const m = makeMgr();
  m.addPayment({ userId: 'julia', amount: 5, reason: 'A' });
  m.addPayment({ userId: 'helena', amount: 2, reason: 'B' });
  const st = m.createWeeklyStatement();
  notNull(st);
  eq(st.transactionIds.length, 2);
  isTrue(m.getTransactions().every(t => !!t.settledAt));
  eq(m.getStatements(1).length, 1);
});

test('Leere Abrechnung liefert false', () => {
  const m = makeMgr();
  isFalse(!!m.createWeeklyStatement());
});

// ── Strafe-Transaktionen (NEU: applyPenalty Integration) ──────────────────

suite('ReisekasseManager.penalty-transactions');

test('Strafe-Transaktion wird in Reisekasse registriert', () => {
  const storage = makeStorage();
  const m = new ReisekasseManager(storage, { markDirty: () => {} });

  // Straf-Transaktion hinzufügen (wie in QuestManager.applyPenalty)
  storage.data.reisekasse.transactions.push({
    id: 'rk-tx-test',
    userId: 'helena',
    userName: 'Helena',
    ruleId: null,
    reason: 'Geldstrafe: Bad putzen (Nicht rechtzeitig gereinigt)',
    amountCents: 200,
    occurredAt: Date.now(),
    settledAt: null,
    statementId: null,
    _deleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const txs = m.getTransactions();
  eq(txs.length, 1);
  eq(txs[0].amountCents, 200);
  isTrue(txs[0].reason.includes('Geldstrafe'));
  eq(txs[0].userId, 'helena');
});

test('Strafe-Transaktion wird in Wochenabrechnung erfasst', () => {
  const storage = makeStorage();
  const m = new ReisekasseManager(storage, { markDirty: () => {} });

  // Strafe-Transaktion
  m.addPayment({ userId: 'helena', amount: 2, reason: 'Geldstrafe: Bad nicht geputzt' });

  const summary = m.getOpenWeeklySummary();
  eq(summary.totalsByUser.helena, 200);

  // Wochenabrechnung
  const stmt = m.createWeeklyStatement();
  notNull(stmt);
  eq(stmt.totalsByUser.helena, 200);
});

summary();

