/**
 * tests/bill.test.js
 * Tests für BillOCRManager: Parser, Normalisierung und Metadaten-Extraktion.
 */
import { suite, test, eq, isTrue, isFalse, isNull, summary } from './helpers.js';
import { BillOCRManager } from '../modules/domains/bill/manager.js';

const mgr = new BillOCRManager({ data: {} }, {}, {}, null);

// ─── _normalizeLine ──────────────────────────────────────────────────────────
suite('_normalizeLine');

test('entfernt Semikolons und Pipes', () => {
  eq(mgr._normalizeLine('ZZ APFEL; 3,49 B|rest'), 'ZZ APFEL 3,49 B rest');
});

test('kollabiert mehrfache Leerzeichen', () => {
  eq(mgr._normalizeLine('A   B   C'), 'A B C');
});

test('trimmt Leerzeichen', () => {
  eq(mgr._normalizeLine('  APFEL 1,99  '), 'APFEL 1,99');
});

test('gibt leeren String bei undefined zurück', () => {
  eq(mgr._normalizeLine(undefined), '');
});

// ─── _normalizePrice ─────────────────────────────────────────────────────────
suite('_normalizePrice');

test('wandelt Komma in Punkt um', () => {
  eq(mgr._normalizePrice('3,49'), '3.49');
});

test('gibt zweistellige Dezimalen zurück', () => {
  eq(mgr._normalizePrice('58.9'), '58.90');
});

test('ignoriert Leerzeichen im Preis', () => {
  eq(mgr._normalizePrice('58, 91'), '58.91');
});

test('gibt leeren String für ungültigen Wert zurück', () => {
  eq(mgr._normalizePrice('ABC'), '');
  eq(mgr._normalizePrice(null), '');
  eq(mgr._normalizePrice(''), '');
});

// ─── extractBillSummary ───────────────────────────────────────────────────────
suite('extractBillSummary – REWE-Bon');

const REWE_TEXT = `
KO Ea Büren
UID Nr. : DE812706034
ZZ SPIN. RIC. TORT. 4,99
EEE APFEL ELSTAR 3,49 B
En MANGO 7ER 1,59 B
SALAT KOPF HERZ 2,22 B
SALATGURKE 1,76 B
AUBERGINE 1,29 B
CHAMPIGNONS 1,49 B
EIER BH_M-L 2,49 B
SUMME TU EUR 58,91
ZZ — Geg. EC-Cash EUR 58, 91
Da X X Kundenbeleg x *
; : 14. 03. 2026
`;

test('erkennt Datum korrekt', () => {
  eq(mgr.extractBillSummary(REWE_TEXT).date, '2026-03-14');
});

test('erkennt Gesamtsumme', () => {
  eq(mgr.extractBillSummary(REWE_TEXT).total, '58.91');
});

test('erkennt EC-Cash-Betrag', () => {
  eq(mgr.extractBillSummary(REWE_TEXT).paid, '58.91');
});

test('gibt null/leer bei leerem Text', () => {
  const s = mgr.extractBillSummary('');
  isNull(s.date);
  eq(s.total, '');
  eq(s.paid, '');
});

test('zweistellige Jahreszahl wird zu vierstellig', () => {
  eq(mgr.extractBillSummary('SUMME EUR 10,00\n15.03.26').date, '2026-03-15');
});

// ─── parseBillText ────────────────────────────────────────────────────────────
suite('parseBillText – Artikelerkennung');

test('erkennt typische REWE-Artikel mit Steuerklasse B', () => {
  const items = mgr.parseBillText('APFEL ELSTAR 3,49 B');
  eq(items.length, 1);
  eq(items[0].price, '3.49');
  isTrue(items[0].name.includes('APFEL ELSTAR'), `Name war: ${items[0].name}`);
});

test('erkennt Artikel mit Steuerklasse A', () => {
  const items = mgr.parseBillText('REWE APFEL TRUEB 2,78 A');
  eq(items.length, 1);
  eq(items[0].price, '2.78');
});

test('ignoriert Zeilen ohne Preis', () => {
  eq(mgr.parseBillText('UID Nr. DE812706034\nUhrzeit 12:40').length, 0);
});

test('ignoriert SUMME-Zeile', () => {
  eq(mgr.parseBillText('SUMME TU EUR 58,91').length, 0);
});

test('ignoriert kg×Preis-Zeilen (Gewichtsartikel)', () => {
  eq(mgr.parseBillText('1,128 kg x 2,99 EUR/kg').length, 0);
});

test('ignoriert Stk×Preis-Zeilen', () => {
  eq(mgr.parseBillText('3 Stk x 0,88').length, 0);
});

test('setzt Kaufdatum aus Bon-Datum', () => {
  const items = mgr.parseBillText('APFEL ELSTAR 3,49 B\n14. 03. 2026');
  eq(items.length, 1);
  eq(items[0].purchaseDate, '2026-03-14');
});

test('ordnet kg-Folgezeile dem letzten Artikel zu', () => {
  const items = mgr.parseBillText('R ZUCCHINI GRUEN 3,37 B ]\n1,128 kg x 2,99 EUR/kg');
  eq(items.length, 1);
  isTrue(items[0].quantity.includes('1,128 kg x 2,99 EUR/kg'));
});

test('bereinigt führende OCR-Artefakte (2-Zeichen-Prefix)', () => {
  const items = mgr.parseBillText('En MANGO 7ER 1,59 B');
  eq(items.length, 1);
  isFalse(items[0].name.startsWith('En '), `Name war: ${items[0].name}`);
});

test('parst vollständigen REWE-Bon mit mindestens 8 Artikeln', () => {
  isTrue(mgr.parseBillText(REWE_TEXT).length >= 8,
    `Nur ${mgr.parseBillText(REWE_TEXT).length} Artikel erkannt`);
});

test('jeder geparste Artikel hat name, price und purchaseDate', () => {
  for (const item of mgr.parseBillText(REWE_TEXT)) {
    isTrue(item.name.length >= 2, `Zu kurzer Name: "${item.name}"`);
    isTrue(item.price.length > 0, `Kein Preis für "${item.name}"`);
    isTrue(/^\d{4}-\d{2}-\d{2}$/.test(item.purchaseDate),
      `Falsches Datum "${item.purchaseDate}" für "${item.name}"`);
  }
});

test('keine Duplikate: SUMME-Zeile nicht als Artikel', () => {
  const sumItem = mgr.parseBillText(REWE_TEXT).find(i => /SUMME/i.test(i.name));
  isTrue(!sumItem, `SUMME fälschlicherweise als Artikel: ${JSON.stringify(sumItem)}`);
});

summary();

