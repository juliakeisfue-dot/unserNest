/**
 * modules/core/tracker.js
 *
 * Automatisches Funktions-Tracking für Analytics.
 * Erfasst Benutzeraktionen lokal in localStorage ohne Netzwerk-Aufwand.
 *
 * Verwendung:
 *   tracker.trackFeatureUsage('shopping', 'item_added', activeUserId, { itemName: 'Milch' });
 *   const analytics = tracker.getAnalytics();
 */

const STORAGE_KEY = 'unser-nest-analytics-v1';
const BATCH_SIZE = 1000; // Batch-Limit pro Feature

export class TrackerManager {
  constructor() {
    this.events = this._loadFromStorage();
  }

  /**
   * Hauptmethode: Track eine Feature-Aktion
   * @param {string} featureId - z.B. 'shopping', 'quests', 'mealplan'
   * @param {string} eventName - z.B. 'item_added', 'quest_completed'
   * @param {string} userId - Aktiver User-ID
   * @param {object} metadata - Optionale zusätzliche Daten
   */
  trackFeatureUsage(featureId, eventName, userId, metadata = {}) {
    if (!featureId || !eventName || !userId) return; // Sicherheits-Check

    const event = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      featureId,
      eventName,
      userId,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      metadata, // { itemName, recipeId, points, etc. }
    };

    // In-Memory speichern
    if (!this.events[featureId]) {
      this.events[featureId] = [];
    }
    this.events[featureId].push(event);

    // Sofort persistieren
    this._saveToStorage();

    // Optional: Alte Events löschen wenn zu viele (Speicher-Management)
    if (this.events[featureId].length > BATCH_SIZE) {
      this.events[featureId] = this.events[featureId].slice(-BATCH_SIZE);
      this._saveToStorage();
    }

    return event.id;
  }

  /**
   * Alle Events als Objekt abrufen
   * @returns { featureId: Event[] }
   */
  getAllEvents() {
    return JSON.parse(JSON.stringify(this.events)); // deep copy
  }

  /**
   * Aggregierte Analytics für eine Feature
   * @param {string} featureId
   * @returns { totalEvents, uniqueUsers, eventsPerUser, lastEventAt, eventBreakdown }
   */
  getFeatureAnalytics(featureId) {
    const events = this.events[featureId] || [];
    if (events.length === 0) {
      return {
        featureId,
        totalEvents: 0,
        uniqueUsers: 0,
        eventsPerUser: {},
        eventBreakdown: {},
        lastEventAt: null,
      };
    }

    const uniqueUsers = new Set();
    const eventsPerUser = {};
    const eventBreakdown = {};

    events.forEach(event => {
      uniqueUsers.add(event.userId);
      eventsPerUser[event.userId] = (eventsPerUser[event.userId] || 0) + 1;
      eventBreakdown[event.eventName] = (eventBreakdown[event.eventName] || 0) + 1;
    });

    return {
      featureId,
      totalEvents: events.length,
      uniqueUsers: uniqueUsers.size,
      eventsPerUser,
      eventBreakdown,
      lastEventAt: events[events.length - 1].timestamp,
    };
  }

  /**
   * Dashboard-Analytics: Alle Features aggregiert
   * @returns Array von Feature-Analytics, sortiert nach Nutzung
   */
  getAnalytics() {
    return Object.keys(this.events)
      .map(featureId => this.getFeatureAnalytics(featureId))
      .sort((a, b) => b.totalEvents - a.totalEvents);
  }

  /**
   * Nutzer-zentrale View: Was hat dieser Nutzer wo gemacht?
   * @param {string} userId
   * @returns { featureId: [...events] }
   */
  getUserActivity(userId) {
    const activity = {};
    Object.entries(this.events).forEach(([featureId, events]) => {
      const userEvents = events.filter(e => e.userId === userId);
      if (userEvents.length > 0) {
        activity[featureId] = userEvents;
      }
    });
    return activity;
  }

  /**
   * Zeitliche Verteilung: Events pro Tag (für Charts)
   * @param {string} featureId - Optional: nur diese Feature, sonst alle
   * @returns { '2026-03-20': count, '2026-03-21': count, ... }
   */
  getEventsByDate(featureId = null) {
    const dateMap = {};
    const allEvents = featureId ? (this.events[featureId] || []) : Object.values(this.events).flat();

    allEvents.forEach(event => {
      const date = event.date;
      dateMap[date] = (dateMap[date] || 0) + 1;
    });

    return dateMap;
  }

  /**
   * Detaillierte Events für einen Zeitraum
   * @param {string} featureId
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns Event[]
   */
  getEventsByDateRange(featureId, startDate, endDate) {
    const events = this.events[featureId] || [];
    const start = startDate.getTime();
    const end = endDate.getTime();
    return events.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  /**
   * Report exportieren als JSON (für 1-Monat-Auswertung)
   * @returns JSON-String
   */
  exportAsJSON() {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        data: this.events,
        summary: this.getAnalytics(),
      },
      null,
      2
    );
  }

  /**
   * Report als CSV (Benutzer-zentriert)
   * @returns CSV-String
   */
  exportAsCSV() {
    const rows = ['timestamp,date,featureId,eventName,userId,metadata'];

    Object.values(this.events).flat().forEach(event => {
      const metadataStr = JSON.stringify(event.metadata).replace(/"/g, '""');
      rows.push(
        `${event.timestamp},${event.date},${event.featureId},${event.eventName},${event.userId},"${metadataStr}"`
      );
    });

    return rows.join('\n');
  }

  /**
   * Daten zurücksetzen (Vorsicht!)
   */
  clearAll() {
    this.events = {};
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Feature-spezifisch löschen
   */
  clearFeature(featureId) {
    delete this.events[featureId];
    this._saveToStorage();
  }

  // ── Private ────────────────────────────────────────────────────────────────────

  _loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('[Tracker] Fehler beim Laden aus localStorage:', e);
      return {};
    }
  }

  _saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
    } catch (e) {
      console.error('[Tracker] Fehler beim Speichern in localStorage:', e);
      // Silent fail: Tracker sollte die App nicht blockieren
    }
  }
}

// Globale Instanz
export const tracker = new TrackerManager();

