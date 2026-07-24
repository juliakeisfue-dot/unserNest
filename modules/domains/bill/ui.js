// modules/billUI.js
/**
 * UI-Modul für Kassenbon-Erfassung mit Foto
 */

export class BillUI {
  constructor(app, billOCRManager) {
    this.app = app;
    this.billManager = billOCRManager;
    this.currentImageData = null;
    this.currentParsedItems = [];
    this.currentBillSummary = null;
    this.isProcessing = false;
  }

  /**
   * Rendert den kompletten Kassenbon-Bereich
   */
  render() {
    const container = document.getElementById('billSection');
    if (!container) return;

    const bills = this.billManager.getBills();
    const pendingCount = bills.filter(b => b.status === 'pending').length;

    let html = `
      <div class="card">
        <h2 class="card__title">📸 Kassenbon</h2>
        <div class="card__subtitle">Foto aufnehmen und Artikel erfassen</div>

        <!-- Upload-Bereich -->
        <div class="bill-upload" style="margin-bottom: 16px;">
          <label class="bill-upload__label">
            <input 
              type="file" 
              id="billImageInput" 
              accept="image/*" 
              capture="environment"
              style="display: none;"
            >
            <div class="bill-upload__btn">
              <div style="font-size: 2rem; margin-bottom: 8px;">📷</div>
              <div>Kassenbon fotografieren</div>
              <div style="font-size: 0.75rem; color: var(--text-soft); margin-top: 4px;">oder Datei wählen</div>
            </div>
          </label>
        </div>

        <!-- Progress -->
        <div id="billProgress" style="display: none; margin-bottom: 16px;">
          <div style="font-size: 0.85rem; margin-bottom: 8px;">Verarbeite Bild...</div>
          <div class="progress">
            <div class="progress__bar">
              <div class="progress__fill" style="width: 0%; animation: pulse 1s infinite;"></div>
            </div>
          </div>
        </div>

        <!-- Vorschau & Parsing -->
        <div id="billPreview" style="display: none; margin-bottom: 16px;">
          <img id="billPreviewImg" alt="Kassenbon Vorschau" style="max-width: 100%; max-height: 300px; border-radius: 8px; margin-bottom: 12px;">
          
          <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 4px; font-size: 0.85rem; color: var(--text-soft);">
              Erkannter Text (bearbeitbar):
            </label>
            <textarea 
              id="billOCRText" 
              style="width: 100%; height: 150px; padding: 8px; border: 1px solid var(--border); border-radius: 8px; font-size: 0.8rem; font-family: monospace;"
              placeholder="Hier wird der erkannte Text angezeigt. Du kannst ihn bearbeiten!"
            ></textarea>
          </div>

          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <button id="btnParseBill" class="btn btn--primary">✨ Artikel erkennen</button>
            <button id="btnCancelBill" class="btn">Abbrechen</button>
          </div>
        </div>

        <!-- Geparste Artikel -->
        <div id="billItems" style="display: none; margin-bottom: 16px;">
          <div style="margin-bottom: 12px;">
            <div style="font-size: 0.85rem; color: var(--text-soft); margin-bottom: 8px;">
              Erkannte Artikel (überprüfe und bearbeite):
            </div>

            <!-- Ort-Selector für direktes Einräumen -->
            <div style="margin-bottom: 12px; padding: 10px; background: var(--accent-soft); border-radius: 8px;">
              <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">
                📦 Direkt in Vorrat einräumen (optional):
              </label>
              <select id="billLocationSelect" class="form__input">
                <option value="">— Nur zur Einkaufsliste hinzufügen —</option>
                ${this.app.inventory.getLocations().map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
              </select>
              <div style="font-size: 0.75rem; color: var(--text-soft); margin-top: 4px;">
                Ort wählen → Artikel landen direkt im Vorrat. Kein Ort → erst zur Einkaufsliste.
              </div>
            </div>

            <div id="billItemsList"></div>
          </div>
          
          <div style="display: flex; gap: 8px;">
            <button id="btnSaveBill" class="btn btn--success">💾 Speichern</button>
            <button id="btnCancelBillItems" class="btn">Zurück</button>
          </div>
        </div>

        <!-- Historie -->
        ${pendingCount > 0 ? `
          <div style="background: var(--accent-soft); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
            <div style="font-size: 0.85rem; font-weight: 600;">
              ⏳ ${pendingCount} Kassenbon(e) warten auf Verarbeitung
            </div>
          </div>
        ` : ''}

        ${bills.length > 0 ? `
          <div>
            <h3 style="margin-top: 0; font-size: 0.9rem; color: var(--text-soft); margin-bottom: 8px;">
              📋 Kassenbon-Historie
            </h3>
            <div id="billHistory"></div>
          </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = html;

    // Event-Listener hinzufügen
    this.attachEventListeners();

    // Historie rendern
    if (bills.length > 0) {
      this.renderBillHistory(bills);
    }
  }

  /**
   * Befestigt alle Event-Listener
   */
  attachEventListeners() {
    const imageInput   = document.getElementById('billImageInput');
    const btnParse     = document.getElementById('btnParseBill');
    const btnCancel    = document.getElementById('btnCancelBill');
    const btnSave      = document.getElementById('btnSaveBill');
    const btnCancelItems = document.getElementById('btnCancelBillItems');
    const locationSelect = document.getElementById('billLocationSelect');

    if (imageInput)    imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
    if (btnParse)      btnParse.addEventListener('click', () => this.parseBill());
    if (btnCancel)     btnCancel.addEventListener('click', () => this.resetUI());
    if (btnSave)       btnSave.addEventListener('click', () => this.saveBill());
    if (btnCancelItems) btnCancelItems.addEventListener('click', () => this.resetUI());
    if (locationSelect) {
      locationSelect.addEventListener('change', () => this.updateSaveButtonLabel());
    }
    this.updateSaveButtonLabel();
  }

  updateSaveButtonLabel() {
    const btn = document.getElementById('btnSaveBill');
    if (!btn) return;
    const locationId = document.getElementById('billLocationSelect')?.value || '';
    btn.textContent = locationId
      ? '💾 Speichern & direkt in Vorrat'
      : '💾 Speichern & zur Einkaufsliste';
  }

  /**
   * Behandelt Bild-Upload
   */
  async handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validierung
    if (!file.type.startsWith('image/')) {
      this.app.toast('❌ Bitte ein Bild auswählen', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.app.toast('❌ Datei zu groß (max. 5MB)', 'error');
      return;
    }

    // Bild anzeigen
    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentImageData = e.target.result;
      document.getElementById('billPreviewImg').src = this.currentImageData;
      document.getElementById('billPreview').style.display = 'block';
      document.getElementById('billOCRText').value = '';
      this.currentParsedItems = [];
      this.currentBillSummary = null;
      document.getElementById('billItems').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  /**
   * Startet OCR-Verarbeitung
   */
  async parseBill() {
    if (!this.currentImageData) {
      this.app.toast('❌ Kein Bild vorhanden', 'error');
      return;
    }

    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      document.getElementById('billProgress').style.display = 'block';
      document.getElementById('btnParseBill').disabled = true;

      // OCR initialisieren und Text erkennen
      const ocrText = await this.billManager.recognizeText(
        this.dataURLtoFile(this.currentImageData, 'bill.jpg')
      );

      // Text in Textarea einfügen
      document.getElementById('billOCRText').value = ocrText;

      // Bon-Metadaten erkennen (Datum, Summe, Zahlung)
      this.currentBillSummary = this.billManager.extractBillSummary(ocrText);

      // Artikel parsen (robust: akzeptiert sync oder async Rueckgabe)
      const parsedItems = await Promise.resolve(this.billManager.parseBillText(ocrText));
      this.currentParsedItems = Array.isArray(parsedItems) ? parsedItems : [];
      if (!Array.isArray(parsedItems)) {
        console.warn('[BillUI] parseBillText lieferte kein Array:', parsedItems);
      }

      if (this.currentParsedItems.length === 0) {
        this.app.toast('⚠️ Keine Artikel erkannt. Text manuell bearbeiten?', 'warning');
      } else {
        this.app.toast(`✅ ${this.currentParsedItems.length} Artikel erkannt!`);
      }

      // UI aktualisieren
      this.renderParsedItems();
      document.getElementById('billItems').style.display = 'block';
    } catch (e) {
      console.error('Parse-Fehler:', e);
      this.app.toast(`❌ ${e.message}`, 'error');
    } finally {
      document.getElementById('billProgress').style.display = 'none';
      document.getElementById('btnParseBill').disabled = false;
      this.isProcessing = false;
    }
  }

  /**
   * Rendert die geparsten Artikel zur Bearbeitung
   */
  renderParsedItems() {
    const container = document.getElementById('billItemsList');
    if (!container) return;

    if (this.currentParsedItems.length === 0) {
      container.innerHTML = '<div class="empty"><div class="empty__icon">🔍</div>Keine Artikel erkannt</div>';
      return;
    }

    let html = '';

    if (this.currentBillSummary && (this.currentBillSummary.date || this.currentBillSummary.total || this.currentBillSummary.paid)) {
      html += `
        <div style="padding: 10px; background: var(--accent-soft); border-radius: 8px; margin-bottom: 10px; font-size: 0.85rem;">
          <div><strong>Datum:</strong> ${this.currentBillSummary.date || 'n/a'}</div>
          <div><strong>Summe:</strong> ${this.currentBillSummary.total ? `${this.currentBillSummary.total} EUR` : 'n/a'}</div>
          <div><strong>EC-Cash:</strong> ${this.currentBillSummary.paid ? `${this.currentBillSummary.paid} EUR` : 'n/a'}</div>
        </div>
      `;
    }

    // Kompakte Leseansicht fuer schnellen Plausibilitaets-Check vor dem Editieren.
    html += `
      <div style="padding: 10px; background: #fff; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px;">
        <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 6px;">📋 Kompakte Bon-Ansicht</div>
        ${this.currentParsedItems.map(item => {
          const qty = item.quantity ? ` | ${this.app.escapeHtml(item.quantity)}` : '';
          const price = item.price ? `${this.app.escapeHtml(item.price)} EUR` : 'n/a';
          return `<div style="font-size: 0.8rem; margin-bottom: 3px;">${this.app.escapeHtml(item.name)} | ${price}${qty}</div>`;
        }).join('')}
      </div>
    `;

    this.currentParsedItems.forEach((item, index) => {
      html += `
        <div class="bill-item" style="padding: 12px; background: #f9f9f9; border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border);">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div>
              <label style="display: block; font-size: 0.75rem; color: var(--text-soft); margin-bottom: 2px;">Artikel</label>
              <input type="text" class="form__input" value="${item.name}" data-field="name" data-index="${index}" style="font-size: 0.9rem; padding: 6px;">
            </div>
            <div>
              <label style="display: block; font-size: 0.75rem; color: var(--text-soft); margin-bottom: 2px;">Menge</label>
              <input type="text" class="form__input" value="${item.quantity || ''}" data-field="quantity" data-index="${index}" placeholder="z.B. 1l, 500g" style="font-size: 0.9rem; padding: 6px;">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label style="display: block; font-size: 0.75rem; color: var(--text-soft); margin-bottom: 2px;">Preis (€)</label>
              <input type="text" class="form__input" value="${item.price || ''}" data-field="price" data-index="${index}" placeholder="z.B. 2,99" style="font-size: 0.9rem; padding: 6px;">
            </div>
            <div>
              <label style="display: block; font-size: 0.75rem; color: var(--text-soft); margin-bottom: 2px;">Kaufdatum</label>
              <input type="date" class="form__input" value="${item.purchaseDate}" data-field="purchaseDate" data-index="${index}" style="font-size: 0.9rem; padding: 6px;">
            </div>
          </div>
          <button class="btn btn--danger btn--small" style="margin-top: 8px; width: 100%;" onclick="app.billUI.removeItem(${index})">🗑 Entfernen</button>
        </div>
      `;
    });

    container.innerHTML = html;

    // Input-Änderungen tracken
    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        this.currentParsedItems[index][field] = e.target.value;
      });
    });
  }

  /**
   * Entfernt einen Artikel aus der Liste
   */
  removeItem(index) {
    this.currentParsedItems.splice(index, 1);
    this.renderParsedItems();
  }

  /**
   * Speichert die Artikel
   */
  async saveBill() {
    if (this.currentParsedItems.length === 0) {
      this.app.toast('❌ Keine Artikel zum Speichern', 'error');
      return;
    }

    // Validiere Artikel
    const valid = this.currentParsedItems.every(item => item.name && item.name.trim());
    if (!valid) {
      this.app.toast('❌ Alle Artikel müssen einen Namen haben', 'error');
      return;
    }

    try {
      const t0 = (typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now();
      const locationId = document.getElementById('billLocationSelect')?.value || null;
      const locationName = locationId
        ? this.app.inventory.getLocation(locationId)?.name || 'Vorrat'
        : null;

      const success = await this.billManager.saveBillItems(this.currentParsedItems, locationId);

      if (success) {
        const t1 = (typeof performance !== 'undefined' && performance.now)
          ? performance.now()
          : Date.now();
        const durationMs = Math.max(0, Math.round(t1 - t0));
        const ziel = locationName
          ? `✅ ${this.currentParsedItems.length} Artikel → ${locationName} (${durationMs} ms)`
          : `✅ ${this.currentParsedItems.length} Artikel → Einkaufsliste (${durationMs} ms)`;
        this.app.toast(ziel);

        if (this.app.chronicles) {
          this.app.chronicles.addEntry(
            '📸',
            `Kassenbon mit ${this.currentParsedItems.length} Artikeln eingescannt${locationName ? ` → ${locationName}` : ''}`,
            {
              items: this.currentParsedItems.length,
              totalPrice: this.currentParsedItems.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0)
            }
          );
        }

        this.resetUI();
        this.app.updateUI();
      } else {
        this.app.toast('❌ Fehler beim Speichern', 'error');
      }
    } catch (e) {
      console.error('Fehler:', e);
      this.app.toast('❌ ' + e.message, 'error');
    }
  }

  /**
   * Rendert die Kassenbon-Historie
   */
  renderBillHistory(bills) {
    const container = document.getElementById('billHistory');
    if (!container) return;

    if (bills.length === 0) {
      container.innerHTML = '<div class="empty"><div class="empty__icon">📄</div>Keine Kassenbons</div>';
      return;
    }

    let html = '';
    bills.slice().reverse().forEach(bill => {
      const date = new Date(bill.createdAt).toLocaleString('de-DE');
      const statusLabel = bill.status === 'pending' ? '⏳ Ausstehend' : '✅ Verarbeitet';
      const statusColor = bill.status === 'pending' ? 'var(--warning)' : 'var(--success)';

      html += `
        <div style="padding: 12px; background: #f9f9f9; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid ${statusColor};">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 600; margin-bottom: 2px;">${bill.items.length} Artikel</div>
              <div style="font-size: 0.8rem; color: var(--text-soft);">${date}</div>
            </div>
            <div style="font-size: 0.8rem; color: ${statusColor}; font-weight: 600;">${statusLabel}</div>
          </div>
          <div style="font-size: 0.8rem; margin-bottom: 8px;">
            ${bill.items.map(i => `${i.name}${i.quantity ? ` (${i.quantity})` : ''}`).join(', ')}
          </div>
          <div style="display: flex; gap: 6px;">
            ${bill.status === 'pending' ? `
              <button class="btn btn--small btn--success" onclick="app.billUI.markProcessed('${bill.id}')">✅ Verarbeitet</button>
            ` : ''}
            <button class="btn btn--small btn--danger" onclick="app.billUI.deleteBill('${bill.id}')">🗑</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  /**
   * Markiert einen Kassenbon als verarbeitet
   */
  markProcessed(billId) {
    if (this.billManager.markBillProcessed(billId)) {
      this.app.toast('✅ Kassenbon verarbeitet');
      this.app.updateUI();
    }
  }

  /**
   * Löscht einen Kassenbon
   */
  deleteBill(billId) {
    if (!confirm('Kassenbon wirklich löschen?')) return;

    if (this.billManager.deleteBill(billId)) {
      this.app.toast('🗑 Kassenbon gelöscht');
      this.app.updateUI();
    }
  }

  /**
   * Setzt die UI zurück
   */
  resetUI() {
    document.getElementById('billImageInput').value = '';
    document.getElementById('billPreview').style.display = 'none';
    document.getElementById('billItems').style.display = 'none';
    document.getElementById('billOCRText').value = '';
    const locSel = document.getElementById('billLocationSelect');
    if (locSel) locSel.value = '';
    this.currentImageData = null;
    this.currentParsedItems = [];
    this.currentBillSummary = null;
  }

  /**
   * Konvertiert DataURL zu File-Objekt
   */
  dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new File([u8arr], filename, { type: mime });
  }
}

