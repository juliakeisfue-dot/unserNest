// modules/chronicleManager.js
/**
 * Manager für die Chronik/Historie aller Aktionen
 */

function genId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export class ChronicleManager {
  constructor(storage, sync) {
    this.storage = storage;
    this.sync = sync;
  }

  /**
   * Fügt einen Eintrag zur Chronik hinzu
   * @param {string} emoji - Emoji/Icon für den Eintrag
   * @param {string} text - Beschreibung der Aktion
   * @param {object} metadata - Zusätzliche Daten (optional)
   */
  addEntry(emoji, text, metadata = {}) {
    if (!Array.isArray(this.storage.data.chronicle)) {
      this.storage.data.chronicle = [];
    }

    const entry = {
      id: genId('chronicle'),
      emoji: emoji || '📝',
      text: text.trim(),
      date: new Date().toLocaleString('de-DE'),
      timestamp: Date.now(),
      metadata: metadata
    };

    this.storage.data.chronicle.push(entry);
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();

    return entry;
  }

  /**
   * Holt alle Chronik-Einträge
   */
  getEntries(limit = null) {
    let entries = (this.storage.data.chronicle || []).filter(e => e.id && !e._deleted);

    // Neueste zuerst
    entries = entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (limit) {
      entries = entries.slice(0, limit);
    }

    return entries;
  }

  /**
   * Holt Einträge nach Emoji-Filter
   */
  getEntriesByEmoji(emoji) {
    return this.getEntries().filter(e => e.emoji === emoji);
  }

  /**
   * Löscht einen Eintrag
   */
  deleteEntry(entryId) {
    const entry = this.storage.data.chronicle?.find(e => e.id === entryId);
    if (!entry) return false;

    entry._deleted = true;
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return true;
  }

  /**
   * Löscht alle Einträge (Vorsicht!)
   */
  clearAll() {
    this.storage.data.chronicle = [];
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
  }

  /**
   * Gibt Statistiken zur Aktivität
   */
  getStats() {
    const entries = this.getEntries();
    const stats = {
      totalEntries: entries.length,
      byEmoji: {},
      lastEntry: entries[0] || null,
      firstEntry: entries[entries.length - 1] || null
    };

    entries.forEach(e => {
      stats.byEmoji[e.emoji] = (stats.byEmoji[e.emoji] || 0) + 1;
    });

    return stats;
  }
}

export default ChronicleManager;

