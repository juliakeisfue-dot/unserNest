// modules/inventory.js
export class InventoryManager {
  constructor(storage, sync) {
    this.storage = storage;
    this.sync = sync;
  }

  _normalizeName(name) {
    return (name || '').trim().toLowerCase();
  }

  _normalizeAmountText(rawAmount = '') {
    const raw = String(rawAmount || '').trim();
    if (!raw) return '';

    const parts = raw.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return '';

    const parsed = this._parseQuantity(parts[0]);
    const first = parsed ? this._formatQuantity(parsed) : parts[0].replace(/\s+/g, ' ');

    if (parts.length === 1) return first;
    return [first, ...parts.slice(1)].join(' | ');
  }

  _trimNumber(num) {
    const fixed = Number(num.toFixed(2));
    return Number.isInteger(fixed) ? String(fixed) : String(fixed).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  }

  _parseQuantity(rawAmount = '') {
    const firstPart = String(rawAmount).split('|')[0].trim();
    // Kassenbonmenge: "1,128 kg x 2,99 EUR/kg" -> nur den Mengenanteil vor dem "x" auswerten
    const billM = firstPart.match(/^(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg)\s*x\s*/i);
    if (billM) {
      const value = parseFloat(billM[1].replace(',', '.'));
      const unit = billM[2].toLowerCase();
      if (!Number.isNaN(value)) {
        if (unit === 'ml' || unit === 'l') {
          return { kind: 'volume', base: unit === 'l' ? value * 1000 : value };
        }
        return { kind: 'weight', base: unit === 'kg' ? value * 1000 : value };
      }
    }
    const m = firstPart.match(/^(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg|stk|st|x)$/i);
    if (!m) return null;

    const value = parseFloat(m[1].replace(',', '.'));
    const unit = m[2].toLowerCase();
    if (Number.isNaN(value)) return null;

    if (unit === 'ml' || unit === 'l') {
      const base = unit === 'l' ? value * 1000 : value;
      return { kind: 'volume', base };
    }

    if (unit === 'g' || unit === 'kg') {
      const base = unit === 'kg' ? value * 1000 : value;
      return { kind: 'weight', base };
    }

    // stk / st / x -> Stueckzahl
    return { kind: 'count', base: value };
  }

  _formatQuantity(q) {
    if (!q) return '';
    if (q.kind === 'volume') {
      if (q.base >= 1000) return `${this._trimNumber(q.base / 1000)} L`;
      return `${this._trimNumber(q.base)} ml`;
    }
    if (q.kind === 'weight') {
      if (q.base >= 1000) return `${this._trimNumber(q.base / 1000)} kg`;
      return `${this._trimNumber(q.base)} g`;
    }
    return `${this._trimNumber(q.base)} Stk`;
  }

  _mergeAmount(existingAmount = '', incomingAmount = '') {
    const existing = this._normalizeAmountText(existingAmount);
    const incoming = this._normalizeAmountText(incomingAmount);
    if (!existing) return incoming;
    if (!incoming) return existing;
    if (existing.toLowerCase() === incoming.toLowerCase()) return existing;

    // Nur bei einfachen Mengenangaben intelligent summieren.
    const existingParts = existing.split('|').map(p => p.trim());
    const incomingParts = incoming.split('|').map(p => p.trim());
    const e = this._parseQuantity(existingParts[0]);
    const i = this._parseQuantity(incomingParts[0]);
    if (e && i && e.kind === i.kind) {
      const mergedQty = this._formatQuantity({ kind: e.kind, base: e.base + i.base });
      // Bestehende Zusatzinfos behalten, neue (Preis/Datum) anhängen
      const extraParts = [...existingParts.slice(1), ...incomingParts.slice(1)];
      return extraParts.length
        ? [mergedQty, ...extraParts].join(' | ')
        : mergedQty;
    }

    return `${existing} + ${incoming}`;
  }

  _findSameItemInLocation(location, name, excludeItemId = null) {
    const key = this._normalizeName(name);
    if (!key || !Array.isArray(location?.items)) return null;
    return location.items.find(i =>
      i.id !== excludeItemId && !i._deleted && this._normalizeName(i.name) === key
    ) || null;
  }

  _defaultShelfLifeDaysForLocation(locationId, locationName = '') {
    const id = String(locationId || '').toLowerCase();
    const name = String(locationName || '').toLowerCase();
    const isFridge = id === 'fridge' || name.includes('kühlschrank') || name.includes('kuehlschrank');
    return isFridge ? 90 : 730;
  }

  _resolveShelfLifeDays(location) {
    const explicit = Number(location?.maxAgeDays);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    return this._defaultShelfLifeDaysForLocation(location?.id, location?.name);
  }

  _extractPurchaseDate(amount = '') {
    const m = String(amount || '').match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (!m) return null;
    const date = new Date(`${m[1]}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  _computeExpiresAt(location, amount = '', fallbackTimestamp = Date.now()) {
    const shelfLifeDays = this._resolveShelfLifeDays(location);
    const refDate = this._extractPurchaseDate(amount) || new Date(fallbackTimestamp);
    const expires = new Date(refDate);
    expires.setDate(expires.getDate() + shelfLifeDays);
    return expires.getTime();
  }

  getLocations() {
    return Object.values(this.storage.data.locations || {})
      .filter(loc => !loc._deleted)
      .map(loc => ({
        ...loc,
        items: (loc.items || []).filter(i => !i?._deleted)
      }));
  }

  getLocation(id) {
    const loc = this.storage.data.locations[id];
    if (!loc) return null;
    return {
      ...loc,
      items: (loc.items || []).filter(i => !i?._deleted)
    };
  }

  addItem(locationId, name, amount = '', deferPersist = false) {
    const loc = this.storage.data.locations[locationId];
    if (!loc || loc._deleted) return false;
    
    if (!Array.isArray(loc.items)) loc.items = [];
    
    const itemName = name.trim();
    const itemAmount = this._normalizeAmountText(amount);
    if (!itemName) return false;

    const existing = this._findSameItemInLocation(loc, itemName);
    const computedExpiresAt = this._computeExpiresAt(loc, itemAmount);
    if (existing) {
      existing.amount = this._mergeAmount(existing.amount, itemAmount);
      if (computedExpiresAt) {
        existing.expiresAt = existing.expiresAt
          ? Math.min(existing.expiresAt, computedExpiresAt)
          : computedExpiresAt;
      }
      existing.updatedAt = Date.now();
    } else {
      loc.items.push({
        id: 'inv-' + Date.now(),
        name: itemName,
        amount: itemAmount,
        addedAt: Date.now(),
        expiresAt: computedExpiresAt,
        _deleted: false,
        updatedAt: Date.now()
      });
    }
    
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    if (!deferPersist) {
      this.storage.saveLocal();
      this.sync.markDirty();
    }
    return true;
  }

  removeItem(locationId, itemId) {
    const loc = this.storage.data.locations[locationId];
    if (!loc || loc._deleted || !loc.items) return false;
    const item = loc.items.find(i => i.id === itemId && !i._deleted);
    if (!item) return false;
    item._deleted = true;
    item.updatedAt = Date.now();
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return true;
  }

  /**
   * Verbraucht eine Zutat aus dem Vorrat.
   * - Hat der Artikel eine parsierbare Mengenangabe (z.B. "3 Stk", "500 g"),
   *   wird sie um 1 Einheit (Stk) bzw. eine Standard-Portion verringert.
   *   Sinkt die Menge auf ≤ 0, wird der Artikel entfernt.
   * - Hat der Artikel keine Mengenangabe, wird er direkt entfernt.
   * Gibt 'removed' | 'reduced' | false zurück.
   */
  consumeItem(locationId, itemId) {
    const loc = this.storage.data.locations[locationId];
    if (!loc || !loc.items) return false;

    const item = loc.items.find(i => i.id === itemId && !i._deleted);
    if (!item) return false;

    const parsed = this._parseQuantity(item.amount || '');

    // Keine parsierbare Menge → direkt entfernen
    if (!parsed) {
      item._deleted = true;
      item.updatedAt = Date.now();
      this.storage.data.version = (this.storage.data.version || 0) + 1;
      this.storage.saveLocal();
      this.sync.markDirty();
      return 'removed';
    }

    // Menge um 1 Einheit reduzieren (1 Stk / 1 Einheit der jeweiligen Art)
    const newBase = parsed.base - 1;

    if (newBase <= 0) {
      item._deleted = true;
      item.updatedAt = Date.now();
      this.storage.data.version = (this.storage.data.version || 0) + 1;
      this.storage.saveLocal();
      this.sync.markDirty();
      return 'removed';
    }

    item.amount = this._formatQuantity({ kind: parsed.kind, base: newBase });
    item.updatedAt = Date.now();
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return 'reduced';
  }

  updateItem(locationId, itemId, updates = {}) {
    const loc = this.storage.data.locations[locationId];
    if (!loc || loc._deleted || !Array.isArray(loc.items)) return false;

    const item = loc.items.find(i => i.id === itemId && !i._deleted);
    if (!item) return false;

    if (typeof updates.name === 'string') {
      const name = updates.name.trim();
      if (!name) return false;
      item.name = name;
    }

    if (typeof updates.amount === 'string') {
      item.amount = this._normalizeAmountText(updates.amount);
    }

    item.updatedAt = Date.now();
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return true;
  }

  moveItem(fromId, toId, itemId) {
    const from = this.storage.data.locations[fromId];
    const to = this.storage.data.locations[toId];
    if (!from || !to || from._deleted || to._deleted) return false;
    
    const item = from.items.find(i => i.id === itemId && !i._deleted);
    if (!item) return false;

    item._deleted = true;
    item.updatedAt = Date.now();
    if (!Array.isArray(to.items)) to.items = [];

    const existing = this._findSameItemInLocation(to, item.name);
    const recomputedExpiresAt = this._computeExpiresAt(to, item.amount || '', item.addedAt || Date.now());
    if (existing) {
      existing.amount = this._mergeAmount(existing.amount, item.amount || '');
      if (recomputedExpiresAt) {
        existing.expiresAt = existing.expiresAt
          ? Math.min(existing.expiresAt, recomputedExpiresAt)
          : recomputedExpiresAt;
      }
      existing.updatedAt = Date.now();
    } else {
      to.items.push({
        ...item,
        _deleted: false,
        updatedAt: Date.now(),
        expiresAt: recomputedExpiresAt,
        movedAt: Date.now()
      });
    }
    
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return true;
  }

  addLocation(name, icon = '📦', maxAgeDays = null) {
    const id = 'loc-' + Date.now();
    const fallbackDays = this._defaultShelfLifeDaysForLocation(id, name);
    const parsed = Number(maxAgeDays);
    const resolvedMaxAgeDays = Number.isFinite(parsed) && parsed > 0
      ? Math.round(parsed)
      : fallbackDays;
    this.storage.data.locations[id] = {
      id,
      name: `${icon} ${name}`,
      items: [],
      maxAgeDays: resolvedMaxAgeDays,
      updatedAt: Date.now(),
      _deleted: false
    };
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return id;
  }

  updateLocation(id, name, icon, maxAgeDays = null) {
    const loc = this.storage.data.locations[id];
    if (!loc || loc._deleted) return false;
    
    if (name) loc.name = `${icon || loc.name.split(' ')[0]} ${name}`;
    const parsed = Number(maxAgeDays);
    if (Number.isFinite(parsed) && parsed > 0) {
      loc.maxAgeDays = Math.round(parsed);
    }
    loc.updatedAt = Date.now();
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return true;
  }

  removeLocation(id) {
    const loc = this.storage.data.locations[id];
    if (!loc || loc._deleted) return false;
    const hasVisibleItems = Array.isArray(loc.items) && loc.items.some(i => !i?._deleted);
    if (hasVisibleItems) {
      throw new Error('Ort ist nicht leer');
    }
    
    loc._deleted = true;
    loc.updatedAt = Date.now();
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return true;
  }

  findLocationByName(name) {
    return this.getLocations().find(l => 
      l.name.toLowerCase().includes(name.toLowerCase())
    );
  }
}
