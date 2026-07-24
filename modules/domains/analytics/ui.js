/**
 * modules/domains/analytics/ui.js
 *
 * Visualisierung von Tracking-Daten: Dashboard, Reports, Export.
 */

export class AnalyticsUI {
  constructor(app) {
    this.app = app;
    this.analytics = app.analyticsManager;
  }

  renderDashboard() {
    const dash = this.analytics.getDashboard();
    const ranking = this.analytics.getFeatureRanking();

    const html = `
      <div class="analytics-container">
        <h2>📊 Analytics Dashboard</h2>
        
        <!-- Zusammenfassung -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${dash.summary.totalEvents}</div>
            <div class="stat-label">Gesamt-Events</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${dash.summary.uniqueUsers}</div>
            <div class="stat-label">Aktive Benutzer</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${dash.summary.totalFeatures}</div>
            <div class="stat-label">Features</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._formatTime(dash.summary.lastEventAt)}</div>
            <div class="stat-label">Letzte Aktivität</div>
          </div>
        </div>

        <!-- Feature-Ranking -->
        <div class="section">
          <h3>🏆 Feature-Ranking (Nutzung)</h3>
          <table class="analytics-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Events</th>
                <th>Nutzer</th>
                <th>ø/User</th>
                <th>Typen</th>
              </tr>
            </thead>
            <tbody>
              ${ranking.map((f, i) => `
                <tr>
                  <td><strong>${i + 1}. ${f.featureId}</strong></td>
                  <td>${f.totalEvents}</td>
                  <td>${f.uniqueUsers}</td>
                  <td>${f.avgEventsPerUser}</td>
                  <td>${f.eventTypes}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Export-Optionen -->
        <div class="section">
          <h3>📥 Daten exportieren</h3>
          <button onclick="app.analyticsExportJSON()" class="btn btn-primary">
            📄 JSON exportieren
          </button>
          <button onclick="app.analyticsExportCSV()" class="btn btn-primary">
            📊 CSV exportieren
          </button>
          <button onclick="app.analyticsExportMonthly()" class="btn btn-primary">
            📋 1-Monat-Report
          </button>
        </div>

        <!-- Tracking-Info -->
        <div class="section">
          <h3>ℹ️ Tracking-Info</h3>
          <p>
            Die App verfolgt automatisch im Hintergrund, welche Funktionen von wem und wann genutzt werden.
            Diese Daten werden <strong>lokal in Ihrem Browser</strong> gespeichert und nicht an externe Server übertragen.
          </p>
          <p>
            Tracking kann jederzeit gelöscht werden:
          </p>
          <button onclick="app.clearAllAnalytics()" class="btn btn-danger">
            🗑️ Alle Tracking-Daten löschen
          </button>
        </div>
      </div>
    `;

    const container = document.getElementById('analyticsContent');
    if (container) {
      container.innerHTML = html;
    }

    return html;
  }

  renderMonthlyReport() {
    const report = this.analytics.getMonthlyReport(30);

    return `
      <div class="analytics-container">
        <h2>📊 Monatlicher Report</h2>
        <p><small>Generiert: ${this._formatDateTime(report.generatedAt)}</small></p>

        <!-- Zusammenfassung -->
        <div class="section">
          <h3>Zusammenfassung</h3>
          <ul class="stats-list">
            <li><strong>Zeitraum:</strong> ${report.period}</li>
            <li><strong>Gesamte Events:</strong> ${report.summary.totalEvents}</li>
            <li><strong>Tage mit Aktivität:</strong> ${report.summary.daysActive}</li>
            <li><strong>Ø Events/Tag:</strong> ${report.summary.avgEventsPerDay}</li>
            <li><strong>Top-Tag:</strong> ${report.summary.peakDay} (${report.dailyTrends[report.summary.peakDay]} events)</li>
          </ul>
        </div>

        <!-- Top Features -->
        <div class="section">
          <h3>🔥 Top 5 Features</h3>
          <table class="analytics-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Events</th>
                <th>Nutzer</th>
                <th>ø/User</th>
              </tr>
            </thead>
            <tbody>
              ${report.topFeatures.map(f => `
                <tr>
                  <td><strong>${f.featureId}</strong></td>
                  <td>${f.totalEvents}</td>
                  <td>${f.uniqueUsers}</td>
                  <td>${f.avgEventsPerUser}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Tägliche Trends (Grafik-Daten) -->
        <div class="section">
          <h3>📈 Tägliche Trends</h3>
          <div class="trend-chart">
            ${this._renderSimpleChart(report.dailyTrends)}
          </div>
        </div>

        <!-- Download -->
        <div class="section">
          <button onclick="app.analyticsExportMonthly()" class="btn btn-primary">
            💾 Als JSON speichern
          </button>
        </div>
      </div>
    `;
  }

  renderUserReport(userId) {
    const report = this.analytics.getUserReport(userId);

    return `
      <div class="analytics-container">
        <h2>👤 Nutzer-Report: ${userId}</h2>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${report.totalActions}</div>
            <div class="stat-label">Aktionen gesamt</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${report.featureBreakdown.length}</div>
            <div class="stat-label">Features genutzt</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._formatTime(report.firstActivityAt)}</div>
            <div class="stat-label">Erste Aktivität</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._formatTime(report.lastActivityAt)}</div>
            <div class="stat-label">Letzte Aktivität</div>
          </div>
        </div>

        <div class="section">
          <h3>Feature-Nutzung</h3>
          <table class="analytics-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Aktionen</th>
                <th>Letzte Aktivität</th>
              </tr>
            </thead>
            <tbody>
              ${report.featureBreakdown.map(f => `
                <tr>
                  <td>${f.featureId}</td>
                  <td>${f.count}</td>
                  <td>${this._formatTime(f.lastActivityAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── Private ────────────────────────────────────────────────────────────────────

  _formatTime(timestamp) {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  _formatDateTime(isoString) {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString('de-DE', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  _renderSimpleChart(trends) {
    const values = Object.values(trends);
    const maxValue = Math.max(...values, 1);
    const dates = Object.keys(trends);

    // Vereinfachtes Bar-Chart rendering
    return `
      <div style="font-size: 12px; line-height: 1.8;">
        ${dates.map(date => {
          const count = trends[date];
          const barWidth = Math.max(1, Math.round((count / maxValue) * 200));
          return `
            <div style="margin: 4px 0;">
              <div style="display: inline-block; width: 70px; font-weight: bold;">${date}</div>
              <div style="display: inline-block; background: #4CAF50; height: 20px; width: ${barWidth}px;"></div>
              <span style="margin-left: 10px;">${count}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}

