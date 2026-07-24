// modules/domains/mealplan/manager.js
/**
 * MealPlanManager – verwaltet den Wochenspeisenplan.
 *
 * Datenstruktur in storage.data.mealPlan:
 * {
 *   weekOffset: 0,          // 0 = aktuelle Woche, -1 = letzte, +1 = nächste ...
 *   slots: {
 *     "2024-06-10:lunch":   { recipeId: "...", servings: 4, cooked: false },
 *     "2024-06-10:dinner":  { ... },
 *     ...
 *   }
 * }
 *
 * Jeder Slot-Key = "<YYYY-MM-DD>:<meal>" wobei meal ∈ {lunchbox, dinner}
 * lunchbox = Mitnahme-Essen (Arbeit/Schule), dinner = Abendessen – beide optional
 *
 * Bewertung in slot.ratings: Array von { userId, stars, ratedAt }
 * stars ∈ {1, 2, 3}  → 1=🤢  2=😐  3=😋
 */
import { CONFIG } from '../../core/config.js';

export class MealPlanManager {
  constructor(storage, sync, inventory, shopping, users, tracker = null) {
    this.storage = storage;
    this.sync = sync;
    this.inventory = inventory;
    this.shopping = shopping;
    this.users = users; // optional – kann null sein (z.B. in Tests ohne Punkte)
    this.tracker = tracker;
  }

  // ── Initialisierung ──────────────────────────────────────────────────

  _ensurePlan() {
    if (!this.storage.data.mealPlan) {
      this.storage.data.mealPlan = { weekOffset: 0, slots: {} };
    }
    if (!this.storage.data.mealPlan.slots) {
      this.storage.data.mealPlan.slots = {};
    }
    return this.storage.data.mealPlan;
  }

  // ── Woche navigieren ────────────────────────────────────────────────

  getWeekOffset() {
    return this._ensurePlan().weekOffset ?? 0;
  }

  setWeekOffset(offset) {
    this._ensurePlan().weekOffset = offset;
    this._persist();
  }

  /** Gibt Montag der angezeigten Woche als Date zurück */
  getMonday() {
    const today = new Date();
    const offset = this.getWeekOffset();
    const day = today.getDay(); // 0=So, 1=Mo ...
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /** Gibt Array von 7 Date-Objekten (Mo–So) zurück */
  getWeekDays() {
    const monday = this.getMonday();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }

  static dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  static slotKey(date, meal) {
    return `${MealPlanManager.dateKey(date)}:${meal}`;
  }

  // ── Slots lesen / schreiben ─────────────────────────────────────────

  getSlot(date, meal) {
    const key = MealPlanManager.slotKey(date, meal);
    return this._ensurePlan().slots[key] ?? null;
  }

  /** Setzt ein Rezept auf einen Slot (recipeId = null → löscht den Slot) */
  setSlot(date, meal, recipeId, servings = null) {
    const plan = this._ensurePlan();
    const key = MealPlanManager.slotKey(date, meal);
    if (!recipeId) {
      delete plan.slots[key];
    } else {
      const existing = plan.slots[key] || {};
      plan.slots[key] = {
        recipeId,
        servings: servings ?? existing.servings ?? 4,
        cooked: existing.cooked ?? false,
        assignedAt: Date.now()
      };
    }
    this._persist();
    return true;
  }

  removeSlot(date, meal) {
    return this.setSlot(date, meal, null);
  }

  /**
   * Verschiebt einen bestehenden Slot auf ein anderes Datum/Mahlzeit.
   * overwrite=false verhindert versehentliches Überschreiben belegter Ziele.
   */
  moveSlot(fromDate, fromMeal, toDate, toMeal, options = {}) {
    const plan = this._ensurePlan();
    const fromKey = MealPlanManager.slotKey(fromDate, fromMeal);
    const toKey = MealPlanManager.slotKey(toDate, toMeal);
    if (fromKey === toKey) return false;

    const sourceSlot = plan.slots[fromKey];
    if (!sourceSlot) return false;

    const overwrite = !!options.overwrite;
    const target = plan.slots[toKey];
    if (target && !overwrite) return false;

    plan.slots[toKey] = {
      ...sourceSlot,
      assignedAt: Date.now()
    };
    delete plan.slots[fromKey];

    const source = String(options.source || 'generic');
    const eventName = source === 'date-button' ? 'slot_moved_by_date' : 'slot_moved';
    this.tracker?.trackFeatureUsage?.('mealplan', eventName, this.storage.activeUserId ?? 'unknown', {
      fromKey,
      toKey,
      fromMeal,
      toMeal,
      overwrite: !!options.overwrite,
      source
    });

    this._persist();
    return true;
  }

  /** Markiert einen Slot als gekocht und zieht Zutaten vom Vorrat ab */
  cookSlot(date, meal, recipes) {
    const plan = this._ensurePlan();
    const key = MealPlanManager.slotKey(date, meal);
    const slot = plan.slots[key];
    if (!slot || slot.cooked) return false;

    const recipe = recipes.find(r => r.id === slot.recipeId);
    if (!recipe) return false;

    // Zutaten aus dem Vorrat abziehen (best-effort: findet ersten Treffer je Zutat)
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      const locations = Object.values(this.storage.data.locations || {});
      recipe.ingredients.forEach(ing => {
        const ingLower = ing.toLowerCase();
        let consumed = false;
        for (const loc of locations) {
          if (consumed) break;
          const item = (loc.items || []).find(i =>
            i.name.toLowerCase().includes(ingLower) ||
            ingLower.includes(i.name.toLowerCase())
          );
          if (item) {
            this.inventory.consumeItem(loc.id, item.id);
            consumed = true;
          }
        }
      });
    }

    slot.cooked = true;
    slot.cookedAt = Date.now();
    if (!slot.ratings) slot.ratings = [];

    // Punkte für den aktiven User
    if (this.users) {
      const activeUser = this.users.getActive();
      if (activeUser) {
        this.users.addPoints(
          activeUser.id,
          CONFIG.POINTS_MEAL_COOKED,
          `${recipe.name} zubereitet 🍽️`
        );
      }
    }

    this._persist();
    return true;
  }

  /**
   * Bewertet einen (gekochten) Slot mit 1–3 Sternen.
   * stars: 1 = 🤢 Nicht so gut · 2 = 😐 Ok · 3 = 😋 Lecker!
   * Pro User wird die letzte Bewertung überschrieben.
   * Gibt false zurück wenn der Slot nicht existiert oder noch nicht gekocht wurde.
   */
  rateSlot(date, meal, stars) {
    if (![1, 2, 3].includes(stars)) return false;
    const plan = this._ensurePlan();
    const key = MealPlanManager.slotKey(date, meal);
    const slot = plan.slots[key];
    if (!slot || !slot.cooked) return false;

    if (!slot.ratings) slot.ratings = [];

    const userId = this.storage.activeUserId ?? 'unknown';
    // Bestehende Bewertung dieses Users überschreiben
    const existingIdx = slot.ratings.findIndex(r => r.userId === userId);
    const entry = { userId, stars, ratedAt: Date.now() };
    if (existingIdx >= 0) {
      slot.ratings[existingIdx] = entry;
    } else {
      slot.ratings.push(entry);
    }

    this._persist();
    return true;
  }

  /**
   * Gibt ein Ranking aller Rezepte zurück, sortiert nach Durchschnittssterne (desc).
   * [ { recipeId, recipeName, avg, count, ratings: [...] }, ... ]
   */
  getRanking() {
    const plan = this._ensurePlan();
    const byRecipe = {};

    Object.values(plan.slots).forEach(slot => {
      if (!slot.recipeId || !Array.isArray(slot.ratings) || slot.ratings.length === 0) return;
      if (!byRecipe[slot.recipeId]) byRecipe[slot.recipeId] = [];
      byRecipe[slot.recipeId].push(...slot.ratings);
    });

    return Object.entries(byRecipe)
      .map(([recipeId, ratings]) => {
        const avg = ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
        return { recipeId, avg: Math.round(avg * 10) / 10, count: ratings.length, ratings };
      })
      .sort((a, b) => b.avg - a.avg || b.count - a.count);
  }

  /** Fehlende Zutaten eines Slots auf die Einkaufsliste */
  addMissingToShopping(date, meal, recipes) {
    const slot = this.getSlot(date, meal);
    if (!slot) return 0;
    const recipe = recipes.find(r => r.id === slot.recipeId);
    if (!recipe) return 0;

    const locations = Object.values(this.storage.data.locations || {});
    const allItemNames = locations.flatMap(l => (l.items || []).map(i => i.name.toLowerCase()));

    let count = 0;
    recipe.ingredients.forEach(ing => {
      const ingLower = ing.toLowerCase();
      const inStock = allItemNames.some(n => n.includes(ingLower) || ingLower.includes(n));
      if (!inStock) {
        const alreadyOnList = this.shopping.getItems().find(i =>
          i.name.toLowerCase() === ingLower && i.status === 'offen' && !i._deleted
        );
        if (!alreadyOnList) {
          this.shopping.add(ing, `für ${recipe.name}`);
          count++;
        }
      }
    });
    return count;
  }

  getPlannedRecipeIdsForWeek(weekDays = null) {
    const days = Array.isArray(weekDays) && weekDays.length > 0
      ? weekDays
      : this.getWeekDays();
    const meals = ['lunchbox', 'dinner'];
    const ids = new Set();

    days.forEach(day => {
      meals.forEach(meal => {
        const slot = this.getSlot(day, meal);
        if (slot?.recipeId) ids.add(slot.recipeId);
      });
    });

    return Array.from(ids);
  }

  // ── Hilfsmethoden ───────────────────────────────────────────────────

  _persist() {
    this._ensurePlan().updatedAt = Date.now();
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
  }
}
