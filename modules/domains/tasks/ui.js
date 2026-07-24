export class TasksUI {
  constructor(app) {
    this.app = app;
    this._taskFilter = 'all';
  }

  _priorityLabel(priority) {
    switch (Number(priority)) {
      case 4: return '🔥 Sehr hoch';
      case 3: return '🔺 Hoch';
      case 2: return '🟡 Mittel';
      default: return '🔹 Niedrig';
    }
  }

  render() {
    const container = document.getElementById('tasksList');
    if (!container) return;

    const activeUserId = this.app.storage.activeUserId;
    const visibleTasks = this.app.quests.getQuestsForUser(activeUserId);
    const sortedVisible = this.app.quests.sortByPriorityAndDue(visibleTasks);
    const available = sortedVisible.filter(q => this.app.quests.isQuestAvailable(q) && !q.completed);
    const notAvailable = sortedVisible.filter(q => !this.app.quests.isQuestAvailable(q) && !q.completed);
    const completed = sortedVisible.filter(q => q.completed);

    let displayTasks = [];
    let title = '';
    switch (this._taskFilter) {
      case 'available':
        displayTasks = available;
        title = `🎯 Verfügbar (${available.length})`;
        break;
      case 'locked':
        displayTasks = notAvailable;
        title = `🔒 Gesperrt (${notAvailable.length})`;
        break;
      case 'completed':
        displayTasks = completed;
        title = `✅ Abgeschlossen (${completed.length})`;
        break;
      case 'all':
      default:
        displayTasks = [...available, ...notAvailable, ...completed];
        title = `📋 Für mich / Alle (${sortedVisible.length})`;
    }

    const usersById = new Map((this.app.users.getAll() || []).map(u => [u.id, u.name]));
    const allForParents = this.app.quests.getAllForParentSelection('task');

    let html = `
      <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
        <button class="btn btn--small ${this._taskFilter === 'all' ? 'btn--primary' : ''}" onclick="app.tasksUI.setFilter('all')">📋 Alle</button>
        <button class="btn btn--small ${this._taskFilter === 'available' ? 'btn--primary' : ''}" onclick="app.tasksUI.setFilter('available')">🎯 Verfügbar</button>
        <button class="btn btn--small ${this._taskFilter === 'locked' ? 'btn--primary' : ''}" onclick="app.tasksUI.setFilter('locked')">🔒 Gesperrt</button>
        <button class="btn btn--small ${this._taskFilter === 'completed' ? 'btn--primary' : ''}" onclick="app.tasksUI.setFilter('completed')">✅ Erledigt</button>
      </div>

      <div class="card" style="margin-bottom:16px; border:2px solid var(--accent);">
        <h3 class="card__title" style="font-size:1rem;">➕ Neue Aufgabe anlegen</h3>
        <div class="form" style="gap:8px;" id="taskForm">
          <input type="text" id="newTaskTitle" class="form__input" placeholder="Titel *"
                 oninput="app.tasksUI.saveDraft()" onfocus="app._isTyping=true" onblur="app._isTyping=false">
          <input type="text" id="newTaskDesc" class="form__input" placeholder="Beschreibung"
                 oninput="app.tasksUI.saveDraft()" onfocus="app._isTyping=true" onblur="app._isTyping=false">
          <div class="form__row">
            <input type="number" id="newTaskPoints" class="form__input" placeholder="Punkte" value="10" style="min-width:80px;"
                   oninput="app.tasksUI.saveDraft()" onfocus="app._isTyping=true" onblur="app._isTyping=false">
            <input type="date" id="newTaskDueDate" class="form__input" style="min-width:120px;"
                   oninput="app.tasksUI.saveDraft()" onfocus="app._isTyping=true" onblur="app._isTyping=false">
          </div>
          <div class="form__row">
            <select id="newTaskTargetUser" class="form__input"
                    onchange="app.tasksUI.saveDraft()" onfocus="app._isTyping=true" onblur="app._isTyping=false">
              <option value="all">Für alle</option>
              ${(this.app.users.getAll() || []).map(u => `<option value="${u.id}">Für ${this.app.escapeHtml(u.name)}</option>`).join('')}
            </select>
            <select id="newTaskPriority" class="form__input"
                    onchange="app.tasksUI.saveDraft()" onfocus="app._isTyping=true" onblur="app._isTyping=false">
              <option value="2">Priorität: Mittel</option>
              <option value="3">Priorität: Hoch</option>
              <option value="4">Priorität: Sehr hoch</option>
              <option value="1">Priorität: Niedrig</option>
            </select>
          </div>
          <select id="newTaskDependsOn" class="form__input"
                  onchange="app.tasksUI.saveDraft()" onfocus="app._isTyping=true" onblur="app._isTyping=false">
            <option value="">-- Keine Abhängigkeit --</option>
            ${allForParents.map(q => `<option value="${q.id}">${this.app.escapeHtml(q.title)} ${q.completed ? '(✓ erledigt)' : ''}</option>`).join('')}
          </select>
          <label style="font-size:0.85rem; display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="newTaskRepeatable" checked onchange="app.tasksUI.saveDraft()"> Wiederholbar
          </label>
          <div class="form__row">
            <button class="btn btn--primary btn--small" onclick="app.tasksUI.addTask()">💾 Speichern</button>
            <button class="btn btn--small" onclick="app.tasksUI.clearDraft()">❌ Leeren</button>
          </div>
        </div>
      </div>
    `;

    html += `<h3 class="text--small text--soft mb--1">${title}</h3>`;
    if (displayTasks.length === 0) {
      html += '<div class="empty"><div class="empty__icon">📭</div>Keine Aufgaben in dieser Kategorie</div>';
    } else {
      html += displayTasks.map(q => {
        const dueInfo = this.app.quests.formatDueDate(q.dueDate);
        const isAvailable = this.app.quests.isQuestAvailable(q);
        const targetLabel = q.targetUserId && q.targetUserId !== 'all'
          ? `👤 Für ${this.app.escapeHtml(usersById.get(q.targetUserId) || q.targetUserId)}`
          : '👥 Für alle';
        const reporterLabel = q.reporterUserId
          ? ` · 📩 von ${this.app.escapeHtml(usersById.get(q.reporterUserId) || q.reporterUserId)}`
          : '';

        return `
          <div class="item ${q.completed ? 'item--done' : (isAvailable ? 'item--open' : '')}">
            <div class="item__content">
              <div class="item__name">${this.app.escapeHtml(q.title)}</div>
              <div class="item__meta">
                ${this.app.escapeHtml(q.description)}<br>
                ${targetLabel}${reporterLabel}<br>
                ${this._priorityLabel(q.priority)}
                ${dueInfo ? ` | 📅 ${dueInfo}` : ''}
                ${q.repeatable ? ' | 🔄 Wiederholbar' : ''}
              </div>
              <div class="quest__points" style="margin-top:4px;">+${q.points}★</div>
            </div>
            <div class="item__actions">
              ${!q.completed && isAvailable ? `<button class="btn btn--success btn--small" onclick="app.tasksUI.completeTask('${q.id}')">✓</button>` : ''}
              ${q.completed && q.repeatable ? `<button class="btn btn--small" onclick="app.tasksUI.resetTask('${q.id}')">🔄</button>` : ''}
              <button class="btn btn--small btn--danger" onclick="app.tasksUI.deleteTask('${q.id}')">🗑</button>
            </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = html;
    this.restoreDraft();
  }

  setFilter(filter) {
    this._taskFilter = filter;
    this.render();
  }

  saveDraft() {
    const draft = {
      title: document.getElementById('newTaskTitle')?.value || '',
      description: document.getElementById('newTaskDesc')?.value || '',
      points: document.getElementById('newTaskPoints')?.value || '10',
      dueDate: document.getElementById('newTaskDueDate')?.value || '',
      dependsOn: document.getElementById('newTaskDependsOn')?.value || '',
      repeatable: document.getElementById('newTaskRepeatable')?.checked !== false,
      targetUserId: document.getElementById('newTaskTargetUser')?.value || 'all',
      priority: document.getElementById('newTaskPriority')?.value || '2',
      timestamp: Date.now()
    };
    try { localStorage.setItem('taskDraft', JSON.stringify(draft)); } catch {}
  }

  restoreDraft() {
    try {
      const raw = localStorage.getItem('taskDraft');
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (Date.now() - Number(draft.timestamp || 0) > 24 * 60 * 60 * 1000) return;

      document.getElementById('newTaskTitle').value = draft.title || '';
      document.getElementById('newTaskDesc').value = draft.description || '';
      document.getElementById('newTaskPoints').value = draft.points || '10';
      document.getElementById('newTaskDueDate').value = draft.dueDate || '';
      document.getElementById('newTaskDependsOn').value = draft.dependsOn || '';
      document.getElementById('newTaskRepeatable').checked = draft.repeatable !== false;
      document.getElementById('newTaskTargetUser').value = draft.targetUserId || 'all';
      document.getElementById('newTaskPriority').value = draft.priority || '2';
    } catch {}
  }

  clearDraft() {
    localStorage.removeItem('taskDraft');
    document.getElementById('newTaskTitle').value = '';
    document.getElementById('newTaskDesc').value = '';
    document.getElementById('newTaskPoints').value = '10';
    document.getElementById('newTaskDueDate').value = '';
    document.getElementById('newTaskDependsOn').value = '';
    document.getElementById('newTaskRepeatable').checked = true;
    document.getElementById('newTaskTargetUser').value = 'all';
    document.getElementById('newTaskPriority').value = '2';
  }

  addTask() {
    const title = document.getElementById('newTaskTitle')?.value.trim();
    const description = document.getElementById('newTaskDesc')?.value.trim();
    const points = parseInt(document.getElementById('newTaskPoints')?.value) || 10;
    const dueDate = document.getElementById('newTaskDueDate')?.value || null;
    const dependsOn = document.getElementById('newTaskDependsOn')?.value || null;
    const repeatable = document.getElementById('newTaskRepeatable')?.checked;
    const targetUserId = document.getElementById('newTaskTargetUser')?.value || 'all';
    const priority = parseInt(document.getElementById('newTaskPriority')?.value) || 2;

    if (!title) {
      this.app.showDialog('⚠️ Titel erforderlich', 'Bitte geben Sie einen Titel für die Aufgabe ein.');
      return;
    }

    this.app.quests.addCustomQuest(title, description, points, {
      dueDate,
      dependsOn: dependsOn || null,
      repeatable,
      targetUserId,
      priority,
      reporterUserId: this.app.storage.activeUserId || null,
      kind: 'task'
    });
    this.clearDraft();
    this.app.updateUI();
    this.app.toast(`📝 "${title}" angelegt`);
  }

  completeTask(id) {
    if (this.app.quests.completeQuest(id)) {
      this.app.updateUI();
      this.app.toast('✅ Aufgabe abgeschlossen!');
    } else {
      this.app.toast('❌ Aufgabe nicht verfügbar');
    }
  }

  resetTask(id) {
    this.app.quests.resetQuest(id);
    this.app.updateUI();
  }

  deleteTask(id) {
    if (!confirm('Aufgabe wirklich löschen?')) return;
    this.app.quests.deleteQuest(id);
    this.app.updateUI();
    this.app.toast('🗑️ Aufgabe gelöscht');
  }
}

