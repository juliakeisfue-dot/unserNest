// modules/domains/reisekasse/manager.js

function genId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function toCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

function fromCents(cents) {
  return (Number(cents) || 0) / 100;
}

function weekRangeFor(ts) {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7; // Montag = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  const start = d.getTime();
  const end = start + (7 * 24 * 60 * 60 * 1000) - 1;
  return { start, end };
}

export class ReisekasseManager {
  constructor(storage, sync) {
    this.storage = storage;
    this.sync = sync;
  }

  _ensureState() {
    if (!this.storage.data.reisekasse || typeof this.storage.data.reisekasse !== 'object') {
      this.storage.data.reisekasse = { rules: [], transactions: [], weeklyStatements: [], updatedAt: Date.now() };
    }
    if (!Array.isArray(this.storage.data.reisekasse.rules)) this.storage.data.reisekasse.rules = [];
    if (!Array.isArray(this.storage.data.reisekasse.transactions)) this.storage.data.reisekasse.transactions = [];
    if (!Array.isArray(this.storage.data.reisekasse.weeklyStatements)) this.storage.data.reisekasse.weeklyStatements = [];
  }

  _touch() {
    this._ensureState();
    this.storage.data.reisekasse.updatedAt = Date.now();
    this.storage.data.version = Number(this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
  }

  _appendChronicle(text, emoji = '💰', metadata = {}) {
    if (!Array.isArray(this.storage.data.chronicle)) this.storage.data.chronicle = [];
    const ts = Date.now();
    this.storage.data.chronicle.unshift({
      id: genId('chr'),
      emoji,
      text,
      timestamp: ts,
      date: new Date(ts).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
      metadata
    });
    this.storage.data.chronicle = this.storage.data.chronicle.slice(0, 300);
  }

  getRules(includeDeleted = false) {
    this._ensureState();
    const rules = this.storage.data.reisekasse.rules;
    return rules
      .filter(r => includeDeleted || !r._deleted)
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
  }

  addRule({ title, description = '', amount = 0, userIds = [], exceptionNote = '', active = true }) {
    const cleanTitle = String(title || '').trim();
    const cents = toCents(amount);
    if (!cleanTitle || cents <= 0) return false;

    const now = Date.now();
    this.storage.data.reisekasse.rules.push({
      id: genId('rk-rule'),
      title: cleanTitle,
      description: String(description || '').trim(),
      amountCents: cents,
      userIds: Array.isArray(userIds) ? [...new Set(userIds.filter(Boolean))] : [],
      appliesToAll: !Array.isArray(userIds) || userIds.length === 0,
      exceptionNote: String(exceptionNote || '').trim(),
      active: !!active,
      _deleted: false,
      createdAt: now,
      updatedAt: now
    });

    this._touch();
    return true;
  }

  updateRule(ruleId, patch = {}) {
    const rule = this.storage.data.reisekasse.rules.find(r => r.id === ruleId && !r._deleted);
    if (!rule) return false;

    if (patch.title !== undefined) rule.title = String(patch.title || '').trim() || rule.title;
    if (patch.description !== undefined) rule.description = String(patch.description || '').trim();
    if (patch.exceptionNote !== undefined) rule.exceptionNote = String(patch.exceptionNote || '').trim();
    if (patch.active !== undefined) rule.active = !!patch.active;
    if (patch.amount !== undefined) {
      const cents = toCents(patch.amount);
      if (cents > 0) rule.amountCents = cents;
    }
    if (patch.userIds !== undefined) {
      const ids = Array.isArray(patch.userIds) ? [...new Set(patch.userIds.filter(Boolean))] : [];
      rule.userIds = ids;
      rule.appliesToAll = ids.length === 0;
    }

    rule.updatedAt = Date.now();
    this._touch();
    return true;
  }

  deleteRule(ruleId) {
    const rule = this.storage.data.reisekasse.rules.find(r => r.id === ruleId && !r._deleted);
    if (!rule) return false;
    rule._deleted = true;
    rule.updatedAt = Date.now();
    this._touch();
    return true;
  }

  toggleRule(ruleId) {
    const rule = this.storage.data.reisekasse.rules.find(r => r.id === ruleId && !r._deleted);
    if (!rule) return false;
    rule.active = !rule.active;
    rule.updatedAt = Date.now();
    this._touch();
    return true;
  }

  getTransactions({ includeDeleted = false, includeSettled = true } = {}) {
    this._ensureState();
    return this.storage.data.reisekasse.transactions
      .filter(t => (includeDeleted || !t._deleted) && (includeSettled || !t.settledAt))
      .sort((a, b) => Number(b.occurredAt || 0) - Number(a.occurredAt || 0));
  }

  addPayment({ userId, amount, reason, ruleId = null, occurredAt = Date.now() }) {
    const user = this.storage.data.users.find(u => u.id === userId);
    const cents = toCents(amount);
    const cleanReason = String(reason || '').trim();
    if (!user || cents <= 0 || !cleanReason) return false;

    const now = Date.now();
    const tx = {
      id: genId('rk-tx'),
      userId: user.id,
      userName: user.name,
      ruleId: ruleId || null,
      reason: cleanReason,
      amountCents: cents,
      occurredAt: Number(occurredAt || now),
      createdAt: now,
      updatedAt: now,
      _deleted: false,
      settledAt: null,
      statementId: null
    };

    this.storage.data.reisekasse.transactions.push(tx);
    this._appendChronicle(`Reisekasse: ${user.name} zahlt ${fromCents(cents).toFixed(2)} EUR (${cleanReason})`, '💰', {
      domain: 'reisekasse',
      transactionId: tx.id,
      userId: user.id,
      amountCents: cents
    });
    this._touch();
    return tx;
  }

  deleteTransaction(txId) {
    const tx = this.storage.data.reisekasse.transactions.find(t => t.id === txId && !t._deleted);
    if (!tx) return false;
    tx._deleted = true;
    tx.updatedAt = Date.now();
    this._touch();
    return true;
  }

  getOpenWeeklySummary(now = Date.now()) {
    const { start, end } = weekRangeFor(now);
    const rows = this.getTransactions({ includeSettled: false }).filter(t => !t._deleted && t.occurredAt >= start && t.occurredAt <= end);
    const totalsByUser = {};
    rows.forEach(t => {
      totalsByUser[t.userId] = (totalsByUser[t.userId] || 0) + Number(t.amountCents || 0);
    });

    return {
      weekStart: start,
      weekEnd: end,
      count: rows.length,
      totalCents: rows.reduce((sum, r) => sum + Number(r.amountCents || 0), 0),
      totalsByUser,
      rows
    };
  }

  createWeeklyStatement(now = Date.now()) {
    const open = this.getTransactions({ includeSettled: false }).filter(t => !t._deleted);
    if (open.length === 0) return false;

    const firstTs = Math.min(...open.map(t => Number(t.occurredAt || now)));
    const lastTs = Math.max(...open.map(t => Number(t.occurredAt || now)));
    const range = weekRangeFor(lastTs);

    const totalsByUser = {};
    open.forEach(t => {
      totalsByUser[t.userId] = (totalsByUser[t.userId] || 0) + Number(t.amountCents || 0);
    });

    const statementId = genId('rk-statement');
    open.forEach(t => {
      t.settledAt = now;
      t.statementId = statementId;
      t.updatedAt = now;
    });

    const statement = {
      id: statementId,
      title: `Abrechnung ${new Date(range.start).toLocaleDateString('de-DE')} - ${new Date(range.end).toLocaleDateString('de-DE')}`,
      weekStart: range.start,
      weekEnd: range.end,
      firstTransactionAt: firstTs,
      lastTransactionAt: lastTs,
      transactionIds: open.map(t => t.id),
      totalsByUser,
      totalCents: open.reduce((sum, t) => sum + Number(t.amountCents || 0), 0),
      createdAt: now,
      updatedAt: now,
      _deleted: false
    };

    this.storage.data.reisekasse.weeklyStatements.unshift(statement);
    this._appendChronicle(`Reisekasse: Wochenabrechnung erstellt (${open.length} Buchungen)`, '🧾', {
      domain: 'reisekasse',
      statementId,
      transactionCount: open.length
    });
    this._touch();
    return statement;
  }

  getStatements(limit = 12) {
    this._ensureState();
    return this.storage.data.reisekasse.weeklyStatements
      .filter(s => !s._deleted)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, limit);
  }
}

