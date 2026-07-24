/**
 * modules/domains/documentation/ui.js
 *
 * Renderung der Feature-Dokumentation.
 */

export class DocumentationUI {
  constructor(app) {
    this.app = app;
    this.docManager = app.docManager;
  }

  render() {
    const doc = this.docManager.getFullDocumentation();
    const container = document.getElementById('documentationContent');
    if (!container) return;

    container.innerHTML = this._renderDocumentation(doc);
  }

  _renderDocumentation(doc) {
    return `
      <div class="documentation-container">
        <h1>📚 ${doc.appName} v${doc.appVersion}</h1>
        <p><em>${doc.purpose}</em></p>
        <p><small>Dokumentation aktualisiert: ${new Date(doc.lastUpdated).toLocaleDateString('de-DE')}</small></p>

        <!-- Kurzbeschreibung -->
        <section class="doc-section">
          <h2>📖 Übersicht</h2>
          <p>
            <strong>${doc.appName}</strong> ist eine<strong> PWA für Familienorganisation</strong>, 
            die komplett <strong>lokal auf Ihrem Gerät</strong> läuft. Keine Registrierung, 
            keine Datenübertragung an externe Server (wenn nicht gewünscht).
          </p>
        </section>

        <!-- Core Features -->
        <section class="doc-section">
          <h2>✨ Funktionen</h2>
          ${this._renderFeaturesList(doc.features)}
        </section>

        <!-- Authentifizierung -->
        <section class="doc-section">
          <h2>🔐 Authentifizierung & Benutzer</h2>
          <h3>${doc.authentication.model}</h3>
          <p>${doc.authentication.description}</p>
          <ul>
            ${doc.authentication.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </section>

        <!-- Berechtigungen -->
        <section class="doc-section">
          <h2>🛡️ Berechtigungen</h2>
          <p>${doc.permissions.roleModel}</p>
          <h3>Rollen:</h3>
          <ul>
            ${doc.permissions.levels.map(l => `
              <li><strong>${l.role}</strong>: ${l.desc}</li>
            `).join('')}
          </ul>
        </section>

        <!-- Datenspeicherung -->
        <section class="doc-section">
          <h2>💾 Datenspeicherung</h2>
          <ul>
            <li><strong>localStorage:</strong> ${doc.dataRetention.localStorage}</li>
            <li><strong>Cloud-Sync (optional):</strong> ${doc.dataRetention.cloudSync}</li>
            <li><strong>Tracking:</strong> ${doc.dataRetention.tracking}</li>
          </ul>
        </section>

        <!-- Feature Details -->
        <section class="doc-section">
          <h2>🔍 Feature-Details</h2>
          ${this._renderFeatureDetails(doc.features)}
        </section>
      </div>
    `;
  }

  _renderFeaturesList(features) {
    return `
      <div class="features-grid">
        ${features.map(f => `
          <div class="feature-card">
            <h3>${f.name}</h3>
            <p>${f.description}</p>
            <div class="feature-meta">
              <span class="status-badge status-${f.status}">${f.status}</span>
              <span class="category-badge">${f.category}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  _renderFeatureDetails(features) {
    return features.map(f => `
      <div class="feature-detail">
        <h3>${f.name}</h3>
        <p><strong>Status:</strong> <span class="status-badge status-${f.status}">${f.status}</span></p>
        <p><strong>Kategorie:</strong> ${f.category}</p>
        <p>${f.description}</p>

        <h4>Datenmodell:</h4>
        <pre><code>${f.dataModel.structure}</code></pre>
        <table class="doc-table">
          <thead>
            <tr>
              <th>Feld</th>
              <th>Typ</th>
              <th>Beschreibung</th>
            </tr>
          </thead>
          <tbody>
            ${f.dataModel.fields.map(field => `
              <tr>
                <td><code>${field.name}</code></td>
                <td><code>${field.type}</code></td>
                <td>${field.desc}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h4>Tracked Events:</h4>
        <ul>
          ${f.trackedEvents.map(e => `<li><code>${e}</code></li>`).join('')}
        </ul>

        <h4>Berechtigungen:</h4>
        <ul>
          ${Object.entries(f.permissions).map(([action, roles]) => `
            <li><strong>${action}:</strong> ${roles.join(', ')}</li>
          `).join('')}
        </ul>
      </div>
    `).join('');
  }
}

