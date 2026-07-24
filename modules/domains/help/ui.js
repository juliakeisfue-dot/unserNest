// modules/domains/help/ui.js
export class HelpUI {
  constructor(app) {
    this.app = app;
    this.selectedSection = 'overview';
  }

  render() {
    const container = document.getElementById('helpSection');
    if (!container) return;

    const currentSection = this.app.help.getSection(this.selectedSection);
    if (!currentSection) return;

    const categories = this.app.help.getCategories();
    const allSections = this.app.help.getAllSections();

    // Kategorie-Tabs (wie nav__btn)
    const tabs = categories.map(cat => `
      <button class="nav__btn ${currentSection.category === cat ? 'nav__btn--active' : ''}"
              onclick="app.helpUI.showCategory('${cat}')">
        ${cat}
      </button>
    `).join('');

    // Sections der aktiven Kategorie
    const sectionsInCat = allSections.filter(s => s.category === currentSection.category);
    const sectionButtons = sectionsInCat.map(sec => `
      <button class="btn btn--small ${sec.id === this.selectedSection ? 'btn--primary' : ''}"
              onclick="app.helpUI.selectSection('${sec.id}')"
              style="margin: 4px 4px 4px 0;">
        ${sec.title}
      </button>
    `).join('');

    const content = this.toHtml(currentSection.content);

    container.innerHTML = `
      <div class="card">
        <h2 class="card__title">📖 Hilfe</h2>

        <div style="margin-bottom:12px;">
          ${tabs}
        </div>

        <div style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--border);">
          ${sectionButtons}
        </div>

        <div style="font-size:0.95rem; line-height:1.7; color:var(--text);">
          ${content}
        </div>
      </div>
    `;
  }

  showCategory(cat) {
    const first = this.app.help.getSectionsByCategory(cat)[0];
    if (first) this.selectedSection = first.id;
    this.render();
  }

  selectSection(id) {
    this.selectedSection = id;
    this.render();
  }

  // Zeilen­weiser Text → HTML
  toHtml(text) {
    if (!text) return '';

    const lines = text.replace(/\r\n/g, '\n').trim().split('\n');
    let out = '';
    let inUl = false;
    let inOl = false;

    const closeList = () => {
      if (inUl) { out += '</ul>'; inUl = false; }
      if (inOl) { out += '</ol>'; inOl = false; }
    };

    const fmt = (s) => {
      s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/`([^`]+)`/g, '<code style="background:var(--bg);padding:2px 5px;border-radius:3px;font-size:0.9em;">$1</code>');
      return s;
    };

    for (const raw of lines) {
      const line = raw.trimEnd();

      if (line.trim() === '') {
        closeList();
        out += '<br>';
        continue;
      }

      if (line.startsWith('# ')) {
        closeList();
        out += `<h2 style="font-size:1.3rem;margin:16px 0 8px;color:var(--accent);">${fmt(line.slice(2))}</h2>`;
        continue;
      }
      if (line.startsWith('## ')) {
        closeList();
        out += `<h3 style="font-size:1.1rem;margin:14px 0 6px;color:var(--accent);">${fmt(line.slice(3))}</h3>`;
        continue;
      }
      if (line.startsWith('### ')) {
        closeList();
        out += `<strong style="display:block;margin:10px 0 4px;">${fmt(line.slice(4))}</strong>`;
        continue;
      }

      if (/^-{3,}$/.test(line.trim())) {
        closeList();
        out += '<hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">';
        continue;
      }

      if (line.startsWith('- ')) {
        if (!inUl) { out += '<ul style="margin:8px 0;padding-left:20px;">'; inUl = true; }
        out += `<li style="margin:4px 0;">${fmt(line.slice(2))}</li>`;
        continue;
      }

      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        if (!inOl) { out += '<ol style="margin:8px 0;padding-left:20px;">'; inOl = true; }
        out += `<li style="margin:4px 0;">${fmt(numMatch[2])}</li>`;
        continue;
      }

      if (line.startsWith('→ ')) {
        closeList();
        out += `<div style="margin:6px 0;padding:6px 10px;border-left:3px solid var(--accent);color:var(--text-soft);">${fmt(line.slice(2))}</div>`;
        continue;
      }

      if (line.startsWith('✅')) {
        closeList();
        out += `<div style="color:var(--success);margin:4px 0;">✅ <strong>${fmt(line.slice(1).trim())}</strong></div>`;
        continue;
      }
      if (line.startsWith('❌')) {
        closeList();
        out += `<div style="color:var(--danger);margin:4px 0;">❌ <strong>${fmt(line.slice(1).trim())}</strong></div>`;
        continue;
      }

      closeList();
      out += `<span>${fmt(line)}</span><br>`;
    }

    closeList();
    return out;
  }
}

export default HelpUI;
