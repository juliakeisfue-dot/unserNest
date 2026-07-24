// modules/questsUI.js
export class QuestsUI {
  constructor(app) {
    this.app = app;
    this._questFilter = 'all';
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
    const container = document.getElementById('questsList');
    const allQuests = this.app.quests.getQuestItems();
    const available = allQuests.filter(q => this.app.quests.isQuestAvailable(q) && !q.completed);
    const notAvailable = allQuests.filter(q => !this.app.quests.isQuestAvailable(q) && !q.completed);
    const completed = allQuests.filter(q => q.completed);

    let displayQuests = [];
    let title = '';

    switch(this._questFilter) {
      case 'available':
        displayQuests = available;
        title = `🎯 Verfügbar (${available.length})`;
        break;
      case 'locked':
        displayQuests = notAvailable;
        title = `🔒 Gesperrt (${notAvailable.length})`;
        break;
      case 'completed':
        displayQuests = completed;
        title = `✅ Abgeschlossen (${completed.length})`;
        break;
      case 'all':
        displayQuests = [...available, ...notAvailable, ...completed];
        title = `📋 Alle Quests (${allQuests.length})`;
        break;
    }

    let html = '';

    // Filter-Buttons
    html += `
      <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
        <button class="btn btn--small ${this._questFilter === 'all' ? 'btn--primary' : ''}" onclick="app.questsUI.setFilter('all')">📋 Alle</button>
        <button class="btn btn--small ${this._questFilter === 'available' ? 'btn--primary' : ''}" onclick="app.questsUI.setFilter('available')">🎯 Verfügbar</button>
        <button class="btn btn--small ${this._questFilter === 'locked' ? 'btn--primary' : ''}" onclick="app.questsUI.setFilter('locked')">🔒 Gesperrt</button>
        <button class="btn btn--small ${this._questFilter === 'completed' ? 'btn--primary' : ''}" onclick="app.questsUI.setFilter('completed')">✅ Erledigt</button>
      </div>
    `;

    // Neue Quest Formular
    const allForParents = this.app.quests.getAllForParentSelection('quest');
    html += `
      <div class="card" style="margin-bottom:16px; border:2px solid var(--accent);">
        <h3 class="card__title" style="font-size:1rem;">➕ Neue Quest anlegen</h3>
        <div class="form" style="gap:8px;" id="questForm">
          <input type="text" id="newQuestTitle" class="form__input" placeholder="Titel *" 
                 oninput="app.questsUI.saveDraft()" onfocus="app._isTyping=true" onblur="app._isTyping=false">
          <input type="text" id="newQuestDesc" class="form__input" placeholder="Beschreibung" 
                 oninput="app.questsUI.saveDraft()" onfocus="app._isTyping=true" onblur="app._isTyping=false">
          <div class="form__row">
            <input type="number" id="newQuestPoints" class="form__input" placeholder="Punkte" value="10" style="min-width:80px;" 
                   oninput="app.questsUI.saveDraft()" onfocus="app._isTyping=true" onblur="app._isTyping=false">
            <input type="date" id="newQuestDueDate" class="form__input" style="min-width:120px;" 
                   oninput="app.questsUI.saveDraft()" onfocus="app._isTyping=true" onblur="app._isTyping=false">
          </div>
          <select id="newQuestDependsOn" class="form__input" 
                 onchange="app.questsUI.saveDraft()" onfocus="app._isTyping=true" onblur="app._isTyping=false">
            <option value="">-- Keine Abhängigkeit --</option>
            ${allForParents.map(q => `<option value="${q.id}">${this.app.escapeHtml(q.title)} ${q.completed ? '(✓ erledigt)' : ''}</option>`).join('')}
          </select>
          <label style="font-size:0.85rem; display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="newQuestRepeatable" checked onchange="app.questsUI.saveDraft()"> Wiederholbar
          </label>
          <div class="form__row">
            <button class="btn btn--primary btn--small" onclick="app.questsUI.addQuest()">💾 Speichern</button>
            <button class="btn btn--small" onclick="app.questsUI.clearDraft()">❌ Leeren</button>
          </div>
          <div id="draftStatus" class="text--small text--soft" style="font-style:italic;"></div>
        </div>
      </div>
    `;

    // Überschrift
    html += `<h3 class="text--small text--soft mb--1">${title}</h3>`;

    // Liste
    if (displayQuests.length === 0) {
      html += '<div class="empty"><div class="empty__icon">📭</div>Keine Quests in dieser Kategorie</div>';
    } else {
      html += displayQuests.map(q => {
        const dueInfo = this.app.quests.formatDueDate(q.dueDate);
        const isAvailable = this.app.quests.isQuestAvailable(q);
        const rotationInfo = this.app.quests.getRotationInfo(q);

        let statusBadge = '';
        if (q.completed) {
          statusBadge = '<span style="color:var(--success); font-size:0.8rem;">✓ Erledigt</span>';
        } else if (!isAvailable) {
          const parent = q.dependsOn ? allQuests.find(p => p.id === q.dependsOn) : null;
          if (parent && !parent.completed) {
            statusBadge = `<span style="color:var(--warning); font-size:0.8rem;">⛓️ Wartet auf: ${this.app.escapeHtml(parent.title)}</span>`;
          } else if (q.dueDate) {
            statusBadge = '<span style="color:var(--text-soft); font-size:0.8rem;">📅 Noch nicht fällig</span>';
          } else {
            statusBadge = '<span style="color:var(--text-soft); font-size:0.8rem;">🔒 Gesperrt</span>';
          }
        } else {
          statusBadge = '<span style="color:var(--accent); font-size:0.8rem;">🎯 Verfügbar</span>';
        }

        // 🆕 Ausgrauen wenn nicht verfügbar (aber nicht erledigt)
        const opacityStyle = (!isAvailable && !q.completed) ? 'opacity:0.6;' : '';
        const borderStyle = dueInfo?.includes('Überfällig') ? 'border-left-color:var(--danger);' : '';

        return `
          <div class="item ${q.completed ? 'item--done' : (isAvailable ? 'item--open' : '')}" 
               style="${opacityStyle} ${borderStyle}">
            <div class="item__content">
              <div class="item__name">${this.app.escapeHtml(q.title)}</div>
              <div class="item__meta">
                ${this.app.escapeHtml(q.description)}<br>
                ${statusBadge}
                ${dueInfo ? ` | 📅 ${dueInfo}` : ''}
                ${q.repeatable ? ' | 🔄 Wiederholbar' : ''}
                ${rotationInfo.enabled
                  ? `<br>🧼 Heute dran: <strong>${this.app.escapeHtml(rotationInfo.currentAssigneeName || 'offen')}</strong> · Als Nächstes: ${this.app.escapeHtml(rotationInfo.nextAssigneeName || 'offen')}${rotationInfo.lastCompletedByName ? ` · Zuletzt: ${this.app.escapeHtml(rotationInfo.lastCompletedByName)}` : ''}`
                  : ''}
              </div>
              <div class="quest__points" style="margin-top:4px;">+${q.points}★</div>
            </div>
             <div class="item__actions">
               ${!q.completed && isAvailable ? 
                 `<button class="btn btn--success btn--small" onclick="app.questsUI.completeQuest('${q.id}')">${rotationInfo.enabled ? '🧽' : '✓'}</button>` : ''}
               ${rotationInfo.enabled
                 ? `<button class="btn btn--small" onclick="app.questsUI.switchRotationAssignee('${q.id}')" title="Heute zuständige Person wechseln">👥</button>`
                 : ''}
               ${!q.completed && dueInfo?.includes('Überfällig') && q.penaltyAmountCents
                 ? `<button class="btn btn--danger btn--small" onclick="app.questsUI.applyPenalty('${q.id}')" title="⚠️ Geldstrafe anwenden">💰 ${(q.penaltyAmountCents / 100).toFixed(2)}€</button>`
                 : ''}
               ${q.completed && q.repeatable ? 
                 `<button class="btn btn--small" onclick="app.questsUI.resetQuest('${q.id}')">🔄</button>` : ''}
               <button class="btn btn--small btn--danger" onclick="app.questsUI.deleteQuest('${q.id}')" title="Quest löschen">🗑</button>
             </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = html;
    this.restoreDraft();
  }

  setFilter(filter) {
    this._questFilter = filter;
    this.render();
  }

  saveDraft() {
    const draft = {
      title: document.getElementById('newQuestTitle')?.value || '',
      description: document.getElementById('newQuestDesc')?.value || '',
      points: document.getElementById('newQuestPoints')?.value || '10',
      dueDate: document.getElementById('newQuestDueDate')?.value || '',
      dependsOn: document.getElementById('newQuestDependsOn')?.value || '',
      repeatable: document.getElementById('newQuestRepeatable')?.checked !== false,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem('questDraft', JSON.stringify(draft));
    } catch(e) {}
    
    const status = document.getElementById('draftStatus');
    if (status) {
      status.textContent = '💾 Entwurf gespeichert';
      setTimeout(() => { if(status) status.textContent = ''; }, 1000);
    }
  }

  restoreDraft() {
    try {
      const saved = localStorage.getItem('questDraft');
      if (!saved) return;
      
      const draft = JSON.parse(saved);
      if (Date.now() - draft.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('questDraft');
        return;
      }
      
      const titleEl = document.getElementById('newQuestTitle');
      if (titleEl && draft.title) {
        titleEl.value = draft.title;
        document.getElementById('newQuestDesc').value = draft.description;
        document.getElementById('newQuestPoints').value = draft.points;
        document.getElementById('newQuestDueDate').value = draft.dueDate;
        document.getElementById('newQuestDependsOn').value = draft.dependsOn;
        document.getElementById('newQuestRepeatable').checked = draft.repeatable;
      }
    } catch(e) {}
  }

  clearDraft() {
    localStorage.removeItem('questDraft');
    document.getElementById('newQuestTitle').value = '';
    document.getElementById('newQuestDesc').value = '';
    document.getElementById('newQuestPoints').value = '10';
    document.getElementById('newQuestDueDate').value = '';
    document.getElementById('newQuestDependsOn').value = '';
    document.getElementById('newQuestRepeatable').checked = true;
  }

   addQuest() {
     const title = document.getElementById('newQuestTitle')?.value.trim();
     const description = document.getElementById('newQuestDesc')?.value.trim();
     const points = parseInt(document.getElementById('newQuestPoints')?.value) || 10;
     const dueDate = document.getElementById('newQuestDueDate')?.value || null;
     const dependsOn = document.getElementById('newQuestDependsOn')?.value || null;
     const repeatable = document.getElementById('newQuestRepeatable')?.checked;

     // Validierung
     if (!title) {
       this.app.showDialog('⚠️ Titel erforderlich', 'Bitte geben Sie einen Titel für die Quest ein.');
       return;
     }
     if (title.length > 100) {
       this.app.showDialog('⚠️ Text zu lang', 'Maximum 100 Zeichen für Titel.');
       return;
     }
     if (description && description.length > 300) {
       this.app.showDialog('⚠️ Text zu lang', 'Maximum 300 Zeichen für Beschreibung.');
       return;
     }
     if (points < 1 || points > 100) {
       this.app.showDialog('⚠️ Ungültige Punkte', 'Bitte geben Sie 1-100 Punkte ein.');
       return;
     }

     try {
       this.app.quests.addCustomQuest(title, description, points, {
         dueDate,
         dependsOn: dependsOn || null,
         repeatable,
         kind: 'quest'
       });

       this.clearDraft();
       this.app.updateUI();
       this.app.toast(`🎯 "${title}" angelegt`);
     } catch (err) {
       this.app.showDialog('❌ Fehler', `Fehler beim Anlegen: ${err.message}`);
     }
   }

  completeQuest(id) {
    const before = this.app.quests.getRotationInfo(id);
    if (this.app.quests.completeQuest(id)) {
      const after = this.app.quests.getRotationInfo(id);
      this.app.updateUI();

      if (before.enabled) {
        const completedBy = this.app.users.getActive()?.name || 'Jemand';
        this.app.toast(`🧼 ${completedBy} hat erledigt · Jetzt dran: ${after.currentAssigneeName || 'offen'}`);
      } else {
        this.app.toast('🎯 Quest abgeschlossen!');
      }

      setTimeout(() => {
        const newlyAvailable = this.app.quests.getAvailableQuests().filter(q => {
          if (q.dependsOn === id && !q.completed) return true;
          return false;
        });
        
        if (newlyAvailable.length > 0) {
          const names = newlyAvailable.map(q => q.title).join(', ');
          this.app.toast(`🔓 Freigeschaltet: ${names}`);
        }
      }, 100);
    } else {
      this.app.toast('❌ Quest nicht verfügbar');
    }
  }

  async switchRotationAssignee(id) {
    const quest = this.app.quests.getQuests().find(q => q.id === id && !q._deleted);
    if (!quest?.rotation?.enabled) return;

    const usersById = new Map((this.app.storage.data.users || []).map(u => [u.id, u]));
    const options = (quest.rotation.userIds || []).map(uid => ({
      id: uid,
      name: usersById.get(uid)?.name || uid
    }));
    if (options.length === 0) return;

    const current = this.app.quests.getRotationInfo(quest).currentAssigneeName || '';
    const input = await this.app.showInputDialog(
      '👥 Zuständigkeit wechseln',
      `Wer ist heute dran? Verfuegbar: ${options.map(o => o.name).join(', ')}`,
      current
    );
    if (!input) return;

    const normalized = String(input).trim().toLowerCase();
    const selected = options.find(o => o.name.toLowerCase() === normalized || o.id.toLowerCase() === normalized);
    if (!selected) {
      this.app.toast('⚠️ Person nicht erkannt. Bitte Namen genau eingeben.', 'warning');
      return;
    }

    if (this.app.quests.setRotationAssignee(id, selected.id)) {
      this.app.updateUI();
      this.app.toast(`👥 Heute dran: ${selected.name}`, 'success');
    }
  }

  resetQuest(id) {
    this.app.quests.resetQuest(id);
    this.app.updateUI();
  }

   deleteQuest(id) {
     if (!confirm('Quest wirklich löschen? Abhängige Quests werden freigegeben.')) return;

     try {
       this.app.quests.deleteQuest(id);
       this.app.updateUI();
       this.app.toast('🗑️ Quest gelöscht');
     } catch (err) {
       alert(err.message);
     }
   }

   applyPenalty(questId) {
     const quest = this.app.quests.getQuests().find(q => q.id === questId);
     if (!quest || !quest.penaltyAmountCents || quest.completed) return;

     let penaltyForUser = null;
     if (quest.rotation?.enabled) {
       const rotationInfo = this.app.quests.getRotationInfo(quest.id);
       if (rotationInfo.currentAssigneeId) {
         penaltyForUser = this.app.users.getAll().find(u => u.id === rotationInfo.currentAssigneeId);
       }
     }

     if (!penaltyForUser) {
       this.app.showDialog('⚠️ Fehler', 'Konnte nicht feststellen, wer die Strafe zahlen muss.');
       return;
     }

     const amount = (quest.penaltyAmountCents / 100).toFixed(2);
     const message = `Geldstrafe für ${this.app.escapeHtml(penaltyForUser.name)}?\n\n` +
                     `Quest: ${this.app.escapeHtml(quest.title)}\n` +
                     `Grund: ${quest.penaltyDescription || 'Nicht erfüllt'}\n` +
                     `Betrag: ${amount}€`;

     if (!confirm(message)) return;

     try {
       this.app.quests.applyPenalty(questId, penaltyForUser.id);
       this.app.updateUI();
       this.app.toast(`💸 Strafe von ${amount}€ für ${penaltyForUser.name} eingetragen`);
     } catch (err) {
       this.app.showDialog('❌ Fehler', `Strafe konnte nicht eingetragen werden: ${err.message}`);
     }
   }
}
