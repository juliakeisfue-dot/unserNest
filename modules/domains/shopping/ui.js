// modules/shoppingUI.js
import { CONFIG } from '../../core/config.js';

export class ShoppingUI {
  constructor(app) {
    this.app = app;
    this.editingItemId = null;
  }

    render() {
      const items = this.app.shopping.getItems();
      const offen = items.filter(i => i.status === 'offen');
      const gekauft = items.filter(i => i.status === 'gekauft');
      this.renderMainCategorySelect();

      const progressEl = document.getElementById('shoppingProgress');
      if (items.length > 0) {
        const pct = Math.round((gekauft.length / items.length) * 100);
        progressEl.innerHTML = `
          <div class="progress mb--2">
            <div class="progress__bar">
              <div class="progress__fill" style="width:${pct}%"></div>
            </div>
            <div class="progress__label">${pct}% gekauft</div>
          </div>
        `;
      } else {
        progressEl.innerHTML = '';
      }

      const container = document.getElementById('shoppingList');
      const locations = this.app.inventory.getLocations();

      let html = '';

      html += `
        <div style="margin-bottom:10px;">
          <button class="btn btn--small" onclick="app.showSection('bill')">🧾 Kassenbon erfassen</button>
          <button class="btn btn--small" onclick="app.shoppingUI.addCategoryDialog()">🏷️ Kategorie hinzufügen</button>
          <button class="btn btn--small" onclick="app.shoppingUI.showAddFromPlannedRecipesDialog()">🍳 Zutaten von Rezept hinzufügen</button>
          <button class="btn btn--small" onclick="app.exportShoppingToGoogleTasks()">↗ Google Tasks (offen)</button>
        </div>
      `;

      // Autovervollständigungs-Vorschläge mit häufig gekauften Lebensmitteln
      html += this.renderAutocompleteBar();

     html += `<h3 class="text--small text--soft mb--1">📋 Zu kaufen (${offen.length})</h3>`;
     if (offen.length > 0) {
       html += `<div style="margin-bottom:8px;"><button class="btn btn--success btn--small" onclick="app.shoppingUI.markAllBought()">✅ Alle gekauft</button></div>`;
     }
     html += offen.length === 0
       ? '<div class="empty"><div class="empty__icon">✨</div>Alles erledigt!</div>'
       : this.renderGroupedItems(offen, 'offen', locations);

      html += `<h3 class="text--small text--soft mb--1" style="margin-top:16px;">🛒 Gekauft (${gekauft.length})</h3>`;
      if (gekauft.length > 0) {
        const fridgeId = locations.find(l => l.name === 'Kühlschrank')?.id;
        const fridgeBtn = fridgeId ? `<button class="btn btn--primary btn--small" onclick="app.shoppingUI.markAllStoredToLocation('${fridgeId}')">❄️ Alle zu Kühlschrank</button>` : '';
        const bulkBtn = `<button class="btn btn--primary btn--small" onclick="app.shoppingUI.showBulkStoreDialog()">📍 Alle zu Raum...</button>`;
        html += `<div style="margin-bottom:8px;">${fridgeBtn} ${bulkBtn}</div>`;
      }
     html += gekauft.length === 0
       ? '<div class="empty"><div class="empty__icon">📦</div>Nichts einzuräumen</div>'
       : this.renderGroupedItems(gekauft, 'gekauft', locations);

     container.innerHTML = html;
   }

   renderMainCategorySelect() {
     const select = document.getElementById('shoppingItemCategory');
     if (!select) return;
     const options = this.app.shopping.getCategoryDefinitions()
       .map(c => `<option value="${c.id}">${this.app.escapeHtml(c.label)}</option>`)
       .join('');
     select.innerHTML = `<option value="">Kategorie (auto)</option>${options}`;
   }

   async addCategoryDialog() {
     const label = await this.app.showInputDialog('🏷️ Neue Kategorie', 'Name der neuen Kategorie:');
     if (!label) return;
     const created = this.app.shopping.addCategory(label);
     if (!created) {
       this.app.showDialog('⚠️ Ungültig', 'Kategorie konnte nicht erstellt werden.');
       return;
     }
     this.app.updateUI();
     const select = document.getElementById('shoppingItemCategory');
     if (select) select.value = created.id;
     this.app.toast(`🏷️ Kategorie "${created.label}" ergänzt`);
   }

   addItem() {
     const name = document.getElementById('shoppingItemName')?.value?.trim();
     const note = document.getElementById('shoppingItemNote')?.value?.trim();

     // Validierung
     if (!name) {
       this.app.showDialog('⚠️ Eingabe erforderlich', 'Bitte geben Sie einen Artikelnamen ein.');
       return;
     }
     if (name.length > 100) {
       this.app.showDialog('⚠️ Text zu lang', 'Maximum 100 Zeichen für Artikelnamen.');
       return;
     }
     if (note && note.length > 100) {
       this.app.showDialog('⚠️ Text zu lang', 'Maximum 100 Zeichen für Notiz.');
       return;
     }

     const categoryId = document.getElementById('shoppingItemCategory')?.value || '';
     if (this.app.shopping.add(name, note, categoryId)) {
       document.getElementById('shoppingItemName').value = '';
       document.getElementById('shoppingItemNote').value = '';
       const catSelect = document.getElementById('shoppingItemCategory');
       if (catSelect) catSelect.value = '';
       this.app.updateUI();
       this.app.toast(`✅ "${name}" hinzugefügt`);
     }
   }

   markBought(id) {
     this.app.shopping.markBought(id);
     this.app.updateUI();
   }

   markAllBought() {
     const items = this.app.shopping.getItems();
     const offen = items.filter(i => i.status === 'offen');
     let marked = 0;
     offen.forEach(item => {
       if (this.app.shopping.markBought(item.id)) marked++;
     });
     this.app.updateUI();
     this.app.toast(`✅ ${marked} Artikel als gekauft markiert`);
   }

   markAllStoredToLocation(locId) {
     const items = this.app.shopping.getItems();
     const gekauft = items.filter(i => i.status === 'gekauft');
     let stored = 0;
     gekauft.forEach(item => {
       if (this.app.shopping.markStored(item.id, locId)) stored++;
     });
     this.app.updateUI();
     this.app.toast(`📦 ${stored} Artikel eingeräumt`);
   }

  undoBuy(id) {
    this.app.shopping.undo(id);
    this.app.updateUI();
  }

   markStored(id) {
     const select = document.getElementById(`loc-${id}`);
     const locId = select?.value;

     if (!locId) {
       this.app.showDialog('⚠️ Ort erforderlich', 'Bitte wählen Sie einen Ort, wo das Artikel eingeräumt wird.');
       return;
     }

     const success = this.app.shopping.markStored(id, locId);

     if (success) {
       this.app.updateUI();
       this.app.toast('✅ Eingeräumt');
     } else {
       this.app.showDialog('❌ Fehler', 'Fehler beim Einräumen. Bitte versuchen Sie es später erneut.');
     }
   }

  deleteItem(id) {
    if (this.editingItemId === id) this.editingItemId = null;
    this.app.shopping.remove(id);
    this.app.updateUI();
  }

  startEdit(id) {
    this.editingItemId = id;
    this.app.updateUI();
  }

  cancelEdit() {
    this.editingItemId = null;
    this.app.updateUI();
  }

   saveEdit(id) {
     const name = document.getElementById(`shop-edit-name-${id}`)?.value?.trim() || '';
     const note = document.getElementById(`shop-edit-note-${id}`)?.value?.trim() || '';

     if (!name) {
       this.app.showDialog('⚠️ Eingabe erforderlich', 'Bitte geben Sie einen Artikelnamen ein.');
       return;
     }
     if (name.length > 100) {
       this.app.showDialog('⚠️ Text zu lang', 'Maximum 100 Zeichen für Artikelnamen.');
       return;
     }
     if (note.length > 100) {
       this.app.showDialog('⚠️ Text zu lang', 'Maximum 100 Zeichen für Notiz.');
       return;
     }

     const categoryId = document.getElementById(`shop-edit-category-${id}`)?.value || '';
     const ok = this.app.shopping.updateItem(id, { name, note, categoryId });
     if (!ok) {
       this.app.showDialog('❌ Fehler', 'Artikel konnte nicht aktualisiert werden.');
       return;
     }

     this.editingItemId = null;
     this.app.updateUI();
     this.app.toast('✏️ Artikel aktualisiert');
   }

   async showBulkStoreDialog() {
     const locations = this.app.inventory.getLocations();
     const options = locations.map(l => `<option value="${l.id}">${l.name}</option>`).join('');

     const overlay = document.getElementById('dialogOverlay');
     const titleEl = document.getElementById('dialogTitle');
     const msgEl = document.getElementById('dialogMessage');
     const input = document.getElementById('dialogInput');
     const btnCancel = document.getElementById('dialogBtnCancel');
     const btnOk = document.getElementById('dialogBtnOk');

     if (!overlay) return;

     titleEl.textContent = '📍 Alle gekauften Artikel einräumen';
     msgEl.innerHTML = `
       <p>Wählen Sie einen Raum, in den alle gekauften Artikel eingeräumt werden sollen:</p>
       <select id="bulkRoomSelect" class="form__input" style="margin-top: 10px;">
         <option value="">-- Raum wählen --</option>
         ${options}
       </select>
     `;
     input.style.display = 'none';
     btnCancel.style.display = 'block';
     btnCancel.textContent = 'Abbrechen';
     btnOk.textContent = 'Einräumen';

     overlay.classList.add('dialog-overlay--active');

     return new Promise((resolve) => {
       const handleOk = () => {
         const select = document.getElementById('bulkRoomSelect');
         const locId = select?.value;

         cleanup();
         overlay.classList.remove('dialog-overlay--active');

         if (!locId) {
           this.app.showDialog('⚠️ Fehler', 'Bitte wählen Sie einen Raum.');
           return;
         }

         this.markAllStoredToLocation(locId);
         resolve(true);
       };

       const handleCancel = () => {
         cleanup();
         overlay.classList.remove('dialog-overlay--active');
         resolve(false);
       };

       const handleKeydown = (e) => {
         if (e.key === 'Enter') handleOk();
         if (e.key === 'Escape') handleCancel();
       };

       const handleOverlayClick = (e) => {
         if (e.target === overlay) handleCancel();
       };

       const cleanup = () => {
         btnOk.onclick = null;
         btnCancel.onclick = null;
         document.removeEventListener('keydown', handleKeydown);
         overlay.removeEventListener('click', handleOverlayClick);
       };

       btnOk.onclick = handleOk;
       btnCancel.onclick = handleCancel;
       document.addEventListener('keydown', handleKeydown);
       overlay.addEventListener('click', handleOverlayClick);
     });
   }

   renderAutocompleteBar() {
     const groceries = CONFIG?.STANDARD_GROCERIES || [];
     const popular = groceries.slice(0, 6);

     return `
       <div style="background: var(--accent-soft); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
         <div style="font-size: 0.8rem; color: var(--text-soft); margin-bottom: 8px;">💡 Schnell hinzufügen:</div>
         <div style="display: flex; gap: 4px; flex-wrap: wrap;">
           ${popular.map(g => `
             <button class="btn btn--small btn--success" onclick="app.shoppingUI.quickAddItem('${this.app.escapeHtml(g.name)}', '${this.app.escapeHtml(g.suggestion || '')}')" title="Menge: ${g.suggestion || 'beliebig'}">
               ${this.app.escapeHtml(g.name)}
             </button>
           `).join('')}
           <button class="btn btn--small" onclick="app.shoppingUI.showAllGroceries()" title="Weitere Lebensmittel">Mehr...</button>
         </div>
       </div>
     `;
   }

   quickAddItem(name, suggestion) {
     document.getElementById('shoppingItemName').value = name;
     document.getElementById('shoppingItemNote').value = suggestion || '';
     this.addItem();
   }

   showAllGroceries() {
     const groceries = CONFIG?.STANDARD_GROCERIES || [];

     const overlay = document.getElementById('dialogOverlay');
     const titleEl = document.getElementById('dialogTitle');
     const msgEl = document.getElementById('dialogMessage');
     const input = document.getElementById('dialogInput');
     const btnCancel = document.getElementById('dialogBtnCancel');
     const btnOk = document.getElementById('dialogBtnOk');

     if (!overlay) return;

     titleEl.textContent = '📝 Standardlebensmittel';
     msgEl.innerHTML = `
       <div style="max-height: 60vh; overflow-y: auto;">
         <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;">
           ${groceries.map((g, idx) => `
             <button class="btn btn--small" onclick="app.shoppingUI.quickAddFromDialog('${this.app.escapeHtml(g.name)}', '${this.app.escapeHtml(g.suggestion || '')}', ${idx})" style="text-align: center;">
               ${this.app.escapeHtml(g.name)}<br><span style="font-size: 0.7rem; color: var(--text-soft);">${g.suggestion || '—'}</span>
             </button>
           `).join('')}
         </div>
       </div>
     `;
     input.style.display = 'none';
     btnCancel.style.display = 'block';
     btnCancel.textContent = 'Schließen';
     btnOk.style.display = 'none';

     overlay.classList.add('dialog-overlay--active');

     btnCancel.onclick = () => {
       overlay.classList.remove('dialog-overlay--active');
       btnOk.style.display = 'block';
     };
   }

   renderGroupedItems(items, status, locations) {
     const categoryDefs = this.app.shopping.getCategoryDefinitions();
     const sorted = [...items].sort((a, b) => {
       const aCat = String(a.categoryId || '');
       const bCat = String(b.categoryId || '');
       const aIdx = categoryDefs.findIndex(c => c.id === aCat);
       const bIdx = categoryDefs.findIndex(c => c.id === bCat);
       const catCmp = (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
       if (catCmp !== 0) return catCmp;
       return String(a.name || '').localeCompare(String(b.name || ''), 'de', { sensitivity: 'base' });
     });

     const byCategory = new Map();
     sorted.forEach(item => {
       const categoryId = String(item.categoryId || categoryDefs[0]?.id || 'ready');
       if (!byCategory.has(categoryId)) byCategory.set(categoryId, []);
       byCategory.get(categoryId).push(item);
     });

     let html = '';
     categoryDefs.forEach(category => {
       const groupItems = byCategory.get(category.id) || [];
       if (groupItems.length === 0) return;
       html += `<div class="text--small text--soft" style="margin:10px 0 6px 0;"><strong>${this.app.escapeHtml(category.label)}</strong> (${groupItems.length})</div>`;
       html += groupItems.map(item => this.renderShoppingItem(item, status, locations)).join('');
     });
     return html;
   }

   renderCategorySelect(selectId, selectedCategoryId = '') {
     const options = this.app.shopping.getCategoryDefinitions()
       .map(c => `<option value="${c.id}" ${c.id === selectedCategoryId ? 'selected' : ''}>${this.app.escapeHtml(c.label)}</option>`)
       .join('');
     return `
       <select id="${selectId}" class="form__input" style="margin-top:4px; padding:4px; min-width:180px; font-size:0.8rem;">
         <option value="">Kategorie (auto)</option>
         ${options}
       </select>
     `;
   }

   getCategoryLabel(categoryId) {
     const category = this.app.shopping.getCategoryDefinitions().find(c => c.id === categoryId);
     return category?.label || '🍱 Fertig-Lebensmittel';
   }

   formatAmount(item) {
     if (!Number.isFinite(Number(item.amountValue)) || !item.amountUnit) return '';
     const value = Number(item.amountValue);
     const amount = Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.0', '');
     return `${amount} ${item.amountUnit}`;
   }

   getRecipeSourceLabel(item) {
     const sources = Array.isArray(item.recipeSources) ? item.recipeSources : [];
     if (sources.length === 0) return '';
     const recipeNames = Array.from(new Set(sources.map(s => String(s.recipeName || '').trim()).filter(Boolean)));
     if (recipeNames.length === 0) return '';
     return recipeNames.join(' + ');
   }

   renderShoppingItem(item, status, locations) {
     const isEditing = this.editingItemId === item.id;
     const amount = this.formatAmount(item);
     const sourceLabel = this.getRecipeSourceLabel(item);
     const noteParts = [];
     if (item.note) noteParts.push(this.app.escapeHtml(item.note));
     if (amount) noteParts.push(`Σ ${this.app.escapeHtml(amount)}`);
     if (sourceLabel) noteParts.push(`aus ${this.app.escapeHtml(sourceLabel)}`);
     noteParts.push(this.app.escapeHtml(this.getCategoryLabel(item.categoryId)));
     const meta = noteParts
       .filter(Boolean)
       .join(' · ');

     if (status === 'offen') {
       return `
         <div class="item item--open">
           <div class="item__content">
             ${isEditing ? `
               <input id="shop-edit-name-${item.id}" class="form__input" value="${this.app.escapeHtml(item.name)}" maxlength="100" placeholder="Artikelname">
               <input id="shop-edit-note-${item.id}" class="form__input" value="${this.app.escapeHtml(item.note || '')}" maxlength="100" placeholder="Notiz (optional)" style="margin-top:4px;">
               ${this.renderCategorySelect(`shop-edit-category-${item.id}`, item.categoryId)}
             ` : `
               <div class="item__name">${this.app.escapeHtml(item.name)}</div>
               ${meta ? `<div class="item__meta">${meta}</div>` : ''}
             `}
           </div>
           <div class="item__actions">
             ${isEditing
               ? `<button class="btn btn--success btn--small" onclick="app.shoppingUI.saveEdit('${item.id}')">💾</button>
                  <button class="btn btn--small" onclick="app.shoppingUI.cancelEdit()">✖</button>`
               : `<button class="btn btn--success btn--small" onclick="app.shoppingUI.markBought('${item.id}')">✓</button>
                  <button class="btn btn--small" onclick="app.shoppingUI.startEdit('${item.id}')">✏️</button>
                  <button class="btn btn--small" onclick="app.shoppingUI.deleteItem('${item.id}')">🗑</button>`}
           </div>
         </div>
       `;
     }

     return `
       <div class="item item--done" data-item-id="${item.id}">
         <div class="item__content">
           ${isEditing ? `
             <input id="shop-edit-name-${item.id}" class="form__input" value="${this.app.escapeHtml(item.name)}" maxlength="100" placeholder="Artikelname">
             <input id="shop-edit-note-${item.id}" class="form__input" value="${this.app.escapeHtml(item.note || '')}" maxlength="100" placeholder="Notiz (optional)" style="margin-top:4px;">
             ${this.renderCategorySelect(`shop-edit-category-${item.id}`, item.categoryId)}
           ` : `
             <div class="item__name">${this.app.escapeHtml(item.name)}</div>
             ${meta ? `<div class="item__meta">${meta}</div>` : ''}
             <select class="form__input" style="margin-top:4px; padding:4px; min-width:150px; font-size:0.8rem;" id="loc-${item.id}">
               <option value="">📍 Ort wählen...</option>
               ${locations.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
             </select>
           `}
         </div>
         <div class="item__actions" style="flex-direction:column;">
            ${isEditing
              ? `<button class="btn btn--success btn--small" onclick="app.shoppingUI.saveEdit('${item.id}')">💾</button>
                 <button class="btn btn--small" onclick="app.shoppingUI.cancelEdit()">✖</button>`
              : `<button class="btn btn--success btn--small" onclick="app.shoppingUI.markStored('${item.id}')">📦</button>
                 <button class="btn btn--small" onclick="app.shoppingUI.undoBuy('${item.id}')">↩</button>
                 <button class="btn btn--small" onclick="app.shoppingUI.startEdit('${item.id}')">✏️</button>`}
         </div>
       </div>
     `;
   }

   quickAddFromDialog(name, suggestion, idx) {
     this.quickAddItem(name, suggestion);
     const overlay = document.getElementById('dialogOverlay');
     const btnCancel = document.getElementById('dialogBtnCancel');
     const btnOk = document.getElementById('dialogBtnOk');
     overlay.classList.remove('dialog-overlay--active');
     btnOk.style.display = 'block';
     btnCancel.onclick = null;
   }

   getPlannedRecipesForCurrentWeek() {
     const ids = this.app.mealplan.getPlannedRecipeIdsForWeek();
     if (!Array.isArray(ids) || ids.length === 0) return [];
     const recipes = this.app.recipes.getRecipes();
     return ids
       .map(id => recipes.find(r => r.id === id))
       .filter(Boolean)
       .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de', { sensitivity: 'base' }));
   }

   addIngredientsFromRecipe(recipeId) {
     const added = this.app.recipes.addIngredientsToShoppingList(recipeId);
     if (added > 0) {
       this.app.updateUI();
       this.app.toast(`🛒 ${added} Zutat(en) ergänzt`);
     } else {
       this.app.toast('✅ Zutaten sind bereits auf dem Einkaufszettel');
     }
     return added;
   }

   addIngredientsFromAllPlannedRecipes() {
     const planned = this.getPlannedRecipesForCurrentWeek();
     if (planned.length === 0) {
       this.app.toast('ℹ️ Keine geplanten Rezepte in dieser Woche');
       return 0;
     }
     const added = this.app.recipes.addIngredientsToShoppingListForRecipes(planned.map(r => r.id));
     if (added > 0) {
       this.app.updateUI();
       this.app.toast(`🛒 ${added} Zutat(en) aus geplanten Rezepten ergänzt`);
     } else {
       this.app.toast('✅ Alle Zutaten sind bereits auf dem Einkaufszettel');
     }
     return added;
   }

   showAddFromPlannedRecipesDialog() {
     const planned = this.getPlannedRecipesForCurrentWeek();
     if (planned.length === 0) {
       this.app.showDialog('ℹ️ Keine Planung', 'In der aktuell angezeigten Woche sind keine Rezepte geplant.');
       return;
     }

     const overlay = document.getElementById('dialogOverlay');
     const titleEl = document.getElementById('dialogTitle');
     const msgEl = document.getElementById('dialogMessage');
     const input = document.getElementById('dialogInput');
     const btnCancel = document.getElementById('dialogBtnCancel');
     const btnOk = document.getElementById('dialogBtnOk');
     if (!overlay || !titleEl || !msgEl || !input || !btnCancel || !btnOk) return;

     titleEl.textContent = '🍳 Zutaten von Rezept hinzufügen';
     msgEl.innerHTML = `
       <div style="display:flex; flex-direction:column; gap:8px;">
         <button class="btn btn--primary btn--small" onclick="app.shoppingUI.addIngredientsFromAllPlannedRecipes(); app.closeDialog();">
           🛒 Alle geplanten Rezepte (${planned.length})
         </button>
         ${planned.map(r => `
           <button class="btn btn--small" onclick="app.shoppingUI.addIngredientsFromRecipe('${r.id}'); app.closeDialog();">
             ➕ ${this.app.escapeHtml(r.name)}
           </button>
         `).join('')}
       </div>
     `;
     input.style.display = 'none';
     btnCancel.style.display = 'block';
     btnCancel.textContent = 'Schließen';
     btnOk.style.display = 'none';
     overlay.classList.add('dialog-overlay--active');
     btnCancel.onclick = () => {
       overlay.classList.remove('dialog-overlay--active');
       btnOk.style.display = 'block';
     };
   }
}
