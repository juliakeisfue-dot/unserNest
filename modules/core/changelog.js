// modules/core/changeLog.js
/**
 * ChangeLog Manager
 *
 * Dokumentiert ALLE Benutzer-Veränderungen in der App mit:
 * - WAS: Art der Änderung
 * - WER: Nutzer-ID
 * - WANN: Timestamp
 * - DETAILS: Spezifische Informationen
 * - MODUL: Shopping/Inventory/Recipes/MealPlan/Reisekasse/Quests/Rewards
 */

export class ChangeLogManager {
  constructor(storage) {
    this.storage = storage;
  }

  _ensureChangeLog() {
    if (!this.storage.data.changelog) {
      this.storage.data.changelog = [];
    }
  }

  /**
   * Neuen Changelog-Eintrag hinzufügen
   *
   * @param {string} module - 'shopping'|'inventory'|'recipes'|'mealplan'|'reisekasse'|'quests'|'rewards'
   * @param {string} action - 'add'|'update'|'delete'|'use'|'settle'|'complete'
   * @param {string} userId - Nutzer-ID
   * @param {string} description - Lesbare Beschreibung
   * @param {object} metadata - Zusätzliche Daten
   */
  log(module, action, userId, description, metadata = {}) {
    this._ensureChangeLog();

    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      module,
      action,
      userId,
      description,
      metadata,
      timestamp: Date.now(),
      _deleted: false
    };

    this.storage.data.changelog.push(entry);

    // Cleanup: Behalte nur letzte 500 Einträge
    if (this.storage.data.changelog.length > 500) {
      this.storage.data.changelog = this.storage.data.changelog.slice(-500);
    }

    this.storage.data.version++;
    return entry;
  }

  /**
   * Alle Einträge für ein Modul abrufen
   */
  getByModule(module, limit = 50) {
    this._ensureChangeLog();
    return this.storage.data.changelog
      .filter(e => e.module === module && !e._deleted)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Alle Einträge eines Nutzers
   */
  getByUser(userId, limit = 50) {
    this._ensureChangeLog();
    return this.storage.data.changelog
      .filter(e => e.userId === userId && !e._deleted)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Timeline: Alle Änderungen der letzten X Tage (Standard: 7 Tage)
   */
  getRecentActivity(days = 7, limit = 100) {
    this._ensureChangeLog();
    const threshold = Date.now() - (days * 24 * 60 * 60 * 1000);
    return this.storage.data.changelog
      .filter(e => e.timestamp > threshold && !e._deleted)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Übersicht: Wieviele Änderungen pro Modul
   */
  getSummary() {
    this._ensureChangeLog();
    const modules = ['shopping', 'inventory', 'recipes', 'mealplan', 'reisekasse', 'quests', 'rewards'];
    const summary = {};

    modules.forEach(mod => {
      const entries = this.storage.data.changelog.filter(e => e.module === mod && !e._deleted);
      summary[mod] = {
        total: entries.length,
        byAction: {
          add: entries.filter(e => e.action === 'add').length,
          update: entries.filter(e => e.action === 'update').length,
          delete: entries.filter(e => e.action === 'delete').length,
          use: entries.filter(e => e.action === 'use').length,
          settle: entries.filter(e => e.action === 'settle').length,
          complete: entries.filter(e => e.action === 'complete').length
        }
      };
    });

    return summary;
  }

  /**
   * Formatiere einen Eintrag für die UI
   */
  format(entry, userName = '') {
    const date = new Date(entry.timestamp).toLocaleString('de-DE');
    const emoji = {
      shopping: '🛒',
      inventory: '📦',
      recipes: '🍳',
      mealplan: '📅',
      reisekasse: '💰',
      quests: '🎯',
      rewards: '🏆'
    }[entry.module] || '📝';

    const action = {
      add: '➕ Hinzugefügt',
      update: '✏️ Geändert',
      delete: '🗑️ Gelöscht',
      use: '✓ Benutzt',
      settle: '📊 Abgerechnet',
      complete: '✅ Erledigt'
    }[entry.action] || entry.action;

    return {
      icon: emoji,
      action,
      description: entry.description,
      user: userName,
      date,
      timestamp: entry.timestamp
    };
  }
}

export default ChangeLogManager;

