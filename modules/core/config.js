// modules/config.js
export const CONFIG = {
  STORAGE_KEY: 'unser-nest-v2',

  JSONBIN_API_KEY: '$2a$10$3zGc/rfr1JyrzGfSsLar0uPynrwRlwm7g3zflkvurE9ThZyfpvFDi',
  JSONBIN_BIN_ID: '69a99f5dd0ea881f40f20402',
  GOOGLE_TASKS_CLIENT_ID: '',
  // Bei leerem localStorage wird dieses Bundle einmalig als Startbestand importiert.
  PUBLISHED_BUNDLE_PATH: './externesBackup/unser-nest-backup-2026-07-13T06-03-50-950Z.json',
  // Fallback-Reihenfolge fuer Deployments, in denen einzelne JSON-Dateien fehlen.
  PUBLISHED_BUNDLE_PATHS: [
    './externesBackup/unser-nest-backup-2026-07-13T06-03-50-950Z.json'
  ],
  
  SYNC_INTERVAL: 60000, // 60 Sekunden Interval
  SYNC_REQUEST_TIMEOUT_MS: 15000, // Abbruchschutz für hängende Cloud-Requests
  
  POINTS_ITEM_BOUGHT: 2,
  POINTS_ITEM_STORED: 3,
  POINTS_MEAL_COOKED: 5,
  
  USERS: [
    { id: 'julia', name: 'Julia', points: 0 },
    { id: 'christian', name: 'Christian', points: 0 },
    { id: 'helena', name: 'Helena', points: 0 },
    { id: 'elisabeth', name: 'Elisabeth', points: 0 }
  ],
  
  DEFAULT_QUESTS: [
    {
      id: 'waesche-waschen',
      title: 'Wäsche waschen',
      description: 'Schmutzwäsche sortieren und in die Waschmaschine.',
      points: 10,
      repeatable: true
    },
    {
      id: 'waesche-trocknen',
      title: 'Wäsche trocknen',
      description: 'Nasse Wäsche aufhängen oder in den Trockner.',
      points: 10,
      repeatable: true,
      dependsOn: 'waesche-waschen'
    },
    {
      id: 'waesche-einraeumen',
      title: 'Wäsche einräumen',
      description: 'Trockene Wäsche zusammenlegen und verräumen.',
      points: 15,
      repeatable: true,
      dependsOn: 'waesche-trocknen'
    },
    {
      id: 'zimmer-aufraeumen',
      title: 'Zimmer aufräumen',
      description: 'Spielzeug einsammeln, Boden frei machen.',
      points: 20,
      defaultAssignee: 'helena',
      repeatDays: 3
    },
    {
      id: 'muell-rausbringen',
      title: 'Müll rausbringen',
      description: 'Alle Mülleimer leeren und Tüten rausbringen.',
      points: 5,
      repeatable: true
    },
    {
      id: 'spuelen',
      title: 'Spülen',
      description: 'Abwasch machen oder Spülmaschine einräumen.',
      points: 10,
      repeatable: true
    },
     {
       id: 'bad-putzen-rotation',
       title: 'Bad putzen (reihum)',
       description: 'Reihum Bad putzen: Julia ist ausgenommen. Nach jedem Abschluss wandert die Aufgabe weiter.',
       points: 15,
       repeatable: true,
       rotation: {
         enabled: true,
         userIds: ['christian', 'helena', 'elisabeth'],
         excludedUserIds: ['julia'],
         currentIndex: 1,
         lastCompletedBy: 'christian',
         lastCompletedAt: null
       },
       dueDate: '2026-06-29',
       penaltyAmountCents: 200,
       penaltyDescription: 'Nicht rechtzeitig gereinigt'
     }
  ],
  
   DEFAULT_REWARDS: [
     { id: 'fernsehzeit-30', title: '30 Minuten Fernsehzeit', cost: 30 },
     { id: 'fernsehzeit-60', title: '60 Minuten Fernsehzeit', cost: 50 },
     { id: 'uebernachtung', title: 'Übernachtung bei Freund:in', cost: 80 },
     { id: 'ausflug', title: 'Ausflug wählen', cost: 100 },
     { id: 'suessigkeit', title: 'Süßigkeit nach Wahl', cost: 15 }
   ],

   STANDARD_GROCERIES: [
     { name: 'Butter', suggestion: '2', category: 'Kühlschrank' },
     { name: 'Eier', suggestion: '10', category: 'Kühlschrank' },
     { name: 'Milch', suggestion: '1l', category: 'Kühlschrank' },
     { name: 'Hafermilch', suggestion: '', category: 'Kühlschrank' },
     { name: 'Käse', suggestion: '', category: 'Kühlschrank' },
     { name: 'Joghurt', suggestion: '', category: 'Kühlschrank' },
     { name: 'Quark', suggestion: '500g', category: 'Kühlschrank' },
     { name: 'Weizenmehl', suggestion: '1kg', category: 'Lager' },
     { name: 'Roggenmehl', suggestion: '1kg', category: 'Lager' },
     { name: 'Haferflocken', suggestion: '', category: 'Lager' },
     { name: 'Zucker', suggestion: '', category: 'Lager' },
     { name: 'Honig', suggestion: '', category: 'Lager' },
     { name: 'Öl', suggestion: '', category: 'Lager' },
     { name: 'Sojasoße', suggestion: '50ml', category: 'Lager' },
     { name: 'Sesamöl', suggestion: '20ml', category: 'Lager' },
     { name: 'Pesto', suggestion: '', category: 'Lager' },
     { name: 'Möhren', suggestion: '', category: 'Lager' },
     { name: 'Kartoffeln', suggestion: '', category: 'Lager' },
     { name: 'Zwiebeln', suggestion: '', category: 'Lager' },
     { name: 'Knoblauch', suggestion: '', category: 'Lager' },
     { name: 'Tomaten', suggestion: '', category: 'Lager' },
     { name: 'Paprika', suggestion: '', category: 'Lager' },
     { name: 'Salat', suggestion: '', category: 'Kühlschrank' },
     { name: 'Brot', suggestion: '', category: 'Lager' },
     { name: 'Brötchen', suggestion: '', category: 'Lager' }
   ],

   SHOPPING_CATEGORIES: [
     { id: 'produce', label: '🥕 Frisches Obst & Gemüse' },
     { id: 'chilled', label: '🧊 Gekühlte Lebensmittel' },
     { id: 'canned', label: '🥫 Konserven' },
     { id: 'ready', label: '🍱 Fertig-Lebensmittel' },
     { id: 'hygiene', label: '🧼 Hygieneartikel' }
   ]

};

const CLOUD_CONFIG_STORAGE_KEY = 'unser-nest-cloud-config';
const GOOGLE_TASKS_CONFIG_STORAGE_KEY = 'unser-nest-google-tasks-config';

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined' && localStorage !== null;
}

function normalizeCloudConfig(values = {}) {
  return {
    JSONBIN_API_KEY: String(values.JSONBIN_API_KEY || values.apiKey || '').trim(),
    JSONBIN_BIN_ID: String(values.JSONBIN_BIN_ID || values.binId || '').trim()
  };
}

function normalizeGoogleTasksConfig(values = {}) {
  return {
    GOOGLE_TASKS_CLIENT_ID: String(values.GOOGLE_TASKS_CLIENT_ID || values.clientId || '').trim()
  };
}

export function hasConfiguredCloudCredentials(config = CONFIG) {
  const apiKey = String(config?.JSONBIN_API_KEY || '').trim();
  const binId = String(config?.JSONBIN_BIN_ID || '').trim();
  return !!apiKey
    && !!binId
    && !apiKey.includes('DEIN')
    && !binId.includes('DEINE');
}

export function applyCloudConfig(values = {}) {
  const next = normalizeCloudConfig(values);
  if (next.JSONBIN_API_KEY) CONFIG.JSONBIN_API_KEY = next.JSONBIN_API_KEY;
  if (next.JSONBIN_BIN_ID) CONFIG.JSONBIN_BIN_ID = next.JSONBIN_BIN_ID;
  return next;
}

export function hasConfiguredGoogleTasksClientId(config = CONFIG) {
  const clientId = String(config?.GOOGLE_TASKS_CLIENT_ID || '').trim();
  return !!clientId && !clientId.includes('DEINE') && clientId.includes('.apps.googleusercontent.com');
}

export function applyGoogleTasksConfig(values = {}) {
  const next = normalizeGoogleTasksConfig(values);
  if (next.GOOGLE_TASKS_CLIENT_ID) CONFIG.GOOGLE_TASKS_CLIENT_ID = next.GOOGLE_TASKS_CLIENT_ID;
  return next;
}

export function loadStoredCloudConfig() {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const next = normalizeCloudConfig(parsed);
    if (!next.JSONBIN_API_KEY || !next.JSONBIN_BIN_ID) return null;
    applyCloudConfig(next);
    return next;
  } catch (err) {
    console.warn('[Config] Gespeicherte Cloud-Konfiguration konnte nicht geladen werden:', err);
    return null;
  }
}

export function loadStoredGoogleTasksConfig() {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(GOOGLE_TASKS_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const next = normalizeGoogleTasksConfig(parsed);
    if (!next.GOOGLE_TASKS_CLIENT_ID) return null;
    applyGoogleTasksConfig(next);
    return next;
  } catch (err) {
    console.warn('[Config] Gespeicherte Google-Tasks-Konfiguration konnte nicht geladen werden:', err);
    return null;
  }
}

export function saveStoredCloudConfig(apiKey, binId) {
  const next = normalizeCloudConfig({ apiKey, binId });
  if (!next.JSONBIN_API_KEY || !next.JSONBIN_BIN_ID) return false;
  applyCloudConfig(next);
  if (!canUseLocalStorage()) return true;
  try {
    localStorage.setItem(CLOUD_CONFIG_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch (err) {
    console.warn('[Config] Cloud-Konfiguration konnte nicht gespeichert werden:', err);
    return false;
  }
}

export function saveStoredGoogleTasksClientId(clientId) {
  const next = normalizeGoogleTasksConfig({ clientId });
  if (!next.GOOGLE_TASKS_CLIENT_ID) return false;
  applyGoogleTasksConfig(next);
  if (!canUseLocalStorage()) return true;
  try {
    localStorage.setItem(GOOGLE_TASKS_CONFIG_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch (err) {
    console.warn('[Config] Google-Tasks-Konfiguration konnte nicht gespeichert werden:', err);
    return false;
  }
}

export function createInitialState() {
  const now = Date.now();
  return {
    version: 1,
    lastSync: 0,
    homeName: '',
    homeUpdatedAt: 0,
    users: CONFIG.USERS.map(u => ({ ...u })),
    locations: {
      fridge: { id: 'fridge', name: '🧊 Kühlschrank', items: [], maxAgeDays: 90, updatedAt: Date.now() },
      cabinet: { id: 'cabinet', name: '🗄️ Apothekenschrank', items: [], maxAgeDays: 730, updatedAt: Date.now() },
      storage: { id: 'storage', name: '📦 Lager', items: [], maxAgeDays: 730, updatedAt: Date.now() },
      terrace: { id: 'terrace', name: '🌿 Terrasse', items: [], maxAgeDays: 730, updatedAt: Date.now() }
    },
    shoppingList: [],
    shoppingCategories: (CONFIG.SHOPPING_CATEGORIES || []).map(c => ({
      id: c.id,
      label: c.label,
      _deleted: false,
      createdAt: now,
      updatedAt: now
    })),
    recipes: [],
    bills: [],
    quests: CONFIG.DEFAULT_QUESTS.map(q => ({ 
      ...q, 
      completed: false, 
      completedAt: null, 
      completedBy: null,
      dueDate: null,
      dependsOn: q.dependsOn || null,
      kind: q.kind || 'quest',
      targetUserId: q.targetUserId || 'all',
      reporterUserId: q.reporterUserId || null,
      priority: Number.isFinite(Number(q.priority)) ? Math.max(1, Math.min(4, Math.round(Number(q.priority)))) : 3,
      createdAt: now,
      updatedAt: now,
      rotation: q.rotation ? {
        ...q.rotation,
        userIds: Array.isArray(q.rotation.userIds) ? [...q.rotation.userIds] : [],
        excludedUserIds: Array.isArray(q.rotation.excludedUserIds) ? [...q.rotation.excludedUserIds] : [],
        currentIndex: Number.isFinite(Number(q.rotation.currentIndex)) ? Number(q.rotation.currentIndex) : 0,
        lastCompletedAt: q.rotation.lastCompletedAt || (q.rotation.lastCompletedBy ? now : null)
      } : null
    })),
    rewards: CONFIG.DEFAULT_REWARDS.map(r => ({
      ...r,
      availableFrom: null,
      availableUntil: null,
      _deleted: false,
      createdAt: now,
      updatedAt: now
    })),
    chronicle: [],
    mealPlan: {
      weekOffset: 0,
      activeMeals: ['lunchbox', 'dinner'],
      slots: {}
    },
    reisekasse: {
      updatedAt: now,
      rules: [
        {
          id: 'rk-rule-christian-no-shopping',
          title: 'Christian war nicht einkaufen',
          description: 'Christian zahlt 5 EUR, wenn er an einem Tag nicht einkaufen war.',
          amountCents: 500,
          appliesToAll: false,
          userIds: ['christian'],
          exceptionNote: '',
          active: true,
          _deleted: false,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'rk-rule-julia-phone-table',
          title: 'Julia nutzt Handy am Esstisch',
          description: 'Julia zahlt 5 EUR fuer Handybenutzung am Esstisch.',
          amountCents: 500,
          appliesToAll: false,
          userIds: ['julia'],
          exceptionNote: '',
          active: true,
          _deleted: false,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'rk-rule-kids-phone-table',
          title: 'Helena/Elisabeth nutzen Handy',
          description: 'Helena und Elisabeth zahlen je 2 EUR fuer Handybenutzung.',
          amountCents: 200,
          appliesToAll: false,
          userIds: ['helena', 'elisabeth'],
          exceptionNote: '',
          active: true,
          _deleted: false,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'rk-rule-political-incorrect',
          title: 'Politisch inkorrekte Aeusserung',
          description: 'Alle zahlen 5 EUR bei politisch inkorrekter Aeusserung.',
          amountCents: 500,
          appliesToAll: true,
          userIds: [],
          exceptionNote: 'Bei Einspruch darf ein Handy zur Pruefung ohne Strafe benutzt werden.',
          active: true,
          _deleted: false,
          createdAt: now,
          updatedAt: now
        }
      ],
      transactions: [],
      weeklyStatements: []
    }
  };
}
