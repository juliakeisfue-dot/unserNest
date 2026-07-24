// modules/recipesUI.js - KORRIGIERT
export class RecipesUI {
  constructor(app) {
    this.app = app;
    this.editingRecipeId = null;
    this.selectedRecipeIds = new Set();
    this.isOcrRunning = false;
    this.ocrDrafts = [];
    this.currentOcrDraftIndex = -1;
  }

  render() {
    const container = document.getElementById('recipesList');
    if (!container) {
      console.error('[RecipesUI] Container nicht gefunden!');
      return;
    }
    
    const recipes = this.app.recipes.getRecipesSorted();
    const validIds = new Set(recipes.map(r => r.id));
    this.selectedRecipeIds.forEach(id => {
      if (!validIds.has(id)) this.selectedRecipeIds.delete(id);
    });
    
    let html = '';
    
    // 🆕 Neues Rezept Formular - immer anzeigen
    const isEditing = !!this.editingRecipeId;
    html += `
      <div class="card" style="margin-bottom:16px; border:2px solid var(--accent);">
        <h3 class="card__title" style="font-size:1rem;">${isEditing ? '✏️ Rezept bearbeiten' : '➕ Neues Rezept speichern'}</h3>
        <div class="text--small text--soft" style="margin-bottom:8px;">
          Tipp für einheitliche Einheiten: eine Zutat pro Zeile mit Menge + Einheit, z. B.
          <strong>250 g Mehl</strong>, <strong>500 ml Milch</strong>, <strong>2 Stk Eier</strong>.
          Zulässige Kurzformen: <strong>g / kg</strong>, <strong>ml / l</strong>, <strong>Stk</strong>.
        </div>
        <div class="form" style="gap:8px;">
          <input type="text" id="newRecipeName" class="form__input" placeholder="Name (z.B. Rührei)">
          <textarea id="newRecipeIngredients" class="form__input" style="min-height:80px;" placeholder="Zutaten-Schnellerfassung: pro Zeile ODER mit Komma/Semikolon (z. B. Eier\nMilch\nButter)"></textarea>
          <input type="url" id="newRecipeLink" class="form__input" placeholder="Link zu Chefkoch.de o.ä.">
          <div class="form__row">
            <select id="newRecipeDifficulty" class="form__input" style="min-width:120px;">
              <option value="sehr einfach">⭐ Sehr einfach</option>
              <option value="einfach" selected>⭐⭐ Einfach</option>
              <option value="mittel">⭐⭐⭐ Mittel</option>
            </select>
            <input type="text" id="newRecipeTime" class="form__input" placeholder="Zeit (z.B. 15 Min)" style="min-width:100px;">
            <input type="number" id="newRecipeServings" class="form__input" placeholder="Portionen" value="2" style="min-width:80px;">
          </div>
          <div class="form__row">
            <button class="btn btn--primary btn--small" onclick="app.recipesUI.addRecipe()">${isEditing ? '💾 Änderungen speichern' : '💾 Rezept speichern'}</button>
            ${isEditing ? '<button class="btn btn--small" onclick="app.recipesUI.cancelEdit()">↩️ Bearbeiten abbrechen</button>' : ''}
            <button class="btn btn--small" onclick="app.recipesUI.openRecipePhotoPicker()">📷 Rezeptkarten scannen</button>
          </div>
          <div class="form__row" style="gap:8px; flex-wrap:wrap;">
            <button class="btn btn--small" onclick="app.recipesUI.searchRecipeByTitle('hellofresh-google')">🔎 HelloFresh suchen</button>
            <button class="btn btn--small" onclick="app.recipesUI.searchRecipeByTitle('google')">🌐 Google suchen</button>
            <button class="btn btn--small" onclick="app.recipesUI.searchRecipeByTitle('chefkoch')">🍳 Chefkoch suchen</button>
          </div>
          <textarea id="recipeImportText" class="form__input" style="min-height:90px;" placeholder="Chefkoch-/HelloFresh-Rezepttext hier einfügen (z. B. kopierte Rezeptseite mit Zutaten)"></textarea>
          <div class="form__row" style="gap:8px; flex-wrap:wrap;">
            <button class="btn btn--small" onclick="app.recipesUI.importRecipeText()">📋 Rezepttext übernehmen</button>
          </div>
          ${this.ocrDrafts.length > 1 ? `
            <div class="form__row" style="align-items:center; gap:8px;">
              <button class="btn btn--small" onclick="app.recipesUI.prevOcrDraft()">⬅ Entwurf</button>
              <span class="text--small text--soft">OCR-Entwurf ${this.currentOcrDraftIndex + 1}/${this.ocrDrafts.length}</span>
              <button class="btn btn--small" onclick="app.recipesUI.nextOcrDraft()">Entwurf ➡</button>
            </div>
          ` : ''}
          <input type="file" id="recipePhotoInput" accept="image/*" capture="environment" multiple style="display:none;">
          <textarea id="recipeOcrRawText" class="form__input" style="display:none; min-height:90px; font-family:monospace;" placeholder="OCR-Text (optional zur Kontrolle)"></textarea>
        </div>
      </div>
    `;
    
    // Rezepte Liste
    if (!recipes || recipes.length === 0) {
      html += '<div class="empty"><div class="empty__icon">🍳</div>Noch keine Rezepte vorhanden. Füge oben dein erstes Rezept hinzu!</div>';
    } else {
      const cookableCount = recipes.filter(r => this.app.recipes.isCookable(r)).length;
      const partialCount = recipes.filter(r => {
        const a = this.app.recipes.getIngredientAvailability(r);
        return a.ratio > 0 && a.ratio < 1;
      }).length;
      const selectedCount = this.selectedRecipeIds.size;
      html += `<div class="mb--2" style="font-size:0.9rem; color:var(--text-soft);">
        🍳 ${cookableCount} sofort kochbar · ${partialCount} teilweise vorhanden · ${recipes.length} gesamt
      </div>`;

      html += `
        <div class="form__row" style="margin-bottom:12px; gap:8px; align-items:center;">
          <button class="btn btn--small" onclick="app.recipesUI.addMissingSelectedToList()" ${selectedCount === 0 ? 'disabled' : ''}>
            🛒 Fehlende Zutaten für markierte (${selectedCount})
          </button>
          <button class="btn btn--small" onclick="app.recipesUI.clearSelection()" ${selectedCount === 0 ? 'disabled' : ''}>✖ Auswahl löschen</button>
        </div>
      `;
      
      html += recipes.map(r => {
        const availability = this.app.recipes.getIngredientAvailability(r);
        const cookable = availability.missing.length === 0;
        const partial = !cookable && availability.available.length > 0;
        const missing = availability.missing;
        const missingText = cookable
          ? `Alles vorhanden (${availability.available.length}/${availability.total})`
          : `Vorhanden: ${availability.available.length}/${availability.total} · Fehlt: ${missing.join(', ')}`;
        const statusIcon = cookable ? '🟢' : (partial ? '🟡' : '⚪');
        const statusColor = cookable ? 'var(--success)' : (partial ? 'var(--warning)' : 'var(--text-soft)');
        const isSelected = this.selectedRecipeIds.has(r.id);
        
        return `
          <div class="item ${cookable ? 'item--open' : ''}">
            <div class="item__content">
              <div class="item__name">
                <label style="margin-right:8px; display:inline-flex; align-items:center; gap:4px;">
                  <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="app.recipesUI.toggleRecipeSelection('${r.id}', this.checked)">
                  <span style="font-size:0.75rem; color:var(--text-soft);">markieren</span>
                </label>
                ${statusIcon} ${this.app.escapeHtml(r.name)}
                <span style="font-size:0.75rem; color:var(--text-soft); margin-left:8px;">
                  ${r.difficulty} | ${r.time} | ${r.servings} Port.
                </span>
              </div>
              <div class="item__meta">
                <strong>Zutaten:</strong> ${this.app.escapeHtml(r.ingredients.join(', '))}<br>
                <span style="color:${statusColor};">
                  ${cookable ? '✓ ' : (partial ? '⚠ ' : 'ℹ ')}${missingText}
                </span>
              </div>
            </div>
            <div class="item__actions" style="flex-direction:column; gap:4px;">
              <a href="${r.link}" target="_blank" class="btn btn--primary btn--small" style="text-decoration:none; text-align:center;">
                📖 Rezept
              </a>
              ${!cookable ? 
                `<button class="btn btn--small" onclick="app.recipesUI.addMissingToList('${r.id}')" title="Fehlende Zutaten einkaufen">
                  🛒 +${missing.length}
                </button>` : ''}
              <button class="btn btn--small" onclick="app.recipesUI.loadRecipeToForm('${r.id}')" title="Rezept ins Formular laden">✏️ Laden</button>
              <button class="btn btn--small btn--danger" onclick="app.recipesUI.deleteRecipe('${r.id}')" title="Rezept löschen">🗑</button>
            </div>
          </div>
        `;
      }).join('');
    }
    
    container.innerHTML = html;

    const recipePhotoInput = document.getElementById('recipePhotoInput');
    if (recipePhotoInput) {
      recipePhotoInput.onchange = (e) => this.handleRecipePhoto(e);
    }
  }

  addRecipe() {
    const name = document.getElementById('newRecipeName')?.value.trim();
    const ingredients = document.getElementById('newRecipeIngredients')?.value.trim();
    const link = document.getElementById('newRecipeLink')?.value.trim();
    const difficulty = document.getElementById('newRecipeDifficulty')?.value;
    const time = document.getElementById('newRecipeTime')?.value.trim();
    const servings = document.getElementById('newRecipeServings')?.value;
    
    if (!name || !ingredients) {
      alert('Bitte Name und Zutaten eingeben');
      return;
    }
    
    try {
      const payload = {
        name,
        ingredients,
        link: link || `https://www.chefkoch.de/rs/s0/${encodeURIComponent(name)}/Rezepte.html`,
        difficulty,
        time,
        servings
      };

      const wasEditing = !!this.editingRecipeId;
      if (wasEditing) {
        this.app.recipes.updateRecipe(this.editingRecipeId, payload);
      } else {
        this.app.recipes.addRecipe(payload);
      }
      
      // Formular leeren
      document.getElementById('newRecipeName').value = '';
      document.getElementById('newRecipeIngredients').value = '';
      document.getElementById('newRecipeLink').value = '';
      document.getElementById('newRecipeTime').value = '';
      document.getElementById('newRecipeServings').value = '2';
      this.editingRecipeId = null;
      
      this.app.updateUI();
      this.app.toast(wasEditing ? `✏️ "${name}" aktualisiert` : `🍳 "${name}" gespeichert`);
    } catch (err) {
      alert(err.message);
    }
  }

  loadRecipeToForm(recipeId) {
    const recipe = this.app.recipes.getAllRecipes().find(r => r.id === recipeId);
    if (!recipe) return;

    this.editingRecipeId = recipe.id;
    this.app.updateUI();

    document.getElementById('newRecipeName').value = recipe.name || '';
    document.getElementById('newRecipeIngredients').value = (recipe.ingredients || []).join(', ');
    document.getElementById('newRecipeLink').value = recipe.link || '';
    document.getElementById('newRecipeDifficulty').value = recipe.difficulty || 'einfach';
    document.getElementById('newRecipeTime').value = recipe.time || '';
    document.getElementById('newRecipeServings').value = recipe.servings || 2;
  }

  cancelEdit() {
    this.editingRecipeId = null;
    this.app.updateUI();
  }

  openRecipePhotoPicker() {
    if (this.isOcrRunning) return;
    const input = document.getElementById('recipePhotoInput');
    if (input) input.click();
  }

  groupRecipePhotos(files = []) {
    if (files.length <= 2) return [files];

    // Heuristik: bei vielen Bildern jeweils 2 Seiten als ein Rezept (Vorder-/Rueckseite)
    const groups = [];
    for (let i = 0; i < files.length; i += 2) {
      groups.push(files.slice(i, i + 2));
    }
    return groups;
  }

  applyRecipeDraftToForm(draft) {
    if (!draft) return;

    document.getElementById('newRecipeName').value = draft.name || '';
    document.getElementById('newRecipeIngredients').value = (draft.ingredients || []).join(', ');
    document.getElementById('newRecipeLink').value = draft.link || '';
    document.getElementById('newRecipeDifficulty').value = draft.difficulty || 'einfach';
    document.getElementById('newRecipeTime').value = draft.time || '';
    document.getElementById('newRecipeServings').value = draft.servings || 2;

    const rawTextEl = document.getElementById('recipeOcrRawText');
    if (rawTextEl) {
      rawTextEl.style.display = 'block';
      rawTextEl.value = draft.rawText || '';
    }
  }

  setOcrDraftIndex(index) {
    if (!Array.isArray(this.ocrDrafts) || this.ocrDrafts.length === 0) return;
    const bounded = Math.max(0, Math.min(index, this.ocrDrafts.length - 1));
    this.currentOcrDraftIndex = bounded;
    this.app.updateUI();
    this.applyRecipeDraftToForm(this.ocrDrafts[bounded]);
  }

  prevOcrDraft() {
    if (this.ocrDrafts.length <= 1) return;
    this.setOcrDraftIndex(this.currentOcrDraftIndex - 1);
  }

  nextOcrDraft() {
    if (this.ocrDrafts.length <= 1) return;
    this.setOcrDraftIndex(this.currentOcrDraftIndex + 1);
  }

  searchRecipeByTitle(provider = 'hellofresh-google') {
    const title = document.getElementById('newRecipeName')?.value?.trim() || '';
    if (!title) {
      this.app.showDialog('⚠️ Titel fehlt', 'Bitte zuerst einen Rezepttitel eingeben oder per OCR erkennen lassen.');
      return;
    }

    const url = this.app.recipes.buildTitleSearchUrl(title, provider);
    if (!url) {
      this.app.showDialog('❌ Suche nicht möglich', 'Für die Suche konnte keine URL erzeugt werden.');
      return;
    }

    window.open(url, '_blank', 'noopener');
  }

  importRecipeText() {
    const rawText = document.getElementById('recipeImportText')?.value?.trim() || '';
    if (!rawText) {
      this.app.showDialog('⚠️ Rezepttext fehlt', 'Bitte kopieren Sie zuerst den Rezepttext von Chefkoch oder HelloFresh in das Textfeld.');
      return;
    }

    const draft = this.app.recipes.buildRecipeDraftFromPastedText(rawText);
    this.applyRecipeDraftToForm(draft);
    this.app.toast(`📋 Rezepttext übernommen: ${draft.ingredients.length} Zutaten erkannt`);
  }

  async handleRecipePhoto(event) {
    const files = Array.from(event?.target?.files || []);
    if (files.length === 0) return;

    const hasNonImage = files.some(file => !String(file.type || '').startsWith('image/'));
    if (hasNonImage) {
      this.app.toast('❌ Bitte nur Bilddateien auswählen', 'error');
      return;
    }

    const tooLarge = files.find(file => file.size > 8 * 1024 * 1024);
    if (tooLarge) {
      this.app.toast(`❌ Datei zu groß: ${tooLarge.name} (max. 8MB)`, 'error');
      return;
    }

    this.isOcrRunning = true;

    try {
      const groups = this.groupRecipePhotos(files);
      const drafts = [];

      for (const group of groups) {
        const recognizedTexts = [];
        for (const file of group) {
          const text = await this.app.billOCR.recognizeText(file);
          recognizedTexts.push(text);
        }
        drafts.push(this.app.recipes.buildRecipeDraftFromOCRTexts(recognizedTexts));
      }

      this.ocrDrafts = drafts;
      this.currentOcrDraftIndex = 0;
      this.app.updateUI();
      this.applyRecipeDraftToForm(this.ocrDrafts[0]);

      if (drafts.length > 1) {
        this.app.toast(`📷 OCR fertig: ${drafts.length} Rezept-Entwürfe erkannt`);
      } else {
        const first = drafts[0] || { ingredients: [] };
        this.app.toast(`📷 OCR fertig: ${first.ingredients.length} Zutaten erkannt`);
      }
    } catch (err) {
      this.app.toast(`❌ ${err.message || 'OCR fehlgeschlagen'}`, 'error');
    } finally {
      this.isOcrRunning = false;
      if (event?.target) event.target.value = '';
    }
  }

  toggleRecipeSelection(recipeId, isSelected) {
    if (isSelected) {
      this.selectedRecipeIds.add(recipeId);
    } else {
      this.selectedRecipeIds.delete(recipeId);
    }
    this.app.updateUI();
  }

  clearSelection() {
    this.selectedRecipeIds.clear();
    this.app.updateUI();
  }

  addMissingSelectedToList() {
    const selectedIds = Array.from(this.selectedRecipeIds);
    if (selectedIds.length === 0) {
      this.app.toast('ℹ️ Keine Rezepte markiert');
      return;
    }

    const added = this.app.recipes.addMissingToShoppingListForRecipes(selectedIds);
    if (added > 0) {
      this.app.toast(`🛒 ${added} Zutat(en) für markierte Rezepte ergänzt`);
      this.app.updateUI();
      return;
    }

    this.app.toast('✅ Für die markierten Rezepte ist alles bereits vorhanden/auf der Liste');
  }

  addMissingToList(recipeId) {
    const added = this.app.recipes.addMissingToShoppingList(recipeId);
    if (added > 0) {
      this.app.toast(`🛒 ${added} Zutat(en) auf Einkaufsliste`);
      this.app.updateUI();
    } else {
      this.app.toast('✅ Alle Zutaten schon auf der Liste oder vorhanden');
    }
  }

  deleteRecipe(id) {
    if (!confirm('Rezept wirklich löschen?')) return;
    
    try {
      this.app.recipes.deleteRecipe(id);
      this.selectedRecipeIds.delete(id);
      this.app.updateUI();
      this.app.toast('🗑️ Rezept gelöscht');
    } catch (err) {
      alert(err.message);
    }
  }
}
