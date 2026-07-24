// modules/core/sync.js
import { CONFIG } from './config.js';

export class SyncManager {
  constructor(storage) {
    this.storage = storage;
    this.pending = false;
    this.isSyncing = false;
    this.isOnline = navigator.onLine;
    this.lastSyncTime = 0;
    this.onSyncStart = null;
    this.onSyncSuccess = null;
    this.onSyncError = null;
    
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }
  
  handleOnline() {
    this.isOnline = true;
    this.debouncedSync();
  }
  
  handleOffline() {
    this.isOnline = false;
  }

  markDirty() {
    this.pending = true;
    this.debouncedSync();
  }

  start() {
    this._intervalId = setInterval(() => {
      this.sync();
    }, CONFIG.SYNC_INTERVAL || 30000);
  }
  
  stop() {
    if (this._intervalId) clearInterval(this._intervalId);
  }

  debouncedSync() {
    if (this._syncTimeout) clearTimeout(this._syncTimeout);
    this._syncTimeout = setTimeout(() => {
      this.sync();
    }, 3000);
  }

  async sync(force = false) {
    if (this.isSyncing) return;
    if (!this.isOnline) return;
    
    // Immer syncen wenn force=true ODER pending=true ODER letzter Sync > 55 Sekunden her
    const timeSinceLastSync = this.lastSyncTime ? Date.now() - this.lastSyncTime : Infinity;
    if (!force && !this.pending && timeSinceLastSync < 55000) return;
    
    if (!CONFIG.JSONBIN_BIN_ID || !CONFIG.JSONBIN_API_KEY ||
        CONFIG.JSONBIN_BIN_ID.includes('DEINE') || CONFIG.JSONBIN_API_KEY.includes('DEIN')) return;
    
    // Nicht syncen wenn jemand tippt
    if (window.app && window.app._isTyping) {
      this.debouncedSync();
      return;
    }
    
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
      const form = activeElement.closest('#questForm');
      if (form) {
        this.debouncedSync();
        return;
      }
    }
    
    this.isSyncing = true;
    this._safeHook(this.onSyncStart);
    try {
      const cloud = this._normalizeState(await this.storage.fetchCloud());
      const local = this._normalizeState(this.storage.getData());
      const merged = this.merge(local, cloud);

      // lastSync ist nur Metadaten-Timestamp und soll keine Endlosschleifen triggern.
      const localJson = JSON.stringify(this._stripSyncMeta(local));
      const cloudJson = JSON.stringify(this._stripSyncMeta(cloud));
      const mergedJson = JSON.stringify(this._stripSyncMeta(merged));

      const localNeedsUpdate = localJson !== mergedJson;
      const cloudNeedsUpdate = cloudJson !== mergedJson;
      const hasChanges = localNeedsUpdate || cloudNeedsUpdate;

      if (hasChanges) {
        merged.lastSync = Date.now();
      }

      if (localNeedsUpdate) {
        this.storage.setData(merged);
      }

      if (force || this.pending || cloudNeedsUpdate) {
        await this.storage.saveCloud(merged);
      }

      this.pending = false;
      this.lastSyncTime = Date.now();
      // hasChanges = true wenn sich irgendetwas geändert hat
      // localNeedsUpdate = true wenn die Cloud etwas hatte das lokal fehlte → nur dann Toast
      this._safeHook(this.onSyncSuccess, merged, hasChanges, localNeedsUpdate);
      
    } catch (err) {
      // Bei Fehler pending behalten für Retry
      this._safeHook(this.onSyncError, err);
    } finally {
      this.isSyncing = false;
    }
  }

  merge(local, cloud) {
    local = this._normalizeState(local);
    cloud = this._normalizeState(cloud);
    const merged = JSON.parse(JSON.stringify(local));
    
    merged.version = Math.max(local.version || 0, cloud.version || 0);
    const localHomeTs = Number(local.homeUpdatedAt || 0);
    const cloudHomeTs = Number(cloud.homeUpdatedAt || 0);
    if (cloudHomeTs > localHomeTs) {
      merged.homeName = String(cloud.homeName || '');
    } else if (!String(local.homeName || '').trim() && String(cloud.homeName || '').trim()) {
      // Legacy-Fallback: alte Stände ohne homeUpdatedAt.
      merged.homeName = String(cloud.homeName || '');
    }
    merged.homeUpdatedAt = Math.max(localHomeTs, cloudHomeTs);
    
    // Shopping-Liste (bidirektional per id + updatedAt + _syncVersion + _lastChangedBy)
    if (Array.isArray(local.shoppingList) || Array.isArray(cloud.shoppingList)) {
      merged.shoppingList = this._mergeListById(local.shoppingList, cloud.shoppingList, {
        includeDeleted: true,
        timestampFields: ['updatedAt', 'createdAt']
      });
    }
    
    // Users (bidirektional per id)
    if (Array.isArray(local.users) || Array.isArray(cloud.users)) {
      merged.users = this._mergeListById(local.users, cloud.users, {
        includeDeleted: true,
        timestampFields: ['updatedAt', 'createdAt']
      });
    }

    // Rezepte (bidirektional per id + updatedAt/createdAt)
    if (Array.isArray(local.recipes) || Array.isArray(cloud.recipes)) {
      merged.recipes = this._mergeListById(local.recipes, cloud.recipes, {
        includeDeleted: true,
        timestampFields: ['updatedAt', 'createdAt']
      });
    }

    // Quests (bidirektional per id + updatedAt)
    if (Array.isArray(local.quests) || Array.isArray(cloud.quests)) {
      merged.quests = this._mergeListById(local.quests, cloud.quests, {
        includeDeleted: true,
        timestampFields: ['updatedAt', 'completedAt', 'createdAt']
      });
    }

    // Belohnungen (bidirektional per id + updatedAt)
    if (Array.isArray(local.rewards) || Array.isArray(cloud.rewards)) {
      merged.rewards = this._mergeListById(local.rewards, cloud.rewards, {
        includeDeleted: true,
        timestampFields: ['updatedAt', 'createdAt']
      });
    }

    // Einkaufskategorien (bidirektional per id + updatedAt)
    if (Array.isArray(local.shoppingCategories) || Array.isArray(cloud.shoppingCategories)) {
      merged.shoppingCategories = this._mergeListById(local.shoppingCategories, cloud.shoppingCategories, {
        includeDeleted: true,
        timestampFields: ['updatedAt', 'createdAt']
      });
    }

    // Chronik (bidirektional per id + timestamp)
    if (Array.isArray(local.chronicle) || Array.isArray(cloud.chronicle)) {
      merged.chronicle = this._mergeListById(local.chronicle, cloud.chronicle, {
        includeDeleted: true,
        timestampFields: ['updatedAt', 'timestamp', 'createdAt']
      });
    }

    // Kassenbons
    if (Array.isArray(local.bills) || Array.isArray(cloud.bills)) {
      merged.bills = this._mergeListById(local.bills, cloud.bills, {
        includeDeleted: true,
        timestampFields: ['updatedAt', 'createdAt']
      });
    }

    // Mealplan als Ganzes über updatedAt (unterstützt auch Slot-Löschungen).
    if (local.mealPlan || cloud.mealPlan) {
      const localTs = local.mealPlan?.updatedAt || 0;
      const cloudTs = cloud.mealPlan?.updatedAt || 0;
      merged.mealPlan = cloudTs > localTs
        ? JSON.parse(JSON.stringify(cloud.mealPlan || {}))
        : JSON.parse(JSON.stringify(local.mealPlan || {}));
    }

    // Reisekasse: Container + drei Listen pro id zusammenfuehren.
    if (local.reisekasse || cloud.reisekasse) {
      const localRK = local.reisekasse || {};
      const cloudRK = cloud.reisekasse || {};
      const localTs = Number(localRK.updatedAt || 0);
      const cloudTs = Number(cloudRK.updatedAt || 0);

      merged.reisekasse = cloudTs > localTs
        ? JSON.parse(JSON.stringify(cloudRK))
        : JSON.parse(JSON.stringify(localRK));

      merged.reisekasse.rules = this._mergeListById(localRK.rules, cloudRK.rules, {
        includeDeleted: true,
        timestampFields: ['updatedAt', 'createdAt']
      });

      merged.reisekasse.transactions = this._mergeListById(localRK.transactions, cloudRK.transactions, {
        includeDeleted: true,
        timestampFields: ['updatedAt', 'occurredAt', 'settledAt', 'createdAt']
      });

      merged.reisekasse.weeklyStatements = this._mergeListById(localRK.weeklyStatements, cloudRK.weeklyStatements, {
        includeDeleted: true,
        timestampFields: ['updatedAt', 'createdAt', 'weekEnd', 'weekStart']
      });
    }

    // Locations
    if (!merged.locations || typeof merged.locations !== 'object') {
      merged.locations = {};
    }

    if (cloud.locations && typeof cloud.locations === 'object') {
      Object.keys(cloud.locations).forEach(locId => {
        const cloudLoc = cloud.locations[locId];
        if (!cloudLoc || typeof cloudLoc !== 'object') return;

        if (!merged.locations[locId]) {
          merged.locations[locId] = cloudLoc;
        } else {
          const localLoc = merged.locations[locId];

          const winnerLoc = this._pickNewerEntity(localLoc, cloudLoc, ['updatedAt']);
          if (winnerLoc === cloudLoc) {
            localLoc.name = cloudLoc.name;
            localLoc.maxAgeDays = cloudLoc.maxAgeDays;
            localLoc._deleted = cloudLoc._deleted;
            localLoc.updatedAt = cloudLoc.updatedAt;
            localLoc._syncVersion = cloudLoc._syncVersion;
            localLoc._lastChangedBy = cloudLoc._lastChangedBy;
          }

          if (cloudLoc.items && Array.isArray(cloudLoc.items)) {
            localLoc.items = this._mergeListById(localLoc.items, cloudLoc.items, {
              includeDeleted: true,
              timestampFields: ['updatedAt', 'storedAt', 'addedAt', 'createdAt']
            });
          } else if (!Array.isArray(localLoc.items)) {
            localLoc.items = [];
          }
        }
      });
    }
    
    merged.lastSync = Math.max(local.lastSync || 0, cloud.lastSync || 0);
    
    return merged;
  }

  _entityTimestamp(entity, timestampFields = []) {
    if (!entity || typeof entity !== 'object') return 0;
    const fields = timestampFields.length
      ? timestampFields
      : ['updatedAt', 'timestamp', 'createdAt', 'assignedAt', 'cookedAt'];
    let max = 0;
    fields.forEach(f => {
      const value = Number(entity[f] || 0);
      if (value > max) max = value;
    });
    return max;
  }

  _pickNewerEntity(localEntity, cloudEntity, timestampFields = []) {
    const localTs = this._entityTimestamp(localEntity, timestampFields);
    const cloudTs = this._entityTimestamp(cloudEntity, timestampFields);

    if (cloudTs > localTs) return cloudEntity;
    if (localTs > cloudTs) return localEntity;

    const localVersion = Number(localEntity?._syncVersion || 0);
    const cloudVersion = Number(cloudEntity?._syncVersion || 0);
    if (cloudVersion > localVersion) return cloudEntity;
    if (localVersion > cloudVersion) return localEntity;

    const localDevice = String(localEntity?._lastChangedBy || '');
    const cloudDevice = String(cloudEntity?._lastChangedBy || '');
    if (cloudDevice && localDevice && cloudDevice !== localDevice) {
      return cloudDevice > localDevice ? cloudEntity : localEntity;
    }

    // Bei weiterhin gleichem Stand gewinnt Lösch-Flag, sonst lokal (stabil).
    const localDeleted = !!localEntity?._deleted || localEntity?.status === '_deleted';
    const cloudDeleted = !!cloudEntity?._deleted || cloudEntity?.status === '_deleted';
    if (cloudDeleted && !localDeleted) return cloudEntity;
    if (localDeleted && !cloudDeleted) return localEntity;
    return localEntity;
  }

  _mergeListById(localList = [], cloudList = [], options = {}) {
    const { includeDeleted = true, timestampFields = [] } = options;
    const map = new Map();

    const add = (list) => {
      if (!Array.isArray(list)) return;
      list.forEach(item => {
        if (!item || !item.id) return;
        const existing = map.get(item.id);
        if (!existing) {
          map.set(item.id, item);
          return;
        }
        map.set(item.id, this._pickNewerEntity(existing, item, timestampFields));
      });
    };

    add(localList);
    add(cloudList);

    let merged = Array.from(map.values());
    if (!includeDeleted) {
      merged = merged.filter(item => !item._deleted && item.status !== '_deleted');
    }
    return merged;
  }

  _stripSyncMeta(data) {
    if (!data || typeof data !== 'object') return data;
    const copy = JSON.parse(JSON.stringify(data));
    delete copy.lastSync;
    return copy;
  }

  _normalizeState(data) {
    const source = (data && typeof data === 'object') ? data : {};
    if (typeof this.storage?.applyMigrations === 'function') {
      try {
        return this.storage.applyMigrations(source);
      } catch (err) {
        console.warn('[Sync] Migration beim Sync fehlgeschlagen, verwende Rohdaten:', err);
      }
    }
    return source;
  }

  _safeHook(fn, ...args) {
    if (typeof fn !== 'function') return;
    try {
      fn(...args);
    } catch (err) {
      console.error('[Sync] Callback-Fehler:', err);
    }
  }
}
