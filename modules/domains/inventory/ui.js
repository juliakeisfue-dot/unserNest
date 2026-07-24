// modules/inventoryUI.js
export class InventoryUI {
  constructor(app) {
    this.app = app;
  }

  render() {
    const container = document.getElementById('inventoryList');
    const locations = this.app.inventory.getLocations();
    
    let html = '';
    
    // Neuer Lagerort Formular
    html += `
      <div class="card" style="margin-bottom:16px;">
        <h3 class="card__title" style="font-size:1rem;">➕ Neuen Lagerort anlegen</h3>
        <div class="form__row">
          <input type="text" id="newLocationName" class="form__input" placeholder="Name (z.B. Keller)">
          <select id="newLocationIcon" class="form__input" style="min-width:80px;">
            <option value="📦">📦</option>
            <option value="🧊">🧊</option>
            <option value="🗄️">🗄️</option>
            <option value="🌿">🌿</option>
            <option value="🍷">🍷</option>
            <option value="📚">📚</option>
            <option value="🧹">🧹</option>
            <option value="🚗">🚗</option>
          </select>
          <input type="number" id="newLocationMaxAgeDays" class="form__input" min="1" value="730" placeholder="Haltbarkeit (Tage)" style="max-width:150px;">
          <button class="btn btn--primary btn--small" onclick="app.inventoryUI.addLocation()">Anlegen</button>
        </div>
      </div>
    `;
    
    // Locations Liste
    html += locations.map(loc => `
      <div class="location">
        <div class="location__header">
          <span>${loc.name}</span>
          <span class="text--small text--soft">⏳ ${Number(loc.maxAgeDays || 730)} Tage</span>
          <span class="location__count">${loc.items?.length || 0} Artikel</span>
          <button class="btn btn--small btn--danger" onclick="app.inventoryUI.deleteLocation('${loc.id}')" 
                  ${loc.items?.length > 0 ? 'disabled title="Nur leere Orte können gelöscht werden"' : ''}>🗑</button>
        </div>
        ${(loc.items || []).length === 0 
          ? '<div class="text--small text--soft" style="padding:8px;">Leer</div>'
          : ([...(loc.items || [])].sort((a, b) => a.name.localeCompare(b.name, 'de'))).map(item => `
              <div class="inventory-item">
                <div style="flex:1; min-width:0;">
                  <div class="form__row" style="margin-bottom:6px;">
                    <input
                      type="text"
                      id="inv-name-${item.id}"
                      class="form__input"
                      value="${this.app.escapeHtml(item.name)}"
                      style="min-width:160px;"
                    >
                    <input
                      type="text"
                      id="inv-amount-${item.id}"
                      class="form__input"
                      value="${this.app.escapeHtml(item.amount || '')}"
                      placeholder="Menge/Notiz"
                      style="min-width:140px;"
                    >
                    <button class="btn btn--small" onclick="app.inventoryUI.saveItem('${loc.id}','${item.id}')">💾</button>
                  </div>
                  <div class="form__row">
                    <select id="inv-move-${item.id}" class="form__input" style="min-width:180px;">
                      <option value="">📍 Ort ändern...</option>
                      ${locations
                        .filter(target => target.id !== loc.id)
                        .map(target => `<option value="${target.id}">${target.name}</option>`)
                        .join('')}
                    </select>
                    <button class="btn btn--small" onclick="app.inventoryUI.moveItem('${loc.id}','${item.id}')">↔️ Verschieben</button>
                    <button class="btn btn--small btn--danger" onclick="app.inventoryUI.removeItem('${loc.id}', '${item.id}')">🗑</button>
                  </div>
                </div>
              </div>
            `).join('')
        }
      </div>
    `).join('');
    
    container.innerHTML = html;
  }

  addLocation() {
    const name = document.getElementById('newLocationName')?.value.trim();
    const icon = document.getElementById('newLocationIcon')?.value || '📦';
    const maxAgeDays = document.getElementById('newLocationMaxAgeDays')?.value;
    
    if (!name) {
      alert('Bitte einen Namen eingeben');
      return;
    }
    
    try {
      this.app.inventory.addLocation(name, icon, maxAgeDays);
      document.getElementById('newLocationName').value = '';
      document.getElementById('newLocationMaxAgeDays').value = '730';
      this.app.updateUI();
      this.app.toast(`📦 "${name}" angelegt`);
    } catch (err) {
      alert(err.message);
    }
  }

  deleteLocation(id) {
    if (!confirm('Ort wirklich löschen?')) return;
    
    try {
      this.app.inventory.removeLocation(id);
      this.app.updateUI();
      this.app.toast('🗑️ Ort gelöscht');
    } catch (err) {
      alert(err.message);
    }
  }

  removeItem(locId, itemId) {
    this.app.inventory.removeItem(locId, itemId);
    this.app.updateUI();
  }

  saveItem(locId, itemId) {
    const name = document.getElementById(`inv-name-${itemId}`)?.value || '';
    const amount = document.getElementById(`inv-amount-${itemId}`)?.value || '';

    if (!name.trim()) {
      this.app.toast('❌ Name darf nicht leer sein', 'error');
      return;
    }

    const ok = this.app.inventory.updateItem(locId, itemId, { name, amount });
    if (ok) {
      this.app.toast('✅ Artikel aktualisiert');
      this.app.updateUI();
    } else {
      this.app.toast('❌ Konnte Artikel nicht speichern', 'error');
    }
  }

  moveItem(fromLocId, itemId) {
    const toLocId = document.getElementById(`inv-move-${itemId}`)?.value;
    if (!toLocId) {
      this.app.toast('⚠️ Bitte Ziel-Ort wählen', 'warning');
      return;
    }

    const ok = this.app.inventory.moveItem(fromLocId, toLocId, itemId);
    if (ok) {
      const locName = this.app.inventory.getLocation(toLocId)?.name || 'Ziel-Ort';
      this.app.toast(`📦 Nach ${locName} verschoben`);
      this.app.updateUI();
    } else {
      this.app.toast('❌ Verschieben fehlgeschlagen', 'error');
    }
  }
}
