/**
 * modules/domains/analytics/manager.js
 *
 * Aggregation und Analyse von Tracking-Daten.
 * Liefert Reports, Statistiken und Export-Funktionen.
 */

export class AnalyticsManager {
  constructor(tracker) {
    this.tracker = tracker;
  }

  /**
   * Gesamt-Dashboard: Alle Metriken
   */
  getDashboard() {
    const analytics = this.tracker.getAnalytics();
    const allEvents = this.tracker.getAllEvents();
    const normalizedEvents = this._normalizeEvents(allEvents);

    const totalEvents = normalizedEvents.length;
    const allFeatures = analytics.length;
    const mostActive = analytics[0] || null;

    // Nutzer-Statistik
    const uniqueUsers = new Set();
    normalizedEvents.forEach(e => uniqueUsers.add(e.userId));

    return {
      summary: {
        totalEvents,
        totalFeatures: allFeatures,
        uniqueUsers: uniqueUsers.size,
        mostActiveFeature: mostActive?.featureId || null,
        lastEventAt: this._getLastEventTime(normalizedEvents),
      },
      features: analytics.slice(0, 10), // Top 10
      userCount: uniqueUsers.size,
    };
  }

  /**
   * Pro-User-Report: Was hier welche User gemacht?
   */
  getUserReport(userId) {
    const activity = this.tracker.getUserActivity(userId);
    const totalActions = Object.values(activity).reduce((sum, events) => sum + events.length, 0);

    return {
      userId,
      totalActions,
      featureBreakdown: Object.entries(activity).map(([featureId, events]) => ({
        featureId,
        count: events.length,
        lastActivityAt: events[events.length - 1]?.timestamp,
      })),
      firstActivityAt: this._getFirstEventTime(Object.values(activity).flat()),
      lastActivityAt: this._getLastEventTime(Object.values(activity).flat()),
    };
  }

  /**
   * Zeitliche Trends: Events pro Wochentag
   */
  getTrendsByDay(days = 30) {
    const now = Date.now();
    const startDate = new Date(now - days * 24 * 60 * 60 * 1000);
    const endDate = new Date(now);

    const eventsByDate = this.tracker.getEventsByDate();
    const trends = {};

    // Date-Range durchgehen
    let current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      trends[dateStr] = eventsByDate[dateStr] || 0;
      current.setDate(current.getDate() + 1);
    }

    return trends;
  }

  /**
   * Feature-Vergleich: Rankings, Beliebtheit
   */
  getFeatureRanking() {
    return this.tracker.getAnalytics().map((fa, idx) => ({
      rank: idx + 1,
      featureId: fa.featureId,
      totalEvents: fa.totalEvents,
      uniqueUsers: fa.uniqueUsers,
      avgEventsPerUser: Math.round((fa.totalEvents / fa.uniqueUsers) * 10) / 10,
      lastActivityAt: fa.lastEventAt,
      eventTypes: Object.keys(fa.eventBreakdown).length,
    }));
  }

  /**
   * Tägliche Zusammenfassung: Für 1-Monat-Review
   */
  getMonthlyReport(daysBack = 30) {
    const trends = this.getTrendsByDay(daysBack);
    const ranking = this.getFeatureRanking();
    const totalEvents = Object.values(trends).reduce((a, b) => a + b, 0);

    return {
      period: `${daysBack} Tage`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalEvents,
        daysActive: Object.values(trends).filter(c => c > 0).length,
        avgEventsPerDay: Math.round(totalEvents / daysBack),
        peakDay: this._getPeakDay(trends),
      },
      dailyTrends: trends,
      featureRanking: ranking,
      topFeatures: ranking.slice(0, 5),
    };
  }

  /**
   * Export alle Daten als JSON (Backup für Verkauf)
   */
  exportFullReport() {
    return {
      exportedAt: new Date().toISOString(),
      dashboard: this.getDashboard(),
      monthlyReport: this.getMonthlyReport(30),
      ranking: this.getFeatureRanking(),
      rawData: this.tracker.exportAsJSON(),
    };
  }

  /**
   * CSV-Export (für Excel/Google Sheets Analyse)
   */
  exportAsCSV() {
    return this.tracker.exportAsCSV();
  }

  // ── Private ────────────────────────────────────────────────────────────────────

  _getLastEventTime(events) {
    const flat = this._normalizeEvents(events);
    if (flat.length === 0) return null;
    return Math.max(...flat.map(e => e.timestamp));
  }

  _getFirstEventTime(events) {
    const flat = this._normalizeEvents(events);
    if (flat.length === 0) return null;
    return Math.min(...flat.map(e => e.timestamp));
  }

  _normalizeEvents(events) {
    if (!events) return [];

    if (Array.isArray(events)) {
      if (events.length === 0) return [];
      if (events[0] && typeof events[0] === 'object' && Object.prototype.hasOwnProperty.call(events[0], 'timestamp')) {
        return events;
      }
      return events.filter(Array.isArray).flat();
    }

    if (typeof events === 'object') {
      return Object.values(events).filter(Array.isArray).flat();
    }

    return [];
  }

  _getPeakDay(trends) {
    let peakDay = null;
    let peakCount = 0;
    Object.entries(trends).forEach(([date, count]) => {
      if (count > peakCount) {
        peakCount = count;
        peakDay = date;
      }
    });
    return peakDay;
  }
}

