// modules/core/users.js

/** Erzeugt eine kollisionsresistente ID */
function genId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export class UserManager {
  constructor(storage, sync) {
    this.storage = storage;
    this.sync = sync;
  }

  getAll() { return this.storage.data.users; }
  getActive() { return this.storage.getActiveUser(); }
  
  setActive(id) {
    this.storage.setActiveUser(id);
  }

  addPoints(userId, points, reason) {
    const user = this.storage.data.users.find(u => u.id === userId);
    if (!user) return;
    
    user.points = (user.points || 0) + points;
    user.updatedAt = Date.now();

    if (!Array.isArray(this.storage.data.chronicle)) {
      this.storage.data.chronicle = [];
    }
    // Format muss mit ChronicleManager.getEntries() kompatibel sein:
    // getEntries() filtert auf e.id && !e._deleted und sortiert nach e.timestamp
    this.storage.data.chronicle.unshift({
      id: genId('chr'),
      emoji: '⭐',
      text: `${user.name} +${points}★: ${reason}`,
      timestamp: Date.now(),
      date: new Date().toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
      metadata: {}
    });
    
    // Chronik auf 200 Einträge begrenzen
    this.storage.data.chronicle = this.storage.data.chronicle.slice(0, 200);

    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
  }

  spendPoints(userId, points, reason) {
    const user = this.storage.data.users.find(u => u.id === userId);
    if (!user || user.points < points) return false;
    
    user.points -= points;
    user.updatedAt = Date.now();

    if (!Array.isArray(this.storage.data.chronicle)) {
      this.storage.data.chronicle = [];
    }
    this.storage.data.chronicle.unshift({
      id: genId('chr'),
      emoji: '💸',
      text: `${user.name} -${points}★: ${reason}`,
      timestamp: Date.now(),
      date: new Date().toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
      metadata: {}
    });
    
    // Chronik auf 200 Einträge begrenzen
    this.storage.data.chronicle = this.storage.data.chronicle.slice(0, 200);

    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return true;
  }
}
