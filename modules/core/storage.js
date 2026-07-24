// /mnt/kimi/upload/storage.js
import { CONFIG, createInitialState, hasConfiguredCloudCredentials } from './config.js';

export class Storage {
  constructor() {
    this.data = null;
    this.activeUserId = localStorage.getItem('activeUserId') || null;
    this.deviceId = this._ensureDeviceId();
    this._lastSavedSnapshot = null;
  }

  async _fetchWithTimeout(url, options = {}) {
    const timeoutMs = Math.max(1000, Number(CONFIG.SYNC_REQUEST_TIMEOUT_MS || 15000));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new Error(`Cloud-Request Timeout (${timeoutMs}ms)`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  loadLocal() {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (stored) {
        this.data = this.applyMigrations(JSON.parse(stored));
        this._lastSavedSnapshot = this._deepClone(this.data);
        
        console.log('[Storage] Lokal geladen');
        return true;
      }
    } catch (e) {
      console.error('[Storage] Ladefehler:', e);
    }
    this.data = this.applyMigrations(createInitialState());
    this._lastSavedSnapshot = this._deepClone(this.data);
    return false;
  }

   saveLocal() {
     try {
       this._applySyncMetadata();
       // Quota-Check vor dem Speichern
       this.checkAndCleanupQuota();

       localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.data));
       localStorage.setItem('activeUserId', this.activeUserId);
       this._lastSavedSnapshot = this._deepClone(this.data);
       return true;
     } catch (e) {
       console.error('[Storage] Speicherfehler:', e);
       // Global-Event feuern damit die App den Nutzer benachrichtigen kann
       window.dispatchEvent(new CustomEvent('storage-save-error', { detail: e }));
       return false;
     }
   }

   checkAndCleanupQuota() {
     // Prüfe Speicherquota und lösche alte Chronik-Einträge wenn nötig
     if (!navigator.storage || !navigator.storage.estimate) return;

     try {
       navigator.storage.estimate().then(estimate => {
         const percentUsed = (estimate.usage / estimate.quota) * 100;
         if (percentUsed > 80) {
           console.warn(`[Storage] Quota zu 80% genutzt: ${percentUsed.toFixed(1)}%`);
           // Automatisch alte Chronik-Einträge löschen (>60 Tage)
           this.autoCleanupChronicle();
         }
       });
     } catch (e) {
       console.debug('[Storage] Quota-Check nicht verfügbar:', e);
     }
   }

   autoCleanupChronicle() {
     const now = Date.now();
     const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
     const threshold = now - sixtyDaysMs;

     if (!this.data.chronicle) return;

     const beforeLen = this.data.chronicle.length;
     this.data.chronicle = this.data.chronicle.filter(entry => {
       if (!entry.timestamp) return true; // Keep entries without timestamp
       return entry.timestamp > threshold;
     });

     const deleted = beforeLen - this.data.chronicle.length;
     if (deleted > 0) {
       console.log(`[Storage] Automatisches Cleanup: ${deleted} alte Chronik-Einträge gelöscht`);
       this.data.version++;
       try {
         localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.data));
       } catch (e) {}
     }
   }

  getData() { return this.data; }

  getDeviceId() { return this.deviceId; }

  _ensureDeviceId() {
    const key = 'unser-nest-device-id';
    try {
      const existing = String(localStorage.getItem(key) || '').trim();
      if (existing) return existing;
      const generated = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(key, generated);
      return generated;
    } catch {
      return `dev-ephemeral-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }
  }

  _deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  _stripSyncFields(entity) {
    if (!entity || typeof entity !== 'object') return entity;
    const copy = { ...entity };
    delete copy._syncVersion;
    delete copy._lastChangedBy;
    return copy;
  }

  _hasEntityPayloadChanged(prevEntity, nextEntity) {
    const prev = this._stripSyncFields(prevEntity);
    const next = this._stripSyncFields(nextEntity);
    try {
      return JSON.stringify(prev) !== JSON.stringify(next);
    } catch {
      return true;
    }
  }

  _entityTs(entity) {
    if (!entity || typeof entity !== 'object') return 0;
    const candidates = [
      Number(entity.updatedAt || 0),
      Number(entity.timestamp || 0),
      Number(entity.createdAt || 0),
      Number(entity.storedAt || 0),
      Number(entity.addedAt || 0),
      Number(entity.occurredAt || 0)
    ];
    return Math.max(0, ...candidates.filter(Number.isFinite));
  }

  _applyListSyncMetadata(list, previousList, now) {
    if (!Array.isArray(list)) return;
    const prevMap = new Map(
      (Array.isArray(previousList) ? previousList : [])
        .filter(item => item && typeof item === 'object' && item.id)
        .map(item => [item.id, item])
    );

    list.forEach(item => {
      if (!item || typeof item !== 'object' || !item.id) return;
      const prev = prevMap.get(item.id) || null;
      const prevVersion = Number.isFinite(Number(prev?._syncVersion)) ? Number(prev._syncVersion) : 0;
      const currentVersion = Number.isFinite(Number(item._syncVersion)) ? Number(item._syncVersion) : 0;

      if (!prev) {
        const nextTs = this._entityTs(item) || now;
        if (!Number.isFinite(Number(item.updatedAt)) || Number(item.updatedAt) <= 0) {
          item.updatedAt = nextTs;
        }
        item._syncVersion = Math.max(1, currentVersion);
        item._lastChangedBy = String(item._lastChangedBy || this.deviceId);
        return;
      }

      const changed = this._hasEntityPayloadChanged(prev, item);
      if (changed) {
        const nextTs = Math.max(now, this._entityTs(prev) + 1, this._entityTs(item));
        item.updatedAt = nextTs;
        item._syncVersion = Math.max(prevVersion + 1, currentVersion + 1, 1);
        item._lastChangedBy = this.deviceId;
      } else {
        item.updatedAt = Math.max(this._entityTs(item), this._entityTs(prev));
        item._syncVersion = Math.max(currentVersion, prevVersion, 1);
        item._lastChangedBy = String(item._lastChangedBy || prev._lastChangedBy || this.deviceId);
      }
    });
  }

  _applyObjectSyncMetadata(currentObj, previousObj, now) {
    if (!currentObj || typeof currentObj !== 'object') return;
    const prev = previousObj && typeof previousObj === 'object' ? previousObj : null;
    const prevVersion = Number.isFinite(Number(prev?._syncVersion)) ? Number(prev._syncVersion) : 0;
    const currentVersion = Number.isFinite(Number(currentObj._syncVersion)) ? Number(currentObj._syncVersion) : 0;

    if (!prev) {
      if (!Number.isFinite(Number(currentObj.updatedAt)) || Number(currentObj.updatedAt) <= 0) {
        currentObj.updatedAt = now;
      }
      currentObj._syncVersion = Math.max(1, currentVersion);
      currentObj._lastChangedBy = String(currentObj._lastChangedBy || this.deviceId);
      return;
    }

    const changed = this._hasEntityPayloadChanged(prev, currentObj);
    if (changed) {
      currentObj.updatedAt = Math.max(now, Number(prev.updatedAt || 0) + 1, Number(currentObj.updatedAt || 0));
      currentObj._syncVersion = Math.max(prevVersion + 1, currentVersion + 1, 1);
      currentObj._lastChangedBy = this.deviceId;
    } else {
      currentObj.updatedAt = Math.max(Number(currentObj.updatedAt || 0), Number(prev.updatedAt || 0));
      currentObj._syncVersion = Math.max(currentVersion, prevVersion, 1);
      currentObj._lastChangedBy = String(currentObj._lastChangedBy || prev._lastChangedBy || this.deviceId);
    }
  }

  _applySyncMetadata() {
    if (!this.data || typeof this.data !== 'object') return;
    const now = Date.now();
    const previous = this._lastSavedSnapshot && typeof this._lastSavedSnapshot === 'object'
      ? this._lastSavedSnapshot
      : {};

    if (String(this.data.homeName || '') !== String(previous.homeName || '')) {
      this.data.homeUpdatedAt = Math.max(now, Number(previous.homeUpdatedAt || 0) + 1);
    } else {
      this.data.homeUpdatedAt = Math.max(Number(this.data.homeUpdatedAt || 0), Number(previous.homeUpdatedAt || 0));
    }

    this._applyListSyncMetadata(this.data.users, previous.users, now);
    this._applyListSyncMetadata(this.data.shoppingList, previous.shoppingList, now);
    this._applyListSyncMetadata(this.data.shoppingCategories, previous.shoppingCategories, now);
    this._applyListSyncMetadata(this.data.recipes, previous.recipes, now);
    this._applyListSyncMetadata(this.data.quests, previous.quests, now);
    this._applyListSyncMetadata(this.data.rewards, previous.rewards, now);
    this._applyListSyncMetadata(this.data.chronicle, previous.chronicle, now);
    this._applyListSyncMetadata(this.data.bills, previous.bills, now);

    const currentLocations = this.data.locations && typeof this.data.locations === 'object' ? this.data.locations : {};
    const previousLocations = previous.locations && typeof previous.locations === 'object' ? previous.locations : {};
    Object.keys(currentLocations).forEach(locId => {
      const currentLoc = currentLocations[locId];
      const prevLoc = previousLocations[locId] || null;
      if (!currentLoc || typeof currentLoc !== 'object') return;
      this._applyObjectSyncMetadata(currentLoc, prevLoc, now);
      this._applyListSyncMetadata(currentLoc.items, prevLoc?.items, now);
    });

    this._applyObjectSyncMetadata(this.data.mealPlan, previous.mealPlan, now);
    this._applyObjectSyncMetadata(this.data.reisekasse, previous.reisekasse, now);
    this._applyListSyncMetadata(this.data.reisekasse?.rules, previous.reisekasse?.rules, now);
    this._applyListSyncMetadata(this.data.reisekasse?.transactions, previous.reisekasse?.transactions, now);
    this._applyListSyncMetadata(this.data.reisekasse?.weeklyStatements, previous.reisekasse?.weeklyStatements, now);
  }

  applyMigrations(rawData) {
    // Eine zentrale Migrationsstelle: wird beim Laden und beim Import verwendet.
    const initial = createInitialState();
    const migrated = { ...initial, ...(rawData || {}) };
    if (!Number.isFinite(Number(migrated.homeUpdatedAt))) {
      migrated.homeUpdatedAt = 0;
    }

    if (!migrated.mealPlan || typeof migrated.mealPlan !== 'object') {
      migrated.mealPlan = initial.mealPlan;
    }
    if (!migrated.mealPlan.slots || typeof migrated.mealPlan.slots !== 'object') {
      migrated.mealPlan.slots = {};
    }
    if (!Array.isArray(migrated.mealPlan.activeMeals)) {
      migrated.mealPlan.activeMeals = initial.mealPlan.activeMeals;
    }

    if (!migrated.reisekasse || typeof migrated.reisekasse !== 'object') {
      migrated.reisekasse = JSON.parse(JSON.stringify(initial.reisekasse));
    }
    if (!Array.isArray(migrated.reisekasse.rules)) {
      migrated.reisekasse.rules = JSON.parse(JSON.stringify(initial.reisekasse.rules));
    }
    if (!Array.isArray(migrated.reisekasse.transactions)) {
      migrated.reisekasse.transactions = [];
    }
    if (!Array.isArray(migrated.reisekasse.weeklyStatements)) {
      migrated.reisekasse.weeklyStatements = [];
    }
    if (!Number.isFinite(Number(migrated.reisekasse.updatedAt))) {
      migrated.reisekasse.updatedAt = Date.now();
    }

    migrated.reisekasse.rules = migrated.reisekasse.rules
      .filter(r => r && typeof r === 'object')
      .map(r => {
        const ts = Number(r.updatedAt || r.createdAt || Date.now());
        const amountCents = Number.isFinite(Number(r.amountCents))
          ? Math.round(Number(r.amountCents))
          : Math.round(Number(r.amount || 0) * 100);
        const userIds = Array.isArray(r.userIds) ? r.userIds.filter(Boolean) : [];
        return {
          id: r.id || ('rk-rule-' + ts.toString(36) + '-' + Math.random().toString(36).slice(2, 7)),
          title: String(r.title || '').trim() || 'Neue Regel',
          description: String(r.description || '').trim(),
          amountCents: amountCents > 0 ? amountCents : 100,
          appliesToAll: r.appliesToAll !== undefined ? !!r.appliesToAll : userIds.length === 0,
          userIds,
          exceptionNote: String(r.exceptionNote || '').trim(),
          active: r.active === undefined ? true : !!r.active,
          _deleted: !!r._deleted,
          createdAt: Number(r.createdAt || ts),
          updatedAt: ts
        };
      });

    migrated.reisekasse.transactions = migrated.reisekasse.transactions
      .filter(t => t && typeof t === 'object')
      .map(t => {
        const ts = Number(t.updatedAt || t.createdAt || t.occurredAt || Date.now());
        const amountCents = Number.isFinite(Number(t.amountCents))
          ? Math.round(Number(t.amountCents))
          : Math.round(Number(t.amount || 0) * 100);
        return {
          id: t.id || ('rk-tx-' + ts.toString(36) + '-' + Math.random().toString(36).slice(2, 7)),
          userId: t.userId || null,
          userName: t.userName || '',
          ruleId: t.ruleId || null,
          reason: String(t.reason || '').trim(),
          amountCents: amountCents > 0 ? amountCents : 0,
          occurredAt: Number(t.occurredAt || ts),
          settledAt: t.settledAt ? Number(t.settledAt) : null,
          statementId: t.statementId || null,
          _deleted: !!t._deleted,
          createdAt: Number(t.createdAt || ts),
          updatedAt: ts
        };
      });

    migrated.reisekasse.weeklyStatements = migrated.reisekasse.weeklyStatements
      .filter(s => s && typeof s === 'object')
      .map(s => {
        const ts = Number(s.updatedAt || s.createdAt || Date.now());
        const totalsByUser = (s.totalsByUser && typeof s.totalsByUser === 'object') ? s.totalsByUser : {};
        return {
          id: s.id || ('rk-statement-' + ts.toString(36) + '-' + Math.random().toString(36).slice(2, 7)),
          title: String(s.title || 'Wochenabrechnung'),
          weekStart: Number(s.weekStart || ts),
          weekEnd: Number(s.weekEnd || ts),
          firstTransactionAt: Number(s.firstTransactionAt || s.weekStart || ts),
          lastTransactionAt: Number(s.lastTransactionAt || s.weekEnd || ts),
          transactionIds: Array.isArray(s.transactionIds) ? s.transactionIds.filter(Boolean) : [],
          totalsByUser,
          totalCents: Number(s.totalCents || 0),
          _deleted: !!s._deleted,
          createdAt: Number(s.createdAt || ts),
          updatedAt: ts
        };
      });

    if (Array.isArray(migrated.shoppingList)) {
      migrated.shoppingList = migrated.shoppingList.map(item => ({
        ...item,
        _deleted: item?._deleted || false,
        amountValue: Number.isFinite(Number(item?.amountValue)) ? Number(item.amountValue) : null,
        amountUnit: item?.amountUnit ? String(item.amountUnit).trim() : null,
        recipeSources: Array.isArray(item?.recipeSources) ? item.recipeSources : [],
        updatedAt: item?.updatedAt || item?.createdAt || Date.now()
      }));
    }

    if (!Array.isArray(migrated.shoppingCategories)) {
      migrated.shoppingCategories = (initial.shoppingCategories || []).map(c => ({ ...c }));
    } else {
      migrated.shoppingCategories = migrated.shoppingCategories
        .filter(c => c && typeof c === 'object')
        .map(c => {
          const ts = Number(c.updatedAt || c.createdAt || Date.now());
          return {
            id: String(c.id || '').trim() || ('cat-' + ts.toString(36) + '-' + Math.random().toString(36).slice(2, 7)),
            label: String(c.label || '').trim() || 'Neue Kategorie',
            _deleted: !!c._deleted,
            createdAt: Number(c.createdAt || ts),
            updatedAt: ts
          };
        });
    }

    if (migrated.locations && typeof migrated.locations === 'object') {
      // ...existing location migration code...
      Object.values(migrated.locations).forEach(loc => {
        if (!loc || typeof loc !== 'object') return;
        if (!Array.isArray(loc.items)) loc.items = [];
        if (typeof loc._deleted !== 'boolean') loc._deleted = false;

        if (!Number.isFinite(Number(loc.maxAgeDays)) || Number(loc.maxAgeDays) <= 0) {
          const isFridge = String(loc.id || '').toLowerCase() === 'fridge'
            || String(loc.name || '').toLowerCase().includes('kühlschrank')
            || String(loc.name || '').toLowerCase().includes('kuehlschrank');
          loc.maxAgeDays = isFridge ? 90 : 730;
        }

        loc.items = loc.items.map(item => {
          if (!item || typeof item !== 'object') return item;
          const normalizedItem = {
            ...item,
            _deleted: !!item._deleted,
            updatedAt: Number(item.updatedAt || item.storedAt || item.addedAt || Date.now())
          };
          if (normalizedItem.expiresAt) return normalizedItem;

          const m = String(normalizedItem.amount || '').match(/\b(\d{4}-\d{2}-\d{2})\b/);
          const baseDate = m ? new Date(`${m[1]}T00:00:00`) : new Date(normalizedItem.addedAt || Date.now());
          const d = Number.isNaN(baseDate.getTime()) ? new Date(normalizedItem.addedAt || Date.now()) : baseDate;
          const exp = new Date(d);
          exp.setDate(exp.getDate() + Number(loc.maxAgeDays));
          return { ...normalizedItem, expiresAt: exp.getTime() };
        });
      });
    }

    // Migration: Quests – altes Schema heilen
    if (Array.isArray(migrated.quests)) {
      migrated.quests = migrated.quests.map(q => {
        if (!q || typeof q !== 'object') return q;
        const fixed = { ...q };
        // dependsOn: [] → null  (leeres Array sperrt die Quest fälschlicherweise)
        if (Array.isArray(fixed.dependsOn) && fixed.dependsOn.length === 0) {
          fixed.dependsOn = null;
        }
        // Alte Feldnamen normalisieren
        if (fixed.desc !== undefined && !fixed.description) {
          fixed.description = fixed.desc;
          delete fixed.desc;
        }
        if (fixed.defaultAssigneeId !== undefined && !fixed.defaultAssignee) {
          fixed.defaultAssignee = fixed.defaultAssigneeId;
          delete fixed.defaultAssigneeId;
        }
        if (!fixed.kind) {
          fixed.kind = 'quest';
        }
        if (!fixed.targetUserId && fixed.defaultAssignee) {
          fixed.targetUserId = fixed.defaultAssignee;
        }
        if (fixed.repeatEveryDays !== undefined && !fixed.repeatDays) {
          fixed.repeatDays = fixed.repeatEveryDays;
          delete fixed.repeatEveryDays;
        }
        // Pflichtfelder ergänzen
        if (fixed.completed === undefined)   fixed.completed   = false;
        if (fixed.completedAt === undefined) fixed.completedAt = null;
        if (fixed.completedBy === undefined) fixed.completedBy = null;
        if (fixed.dueDate === undefined)     fixed.dueDate     = null;
        if (!fixed.targetUserId)             fixed.targetUserId = 'all';
        if (fixed.reporterUserId === undefined) fixed.reporterUserId = null;
        const priorityRaw = Number(fixed.priority);
        fixed.priority = Number.isFinite(priorityRaw)
          ? Math.max(1, Math.min(4, Math.round(priorityRaw)))
          : 3;
        if (fixed._deleted === undefined)    fixed._deleted    = false;
        if (fixed.updatedAt === undefined)   fixed.updatedAt   = fixed.completedAt || fixed.createdAt || Date.now();

        if (fixed.rotation && typeof fixed.rotation === 'object') {
          const userIds = Array.isArray(fixed.rotation.userIds) ? fixed.rotation.userIds.filter(Boolean) : [];
          const excludedUserIds = Array.isArray(fixed.rotation.excludedUserIds)
            ? fixed.rotation.excludedUserIds.filter(Boolean)
            : [];
          const cleanUserIds = userIds.filter(uid => !excludedUserIds.includes(uid));
          const idxRaw = Number(fixed.rotation.currentIndex || 0);
          const currentIndex = cleanUserIds.length > 0
            ? Math.max(0, Math.min(cleanUserIds.length - 1, Number.isFinite(idxRaw) ? idxRaw : 0))
            : 0;

          fixed.rotation = {
            enabled: fixed.rotation.enabled !== false,
            userIds: cleanUserIds,
            excludedUserIds,
            currentIndex,
            lastCompletedBy: fixed.rotation.lastCompletedBy || null,
            lastCompletedAt: fixed.rotation.lastCompletedAt || null
          };
        } else {
          fixed.rotation = null;
        }
        return fixed;
      });

      const hasBathroomRotation = migrated.quests.some(q => q?.id === 'bad-putzen-rotation');
      const defaultBathroomQuest = (initial.quests || []).find(q => q.id === 'bad-putzen-rotation');
      if (!hasBathroomRotation && defaultBathroomQuest) {
        migrated.quests.push({
          ...defaultBathroomQuest,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    }

    // Migration: recipes Array sicherstellen (fehlte in createInitialState() älterer Versionen)
    if (!Array.isArray(migrated.recipes)) {
      migrated.recipes = initial.recipes || [];
    }

    if (!Array.isArray(migrated.rewards)) {
      migrated.rewards = initial.rewards || [];
    } else {
      migrated.rewards = migrated.rewards
        .filter(r => r && typeof r === 'object')
        .map(r => {
          const ts = Number(r.updatedAt || r.createdAt || Date.now());
          return {
            id: r.id || ('reward-' + ts.toString(36) + '-' + Math.random().toString(36).slice(2, 7)),
            title: String(r.title || '').trim(),
            cost: Number.isFinite(Number(r.cost)) ? Number(r.cost) : 0,
            availableFrom: r.availableFrom || null,
            availableUntil: r.availableUntil || null,
            _deleted: !!r._deleted,
            createdAt: Number(r.createdAt || ts),
            updatedAt: ts
          };
        });
    }

    // Migration: bills Array sicherstellen
    if (!Array.isArray(migrated.bills)) {
      migrated.bills = [];
    }

    // Migration: Chronicle-Einträge ohne id (erzeugt von altem users.js) reparieren.
    // ChronicleManager.getEntries() filtert auf e.id – ohne id sind sie unsichtbar.
    if (Array.isArray(migrated.chronicle)) {
      let needsRepair = false;
      migrated.chronicle = migrated.chronicle.map(entry => {
        if (!entry || typeof entry !== 'object') return entry;
        if (entry.id) return entry; // bereits im neuen Format
        needsRepair = true;
        const ts = Number(entry.time || entry.timestamp || Date.now());
        return {
          id: 'chr-' + ts.toString(36) + '-' + Math.random().toString(36).slice(2, 7),
          emoji: entry.emoji || '📝',
          text: String(entry.text || ''),
          timestamp: ts,
          date: entry.date || new Date(ts).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
          metadata: entry.metadata || {}
        };
      });
      if (needsRepair) {
        console.log('[Storage] Chronicle-Migration: alte Einträge ohne id repariert');
      }
    }

    return this._attachInitialSyncMetadata(migrated);
  }

  _attachInitialSyncMetadata(state) {
    const migrated = state && typeof state === 'object' ? state : createInitialState();
    const fallback = String(migrated.deviceId || 'legacy');
    const now = Date.now();

    const ensureList = (list) => {
      if (!Array.isArray(list)) return;
      list.forEach(item => {
        if (!item || typeof item !== 'object' || !item.id) return;
        if (!Number.isFinite(Number(item.updatedAt)) || Number(item.updatedAt) <= 0) {
          const ts = Number(item.timestamp || item.createdAt || item.storedAt || item.addedAt || now);
          item.updatedAt = Number.isFinite(ts) ? ts : now;
        }
        if (!Number.isFinite(Number(item._syncVersion)) || Number(item._syncVersion) <= 0) {
          item._syncVersion = 1;
        }
        if (!String(item._lastChangedBy || '').trim()) {
          item._lastChangedBy = fallback;
        }
      });
    };

    ensureList(migrated.users);
    ensureList(migrated.shoppingList);
    ensureList(migrated.shoppingCategories);
    ensureList(migrated.recipes);
    ensureList(migrated.quests);
    ensureList(migrated.rewards);
    ensureList(migrated.chronicle);
    ensureList(migrated.bills);
    ensureList(migrated.reisekasse?.rules);
    ensureList(migrated.reisekasse?.transactions);
    ensureList(migrated.reisekasse?.weeklyStatements);

    if (migrated.locations && typeof migrated.locations === 'object') {
      Object.values(migrated.locations).forEach(loc => {
        if (!loc || typeof loc !== 'object') return;
        if (!Number.isFinite(Number(loc.updatedAt)) || Number(loc.updatedAt) <= 0) {
          loc.updatedAt = now;
        }
        if (!Number.isFinite(Number(loc._syncVersion)) || Number(loc._syncVersion) <= 0) {
          loc._syncVersion = 1;
        }
        if (!String(loc._lastChangedBy || '').trim()) {
          loc._lastChangedBy = fallback;
        }
        ensureList(loc.items);
      });
    }

    if (migrated.mealPlan && typeof migrated.mealPlan === 'object') {
      if (!Number.isFinite(Number(migrated.mealPlan.updatedAt)) || Number(migrated.mealPlan.updatedAt) <= 0) {
        migrated.mealPlan.updatedAt = now;
      }
      if (!Number.isFinite(Number(migrated.mealPlan._syncVersion)) || Number(migrated.mealPlan._syncVersion) <= 0) {
        migrated.mealPlan._syncVersion = 1;
      }
      if (!String(migrated.mealPlan._lastChangedBy || '').trim()) {
        migrated.mealPlan._lastChangedBy = fallback;
      }
    }

    if (migrated.reisekasse && typeof migrated.reisekasse === 'object') {
      if (!Number.isFinite(Number(migrated.reisekasse.updatedAt)) || Number(migrated.reisekasse.updatedAt) <= 0) {
        migrated.reisekasse.updatedAt = now;
      }
      if (!Number.isFinite(Number(migrated.reisekasse._syncVersion)) || Number(migrated.reisekasse._syncVersion) <= 0) {
        migrated.reisekasse._syncVersion = 1;
      }
      if (!String(migrated.reisekasse._lastChangedBy || '').trim()) {
        migrated.reisekasse._lastChangedBy = fallback;
      }
    }

    return migrated;
  }

  importData(rawData) {
    this.data = this.applyMigrations(rawData);
    this.saveLocal();
    return this.data;
  }
  
  setData(newData) {
    this.data = newData;
    this.saveLocal();
  }

  getActiveUser() {
    return this.data.users.find(u => u.id === this.activeUserId);
  }

  setActiveUser(userId) {
    this.activeUserId = userId;
    localStorage.setItem('activeUserId', userId);
  }

  // JSONBIN.io
  async fetchCloud() {
    if (!hasConfiguredCloudCredentials(CONFIG)) {
      throw new Error('Nicht konfiguriert');
    }
    const res = await this._fetchWithTimeout(`https://api.jsonbin.io/v3/b/${CONFIG.JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': CONFIG.JSONBIN_API_KEY }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (!result || typeof result !== 'object' || !result.record || typeof result.record !== 'object') {
      throw new Error('Cloud-Datenformat ungültig');
    }
    return result.record;
  }

  async saveCloud(data) {
    if (!hasConfiguredCloudCredentials(CONFIG)) {
      throw new Error('Nicht konfiguriert');
    }
    const res = await this._fetchWithTimeout(`https://api.jsonbin.io/v3/b/${CONFIG.JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'X-Master-Key': CONFIG.JSONBIN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...data, lastSync: Date.now() })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async initCloud() {
    try {
      await this.fetchCloud();
      console.log('[Storage] Cloud existiert');
    } catch {
      console.log('[Storage] Erstelle Cloud...');
      const res = await this._fetchWithTimeout('https://api.jsonbin.io/v3/b', {
        method: 'POST',
        headers: {
          'X-Master-Key': CONFIG.JSONBIN_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...this.data, lastSync: Date.now() })
      });
      const result = await res.json();
      alert(`Bin-ID: ${result.metadata.id}\nIn config.js eintragen!`);
    }
  }
}
