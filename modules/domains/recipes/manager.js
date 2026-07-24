// modules/recipes.js
export class RecipeManager {
  constructor(storage, shopping, sync = null) {
    this.storage = storage;
    this.shopping = shopping;
    this.sync = sync;
  }

  getRecipes() {
    if (!this.storage.data) {
      this.storage.loadLocal();
    }
    
    if (!this.storage.data.recipes || this.storage.data.recipes.length === 0) {
      this.storage.data.recipes = this.getDefaultRecipes();
      this.storage.saveLocal();
    }

    // Migration/Heilung alter Freitext-Zutaten (z.B. "gedünstet" als eigenes Item).
    let changed = false;
    this.storage.data.recipes = this.storage.data.recipes.map(r => {
      const normalized = this.parseIngredients(r.ingredients || []);
      const prev = Array.isArray(r.ingredients) ? r.ingredients : [];
      if (JSON.stringify(prev) !== JSON.stringify(normalized)) {
        changed = true;
        return {
          ...r,
          ingredients: normalized,
          updatedAt: Date.now()
        };
      }
      return r;
    });
    if (changed) this.saveRecipes();
    
    return this.storage.data.recipes.filter(r => !r._deleted);
  }

  getDefaultRecipes() {
    return [
      {
        id: 'ruehrei',
        name: 'Rührei',
        ingredients: ['Eier', 'Milch', 'Butter'],
        link: 'https://www.chefkoch.de/rs/s0/ruehrei/Rezepte.html',
        difficulty: 'einfach',
        time: '10 Min',
        servings: 2
      },
      {
        id: 'nudeln-tomate',
        name: 'Nudeln mit Tomatensoße',
        ingredients: ['Nudeln', 'Passata', 'Zwiebeln', 'Knoblauch', 'Olivenöl'],
        link: 'https://www.chefkoch.de/rs/s0/nudeln+tomatensoße/Rezepte.html',
        difficulty: 'einfach',
        time: '20 Min',
        servings: 4
      },
      {
        id: 'kaesebrot',
        name: 'Käsebrot',
        ingredients: ['Brot', 'Käse', 'Butter'],
        link: 'https://www.chefkoch.de/rs/s0/kaesebrot/Rezepte.html',
        difficulty: 'sehr einfach',
        time: '5 Min',
        servings: 1
      },
      {
        id: 'muesli',
        name: 'Müsli mit Milch',
        ingredients: ['Müsli', 'Milch', 'Joghurt', 'Obst'],
        link: 'https://www.chefkoch.de/rs/s0/muesli/Rezepte.html',
        difficulty: 'sehr einfach',
        time: '5 Min',
        servings: 1
      },
      {
        id: 'pfannkuchen',
        name: 'Pfannkuchen',
        ingredients: ['Mehl', 'Eier', 'Milch', 'Zucker', 'Butter'],
        link: 'https://www.chefkoch.de/rs/s0/pfannkuchen/Rezepte.html',
        difficulty: 'einfach',
        time: '20 Min',
        servings: 4
      }
    ];
  }

  getAllRecipes() {
    return this.getRecipes();
  }

  parseIngredients(rawIngredients) {
    const source = Array.isArray(rawIngredients)
      ? rawIngredients.join(', ')
      : String(rawIngredients || '');

    // Erlaubt schnelle Eingabe per Zeilenumbruch oder Semikolon.
    const cleanedSource = source
      .replace(/^\s*zutaten\s*:\s*/i, '')
      .replace(/[;\n\r]+/g, ',');
    const chunks = [];
    let current = '';
    let depthRound = 0;
    let depthSquare = 0;
    let depthCurly = 0;

    for (const ch of cleanedSource) {
      if (ch === '(') depthRound++;
      if (ch === ')') depthRound = Math.max(0, depthRound - 1);
      if (ch === '[') depthSquare++;
      if (ch === ']') depthSquare = Math.max(0, depthSquare - 1);
      if (ch === '{') depthCurly++;
      if (ch === '}') depthCurly = Math.max(0, depthCurly - 1);

      if (ch === ',' && depthRound === 0 && depthSquare === 0 && depthCurly === 0) {
        chunks.push(current);
        current = '';
        continue;
      }

      current += ch;
    }
    if (current.trim()) chunks.push(current);

    const skipWords = new Set(['geduenstet', 'gedunstet', 'gewuerfelt', 'vorher', 'microwelle']);
    const normalized = chunks
      .map(part => part
        .replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, '')
      )
      .filter(Boolean)
      .filter(part => {
        const key = part
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/ß/g, 'ss');
        return !skipWords.has(key);
      });

    const deduped = [];
    const seen = new Set();
    normalized.forEach(part => {
      const key = part.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(part);
      }
    });

    return deduped;
  }

  isCookable(recipe) {
    return this.getIngredientAvailability(recipe).missing.length === 0;
  }

  getIngredientAvailability(recipe) {
    const locations = Object.values(this.storage.data?.locations || {});
    const allItems = locations.flatMap(loc => loc.items || []);
    const itemNames = allItems.map(item => item.name.toLowerCase());
    const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];

    const available = [];
    const missing = [];

    ingredients.forEach(ingredient => {
      const ingLower = ingredient.toLowerCase();
      const inStock = itemNames.some(name => name.includes(ingLower) || ingLower.includes(name));
      if (inStock) available.push(ingredient);
      else missing.push(ingredient);
    });

    const total = ingredients.length;
    const ratio = total > 0 ? (available.length / total) : 0;
    return { total, available, missing, ratio };
  }

  getMissingIngredients(recipe) {
    return this.getIngredientAvailability(recipe).missing;
  }

  getRecipesSorted() {
    const recipes = this.getRecipes();
    return [...recipes].sort((a, b) =>
      String(a?.name || '').localeCompare(String(b?.name || ''), 'de', { sensitivity: 'base' })
    );
  }

  addRecipe(recipe) {
    const recipes = this.getRecipes();
    const now = Date.now();
    
    const newRecipe = {
      id: 'recipe-' + now,
      name: recipe.name,
      ingredients: this.parseIngredients(recipe.ingredients),
      link: recipe.link,
      difficulty: recipe.difficulty || 'einfach',
      time: recipe.time || '?',
      servings: parseInt(recipe.servings) || 2,
      _deleted: false,
      createdAt: now,
      updatedAt: now
    };
    
    this.storage.data.recipes.push(newRecipe);
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.saveRecipes();
    return newRecipe;
  }

  updateRecipe(id, recipePatch) {
    const recipe = this.storage.data.recipes.find(r => r.id === id && !r._deleted);
    if (!recipe) return false;

    recipe.name = (recipePatch.name || recipe.name || '').trim();
    recipe.ingredients = this.parseIngredients(recipePatch.ingredients ?? recipe.ingredients);
    recipe.link = recipePatch.link || recipe.link;
    recipe.difficulty = recipePatch.difficulty || recipe.difficulty || 'einfach';
    recipe.time = recipePatch.time || recipe.time || '?';
    recipe.servings = parseInt(recipePatch.servings) || recipe.servings || 2;
    recipe.updatedAt = Date.now();

    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.saveRecipes();
    return true;
  }

  deleteRecipe(id) {
    const recipe = this.storage.data.recipes.find(r => r.id === id);
    if (recipe && !recipe._deleted) {
      recipe._deleted = true;
      recipe.updatedAt = Date.now();
      this.storage.data.version = (this.storage.data.version || 0) + 1;
      this.saveRecipes();
      return true;
    }
    return false;
  }

  addMissingToShoppingList(recipeId) {
    const recipes = this.getRecipes();
    const recipe = recipes.find(r => r.id === recipeId && !r._deleted);
    if (!recipe) return false;
    
    const missing = this.getMissingIngredients(recipe);
    if (missing.length === 0) return false;
    
    let addedCount = 0;
    missing.forEach(ingredient => {
      const existing = this.shopping.getItems().find(i => 
        i.name.toLowerCase() === ingredient.toLowerCase() && 
        i.status === 'offen' &&
        !i._deleted
      );
      
      if (!existing) {
        this.shopping.add(ingredient, `für ${recipe.name}`);
        addedCount++;
      }
    });
    
    return addedCount;
  }

  addIngredientsToShoppingList(recipeId) {
    const recipes = this.getRecipes();
    const recipe = recipes.find(r => r.id === recipeId && !r._deleted);
    if (!recipe) return 0;

    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    if (ingredients.length === 0) return 0;

    let addedCount = 0;
    ingredients.forEach(ingredient => {
      const normalized = String(ingredient || '').trim();
      if (!normalized) return;

      if (typeof this.shopping.addOrMergeRecipeIngredient === 'function') {
        const changed = this.shopping.addOrMergeRecipeIngredient(normalized, recipe);
        if (changed) addedCount++;
        return;
      }

      const existing = this.shopping.getItems().find(i =>
        String(i.name || '').trim().toLowerCase() === normalized.toLowerCase() &&
        i.status === 'offen' &&
        !i._deleted
      );
      if (!existing) {
        this.shopping.add(normalized, `für ${recipe.name}`);
        addedCount++;
      }
    });
    return addedCount;
  }

  addIngredientsToShoppingListForRecipes(recipeIds = []) {
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) return 0;
    let totalAdded = 0;
    recipeIds.forEach(id => {
      const added = this.addIngredientsToShoppingList(id);
      if (added > 0) totalAdded += added;
    });
    return totalAdded;
  }

  addMissingToShoppingListForRecipes(recipeIds = []) {
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) return 0;

    let totalAdded = 0;
    recipeIds.forEach(id => {
      const added = this.addMissingToShoppingList(id);
      if (added && added > 0) totalAdded += added;
    });
    return totalAdded;
  }

  buildRecipeDraftFromOCRText(rawText) {
    const text = String(rawText || '');
    const lines = text
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const headingWords = ['zutaten', 'zubereitung', 'zubereiten', 'anleitung', 'schritte', 'nahrwerte', 'naehrwerte'];
    const sectionHeading = (line) => {
      const lower = line.toLowerCase();
      return headingWords.some(w => lower.startsWith(w));
    };

    const likelyTitle = lines.find(line => {
      if (line.length < 3 || line.length > 90) return false;
      if (sectionHeading(line)) return false;
      if (/^hellofresh$/i.test(line)) return false;
      if (/^\d+[\).:\-]/.test(line)) return false;
      return /[a-zA-ZäöüÄÖÜß]/.test(line);
    }) || 'Neues Rezept';

    let inIngredientBlock = false;
    const ingredientCandidates = [];
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (/^zutaten\b/.test(lower)) {
        inIngredientBlock = true;
        const rest = line.replace(/^zutaten\s*:?\s*/i, '').trim();
        if (rest) ingredientCandidates.push(rest);
        return;
      }

      if (inIngredientBlock && /^(zubereitung|anleitung|schritte|n[äa]hrwerte)\b/i.test(lower)) {
        inIngredientBlock = false;
        return;
      }

      if (inIngredientBlock) {
        ingredientCandidates.push(line.replace(/^[-*•]\s*/, ''));
      }
    });

    if (ingredientCandidates.length === 0) {
      lines.forEach(line => {
        if (/\d/.test(line) && /(g|kg|ml|l|tl|el|stk|st\.|prise|bund|dose)\b/i.test(line)) {
          ingredientCandidates.push(line.replace(/^[-*•]\s*/, ''));
        }
      });
    }

    const ingredients = this.parseIngredients(ingredientCandidates.join(', '));

    const timeMatch = text.match(/(\d{1,3})\s*(min|minute|minuten)\b/i);
    const servingsMatch = text.match(/(\d{1,2})\s*(portion(?:en)?|personen?)\b/i);
    const time = timeMatch ? `${timeMatch[1]} Min` : '';
    const servings = servingsMatch ? parseInt(servingsMatch[1], 10) : 2;

    return {
      name: likelyTitle,
      ingredients,
      link: `https://www.chefkoch.de/rs/s0/${encodeURIComponent(likelyTitle)}/Rezepte.html`,
      difficulty: 'einfach',
      time,
      servings,
      rawText: text
    };
  }

  buildRecipeDraftFromOCRTexts(rawTexts = []) {
    const texts = Array.isArray(rawTexts)
      ? rawTexts.map(t => String(t || '').trim()).filter(Boolean)
      : [String(rawTexts || '').trim()].filter(Boolean);

    const mergedText = texts.join('\n\n');
    return this.buildRecipeDraftFromOCRText(mergedText);
  }

  normalizeRecipeSearchTitle(title) {
    return String(title || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  buildTitleSearchUrl(title, provider = 'hellofresh-google') {
    const normalizedTitle = this.normalizeRecipeSearchTitle(title);
    if (!normalizedTitle) return '';

    switch (provider) {
      case 'google':
        return `https://www.google.com/search?q=${encodeURIComponent(normalizedTitle)}`;
      case 'chefkoch':
        return `https://www.chefkoch.de/rs/s0/${encodeURIComponent(normalizedTitle)}/Rezepte.html`;
      case 'hellofresh-google':
      default:
        return `https://www.google.com/search?q=${encodeURIComponent(`site:hellofresh.de ${normalizedTitle}`)}`;
    }
  }

  normalizeImportedIngredientName(line) {
    return String(line || '')
      .replace(/^[-•*]\s*/, '')
      .replace(/\((er|en|n)\)/gi, '$1')
      .replace(/\b([A-Za-zÄÖÜäöüß]+),\s*geriebener\b/gi, 'geriebener $1')
      .replace(/,/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  isRecipeSectionHeading(line) {
    return /^(zutaten|zubereitung|utensilien|n[äa]hrwert|n[äa]hrwerte|allergene|tipp|pdf)\b/i.test(String(line || '').trim());
  }

  isIngredientQuantityLine(line) {
    const value = String(line || '').trim();
    if (!value) return false;

    if (/^\d+[\d.,/]*\s*(g|kg|mg|ml|l|tl|el|stk\.?|st[üu]ck|prise|bund|dose|packung(?:en)?|zehe(?:n)?|scheibe(?:n)?|m\.-gro[ßs]e)\b/i.test(value)) {
      return true;
    }

    return /^\d+[\d.,/]*$/.test(value);
  }

  shouldSkipImportedIngredientLine(line) {
    const value = String(line || '').trim();
    if (!value) return true;
    return /^(bring!|logoauf|auf die einkaufsliste setzen|nicht in deiner lieferung enthalten|kalorien|eiwei[ßs]|fett|kohlenhydrate|speichern|teilen)$/i.test(value);
  }

  buildRecipeDraftFromPastedText(rawText) {
    const text = String(rawText || '');
    const lines = text
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const title = lines.find(line => {
      if (line.length < 3 || line.length > 120) return false;
      if (this.isRecipeSectionHeading(line)) return false;
      if (/^(play|video|tileview|bildergalerie|add_photo|bild hochladen|heart_border|calendar_add|print|share|time|difficulty_level|veggi_vegan|calendar_month|profil)$/i.test(line)) return false;
      if (/^[]+$/u.test(line)) return false;
      if (/^\d+[.,]\d$/.test(line)) return false;
      return /[A-Za-zÄÖÜäöüß]/.test(line);
    }) || 'Neues Rezept';

    const servingsMatch = text.match(/f[üu]r\s+(\d{1,2})\s+portion(?:en)?/i) || text.match(/(\d{1,2})\s+portion(?:en)?/i);
    const totalTimeMatch = text.match(/gesamtzeit\s*(\d{1,3})\s*min/i);
    const workTimeMatch = text.match(/arbeitszeit\s*(\d{1,3})\s*min/i);
    const time = totalTimeMatch
      ? `${totalTimeMatch[1]} Min`
      : (workTimeMatch ? `${workTimeMatch[1]} Min` : ((text.match(/(\d{1,3})\s*(min|minute|minuten)\b/i) || [])[1] ? `${(text.match(/(\d{1,3})\s*(min|minute|minuten)\b/i) || [])[1]} Min` : ''));

    let difficulty = 'einfach';
    if (/\bsimpel\b/i.test(text) || /\beinfach\b/i.test(text)) difficulty = 'einfach';
    else if (/\bmittel\b/i.test(text)) difficulty = 'mittel';

    let inIngredients = false;
    const ingredientLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/^zutaten\b/i.test(line)) {
        inIngredients = true;
        continue;
      }

      if (!inIngredients) continue;
      if (/^zubereitung\b/i.test(line)) break;
      if (this.shouldSkipImportedIngredientLine(line)) continue;
      if (/^f[üu]r\s+\d+\s+portion(?:en)?/i.test(line)) continue;

      const sameLineMatch = line.match(/^\d+[\d.,/]*\s*(g|kg|mg|ml|l|tl|el|stk\.?|st[üu]ck|prise|bund|dose|packung(?:en)?|zehe(?:n)?|scheibe(?:n)?|m\.-gro[ßs]e)\b\s+(.+)$/i);
      if (sameLineMatch) {
        const ingredient = this.normalizeImportedIngredientName(sameLineMatch[2]);
        if (ingredient) ingredientLines.push(ingredient);
        continue;
      }

      if (this.isIngredientQuantityLine(line)) {
        const nameLine = lines[i + 1];
        if (!nameLine || this.isRecipeSectionHeading(nameLine) || this.isIngredientQuantityLine(nameLine) || this.shouldSkipImportedIngredientLine(nameLine)) {
          continue;
        }

        let ingredient = this.normalizeImportedIngredientName(nameLine);
        const detailLine = lines[i + 2];
        const nextAfterDetail = lines[i + 3];
        const canUseDetail = detailLine
          && !this.isRecipeSectionHeading(detailLine)
          && !this.isIngredientQuantityLine(detailLine)
          && !this.shouldSkipImportedIngredientLine(detailLine)
          && (!nextAfterDetail || this.isIngredientQuantityLine(nextAfterDetail) || this.isRecipeSectionHeading(nextAfterDetail));
        if (canUseDetail) {
          ingredient = `${ingredient} ${this.normalizeImportedIngredientName(detailLine)}`.trim();
          i += 1;
        }

        if (ingredient) ingredientLines.push(ingredient);
        i += 1;
        continue;
      }

      if (!this.isRecipeSectionHeading(line)) {
        const ingredient = this.normalizeImportedIngredientName(line);
        if (ingredient) ingredientLines.push(ingredient);
      }
    }

    const ingredients = this.parseIngredients(ingredientLines.join(', '));

    return {
      name: title,
      ingredients,
      link: '',
      difficulty,
      time,
      servings: servingsMatch ? parseInt(servingsMatch[1], 10) : 2,
      rawText: text
    };
  }

  saveRecipes() {
    this.storage.saveLocal();
    if (this.sync) this.sync.markDirty();
  }
}
