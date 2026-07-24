// modules/domains/shopping/manager.js
import { CONFIG } from '../../core/config.js';

/** Kollisionsresistente ID: Zeitbasis (base36) + zufälliges Suffix */
function genId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const SHOPPING_CATEGORIES = [
  { id: 'produce', label: '🥕 Frisches Obst & Gemüse' },
  { id: 'chilled', label: '🧊 Gekühlte Lebensmittel' },
  { id: 'canned', label: '🥫 Konserven' },
  { id: 'ready', label: '🍱 Fertig-Lebensmittel' },
  { id: 'hygiene', label: '🧼 Hygieneartikel' }
];

const SHOPPING_CATEGORY_IDS = new Set(SHOPPING_CATEGORIES.map(c => c.id));

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeForMatch(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSlug(value) {
  return normalizeForMatch(value).replace(/\s+/g, '-').slice(0, 40) || 'kategorie';
}

export class ShoppingManager {
  constructor(storage, sync, users) {
    this.storage = storage;
    this.sync = sync;
    this.users = users;
    this._processing = new Set();
    this._standardCategoryByName = new Map(
      (CONFIG.STANDARD_GROCERIES || []).map(entry => [normalizeText(entry.name), normalizeText(entry.category)])
    );
    this._categoryById = new Map();
    this._categoryOrder = [];
    this._loadCategoryState();
    this._ensureShoppingCategories();
  }

  getItems() { 
    return (this.storage.data.shoppingList || []).filter(i => !i._deleted); 
  }

  getCategoryDefinitions() {
    return this._categoryOrder
      .map(id => this._categoryById.get(id))
      .filter(Boolean)
      .map(c => ({ id: c.id, label: c.label }));
  }

  addCategory(label) {
    const cleaned = String(label || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return null;
    const existing = this.getCategoryDefinitions().find(c => normalizeText(c.label) === normalizeText(cleaned));
    if (existing) return existing;

    const now = Date.now();
    const category = {
      id: `cat-${toSlug(cleaned)}-${now.toString(36).slice(-4)}`,
      label: cleaned,
      _deleted: false,
      createdAt: now,
      updatedAt: now
    };
    if (!Array.isArray(this.storage.data.shoppingCategories)) {
      this.storage.data.shoppingCategories = [];
    }
    this.storage.data.shoppingCategories.push(category);
    this._loadCategoryState();
    this._touchAndPersist();
    return { id: category.id, label: category.label };
  }

  normalizeCategoryId(categoryId, name = '') {
    const normalized = normalizeText(categoryId);
    if (this._categoryById.has(normalized)) return normalized;
    if (SHOPPING_CATEGORY_IDS.has(normalized)) return normalized;
    if (normalized === 'kühlschrank' || normalized === 'kuehlschrank') return 'chilled';
    if (normalized === 'lager' || normalized === 'vorrat') return 'canned';
    if (normalized === 'hygiene') return 'hygiene';
    if (normalized === 'frisch' || normalized === 'obst' || normalized === 'gemuese' || normalized === 'gemüse') return 'produce';
    return this.inferCategory(name);
  }

  inferCategory(name) {
    const lower = normalizeText(name);
    if (!lower) return 'ready';

    const fromStandard = this._standardCategoryByName.get(lower);
    if (fromStandard === 'kühlschrank' || fromStandard === 'kuehlschrank') return 'chilled';
    if (fromStandard === 'lager') return 'canned';

    const has = (keywords) => keywords.some(k => lower.includes(k));

    if (has(['shampoo', 'seife', 'zahnpasta', 'toilettenpapier', 'kuechenrolle', 'küchenrolle', 'spuelmittel', 'spülmittel', 'deo', 'windeln'])) return 'hygiene';
    if (has(['apfel', 'birne', 'banane', 'obst', 'gemuese', 'gemüse', 'karotte', 'möhre', 'moehre', 'zucchini', 'aubergine', 'radieschen', 'salat', 'gurke', 'tomate', 'paprika', 'limette', 'zitrone', 'zwiebel', 'knoblauch', 'spinat', 'kohl', 'petersilie', 'dill', 'schnittlauch', 'kartoffel'])) return 'produce';
    if (has(['milch', 'joghurt', 'quark', 'käse', 'kaese', 'schmand', 'sahne', 'butter', 'mayo', 'mayonaise', 'frischkäse', 'frischkaese', 'hähnchen', 'huhn', 'fleisch', 'wurst', 'filet'])) return 'chilled';
    if (has(['konserve', 'dose', 'bohnen', 'mais', 'kichererbse', 'thunfisch', 'tomatenmark'])) return 'canned';
    if (has(['tk ', 'tiefkühl', 'tiefkuehl', 'fertig', 'pizza', 'nuggets', 'pommes', 'teriyaki', 'sriracha', 'siracha', 'sauce', 'sojasauce'])) return 'ready';
    return 'ready';
  }

  add(name, note = '', categoryOrOptions = '') {
    if (!name || !name.trim()) return false;
    const options = (categoryOrOptions && typeof categoryOrOptions === 'object')
      ? categoryOrOptions
      : { categoryId: categoryOrOptions };
    const recipeSources = Array.isArray(options.recipeSources) ? options.recipeSources : [];
    
    const newItem = {
      id: genId('shop'),
      name: name.trim(),
      note: note.trim(),
      categoryId: this.normalizeCategoryId(options.categoryId, name),
      status: 'offen',
      amountValue: (options.amountValue !== null && options.amountValue !== undefined && Number.isFinite(Number(options.amountValue)))
        ? Number(options.amountValue)
        : null,
      amountUnit: options.amountUnit ? String(options.amountUnit).trim() : null,
      recipeSources: recipeSources,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      _deleted: false
    };
    
    if (!Array.isArray(this.storage.data.shoppingList)) {
      this.storage.data.shoppingList = [];
    }
    
    this.storage.data.shoppingList.push(newItem);
    this._touchAndPersist();
    return true;
  }

  updateItem(id, updates = {}) {
    if (!Array.isArray(this.storage.data.shoppingList)) return false;

    const item = this.storage.data.shoppingList.find(i => i.id === id && !i._deleted);
    if (!item) return false;

    const hasName = Object.prototype.hasOwnProperty.call(updates, 'name');
    const hasNote = Object.prototype.hasOwnProperty.call(updates, 'note');
    const hasCategory = Object.prototype.hasOwnProperty.call(updates, 'categoryId');
    if (!hasName && !hasNote && !hasCategory) return false;

    if (hasName) {
      const nextName = String(updates.name || '').trim();
      if (!nextName) return false;
      item.name = nextName;
    }

    if (hasNote) {
      item.note = String(updates.note || '').trim();
    }

    if (hasCategory) {
      item.categoryId = this.normalizeCategoryId(updates.categoryId, item.name);
    } else if (!item.categoryId) {
      item.categoryId = this.inferCategory(item.name);
    }

    item.updatedAt = Date.now();
    this._touchAndPersist();
    return true;
  }

  markBought(id) {
    const item = this.storage.data.shoppingList.find(i => i.id === id && !i._deleted);
    if (!item || item.status !== 'offen') return false;
    
    item.status = 'gekauft';
    item.boughtAt = Date.now();
    item.updatedAt = Date.now();
    
    const user = this.users.getActive();
    if (user) {
      this.users.addPoints(user.id, CONFIG.POINTS_ITEM_BOUGHT, `🛒 ${item.name}`);
    }
    
    this._touchAndPersist();
    return true;
  }

  markStored(id, locationId) {
    if (this._processing.has(id)) return false;
    this._processing.add(id);
    try {
      if (!Array.isArray(this.storage.data.shoppingList)) this.storage.data.shoppingList = [];
      const index = this.storage.data.shoppingList.findIndex(i => i.id === id && !i._deleted);
      if (index === -1) return false;
      const item = this.storage.data.shoppingList[index];
      if (item.status !== 'gekauft') return false;
      const loc = this.storage.data.locations[locationId];
      if (!loc) return false;
      if (!Array.isArray(loc.items)) loc.items = [];
      loc.items.push({
        id: genId('item'),
        name: item.name,
        amount: item.note || '',
        addedAt: Date.now(),
        storedAt: Date.now()
      });
      item._deleted = true;
      item.updatedAt = Date.now();
      this.storage.data.version = (this.storage.data.version || 0) + 1;
      const user = this.users.getActive();
      if (user) {
        const locName = loc.name.replace(/^[^\s]+\s/, '');
        this.users.addPoints(user.id, CONFIG.POINTS_ITEM_STORED, `📦 ${item.name} → ${locName}`);
      }
      this.storage.saveLocal();
      this.sync.markDirty();
      return true;
    } finally {
      this._processing.delete(id);
    }
  }

  undo(id) {
    const item = this.storage.data.shoppingList.find(i => i.id === id && !i._deleted);
    if (!item || item.status !== 'gekauft') return false;
    
    item.status = 'offen';
    delete item.boughtAt;
    item.updatedAt = Date.now();
    
    this._touchAndPersist();
    return true;
  }

  remove(id) {
    if (!Array.isArray(this.storage.data.shoppingList)) return false;
    
    const item = this.storage.data.shoppingList.find(i => i.id === id);
    if (!item) return false;
    
    item._deleted = true;
    item.updatedAt = Date.now();
    
    this._touchAndPersist();
    return true;
  }
  
  cleanupDeleted() {
    if (!Array.isArray(this.storage.data.shoppingList)) return;
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.storage.data.shoppingList = this.storage.data.shoppingList.filter(item => {
      if (!item._deleted) return true;
      return (item.updatedAt || 0) > oneWeekAgo;
    });
    
    this.storage.saveLocal();
    this.sync.markDirty();
  }

  addOrMergeRecipeIngredient(rawIngredient, recipe) {
    const parsed = this.parseIngredient(rawIngredient);
    if (!parsed.name) return false;

    const list = Array.isArray(this.storage.data.shoppingList) ? this.storage.data.shoppingList : (this.storage.data.shoppingList = []);
    const now = Date.now();
    const source = {
      recipeId: recipe?.id || null,
      recipeName: String(recipe?.name || '').trim(),
      ingredientRaw: String(rawIngredient || '').trim(),
      amountValue: parsed.amountValue,
      amountUnit: parsed.amountUnit,
      addedAt: now
    };

    const openItems = list.filter(i => i && !i._deleted && i.status === 'offen');
    const byName = (item) => normalizeForMatch(item.name) === parsed.matchName;
    const sameUnit = (item) => parsed.amountValue !== null && parsed.amountUnit && item.amountUnit === parsed.amountUnit;
    let target = null;

    if (parsed.amountValue !== null && parsed.amountUnit) {
      target = openItems.find(item => byName(item) && sameUnit(item));
    } else {
      target = openItems.find(item => byName(item));
    }

    if (!target) {
      this.add(parsed.name, '', {
        categoryId: this.inferCategory(parsed.name),
        amountValue: parsed.amountValue,
        amountUnit: parsed.amountUnit,
        recipeSources: [source]
      });
      return true;
    }

    if (parsed.amountValue !== null && parsed.amountUnit && Number.isFinite(Number(target.amountValue)) && target.amountUnit === parsed.amountUnit) {
      target.amountValue = Number(target.amountValue) + parsed.amountValue;
    } else if (parsed.amountValue !== null && parsed.amountUnit && (target.amountValue === null || target.amountUnit === parsed.amountUnit)) {
      target.amountValue = Number.isFinite(Number(target.amountValue)) ? Number(target.amountValue) : 0;
      target.amountValue += parsed.amountValue;
      target.amountUnit = parsed.amountUnit;
    }

    const sources = Array.isArray(target.recipeSources) ? target.recipeSources : [];
    const duplicate = sources.some(s =>
      String(s.recipeId || '') === String(source.recipeId || '') &&
      String(s.ingredientRaw || '').toLowerCase() === String(source.ingredientRaw || '').toLowerCase()
    );
    if (!duplicate) {
      sources.push(source);
      target.recipeSources = sources;
    }
    target.categoryId = this.normalizeCategoryId(target.categoryId, target.name);
    target.updatedAt = now;
    this._touchAndPersist();
    return true;
  }

  parseIngredient(rawIngredient) {
    const raw = String(rawIngredient || '').replace(/\s+/g, ' ').trim();
    if (!raw) return { name: '', amountValue: null, amountUnit: null, matchName: '' };

    const m = raw.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|el|tl|stk|st|stück|stueck)\s*(.+)$/i);
    if (!m) {
      return {
        name: raw,
        amountValue: null,
        amountUnit: null,
        matchName: normalizeForMatch(raw)
      };
    }

    const numberRaw = Number(String(m[1]).replace(',', '.'));
    const unitRaw = normalizeText(m[2]);
    const name = String(m[3] || '').trim();
    if (!name || !Number.isFinite(numberRaw)) {
      return {
        name: raw,
        amountValue: null,
        amountUnit: null,
        matchName: normalizeForMatch(raw)
      };
    }

    let amountValue = numberRaw;
    let amountUnit = unitRaw;
    if (unitRaw === 'kg') {
      amountValue = numberRaw * 1000;
      amountUnit = 'g';
    } else if (unitRaw === 'l') {
      amountValue = numberRaw * 1000;
      amountUnit = 'ml';
    } else if (unitRaw === 'st' || unitRaw === 'stück' || unitRaw === 'stueck') {
      amountUnit = 'stk';
    }

    return {
      name,
      amountValue,
      amountUnit,
      matchName: normalizeForMatch(name)
    };
  }

  _ensureShoppingCategories() {
    if (!Array.isArray(this.storage?.data?.shoppingList)) return;

    let changed = false;
    this.storage.data.shoppingList = this.storage.data.shoppingList.map(item => {
      if (!item || typeof item !== 'object') return item;
      const nextCategoryId = this.normalizeCategoryId(item.categoryId, item.name);
      const sources = Array.isArray(item.recipeSources) ? item.recipeSources : [];
      const hasAmount = item.amountValue !== undefined || item.amountUnit !== undefined;
      const hasCategory = item.categoryId === nextCategoryId;
      if (hasCategory && hasAmount && Array.isArray(item.recipeSources)) return item;
      changed = true;
      return {
        ...item,
        categoryId: nextCategoryId,
        amountValue: (item.amountValue !== null && item.amountValue !== undefined && Number.isFinite(Number(item.amountValue)))
          ? Number(item.amountValue)
          : null,
        amountUnit: item.amountUnit ? String(item.amountUnit).trim() : null,
        recipeSources: sources,
        updatedAt: item.updatedAt || item.createdAt || Date.now()
      };
    });

    if (!changed) return;
    this._touchAndPersist();
  }

  _loadCategoryState() {
    const defaults = SHOPPING_CATEGORIES.map(c => ({ ...c, _deleted: false }));
    const custom = Array.isArray(this.storage?.data?.shoppingCategories)
      ? this.storage.data.shoppingCategories.filter(c => c && typeof c === 'object' && !c._deleted)
      : [];
    const all = [...defaults, ...custom];

    this._categoryById = new Map();
    this._categoryOrder = [];
    all.forEach(c => {
      const id = normalizeText(c.id);
      const label = String(c.label || '').trim();
      if (!id || !label || this._categoryById.has(id)) return;
      this._categoryById.set(id, { id, label });
      this._categoryOrder.push(id);
    });
  }

  _touchAndPersist() {
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
  }
}
