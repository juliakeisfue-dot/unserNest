// modules/core/backup.js
import { createInitialState } from './config.js';

export const BACKUP_SCHEMA_VERSION = 2;
export const BACKUP_KIND_BUNDLE = 'unsernest-config-bundle';
export const BACKUP_KIND_PART = 'unsernest-config-part';

/**
 * Filtert den Speiseplan für den Export:
 * Behalten werden:
 *   - Slots ab dem Beginn der aktuellen Woche (Montag)
 *   - Alle Slots, die mindestens eine Bewertung haben (historisches Ranking)
 * Verworfen werden:
 *   - Alte Slots ohne Bewertung (abgelaufene Wochen, kein bleibender Wert)
 */
function pickMealPlan(data, now = new Date()) {
  const plan = data.mealPlan || {};
  if (!plan.slots) return plan;

  // Montag dieser Woche (00:00)
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);
  const mondayTs = monday.getTime();

  // Alles ab vor 14 Tagen behalten (aktuelle + letzte Woche immer sichtbar)
  const fourteenDaysAgo = mondayTs - 14 * 24 * 60 * 60 * 1000;

  const filteredSlots = {};
  Object.entries(plan.slots).forEach(([key, slot]) => {
    const dateStr = key.split(':')[0];          // "YYYY-MM-DD"
    const slotDate = new Date(`${dateStr}T00:00:00`);
    const slotTs = slotDate.getTime();
    const hasRatings = Array.isArray(slot.ratings) && slot.ratings.length > 0;
    const isRecentOrFuture = slotTs >= fourteenDaysAgo;

    // Behalten: aktuelle/zukünftige Woche, letzte 2 Wochen, oder bewertet
    if (isRecentOrFuture || hasRatings) {
      filteredSlots[key] = slot;
    }
  });

  return { ...plan, slots: filteredSlots };
}

const SECTION_SPECS = [
  {
    key: 'core', fileKey: 'core', label: 'Basis',
    pick: (data) => ({ homeName: data.homeName || '', version: Number(data.version || 1), lastSync: Number(data.lastSync || 0) }),
    description: 'Name des Haushalts'
  },
  {
    key: 'users', fileKey: 'users', label: 'Benutzer',
    pick: (data) => data.users || [],
    description: 'Punkte aller Benutzer'
  },
  {
    key: 'shoppingList', fileKey: 'shopping', label: 'Einkauf',
    pick: (data) => (data.shoppingList || []).filter(i => !i._deleted && i.status !== 'eingeräumt'),
    description: 'Offene und gekaufte Artikel (nicht: bereits eingeräumte)'
  },
  {
    key: 'shoppingCategories', fileKey: 'shopping-categories', label: 'Einkaufskategorien',
    pick: (data) => (data.shoppingCategories || []).filter(c => !c._deleted),
    description: 'Benutzerdefinierte Kategorien für die Einkaufsliste'
  },
  {
    key: 'locations', fileKey: 'inventory', label: 'Vorrat',
    pick: (data) => data.locations || {},
    description: 'Alle Lagerorte mit Inhalt und Ablaufdaten'
  },
  {
    key: 'recipes', fileKey: 'recipes', label: 'Rezepte',
    pick: (data) => (data.recipes || []).filter(r => !r._deleted),
    description: 'Alle aktiven Rezepte'
  },
  {
    key: 'mealPlan', fileKey: 'mealplan', label: 'Speiseplan',
    pick: (data, now) => pickMealPlan(data, now),
    description: 'Aktuelle Woche + Zukunft + bewertete Einträge (ältere ohne Bewertung werden nicht gespeichert)'
  },
  {
    key: 'quests', fileKey: 'quests', label: 'Quests',
    pick: (data) => data.quests || [],
    description: 'Alle Quests inkl. Status'
  },
  {
    key: 'rewards', fileKey: 'rewards', label: 'Belohnungen',
    pick: (data) => data.rewards || [],
    description: 'Verfügbare Belohnungen'
  },
  {
    key: 'reisekasse', fileKey: 'reisekasse', label: 'Reisekasse',
    pick: (data) => data.reisekasse || { rules: [], transactions: [], weeklyStatements: [], updatedAt: Date.now() },
    description: 'Regeln, Zahlungen und Wochenabrechnungen'
  },
  {
    key: 'chronicle', fileKey: 'chronicle', label: 'Chronik',
    pick: (data) => data.chronicle || [],
    description: 'Aktivitätsverlauf und Systemereignisse'
  },
  // Kassenbons bleiben weiterhin ausgeschlossen (reine OCR-Transaktionsdaten).
];

const VALID_SECTIONS = new Set(SECTION_SPECS.map(s => s.key));

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function compactDateStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

/**
 * Gibt ein Array von { label, description, count } zurück –
 * zeigt dem Nutzer was im nächsten Export enthalten sein wird.
 */
export function createSummary(data, now = new Date()) {
  return SECTION_SPECS.map(spec => {
    const value = spec.pick(data || {}, now);
    let count = null;
    if (Array.isArray(value)) count = value.length;
    else if (value && typeof value === 'object') {
      // Für locations: Anzahl aktiver Lagerorte
      count = Object.values(value).filter(v => v && !v._deleted).length;
    }
    return { key: spec.key, label: spec.label, description: spec.description, count };
  });
}

export function createBundle(data, activeUserId = null, now = new Date()) {
  const sections = {};
  SECTION_SPECS.forEach(spec => {
    sections[spec.key] = deepClone(spec.pick(data || {}, now));
  });

  return {
    kind: BACKUP_KIND_BUNDLE,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    activeUserId: activeUserId || null,
    sections
  };
}

export function createParts(data, activeUserId = null, now = new Date()) {
  return SECTION_SPECS.map(spec => ({
    kind: BACKUP_KIND_PART,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    section: spec.key,
    label: spec.label,
    exportedAt: now.toISOString(),
    activeUserId: activeUserId || null,
    payload: deepClone(spec.pick(data || {}, now))
  }));
}

export function bundleFileName(now = new Date()) {
  return `unser-nest-backup-${compactDateStamp(now)}.json`;
}

export function partFileName(section, now = new Date()) {
  return `unser-nest-config-${section}-${compactDateStamp(now)}.json`;
}

function applySection(state, section, payload) {
  if (section === 'core') {
    const core = payload || {};
    state.homeName = String(core.homeName || state.homeName || '');
    state.version = Number(core.version || state.version || 1);
    state.lastSync = Number(core.lastSync || 0);
    return;
  }

  if (VALID_SECTIONS.has(section)) {
    state[section] = deepClone(payload);
  }
}

export function importFromDocuments(documents, currentState = null) {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error('Keine Datei geladen');
  }

  const initial = createInitialState();
  const base = deepClone(currentState || initial);
  let activeUserId = null;
  let importedSomething = false;

  documents.forEach(doc => {
    if (!doc || typeof doc !== 'object') return;

    if (doc.kind === BACKUP_KIND_BUNDLE && doc.sections && typeof doc.sections === 'object') {
      Object.entries(doc.sections).forEach(([section, payload]) => {
        applySection(base, section, payload);
        importedSomething = true;
      });
      if (doc.activeUserId) activeUserId = doc.activeUserId;
      return;
    }

    if (doc.kind === BACKUP_KIND_PART && doc.section) {
      applySection(base, doc.section, doc.payload);
      importedSomething = true;
      if (doc.activeUserId) activeUserId = doc.activeUserId;
      return;
    }

    // Fallback: altes Vollbackup (direktes App-State-JSON)
    if (doc.users && doc.locations && doc.version) {
      Object.keys(base).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(doc, key)) {
          base[key] = deepClone(doc[key]);
        }
      });
      importedSomething = true;
    }
  });

  if (!importedSomething) {
    throw new Error('Unbekanntes Dateiformat');
  }

  return { state: base, activeUserId };
}






