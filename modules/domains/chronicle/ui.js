// modules/chronicleUI.js
import {
  createBundle,
  createSummary,
  bundleFileName,
  importFromDocuments
} from '../../core/backup.js';

export class ChronicleUI {
  constructor(app) {
    this.app = app;
  }

  render() {
    const container = document.getElementById('chronicleList');
    const entries = this.app.chronicles.getEntries();

    let html = '';
    
    // Export/Import Buttons
    html += `
      <div class="form mb--2">
        <div class="form__row">
          <button class="btn btn--primary btn--small" onclick="app.chronicleUI.exportData()">💾 Backup speichern</button>
          <button class="btn btn--small" onclick="document.getElementById('importFile').click()">📁 Backup einspielen</button>
          <button class="btn btn--small" onclick="app.chronicleUI.restorePublishedBackup()">♻️ Mitgelieferte Sicherung</button>
          <input type="file" id="importFile" style="display:none" accept=".json" multiple onchange="app.chronicleUI.handleImport(this)">
        </div>
        <div class="item__meta">
          <strong>Backup</strong> = Schnappschuss aller aktuellen Daten als JSON-Datei.<br>
          <strong>Einspielen</strong> = Überschreibt alle Daten in der App mit dem Stand der Backup-Datei.
          Danach wird der Stand automatisch mit der Cloud synchronisiert (falls konfiguriert).<br>
          <strong>Mitgelieferte Sicherung</strong> = spielt die im Deployment enthaltene JSON-Datei ein (ohne Dateiauswahl).
        </div>
      </div>
    `;

    // Backup-Vorschau
    const summary = createSummary(this.app.storage.data);
    html += `
      <div class="card" style="margin-bottom: 16px;">
        <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 8px;">📦 Aktueller Stand – wird im Backup gesichert</div>
        <div style="font-size: 0.8rem; color: var(--text-soft);">
          ${summary.map(s => `
            <div style="display:flex; justify-content:space-between; padding: 3px 0; border-bottom: 1px solid var(--border);">
              <span><strong>${s.label}</strong><span style="color:var(--text-soft); margin-left:6px;">${s.description || ''}</span></span>
              <span style="white-space:nowrap; margin-left:8px;">${s.count !== null ? s.count + ' Eintr.' : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Statistiken
    const stats = this.app.chronicles.getStats();
    if (stats.totalEntries > 0) {
      html += `
        <div class="card" style="background: var(--accent-soft); margin-bottom: 16px;">
          <div style="font-size: 0.9rem; font-weight: 600;">📊 Aktivitätsstatistiken</div>
          <div style="font-size: 0.8rem; color: var(--text-soft); margin-top: 8px;">
            Insgesamt: <strong>${stats.totalEntries} Einträge</strong>
          </div>
        </div>
      `;
    }

    html += this.renderAnalyticsPanel();

    // Chronik-Einträge
    html += entries.length === 0
      ? '<div class="empty"><div class="empty__icon">📖</div>Noch keine Chronik-Einträge</div>'
      : entries.map(e => `
          <div class="item">
            <div class="item__content">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 1.2rem;">${e.emoji || '📝'}</span>
                <div style="flex: 1;">
                  <div class="item__name">${e.text}</div>
                  <div class="item__meta">${e.date}</div>
                </div>
              </div>
              ${e.metadata && Object.keys(e.metadata).length > 0 ? `
                <div style="font-size: 0.75rem; color: var(--text-soft); margin-top: 4px; padding: 4px; background: rgba(0,0,0,0.02); border-radius: 4px;">
                  ${Object.entries(e.metadata).map(([k, v]) => `<div><strong>${k}:</strong> ${JSON.stringify(v)}</div>`).join('')}
                </div>
              ` : ''}
            </div>
            <button class="btn btn--danger btn--small" style="height: fit-content;" onclick="app.chronicleUI.deleteEntry('${e.id}')">🗑</button>
          </div>
        `).join('');
    
    container.innerHTML = html;
  }

  renderAnalyticsPanel() {
    try {
      const dash = this.app.analyticsManager.getDashboard();
      return `
        <div class="card" style="margin-bottom: 16px;">
          <div style="font-size: 0.95rem; font-weight: 600; margin-bottom: 8px;">📈 Analytics (in Chronik)</div>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-bottom: 10px;">
            <div style="padding:8px; border:1px solid var(--border); border-radius:8px;"><strong>${dash.summary.totalEvents}</strong><br><span style="font-size:0.8rem;color:var(--text-soft);">Events</span></div>
            <div style="padding:8px; border:1px solid var(--border); border-radius:8px;"><strong>${dash.summary.uniqueUsers}</strong><br><span style="font-size:0.8rem;color:var(--text-soft);">Nutzer</span></div>
            <div style="padding:8px; border:1px solid var(--border); border-radius:8px;"><strong>${dash.summary.totalFeatures}</strong><br><span style="font-size:0.8rem;color:var(--text-soft);">Features</span></div>
            <div style="padding:8px; border:1px solid var(--border); border-radius:8px;"><strong>${dash.summary.mostActiveFeature || '—'}</strong><br><span style="font-size:0.8rem;color:var(--text-soft);">Top-Feature</span></div>
          </div>
          <div class="form__row">
            <button class="btn btn--small" onclick="app.analyticsExportJSON()">📄 Analytics JSON</button>
            <button class="btn btn--small" onclick="app.analyticsExportCSV()">📊 Analytics CSV</button>
          </div>
        </div>
      `;
    } catch (e) {
      return `
        <div class="card" style="margin-bottom: 16px;">
          <div style="font-size: 0.9rem; color: var(--text-soft);">📈 Analytics aktuell nicht verfügbar.</div>
        </div>
      `;
    }
  }

  deleteEntry(entryId) {
    if (confirm('Eintrag löschen?')) {
      this.app.chronicles.deleteEntry(entryId);
      this.app.updateUI();
    }
  }

  exportData() {
    const now = new Date();
    const backup = createBundle(this.app.storage.data, this.app.storage.activeUserId, now);
    this.downloadJson(bundleFileName(now), backup);
    this.app.toast('💾 Backup heruntergeladen');
  }

  downloadJson(fileName, data) {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async handleImport(input) {
    const files = Array.from(input.files || []);
    if (!files.length) return;

    try {
      const docs = await Promise.all(files.map(file => file.text().then(text => JSON.parse(text))));
      if (!confirm(
        `Backup einspielen?\n\n` +
        `Alle aktuellen Daten (Vorrat, Einkauf, Rezepte, Speiseplan, Quests, Punkte, Reisekasse, Chronik) ` +
        `werden durch den Stand dieser Backup-Datei ersetzt.\n\n` +
        `Der neue Stand wird danach automatisch in die Cloud synchronisiert.`
      )) {
        return;
      }

      const imported = importFromDocuments(docs, this.app.storage.data);
      this.app.applyImportedData(imported.state, imported.activeUserId);
      this.app.toast('✅ Daten importiert!');
    } catch (err) {
      alert('Fehler: ' + err.message);
    }

    input.value = '';
  }

  async restorePublishedBackup() {
    await this.app.restorePublishedSeed();
  }
}
