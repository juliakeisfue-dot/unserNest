// modules/domains/mealplan/ui.js
/**
 * MealPlanUI – Render-Logik für Wochenspeisenplan
 *
 * Zeigt:
 * - Wochennavigation (← aktuelle Woche →)
 * - 7 Tage x 2 Mahlzeiten (lunchbox, dinner) als Grid
 * - Rezeptplatzierung mit Portionen
 * - Kochbestätigung und Ratings
 * - Verschiebung zu anderem Datum
 */
export class MealPlanUI {
  constructor(app) {
    this.app = app;
    this.editingSlot = null; // { date, meal } wenn gerade Rezept hinzufügen/ändern
    this.movingSlot = null;  // { date, meal } wenn gerade verschieben
    this.recipeSelectorTimer = null;
    this._dialogState = null;
    this.viewMode = this._loadViewMode();
    this.selectedDayKey = null;

    if (typeof this.app.showDialogWithHTML !== 'function') {
      this.app.showDialogWithHTML = (title, html) => this.showHtmlDialog(title, html);
    }
    if (typeof this.app.closeDialog !== 'function') {
      this.app.closeDialog = () => this.closeDialog();
    }
  }

  render() {
    const container = document.getElementById('mealplanContent');
    if (!container) {
      console.error('[MealPlanUI] Container nicht gefunden!');
      return;
    }

    let html = '';

    // ── Header: Wochennavigation ─────────────────────────────────────────
    html += this.renderWeekNav();

    // ── Main Grid: 7 Tage × 2 Mahlzeiten ────────────────────────────────
    html += this.renderWeekGrid();

    // ── Tips & Ranking ───────────────────────────────────────────────────
    html += this.renderRanking();

    container.innerHTML = html;
  }

  renderWeekNav() {
    const monday = this.app.mealplan.getMonday();
    const mondayStr = this.formatDate(monday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sundayStr = this.formatDate(sunday);
    const weekDays = this.app.mealplan.getWeekDays();
    const selectedDay = this._getSelectedDay(weekDays);
    const dayLabel = selectedDay
      ? `${this._weekdayName(selectedDay)} · ${this.formatDate(selectedDay)}`
      : '';

    const isToday = (date) => {
      const today = new Date();
      return date.toDateString() === today.toDateString();
    };

    const todayStr = isToday(monday) ? ' (Diese Woche)' :
                     isToday(sunday) ? ' (Diese Woche)' : '';

    return `
      <div class="card" style="margin-bottom: 16px;">
        <div class="form__row" style="align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <button class="btn btn--small" onclick="app.mealplanUI.prevWeek()">← Letzte Woche</button>
          <span style="font-weight: bold;">📅 ${mondayStr} – ${sundayStr}${todayStr}</span>
          <button class="btn btn--small" onclick="app.mealplanUI.nextWeek()">Nächste Woche →</button>
        </div>
        <div class="form__row" style="align-items: center; justify-content: space-between;">
          <button class="btn btn--small" onclick="app.mealplanUI.toggleViewMode()">
            ${this.viewMode === 'day' ? '🗓 Wochenansicht anzeigen' : '📱 Tagesansicht anzeigen'}
          </button>
          ${this.viewMode === 'day' ? `
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn btn--small" onclick="app.mealplanUI.prevDay()">← Tag</button>
              <strong>${dayLabel}</strong>
              <button class="btn btn--small" onclick="app.mealplanUI.nextDay()">Tag →</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderWeekGrid() {
    const weekDays = this.app.mealplan.getWeekDays();
    const selectedDay = this._getSelectedDay(weekDays);
    const mealNames = { lunchbox: '🍱 Lunchbox', dinner: '🍽️ Dinner' };
    const meals = ['lunchbox', 'dinner'];

    if (this.viewMode === 'day' && selectedDay) {
      let dayHtml = '<div class="card mealplan-day-mode">';
      dayHtml += `<h3 class="card__title" style="margin-bottom:12px;">${this._weekdayName(selectedDay)} · ${this.formatDate(selectedDay)}</h3>`;
      meals.forEach(meal => {
        dayHtml += `
          <div style="margin-bottom:10px;">
            <div style="font-weight:bold; margin-bottom:6px;">${mealNames[meal]}</div>
            <div>${this.renderSlot(selectedDay, meal)}</div>
          </div>
        `;
      });
      dayHtml += '</div>';
      return dayHtml;
    }

    let html = '<div class="card mealplan-week-table-wrap">';
    html += '<table class="mealplan-week-table">';

    // Header Row: Tage
    html += '<tr>';
    html += '<th>Mahlzeit</th>';
    weekDays.forEach((day) => {
      const dayStr = this.formatDate(day);
      const isToday = new Date().toDateString() === day.toDateString();
      const todayClass = isToday ? ' class="mealplan-week-table__today"' : '';
      html += `<th${todayClass}>
        ${this._weekdayName(day)} <br/> ${dayStr}
      </th>`;
    });
    html += '</tr>';

    // Meal Rows
    meals.forEach(meal => {
      html += '<tr>';
      html += `<td class="mealplan-week-table__meal">
        ${mealNames[meal]}
      </td>`;

      weekDays.forEach(day => {
        html += `<td class="mealplan-week-table__slot">`;
        html += this.renderSlot(day, meal);
        html += '</td>';
      });

      html += '</tr>';
    });

    html += '</table>';
    html += '</div>';

    return html;
  }

  renderSlot(date, meal) {
    const slot = this.app.mealplan.getSlot(date, meal);
    const dateKey = this.app.mealplan.constructor.dateKey(date);

    if (!slot) {
      // Empty slot – show "+" button
      return `
        <div class="mealplan-empty-slot">
          <button class="btn btn--primary btn--block mealplan-add-btn" onclick="app.mealplanUI.openRecipeSelector('${dateKey}', '${meal}')">
            ➕ Rezept planen
          </button>
        </div>
      `;
    }

    const recipe = this.findRecipeById(slot.recipeId);
    if (!recipe) {
      return `
        <div style="color:red; font-size:0.8rem;">❌ Rezept nicht gefunden</div>
        <button class="btn btn--small" onclick="app.mealplanUI.clearSlot('${dateKey}', '${meal}')">🗑️</button>
      `;
    }

    const isCookedStyle = slot.cooked ? 'background: #e8f5e9; border: 2px solid green;' : '';
    const ratings = slot.ratings || [];
    const avgRating = ratings.length > 0
      ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1)
      : null;

    let html = `
      <div style="padding:8px; border-radius:4px; ${isCookedStyle}">
        <strong>${this.app.escapeHtml(recipe.name)}</strong><br/>
        <small>👥 ${slot.servings} Port.</small><br/>
    `;

    if (slot.cooked) {
      html += `<span style="font-size:0.8rem; color:green;">✅ Gekocht</span><br/>`;
    }

    if (avgRating !== null) {
      const stars = '⭐'.repeat(Math.round(avgRating));
      html += `<small>${stars} (${ratings.length})</small><br/>`;
    }

    // Buttons
    html += `<div style="display:flex; gap:4px; margin-top:6px; flex-wrap:wrap;">`;

    if (!slot.cooked) {
      html += `<button class="btn btn--tiny" onclick="app.mealplanUI.openCookDialog('${dateKey}', '${meal}')">🧽 Gekocht</button>`;
    }

    html += `<button class="btn btn--tiny" onclick="app.mealplanUI.addSlotIngredientsToShopping('${dateKey}', '${meal}')">🛒 Zutaten auf Einkaufszettel</button>`;
    html += `<button class="btn btn--tiny" onclick="app.mealplanUI.openMoveDialog('${dateKey}', '${meal}')">📅↔️</button>`;
    html += `<button class="btn btn--tiny" onclick="app.mealplanUI.clearSlot('${dateKey}', '${meal}')">🗑️</button>`;

    html += '</div>';
    html += '</div>';

    return html;
  }

  renderRanking() {
    const ranking = this.app.mealplan.getRanking();

    if (ranking.length === 0) {
      return '<div class="empty" style="margin-top:16px;"><div class="empty__icon">⭐</div>Keine Bewertungen bisher – Koche und bewerte Rezepte!</div>';
    }

    let html = `
      <div class="card" style="margin-top: 16px;">
        <h3 class="card__title">⭐ Top Rezepte (Ranking)</h3>
        <div style="max-height: 300px; overflow-y: auto;">
    `;

    ranking.slice(0, 10).forEach((entry, i) => {
      const recipe = this.findRecipeById(entry.recipeId);
      const stars = '⭐'.repeat(Math.round(entry.avg));
      const name = recipe ? this.app.escapeHtml(recipe.name) : `Rezept ${entry.recipeId}`;
      html += `
        <div style="padding:8px; border-bottom:1px solid var(--border);">
          ${i + 1}. ${name} – ${stars} (${entry.avg}/3, ${entry.count} Bewertung${entry.count !== 1 ? 'en' : ''})
        </div>
      `;
    });

    html += '</div></div>';
    return html;
  }

  // ── Dialog & Interaction ─────────────────────────────────────────────

  openRecipeSelector(dateKey, meal) {
    const entries = this.getRecipesSortedSafe();
    if (entries.length === 0) {
      this.app.showDialog('Keine Rezepte', 'Du hast noch keine Rezepte angelegt. Gehe zu 🍳 Rezepte und füge Rezepte hinzu!');
      return;
    }

    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekdayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

    let content = '<div style="display:flex; flex-direction:column; gap:10px;">';
    content += `<p style="font-size:0.9rem; color:var(--text-soft); margin:0;">Rezept für ${this.formatDate(date)} (${weekdayNames[date.getDay()]})</p>`;
    content += `<input id="recipeSelectorSearch" class="form__input" type="search" placeholder="Rezept suchen..." oninput="app.mealplanUI.filterRecipeSelector()" autocomplete="off" autocapitalize="off" spellcheck="false">`;
    content += `<div id="recipeSelectorEmpty" style="display:none; font-size:0.9rem; color:var(--text-soft); text-align:center; padding:12px 0;">Keine Treffer</div>`;
    content += `<div id="recipeSelectorList" style="display:flex; flex-direction:column; gap:8px; max-height:50vh; overflow-y:auto;">`;

    entries.forEach(({ recipe: r, availability: avail }) => {
      const availText = avail.missing.length === 0 ? '✅' : avail.available.length > 0 ? '⚠️' : '❌';
      content += `
        <button class="btn btn--block recipe-selector__item" data-recipe-name="${this.app.escapeHtml(r.name)}" onclick="app.mealplanUI.selectRecipe('${dateKey}', '${meal}', '${r.id}')">
          ${availText} ${this.app.escapeHtml(r.name)}
        </button>
      `;
    });

    content += '</div></div>';

    this.showHtmlDialog('Rezept wählen', content);
    clearTimeout(this.recipeSelectorTimer);
    this.recipeSelectorTimer = setTimeout(() => {
      document.getElementById('recipeSelectorSearch')?.focus();
      this.filterRecipeSelector();
    }, 0);
  }

  selectRecipe(dateKey, meal, recipeId) {
    const recipes = this.getRecipesSafe();
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const defaultServings = Math.max(1, parseInt(recipe.servings, 10) || 4);

    this.closeDialog();

    const askForServings = typeof this.app.showInputDialog === 'function'
      ? this.app.showInputDialog(
          '🍽️ Portionen',
          `Wie viele Portionen für "${recipe.name}"?`,
          String(defaultServings)
        )
      : prompt(`Wie viele Portionen? (Standard: ${defaultServings})`, String(defaultServings));

    const applySelection = (servingsStr) => {
      if (servingsStr === null || servingsStr === undefined) return;

      const servings = Math.max(1, parseInt(servingsStr, 10) || defaultServings);
      this.app.mealplan.setSlot(date, meal, recipeId, servings);
      this.app.updateUI();
      this.app.showDialog('✅ Rezept hinzugefügt', `"${recipe.name}" für ${servings} Portionen geplant!`);
    };

    if (askForServings && typeof askForServings.then === 'function') {
      askForServings.then(applySelection);
      return;
    }

    applySelection(askForServings);
  }

  openCookDialog(dateKey, meal) {
    const slot = this.parseSlot(dateKey, meal);
    if (!slot) return;

    const [date] = slot;
    const slotData = this.app.mealplan.getSlot(date, meal);
    if (!slotData) return;

    const recipe = this.findRecipeById(slotData.recipeId);
    if (!recipe) return;

    const avail = this.app.recipes.getIngredientAvailability(recipe);
    let content = `<div style="display:flex; flex-direction:column; gap:12px;">`;
    content += `<p><strong>Zutaten für "${this.app.escapeHtml(recipe.name)}":</strong></p>`;

    if (avail.missing.length > 0) {
      content += `<div style="color:red;"><strong>❌ Nicht vorhanden:</strong><br/>`;
      content += avail.missing.map(i => `• ${this.app.escapeHtml(i)}`).join('<br/>');
      content += '</div>';
    }

    if (avail.available.length > 0) {
      content += `<div style="color:green;"><strong>✅ Vorhanden:</strong><br/>`;
      content += avail.available.map(i => `• ${this.app.escapeHtml(i)}`).join('<br/>');
      content += '</div>';
    }

    content += `<p><small>Trotzdem kochen?</small></p>`;
    content += `<button class="btn btn--primary btn--block" onclick="app.mealplanUI.confirmCook('${dateKey}', '${meal}')">✅ Ja, Rezept zubereiten</button>`;
    content += '</div>';

    this.showHtmlDialog('Rezept kochen?', content);
  }

  confirmCook(dateKey, meal) {
    const slot = this.parseSlot(dateKey, meal);
    if (!slot) return;

    const [date] = slot;
    const success = this.app.mealplan.cookSlot(date, meal, this.getRecipesSafe());

    if (success) {
      this.app.updateUI();
      this.app.showDialog('✅ Gekocht!', 'Rezept als gekocht markiert. Zutaten wurden vom Vorrat abgezogen.');
      this.promptRating(dateKey, meal);
    } else {
      this.app.showDialog('❌ Fehler', 'Rezept konnte nicht als gekocht markiert werden.');
    }
  }

  addSlotIngredientsToShopping(dateKey, meal) {
    const slot = this.parseSlot(dateKey, meal);
    if (!slot) return;
    const [date] = slot;
    const slotData = this.app.mealplan.getSlot(date, meal);
    if (!slotData?.recipeId) {
      this.app.toast('❌ Kein geplantes Rezept gefunden');
      return;
    }

    const added = this.app.recipes.addIngredientsToShoppingList(slotData.recipeId);
    if (added > 0) {
      this.app.updateUI();
      this.app.toast(`🛒 ${added} Zutat(en) auf Einkaufsliste`);
    } else {
      this.app.toast('✅ Zutaten sind bereits auf dem Einkaufszettel');
    }
  }

  promptRating(dateKey, meal) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const slotData = this.app.mealplan.getSlot(date, meal);
    if (!slotData) return;

    const recipe = this.findRecipeById(slotData.recipeId);
    if (!recipe) return;

    let content = `<div style="display:flex; flex-direction:column; gap:8px; text-align:center;">`;
    content += `<p>Wie hat dir "${this.app.escapeHtml(recipe.name)}" geschmeckt?</p>`;
    content += `<button class="btn btn--block" onclick="app.mealplanUI.rateRecipe('${dateKey}', '${meal}', 1)" style="background:#ffcdd2;">🤢 Nicht so gut</button>`;
    content += `<button class="btn btn--block" onclick="app.mealplanUI.rateRecipe('${dateKey}', '${meal}', 2)" style="background:#fff9c4;">😐 Ok</button>`;
    content += `<button class="btn btn--block" onclick="app.mealplanUI.rateRecipe('${dateKey}', '${meal}', 3)" style="background:#c8e6c9;">😋 Lecker!</button>`;
    content += '</div>';

    this.showHtmlDialog('Bewertung', content);
  }

  rateRecipe(dateKey, meal, stars) {
    const slot = this.parseSlot(dateKey, meal);
    if (!slot) return;

    const [date] = slot;
    this.app.mealplan.rateSlot(date, meal, stars);
    this.app.updateUI();
    this.app.closeDialog();
  }

  openMoveDialog(dateKey, meal) {
    let content = `<div style="display:flex; flex-direction:column; gap:8px;">`;
    content += `<p style="font-size:0.9rem; color:var(--text-soft);">Neues Datum eingeben (YYYY-MM-DD):</p>`;
    content += `<input type="text" id="newDateInput" class="form__input" placeholder="z.B. 2026-06-24" value="${dateKey}">`;
    content += `<button class="btn btn--primary btn--block" onclick="app.mealplanUI.confirmMove('${dateKey}', '${meal}')">📅 Verschieben</button>`;
    content += '</div>';

    this.showHtmlDialog('Rezept verschieben', content);
    setTimeout(() => document.getElementById('newDateInput')?.focus(), 100);
  }

  confirmMove(dateKey, meal) {
    const newDateStr = document.getElementById('newDateInput')?.value?.trim();
    if (!newDateStr) {
      this.app.showDialog('❌ Fehler', 'Bitte geben Sie ein Datum ein.');
      return;
    }

    const [year, month, day] = dateKey.split('-').map(Number);
    const [newYear, newMonth, newDay] = newDateStr.split('-').map(Number);

    if (!this.isValidDate(newYear, newMonth, newDay)) {
      this.app.showDialog('❌ Ungültiges Datum', `Bitte verwenden Sie das Format YYYY-MM-DD (z.B. 2026-06-24)`);
      return;
    }

    const fromDate = new Date(year, month - 1, day);
    const toDate = new Date(newYear, newMonth - 1, newDay);

    const toSlot = this.app.mealplan.getSlot(toDate, meal);
    if (toSlot) {
      const confirmed = confirm(`Dort ist bereits ein Rezept geplant. Überschreiben?`);
      if (!confirmed) return;

      this.app.mealplan.moveSlot(fromDate, meal, toDate, meal, { overwrite: true, source: 'date-button' });
    } else {
      this.app.mealplan.moveSlot(fromDate, meal, toDate, meal, { source: 'date-button' });
    }

    this.app.updateUI();
    this.app.showDialog('✅ Verschoben', `Rezept auf ${newDateStr} verschoben!`);
  }

  clearSlot(dateKey, meal) {
    if (!confirm('Rezept wirklich löschen?')) return;

    const slot = this.parseSlot(dateKey, meal);
    if (!slot) return;

    const [date] = slot;
    this.app.mealplan.removeSlot(date, meal);
    this.app.updateUI();
  }

  // ── Navigation ───────────────────────────────────────────────────────

  nextWeek() {
    this.app.mealplan.setWeekOffset(this.app.mealplan.getWeekOffset() + 1);
    this.selectedDayKey = null;
    this.app.updateUI();
  }

  prevWeek() {
    this.app.mealplan.setWeekOffset(this.app.mealplan.getWeekOffset() - 1);
    this.selectedDayKey = null;
    this.app.updateUI();
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'day' ? 'week' : 'day';
    this._saveViewMode(this.viewMode);
    this.app.updateUI();
  }

  prevDay() {
    this._shiftSelectedDay(-1);
    this.app.updateUI();
  }

  nextDay() {
    this._shiftSelectedDay(1);
    this.app.updateUI();
  }

  // ── Helper ───────────────────────────────────────────────────────────

  getRecipesSafe() {
    if (typeof this.app?.recipes?.getRecipes === 'function') {
      const recipes = this.app.recipes.getRecipes();
      return Array.isArray(recipes) ? recipes : [];
    }

    // Fallback für ältere Struktur mit direktem `recipes`-Array.
    return Array.isArray(this.app?.recipes?.recipes) ? this.app.recipes.recipes : [];
  }

  getRecipesSortedSafe() {
    const recipes = this.getRecipesSafe();
    return recipes
      .map(recipe => ({
        recipe,
        availability: this._getIngredientAvailabilitySafe(recipe)
      }))
      .sort((a, b) => {
        const availabilityDelta = this._availabilityRank(a.availability) - this._availabilityRank(b.availability);
        if (availabilityDelta !== 0) return availabilityDelta;
        return String(a.recipe?.name || '').localeCompare(String(b.recipe?.name || ''), 'de', { sensitivity: 'base' });
      });
  }

  filterRecipeSelector() {
    const search = document.getElementById('recipeSelectorSearch')?.value?.trim().toLowerCase() || '';
    const items = Array.from(document.querySelectorAll('#recipeSelectorList .recipe-selector__item'));
    const empty = document.getElementById('recipeSelectorEmpty');

    let visibleCount = 0;
    items.forEach(item => {
      const name = String(item.dataset.recipeName || '').toLowerCase();
      const visible = !search || name.includes(search);
      item.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    if (empty) {
      empty.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  findRecipeById(recipeId) {
    return this.getRecipesSafe().find(r => r.id === recipeId);
  }

  _getIngredientAvailabilitySafe(recipe) {
    if (typeof this.app?.recipes?.getIngredientAvailability === 'function') {
      const result = this.app.recipes.getIngredientAvailability(recipe);
      return result && typeof result === 'object'
        ? result
        : { available: [], missing: [], ratio: 0, total: 0 };
    }
    return { available: [], missing: [], ratio: 0, total: 0 };
  }

  _availabilityRank(availability) {
    const missing = Array.isArray(availability?.missing) ? availability.missing.length : 0;
    const available = Array.isArray(availability?.available) ? availability.available.length : 0;
    if (missing === 0) return 0;
    if (available > 0) return 1;
    return 2;
  }

  _loadViewMode() {
    try {
      const stored = localStorage.getItem('mealplan-view-mode');
      if (stored === 'day' || stored === 'week') return stored;
    } catch {}
    return (typeof window !== 'undefined' && Number(window.innerWidth || 0) <= 900) ? 'day' : 'week';
  }

  _saveViewMode(mode) {
    try {
      localStorage.setItem('mealplan-view-mode', mode);
    } catch {}
  }

  _weekdayName(date) {
    const names = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    return names[date.getDay()];
  }

  _getSelectedDay(weekDays) {
    const week = Array.isArray(weekDays) ? weekDays : this.app.mealplan.getWeekDays();
    if (week.length === 0) return null;
    const keys = week.map(d => this.app.mealplan.constructor.dateKey(d));

    if (this.selectedDayKey && keys.includes(this.selectedDayKey)) {
      return week[keys.indexOf(this.selectedDayKey)];
    }

    const todayKey = this.app.mealplan.constructor.dateKey(new Date());
    const fallbackIdx = keys.includes(todayKey) ? keys.indexOf(todayKey) : 0;
    this.selectedDayKey = keys[fallbackIdx];
    return week[fallbackIdx];
  }

  _shiftSelectedDay(delta) {
    const weekDays = this.app.mealplan.getWeekDays();
    const selected = this._getSelectedDay(weekDays);
    if (!selected) return;
    const currentKey = this.app.mealplan.constructor.dateKey(selected);
    const currentIdx = weekDays.findIndex(d => this.app.mealplan.constructor.dateKey(d) === currentKey);
    if (currentIdx < 0) return;
    const nextIdx = Math.min(weekDays.length - 1, Math.max(0, currentIdx + delta));
    this.selectedDayKey = this.app.mealplan.constructor.dateKey(weekDays[nextIdx]);
  }

  parseSlot(dateKey, meal) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return [new Date(year, month - 1, day), meal];
  }

  _getDialogElements() {
    const overlay = document.getElementById('dialogOverlay');
    const titleEl = document.getElementById('dialogTitle');
    const msgEl = document.getElementById('dialogMessage');
    const input = document.getElementById('dialogInput');
    const btnCancel = document.getElementById('dialogBtnCancel');
    const btnOk = document.getElementById('dialogBtnOk');

    if (!overlay || !titleEl || !msgEl || !input || !btnCancel || !btnOk) return null;
    return { overlay, titleEl, msgEl, input, btnCancel, btnOk };
  }

  showHtmlDialog(title, html) {
    const elements = this._getDialogElements();
    if (!elements) return Promise.resolve(false);

    const { overlay, titleEl, msgEl, input, btnCancel, btnOk } = elements;
    this.closeDialog();

    titleEl.textContent = title;
    msgEl.innerHTML = html;
    input.style.display = 'none';
    btnCancel.style.display = 'block';
    btnCancel.textContent = 'Abbrechen';
    btnOk.textContent = 'OK';
    overlay.classList.add('dialog-overlay--active');

    return new Promise((resolve) => {
      const cleanup = () => {
        if (this._dialogState?.resolve === resolve) {
          this._dialogState = null;
        }
        btnOk.onclick = null;
        btnCancel.onclick = null;
        document.removeEventListener?.('keydown', handleEscape);
        overlay.removeEventListener?.('click', handleOverlayClick);
      };

      const handleOk = () => {
        cleanup();
        overlay.classList.remove('dialog-overlay--active');
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        overlay.classList.remove('dialog-overlay--active');
        resolve(false);
      };

      const handleEscape = (e) => {
        if (e.key === 'Escape') handleCancel();
      };

      const handleOverlayClick = (e) => {
        if (e.target === overlay) handleCancel();
      };

      this._dialogState = { overlay, resolve, cleanup };
      btnOk.onclick = handleOk;
      btnCancel.onclick = handleCancel;
      document.addEventListener?.('keydown', handleEscape);
      overlay.addEventListener?.('click', handleOverlayClick);
    });
  }

  closeDialog() {
    const state = this._dialogState;
    if (!state) return;

    state.cleanup?.();
    state.overlay.classList.remove('dialog-overlay--active');
    state.resolve?.(false);
    this._dialogState = null;
  }

  formatDate(date) {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}.${m}.`;
  }

  isValidDate(year, month, day) {
    const d = new Date(year, month - 1, day);
    return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
  }
}

export default MealPlanUI;
