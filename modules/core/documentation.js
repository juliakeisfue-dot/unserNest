/**
 * modules/core/documentation.js
 *
 * Zentraler Feature-Katalog für unserNest.
 * Definiert alle Funktionen mit Status, Datenmodell und Berechtigungen.
 * Wird zur Dokumentations-UI und zum Tracking-System genutzt.
 */

export const DOCUMENTATION = {
  appName: 'unserNest',
  appVersion: '1.0.0',
  lastUpdated: new Date().toISOString(),
  purpose: 'Familien-Organisationsapp für Einkauf, Vorrat, Mahlplanung und Belohnungen',

  features: [
    {
      id: 'shopping',
      name: '🛒 Einkaufen',
      description: 'Verwaltung von Einkaufslisten mit Status-Tracking (offen → gekauft → eingeräumt)',
      status: 'fertig', // 'fertig' | 'planung' | 'inarbeit'
      category: 'core',
      dataModel: {
        structure: 'storage.data.shoppingList[]',
        fields: [
          { name: 'id', type: 'string', desc: 'Eindeutige ID' },
          { name: 'name', type: 'string', desc: 'Artikelname' },
          { name: 'status', type: 'string', desc: '"offen", "gekauft", "eingeraeumt"' },
          { name: 'note', type: 'string', desc: 'Optionale Notiz (Rezept, Menge)' },
          { name: 'addedAt', type: 'timestamp', desc: 'Hinzugefügt am' },
          { name: '_deleted', type: 'boolean', desc: 'Soft-delete-Flag' },
        ]
      },
      trackedEvents: [
        'item_added',
        'item_marked_bought',
        'item_marked_shelved',
        'item_deleted'
      ],
      permissions: {
        add: ['all'],
        edit: ['all'],
        delete: ['all']
      }
    },
    {
      id: 'inventory',
      name: '🧊 Vorrat',
      description: 'Verwaltung von Vorräten (Kühlschrank, Gefrierer, Lager) mit Artikel-Tracking',
      status: 'fertig',
      category: 'core',
      dataModel: {
        structure: 'storage.data.locations[location].items[]',
        locations: ['fridge', 'freezer', 'pantry', 'other'],
        fields: [
          { name: 'id', type: 'string', desc: 'Eindeutige ID' },
          { name: 'name', type: 'string', desc: 'Artikelname' },
          { name: 'amount', type: 'string', desc: 'Menge (z.B. "500g", "3 Stk")' },
          { name: 'addedAt', type: 'timestamp', desc: 'Hinzugefügt am' },
        ]
      },
      trackedEvents: [
        'item_added',
        'item_updated',
        'item_removed',
        'location_viewed'
      ],
      permissions: {
        add: ['all'],
        edit: ['all'],
        delete: ['all']
      }
    },
    {
      id: 'recipes',
      name: '👨‍🍳 Rezepte',
      description: 'Verwaltung von Rezepten mit Zutaten-Tracking und Bewertungen',
      status: 'fertig',
      category: 'core',
      dataModel: {
        structure: 'storage.data.recipes[]',
        fields: [
          { name: 'id', type: 'string', desc: 'Eindeutige ID' },
          { name: 'name', type: 'string', desc: 'Rezeptname' },
          { name: 'ingredients', type: 'string[]', desc: 'List von Zutatennamen' },
          { name: 'instructions', type: 'string', desc: 'Zubereitungsanleitung' },
          { name: 'createdBy', type: 'string', desc: 'User-ID des Erstellers' },
          { name: 'createdAt', type: 'timestamp', desc: 'Erstellt am' },
          { name: '_deleted', type: 'boolean', desc: 'Soft-delete-Flag' },
        ]
      },
      trackedEvents: [
        'recipe_created',
        'recipe_viewed',
        'recipe_edited',
        'recipe_deleted'
      ],
      permissions: {
        add: ['all'],
        edit: ['creator', 'admin'],
        delete: ['creator', 'admin']
      }
    },
    {
      id: 'mealplan',
      name: '📅 Wochenplan',
      description: 'Planung von Mahlzeiten pro Woche mit Kochen-Tracking und Bewertungen',
      status: 'fertig',
      category: 'core',
      dataModel: {
        structure: 'storage.data.mealPlan.slots[dateKey:meal]',
        meals: ['breakfast', 'lunchbox', 'dinner'],
        fields: [
          { name: 'recipeId', type: 'string', desc: 'Link zu Rezept-ID' },
          { name: 'cooked', type: 'boolean', desc: 'Wurde gekocht?' },
          { name: 'cookedAt', type: 'timestamp', desc: 'Kochen-Zeitstempel' },
          { name: 'ratings', type: 'object[]', desc: 'Bewertungen pro User' },
          { name: 'servings', type: 'number', desc: 'Portionen' },
        ]
      },
      trackedEvents: [
        'slot_set',
        'slot_moved',
        'slot_moved_by_date',
        'slot_cooked',
        'slot_rated',
        'week_viewed'
      ],
      permissions: {
        set: ['all'],
        cook: ['all'],
        rate: ['all']
      }
    },
    {
      id: 'quests',
      name: '⚔️ Quests',
      description: 'Aufgaben mit Punkte-Vergabe und Abschluss-Tracking',
      status: 'fertig',
      category: 'engagement',
      dataModel: {
        structure: 'storage.data.quests[]',
        fields: [
          { name: 'id', type: 'string', desc: 'Eindeutige ID' },
          { name: 'title', type: 'string', desc: 'Questname' },
          { name: 'description', type: 'string', desc: 'Beschreibung' },
          { name: 'points', type: 'number', desc: 'Punkt-Belohnung' },
          { name: 'assignedTo', type: 'string[]', desc: 'User-IDs der Zuweisung' },
          { name: 'isCompleted', type: 'boolean', desc: 'Abgeschlossen?' },
          { name: 'completedAt', type: 'timestamp', desc: 'Abgeschlossen am' },
          { name: '_deleted', type: 'boolean', desc: 'Soft-delete-Flag' },
        ]
      },
      trackedEvents: [
        'quest_created',
        'quest_assigned',
        'quest_completed',
        'rotation_assignee_switched',
        'rotation_completed_by_other_user',
        'quest_deleted',
        'points_earned'
      ],
      permissions: {
        create: ['admin'],
        assign: ['admin'],
        complete: ['assigned'],
        view: ['all']
      }
    },
    {
      id: 'rewards',
      name: '🎁 Belohnungen',
      description: 'Shop für Punkte-Austausch gegen Belohnungen',
      status: 'fertig',
      category: 'engagement',
      dataModel: {
        structure: 'storage.data.rewards[]',
        fields: [
          { name: 'id', type: 'string', desc: 'Eindeutige ID' },
          { name: 'name', type: 'string', desc: 'Belohnungsname' },
          { name: 'points', type: 'number', desc: 'Kosten in Punkten' },
          { name: 'redeemCount', type: 'number', desc: 'Wie oft eingelöst?' },
          { name: '_deleted', type: 'boolean', desc: 'Soft-delete-Flag' },
        ]
      },
      trackedEvents: [
        'reward_viewed',
        'reward_redeemed',
        'reward_created'
      ],
      permissions: {
        view: ['all'],
        redeem: ['all'],
        create: ['admin']
      }
    },
    {
      id: 'chronicle',
      name: '📖 Chronik',
      description: 'Aktivitätslog aller Punkte-Transaktionen und wichtigen Events',
      status: 'fertig',
      category: 'analytics',
      dataModel: {
        structure: 'storage.data.chronicle[]',
        fields: [
          { name: 'id', type: 'string', desc: 'Eindeutige ID' },
          { name: 'userId', type: 'string', desc: 'Betroffener User' },
          { name: 'action', type: 'string', desc: 'addPoints, spendPoints, reward, etc.' },
          { name: 'points', type: 'number', desc: 'Punkt-Differenz' },
          { name: 'reason', type: 'string', desc: 'Grund/Beschreibung' },
          { name: 'timestamp', type: 'timestamp', desc: 'Zeitstempel' },
        ]
      },
      trackedEvents: [
        'entry_logged',
        'history_viewed'
      ],
      permissions: {
        view: ['all'],
        edit: ['admin']
      }
    },
    {
      id: 'bill',
      name: '📸 Kassenbon-OCR',
      description: 'OCR-Verarbeitung von Fotos zu Einkaufsartikeln via Tesseract',
      status: 'fertig',
      category: 'tools',
      dataModel: {
        structure: 'storage.data.bills[]',
        fields: [
          { name: 'id', type: 'string', desc: 'Eindeutige ID' },
          { name: 'timestamp', type: 'timestamp', desc: 'Gescannt am' },
          { name: 'imageUrl', type: 'string', desc: 'Lokale Blob-URL' },
          { name: 'extractedText', type: 'string', desc: 'OCR-Output' },
          { name: 'suggestedItems', type: 'string[]', desc: 'Erkannte Artikel' },
          { name: 'userId', type: 'string', desc: 'Eingescannt von' },
        ]
      },
      trackedEvents: [
        'bill_scanned',
        'items_extracted',
        'items_added_to_shopping'
      ],
      permissions: {
        scan: ['all'],
        extract: ['all'],
        view: ['all']
      }
    },
    {
      id: 'reisekasse',
      name: '💰 Reisekasse',
      description: 'Verwaltung von gemeinsamen Ausgaben und Ausgleich während Reisen',
      status: 'fertig',
      category: 'finances',
      dataModel: {
        structure: 'storage.data.reisekasse[]',
        fields: [
          { name: 'id', type: 'string', desc: 'Eindeutige ID' },
          { name: 'amount', type: 'number', desc: 'Betrag in €' },
          { name: 'paidBy', type: 'string', desc: 'User-ID des Bezahlers' },
          { name: 'description', type: 'string', desc: 'Was wurde gekauft?' },
          { name: 'participants', type: 'string[]', desc: 'User-IDs der Beteiligten' },
          { name: 'timestamp', type: 'timestamp', desc: 'Aktualisiert am' },
        ]
      },
      trackedEvents: [
        'expense_added',
        'expense_split',
        'settlement_calculated',
        'settlement_paid'
      ],
      permissions: {
        add: ['all'],
        view: ['all'],
        settle: ['all']
      }
    },
  ],

  authentication: {
    model: 'Multi-Benutzer ohne Premium-Login',
    description: 'Jedes Familienmitglied wird manuell erstellt und ist offline verfügbar',
    storage: 'storage.data.users[], storage.activeUserId',
    features: [
      'Lokale Benutzer-Verwaltung (kein zentraler Server erforderlich)',
      'Offline-First: Alle Daten in localStorage',
      'Optional: Cloud-Sync über JSONBin für Multi-Device',
      'Keine Passwörter/Authentifizierung (App läuft lokal)',
    ]
  },

  permissions: {
    roleModel: 'User-basiert, vogl. Benutzertyp (Admin bevormundet)',
    levels: [
      { role: 'admin', desc: 'Volle Kontrolle über Quests, System-Settings' },
      { role: 'user', desc: 'Kann shoppen, Vorrat sehen, Quests abhaken, bewerten' },
      { role: 'readonly', desc: 'Kann nur ansehen (observer-Modus)' },
    ],
    featurePermissions: 'Pro Feature definiert (siehe .features[].permissions)'
  },

  dataRetention: {
    localStorage: 'Unbegrenzt (Nutzer verwaltet)',
    cloudSync: 'Optional über JSONBin, läuft manuell',
    tracking: 'Separat unter unser-nest-analytics-v1, lokal nur'
  }
};

/**
 * Hilfsfunktionen für Dokumentations-Zugriff
 */
export function getFeatureById(featureId) {
  return DOCUMENTATION.features.find(f => f.id === featureId);
}

export function getFeaturesByCategory(category) {
  return DOCUMENTATION.features.filter(f => f.category === category);
}

export function getFeaturesSorted() {
  return DOCUMENTATION.features.sort((a, b) => a.name.localeCompare(b.name));
}

export function getTrackedEvents(featureId) {
  const feature = getFeatureById(featureId);
  return feature ? feature.trackedEvents : [];
}

