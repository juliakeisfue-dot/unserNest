// modules/billOCR.js
/**
 * Kassenbon-Erfassungsmodul mit OCR-Unterstützung
 */

export class BillOCRManager {
  constructor(storage, shoppingManager, sync, inventoryManager) {
    this.storage = storage;
    this.shoppingManager = shoppingManager;
    this.inventoryManager = inventoryManager;
    this.sync = sync;
    this.ocrReady = false;
    this.ocrWorker = null;
  }

  async _loadImage(dataUrl) {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
      img.src = dataUrl;
    });
  }

  async _prepareImageForOCR(dataUrl) {
    const img = await this._loadImage(dataUrl);

    // Große Smartphone-Fotos auf praxisnahe OCR-Groesse bringen.
    const maxDim = 1400;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return dataUrl;

    // Filter-basiertes Preprocessing ist deutlich schneller als Pixel-Loops in JS.
    ctx.filter = 'grayscale(100%) contrast(120%)';
    ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = 'none';

    return canvas.toDataURL('image/jpeg', 0.9);
  }

  _normalizeLine(line) {
    return (line || '').replace(/[;|]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  _normalizePrice(raw) {
    if (!raw) return '';
    const clean = raw.toString().replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(clean);
    if (Number.isNaN(num)) return '';
    return num.toFixed(2);
  }

  extractBillSummary(text) {
    const lines = (text || '').split('\n').map(l => this._normalizeLine(l)).filter(Boolean);
    const joined = lines.join('\n');
    const dateMatch = joined.match(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})\b/);
    let date = null;
    if (dateMatch) {
      let [, d, m, y] = dateMatch;
      if (y.length === 2) y = `20${y}`;
      date = `${y}-${String(parseInt(m, 10)).padStart(2, '0')}-${String(parseInt(d, 10)).padStart(2, '0')}`;
    }
    let total = '';
    let paid = '';
    for (const line of lines) {
      const sumMatch = line.match(/SUMME\s+TU\s+EUR\s+(\d{1,3}[.,]\d{2})/i) ||
        line.match(/SUMME\s+EUR\s+(\d{1,3}[.,]\d{2})/i);
      if (sumMatch) total = this._normalizePrice(sumMatch[1]);
      const paidMatch = line.match(/EC-?Cash\s+EUR\s+(\d{1,3}[.,]\s?\d{2})/i) ||
        line.match(/Geg\.\s*EC-?Cash\s+EUR\s+(\d{1,3}[.,]\s?\d{2})/i);
      if (paidMatch) paid = this._normalizePrice(paidMatch[1]);
    }
    return { date, total, paid };
  }

  async initializeOCR() {
    if (this.ocrReady) return true;
    try {
      if (typeof Tesseract === 'undefined') await this.loadTesseractScript();
      if (!this.ocrWorker && window.Tesseract?.createWorker) {
        this.ocrWorker = await window.Tesseract.createWorker('deu');
      }
      this.ocrReady = true;
      return true;
    } catch (e) {
      console.error('OCR-Initialisierung fehlgeschlagen:', e);
      return false;
    }
  }

  loadTesseractScript() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js';
      script.onload = () => window.Tesseract ? resolve() : reject(new Error('Tesseract init fehlgeschlagen'));
      script.onerror = () => reject(new Error('Tesseract Script-Ladefehler'));
      document.head.appendChild(script);
    });
  }

  async recognizeText(imageFile) {
    if (!this.ocrReady) await this.initializeOCR();
    try {
      const reader = new FileReader();
      const imageData = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      let prepared = imageData;
      try {
        prepared = await this._prepareImageForOCR(imageData);
      } catch (prepErr) {
        // Fallback auf Originalbild statt OCR ganz abzubrechen.
        console.warn('[BillOCR] Preprocessing fehlgeschlagen, nutze Originalbild:', prepErr);
      }

      const result = this.ocrWorker
        ? await this.ocrWorker.recognize(prepared)
        : await Tesseract.recognize(prepared, 'deu');
      return result.data.text;
    } catch (e) {
      console.error('OCR-Fehler:', e);
      throw new Error('Texterkennung fehlgeschlagen. Versuche ein besseres Foto!');
    }
  }

  _isMetaLine(line) {
    return /^(SUMME|Geg\.|Kundenbeleg|Kartenzahlung|Contactless|Uhrzeit|Trace-Nr\.|UID|DE\d+)/i.test(line);
  }

  _isContinuationLine(line) {
    return /(\d+[.,]\d+\s*kg\s*x\s*\d+[.,]\d+\s*EUR\/?kg)|(\d+\s*Stk\s*x\s*\d+[.,]\d+)|(\d+tkx\s*\d+[.,]\d+)/i.test(line);
  }

  _cleanProductName(line) {
    return line
      .replace(/(\-?\d{1,3}[.,]\d{2})\s*(?:EUR)?\s*[AB]?\s*[^\w\s]*$/i, '')
      .replace(/\b[A-Z]\b$/g, '')
      .replace(/^[^A-Za-zÄÖÜäöü0-9]+/, '')
      .replace(/^\d+\s+/, '')
      .replace(/^[A-Za-z]{1,2}\s+/, '')
      .replace(/^[A-Z0-9]{1,3}\s+/, '')
      .trim();
  }

  parseBillText(text) {
    const items = [];
    const lines = (text || '').split('\n').map(l => this._normalizeLine(l)).filter(Boolean);
    const summary = this.extractBillSummary(text);
    let lastItem = null;

    for (const line of lines) {
      if (
        line.length < 3 ||
        /^\d+$/.test(line) ||
        /^[^\w\s€$\d]*$/.test(line) ||
        this._isMetaLine(line)
      ) continue;

      // Folgezeilen wie "1,128 kg x 2,99 EUR/kg" dem zuletzt erkannten Artikel zuordnen.
      if (this._isContinuationLine(line)) {
        if (lastItem) {
          lastItem.quantity = lastItem.quantity
            ? `${lastItem.quantity} | ${line}`
            : line;
        }
        continue;
      }

      const parts = line.split(/\s+/).filter(Boolean);
      if (!parts.length) continue;

      const item = {
        name: '',
        quantity: '',
        price: '',
        purchaseDate: summary.date || new Date().toISOString().split('T')[0]
      };

      const priceMatch = line.match(/(\-?\d{1,3}[.,]\d{2})\s*(?:EUR)?\s*[AB]?\s*[^\w\s]*$/i);
      if (priceMatch) item.price = this._normalizePrice(priceMatch[1]);

      const quantityMatch = line.match(/(\d+[.,]?\d*\s*(?:l|kg|g|ml|stk))\b/i);
      if (quantityMatch) item.quantity = quantityMatch[1].replace(/\s+/g, ' ').trim();

      let name = this._cleanProductName(line);

      if (name.length < 2) name = parts[0] || '';
      if (name.length >= 2 && item.price) {
        item.name = name;
        items.push(item);
        lastItem = item;
      }
    }
    return items;
  }

  async saveBillItems(items, locationId = null) {
    if (!Array.isArray(items)) return false;
    try {
      if (!Array.isArray(this.storage.data.bills)) this.storage.data.bills = [];
      const bill = { id: 'bill-' + Date.now(), items, locationId, createdAt: Date.now(), status: 'processed' };
      this.storage.data.bills.push(bill);

      for (const item of items) {
        if (locationId && this.inventoryManager) {
          // Direkt in den Vorrat einräumen
          const amount = [
            item.quantity ? `${item.quantity}` : '',
            item.price    ? `${item.price}€`    : '',
            item.purchaseDate ? item.purchaseDate : ''
          ].filter(Boolean).join(' | ');
          this.inventoryManager.addItem(locationId, item.name, amount, true);
        } else {
          // Fallback: in die Einkaufsliste (manuell einräumen)
          let note = '';
          if (item.quantity)    note += `Menge: ${item.quantity}`;
          if (item.price)       note += (note ? ' | ' : '') + `Preis: ${item.price}€`;
          if (item.purchaseDate) note += (note ? ' | ' : '') + `Kaufdatum: ${item.purchaseDate}`;
          this.shoppingManager.add(item.name, note);
        }
      }

      this.storage.data.version = (this.storage.data.version || 0) + 1;
      this.storage.saveLocal();
      this.sync.markDirty();
      return true;
    } catch (e) {
      console.error('Fehler beim Speichern:', e);
      return false;
    }
  }

  getBills() {
    return (this.storage.data.bills || []).filter(b => b.status !== '_deleted');
  }

  deleteBill(billId) {
    const bill = (this.storage.data.bills || []).find(b => b.id === billId);
    if (!bill) return false;
    bill.status = '_deleted';
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return true;
  }

  markBillProcessed(billId) {
    const bill = (this.storage.data.bills || []).find(b => b.id === billId);
    if (!bill) return false;
    bill.status = 'processed';
    this.storage.data.version = (this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.sync.markDirty();
    return true;
  }
}
