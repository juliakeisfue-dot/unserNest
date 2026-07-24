// modules/quests.js

function genId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizePriority(priority) {
  const n = Number(priority);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(4, Math.round(n)));
}

export class QuestManager {
  constructor(storage, sync, users, tracker = null) {
    this.storage = storage;
    this.sync = sync;
    this.users = users;
    this.tracker = tracker;
    this._drafts = new Map();
  }

  getQuests() {
    return this.storage.data.quests || [];
  }

  getQuestItems() {
    return this.getQuests().filter(q => q && !q._deleted && q.kind !== 'task');
  }

  getTaskItems() {
    return this.getQuests().filter(q => q && !q._deleted && q.kind === 'task');
  }

  getQuestsForUser(userId) {
    const visible = this.getTaskItems().filter(q => {
      if (!q || q._deleted) return false;
      const target = q.targetUserId;
      if (!target || target === 'all') return true;
      return target === userId;
    });
    if (visible.length > 0) return visible;
    return this.getTaskItems();
  }

  sortByPriorityAndDue(quests) {
    const now = Date.now();
    return [...(quests || [])].sort((a, b) => {
      const aPriority = normalizePriority(a?.priority);
      const bPriority = normalizePriority(b?.priority);
      if (aPriority !== bPriority) return bPriority - aPriority;

      const aHasDue = !!a?.dueDate;
      const bHasDue = !!b?.dueDate;
      if (aHasDue && bHasDue) {
        const aTs = new Date(a.dueDate).getTime();
        const bTs = new Date(b.dueDate).getTime();
        const aOverdue = Number.isFinite(aTs) && aTs < now;
        const bOverdue = Number.isFinite(bTs) && bTs < now;
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (aTs !== bTs) return aTs - bTs;
      } else if (aHasDue !== bHasDue) {
        return aHasDue ? -1 : 1;
      }

      return Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0);
    });
  }

  isQuestAvailable(quest, ignoreCompleted = false) {
    if (quest._deleted) return false;
    
    if (ignoreCompleted) return true;
    
    if (!quest.repeatable && quest.completed) return false;
    
    if (quest.dependsOn && !quest.completed) {
      const parentQuest = this.storage.data.quests.find(q => q.id === quest.dependsOn);
      if (!parentQuest) return false;
      if (!parentQuest.completed) return false;
    }
    
    if (quest.dueDate && !quest.completed) {
      const now = new Date();
      const due = new Date(quest.dueDate);
      due.setHours(23, 59, 59, 999);
      if (now > due) return true;
      const today = new Date();
      today.setHours(0,0,0,0);
      const dueDay = new Date(due);
      dueDay.setHours(0,0,0,0);
      if (dueDay.getTime() !== today.getTime()) return false;
    }
    
    return true;
  }

  getAllForParentSelection(kind = 'all') {
    if (kind === 'quest') return this.getQuestItems();
    if (kind === 'task') return this.getTaskItems();
    return this.getQuests().filter(q => !q._deleted);
  }

  getAvailableQuests() {
    return this.getQuestItems().filter(q => this.isQuestAvailable(q) && !q.completed);
  }

  getRotationInfo(questOrId) {
    const quest = typeof questOrId === 'string'
      ? this.storage.data.quests.find(q => q.id === questOrId)
      : questOrId;
    if (!quest?.rotation?.enabled) {
      return {
        enabled: false,
        currentAssigneeId: null,
        currentAssigneeName: null,
        nextAssigneeId: null,
        nextAssigneeName: null,
        lastCompletedBy: null,
        lastCompletedByName: null
      };
    }

    const userIds = Array.isArray(quest.rotation.userIds) ? quest.rotation.userIds : [];
    const usersById = new Map((this.storage.data.users || []).map(u => [u.id, u]));
    if (userIds.length === 0) {
      return {
        enabled: true,
        currentAssigneeId: null,
        currentAssigneeName: null,
        nextAssigneeId: null,
        nextAssigneeName: null,
        lastCompletedBy: quest.rotation.lastCompletedBy || null,
        lastCompletedByName: usersById.get(quest.rotation.lastCompletedBy || '')?.name || null
      };
    }

    const idxRaw = Number(quest.rotation.currentIndex || 0);
    const currentIndex = ((Number.isFinite(idxRaw) ? idxRaw : 0) % userIds.length + userIds.length) % userIds.length;
    const nextIndex = (currentIndex + 1) % userIds.length;
    const currentAssigneeId = userIds[currentIndex];
    const nextAssigneeId = userIds[nextIndex];

    return {
      enabled: true,
      currentAssigneeId,
      currentAssigneeName: usersById.get(currentAssigneeId)?.name || currentAssigneeId,
      nextAssigneeId,
      nextAssigneeName: usersById.get(nextAssigneeId)?.name || nextAssigneeId,
      excludedUserIds: Array.isArray(quest.rotation.excludedUserIds) ? [...quest.rotation.excludedUserIds] : [],
      lastCompletedBy: quest.rotation.lastCompletedBy || null,
      lastCompletedByName: usersById.get(quest.rotation.lastCompletedBy || '')?.name || null,
      lastCompletedAt: quest.rotation.lastCompletedAt || null
    };
  }

  setRotationAssignee(questId, userId) {
    const quest = this.storage.data.quests.find(q => q.id === questId && !q._deleted);
    if (!quest?.rotation?.enabled) return false;

    const userIds = Array.isArray(quest.rotation.userIds) ? quest.rotation.userIds : [];
    const prevIdxRaw = Number(quest.rotation.currentIndex || 0);
    const prevIdx = userIds.length > 0
      ? ((Number.isFinite(prevIdxRaw) ? prevIdxRaw : 0) % userIds.length + userIds.length) % userIds.length
      : -1;
    const prevAssigneeId = prevIdx >= 0 ? userIds[prevIdx] : null;
    const nextIndex = userIds.indexOf(userId);
    if (nextIndex < 0) return false;

    quest.rotation.currentIndex = nextIndex;
    quest.updatedAt = Date.now();

    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    this.tracker?.trackFeatureUsage?.('quests', 'rotation_assignee_switched', this.storage.activeUserId ?? 'unknown', {
      questId: quest.id,
      questTitle: quest.title,
      fromUserId: prevAssigneeId,
      toUserId: userId
    });
    return true;
  }

  completeQuest(questId) {
    const quest = this.storage.data.quests.find(q => q.id === questId);
    if (!quest) return false;
    
    if (!this.isQuestAvailable(quest)) {
      console.log('[QuestManager] Quest nicht verfügbar:', questId);
      return false;
    }
    
    const now = Date.now();
    const isRotationQuest = !!quest.rotation?.enabled;
    let assignedUserId = null;

    quest.completed = true;
    quest.completedAt = now;
    quest.completedBy = this.storage.activeUserId;
    quest.updatedAt = now;

    const user = this.users.getActive();
    if (user) {
      this.users.addPoints(user.id, quest.points, `🎯 ${quest.title}`);
    }

    if (isRotationQuest) {
      const userIds = Array.isArray(quest.rotation.userIds) ? quest.rotation.userIds : [];
      if (userIds.length > 0) {
        const idxRaw = Number(quest.rotation.currentIndex || 0);
        const currentIndex = ((Number.isFinite(idxRaw) ? idxRaw : 0) % userIds.length + userIds.length) % userIds.length;
        assignedUserId = userIds[currentIndex] || null;
        quest.rotation.currentIndex = (currentIndex + 1) % userIds.length;
      } else {
        quest.rotation.currentIndex = 0;
      }
      quest.rotation.lastCompletedBy = this.storage.activeUserId || null;
      quest.rotation.lastCompletedAt = now;

      // Offenes/faires Modell: Aufgabe wandert direkt weiter und bleibt verfügbar.
      quest.completed = false;
      quest.completedAt = null;
      quest.completedBy = null;

      if (assignedUserId && this.storage.activeUserId && assignedUserId !== this.storage.activeUserId) {
        this.tracker?.trackFeatureUsage?.('quests', 'rotation_completed_by_other_user', this.storage.activeUserId, {
          questId: quest.id,
          questTitle: quest.title,
          assignedTo: assignedUserId,
          completedBy: this.storage.activeUserId
        });
      }
    }

    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return true;
  }

  resetQuest(questId) {
    const quest = this.storage.data.quests.find(q => q.id === questId);
    if (!quest || !quest.repeatable) return false;
    
    quest.completed = false;
    quest.completedAt = null;
    quest.completedBy = null;
    // updatedAt MUSS gesetzt werden – sonst gewinnt beim nächsten Sync die Cloud
    // (die hat noch den alten completedAt-Timestamp) und der Reset wird rückgängig gemacht.
    quest.updatedAt = Date.now();

    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return true;
  }

  addCustomQuest(title, description, points, options = {}) {
    if (!Array.isArray(this.storage.data.quests)) {
      this.storage.data.quests = [];
    }
    const reporterUserId = options.reporterUserId || this.storage.activeUserId || null;
    const targetUserId = options.targetUserId || 'all';
    const quest = {
      id: genId('custom'),
      title: title.trim(),
      description: description ? description.trim() : '',
      points: parseInt(points) || 10,
      completed: false,
      repeatable: options.repeatable !== false,
      dependsOn: options.dependsOn || null,
      dueDate: options.dueDate || null,
      defaultAssignee: options.defaultAssignee || null,
      kind: options.kind === 'task' ? 'task' : 'quest',
      targetUserId,
      reporterUserId,
      priority: normalizePriority(options.priority),
      completedAt: null,
      completedBy: null,
      rotation: options.rotation || null,
      _deleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.storage.data.quests.push(quest);
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return quest;
  }

  deleteQuest(questId) {
    const quest = this.storage.data.quests.find(q => q.id === questId);
    if (!quest) return false;
    
    const dependents = this.getDependentQuests(questId);
    if (dependents.length > 0) {
      dependents.forEach(d => {
        d.dependsOn = null;
        d.updatedAt = Date.now();
      });
    }
    
    quest._deleted = true;
    quest.updatedAt = Date.now();
    
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return true;
  }

  getDependentQuests(questId) {
    return this.storage.data.quests.filter(q => 
      q.dependsOn === questId && !q._deleted
    );
  }

  formatDueDate(dueDate) {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    today.setHours(0,0,0,0);
    tomorrow.setHours(0,0,0,0);
    const checkDate = new Date(date);
    checkDate.setHours(0,0,0,0);
    
    if (checkDate.getTime() === today.getTime()) return 'Heute fällig';
    if (checkDate.getTime() === tomorrow.getTime()) return 'Morgen fällig';
    if (checkDate < today) return 'Überfällig!';
    
    return date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  applyPenalty(questId, penaltyForUserId) {
    const quest = this.storage.data.quests.find(q => q.id === questId);
    if (!quest) throw new Error('Quest nicht gefunden');
    if (!quest.penaltyAmountCents) throw new Error('Keine Geldstrafe für diese Quest konfiguriert');
    if (quest._penaltyApplied) throw new Error('Strafe wurde bereits angewendet');
    if (quest.completed) throw new Error('Quest wurde bereits erledigt - Strafe nicht nötig');

    const user = this.storage.data.users.find(u => u.id === penaltyForUserId);
    if (!user) throw new Error('Benutzer nicht gefunden');

    // Transaktion in Reisekasse eintragen
    const txId = `rk-tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    if (!this.storage.data.reisekasse) this.storage.data.reisekasse = { rules: [], transactions: [], weeklyStatements: [] };
    if (!Array.isArray(this.storage.data.reisekasse.transactions)) this.storage.data.reisekasse.transactions = [];

    this.storage.data.reisekasse.transactions.push({
      id: txId,
      userId: penaltyForUserId,
      userName: user.name,
      ruleId: null,
      reason: `Geldstrafe: ${quest.title} (${quest.penaltyDescription || 'nicht erfüllt'})`,
      amountCents: quest.penaltyAmountCents,
      occurredAt: Date.now(),
      settledAt: null,
      statementId: null,
      _deleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Chronik-Eintrag
    if (!Array.isArray(this.storage.data.chronicle)) this.storage.data.chronicle = [];
    this.storage.data.chronicle.unshift({
      id: `chr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      emoji: '💸',
      text: `Geldstrafe: ${user.name} zahlt €${(quest.penaltyAmountCents / 100).toFixed(2)} wegen "${quest.title}"`,
      timestamp: Date.now(),
      date: new Date().toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
      metadata: { questId, userId: penaltyForUserId, questTitle: quest.title }
    });

    // Quest als "gestraft" markieren
    quest._penaltyApplied = true;
    quest.updatedAt = Date.now();

    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.data.reisekasse.updatedAt = Date.now();
    this.storage.saveLocal();
    this.sync.markDirty();

    this.tracker?.trackFeatureUsage?.('quests', 'penalty_applied', this.storage.activeUserId ?? 'unknown', {
      questId: quest.id,
      questTitle: quest.title,
      penaltyAmount: quest.penaltyAmountCents / 100,
      penaltyForUser: penaltyForUserId
    });

    return true;
  }
}
