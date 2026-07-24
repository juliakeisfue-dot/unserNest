// modules/rewardsUI.js

function genId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export class RewardsUI {
  constructor(app) {
    this.app = app;
  }

  render() {
    const container = document.getElementById('rewardsList');
    const user = this.app.users.getActive();
    const points = user?.points || 0;
    const now = new Date();
    
    let html = '';
    
    html += `
      <div class="card" style="margin-bottom:16px;">
        <h3 class="card__title" style="font-size:1rem;">➕ Neue Belohnung anlegen</h3>
        <div class="form" style="gap:8px;">
          <input type="text" id="newRewardTitle" class="form__input" placeholder="Belohnung (z.B. Pizzaabend)">
          <div class="form__row">
            <input type="number" id="newRewardCost" class="form__input" placeholder="Kosten in ★" value="50" style="min-width:100px;">
            <input type="date" id="newRewardUntil" class="form__input" style="min-width:120px;" placeholder="Gültig bis">
          </div>
          <button class="btn btn--primary btn--small" onclick="app.rewardsUI.addReward()">Belohnung anlegen</button>
        </div>
      </div>
    `;
    
    html += `
      <div class="mb--2">
        <strong>Deine Punkte: ${points}★</strong>
      </div>
    `;
    
    const rewards = (this.app.storage.data.rewards || []).filter(r => !r?._deleted);
    
    const activeRewards = rewards.filter(r => {
      if (r.availableUntil && new Date(r.availableUntil) < now) return false;
      return true;
    });
    
    const expiredRewards = rewards.filter(r => {
      if (r.availableUntil && new Date(r.availableUntil) < now) return true;
      return false;
    });
    
    if (activeRewards.length === 0) {
      html += '<div class="empty">Keine Belohnungen verfügbar</div>';
    } else {
      html += activeRewards.map(r => {
        const timeLimit = r.availableUntil ? `⏰ Bis: ${new Date(r.availableUntil).toLocaleDateString('de-DE')}` : '';
        const canAfford = points >= r.cost;
        
        return `
          <div class="item" style="${!canAfford ? 'opacity:0.6;' : ''} ${timeLimit ? 'border-left:4px solid var(--warning);' : ''}">
            <div class="item__content">
              <div class="item__name">${this.app.escapeHtml(r.title)}</div>
              <div class="item__meta">
                ${r.cost}★ ${timeLimit ? `| ${timeLimit}` : ''}
              </div>
            </div>
            <div class="item__actions">
              <button class="btn btn--primary btn--small" 
                      onclick="app.rewardsUI.redeemReward('${r.id}')"
                      ${!canAfford ? 'disabled' : ''}>
                Einlösen
              </button>
              <button class="btn btn--small btn--danger" onclick="app.rewardsUI.deleteReward('${r.id}')">🗑</button>
            </div>
          </div>
        `;
      }).join('');
    }
    
    if (expiredRewards.length > 0) {
      html += `<h3 class="text--small text--soft mb--1" style="margin-top:16px;">⏰ Abgelaufen</h3>`;
      html += expiredRewards.map(r => `
        <div class="item" style="opacity:0.4; text-decoration:line-through;">
          <div class="item__content">
            <div class="item__name">${this.app.escapeHtml(r.title)}</div>
            <div class="item__meta">Abgelaufen am ${new Date(r.availableUntil).toLocaleDateString('de-DE')}</div>
          </div>
          <button class="btn btn--small" onclick="app.rewardsUI.extendReward('${r.id}')">Verlängern</button>
          <button class="btn btn--small btn--danger" onclick="app.rewardsUI.deleteReward('${r.id}')">🗑</button>
        </div>
      `).join('');
    }
    
    container.innerHTML = html;
  }

  addReward() {
    const title = document.getElementById('newRewardTitle')?.value.trim();
    const cost = parseInt(document.getElementById('newRewardCost')?.value) || 50;
    const until = document.getElementById('newRewardUntil')?.value || null;
    
    if (!title) {
      alert('Bitte Titel eingeben');
      return;
    }
    
    const reward = {
      id: genId('reward'),
      title,
      cost,
      availableFrom: null,
      availableUntil: until,
      _deleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.app.storage.data.rewards.push(reward);
    this.app.storage.data.version = (this.app.storage.data.version || 0) + 1;
    this.app.storage.saveLocal();
    this.app.sync.markDirty();
    
    document.getElementById('newRewardTitle').value = '';
    document.getElementById('newRewardCost').value = '50';
    document.getElementById('newRewardUntil').value = '';
    
    this.app.updateUI();
    this.app.toast(`🏆 "${title}" angelegt`);
  }

  deleteReward(id) {
    if (!confirm('Belohnung wirklich löschen?')) return;
    
    const index = this.app.storage.data.rewards.findIndex(r => r.id === id);
    if (index > -1) {
      this.app.storage.data.rewards[index]._deleted = true;
      this.app.storage.data.rewards[index].updatedAt = Date.now();
      this.app.storage.data.version = (this.app.storage.data.version || 0) + 1;
      this.app.storage.saveLocal();
      this.app.sync.markDirty();
      this.app.updateUI();
      this.app.toast('🗑️ Belohnung gelöscht');
    }
  }

  extendReward(id) {
    const reward = this.app.storage.data.rewards.find(r => r.id === id);
    if (!reward) return;
    
    const newDate = prompt('Neues Ablaufdatum (YYYY-MM-DD):', 
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    
    if (newDate) {
      reward.availableUntil = newDate;
      reward.updatedAt = Date.now();
      this.app.storage.data.version = (this.app.storage.data.version || 0) + 1;
      this.app.storage.saveLocal();
      this.app.sync.markDirty();
      this.app.updateUI();
      this.app.toast('⏰ Belohnung verlängert');
    }
  }

  redeemReward(id) {
    const reward = this.app.storage.data.rewards.find(r => r.id === id);
    if (!reward) return;
    
    const user = this.app.users.getActive();
    if (!user) {
      alert('Bitte zuerst Benutzer auswählen');
      return;
    }
    
    if (reward.availableUntil && new Date(reward.availableUntil) < new Date()) {
      alert('Diese Belohnung ist abgelaufen!');
      return;
    }
    
    if (this.app.users.spendPoints(user.id, reward.cost, reward.title)) {
      this.app.toast(`🏆 ${reward.title} eingelöst!`);
      this.app.updateUI();
    } else {
      alert('Nicht genug Punkte!');
    }
  }
}
