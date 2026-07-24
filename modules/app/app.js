// modules/app/app.js
import { Storage } from '../core/storage.js';
import { SyncManager } from '../core/sync.js';
import { UserManager } from '../core/users.js';
import { tracker } from '../core/tracker.js';
import {
  CONFIG,
  hasConfiguredCloudCredentials,
  hasConfiguredGoogleTasksClientId,
  loadStoredCloudConfig,
  loadStoredGoogleTasksConfig,
  saveStoredCloudConfig,
  saveStoredGoogleTasksClientId
} from '../core/config.js';
import { createBundle, importFromDocuments } from '../core/backup.js';
import { buildShoppingListTitle, exportOpenShoppingItemsToGoogleTasks } from '../core/googleTasks.js';
import { ShoppingManager } from '../domains/shopping/manager.js';
import { ShoppingUI } from '../domains/shopping/ui.js';
import { InventoryManager } from '../domains/inventory/manager.js';
import { InventoryUI } from '../domains/inventory/ui.js';
import { QuestManager } from '../domains/quests/manager.js';
import { QuestsUI } from '../domains/quests/ui.js';
import { TasksUI } from '../domains/tasks/ui.js';
import { RecipeManager } from '../domains/recipes/manager.js';
import { RecipesUI } from '../domains/recipes/ui.js';
import { RewardsUI } from '../domains/rewards/ui.js';
import * as ChronicleModule from '../domains/chronicle/manager.js';
import { ChronicleUI } from '../domains/chronicle/ui.js';
import { BillOCRManager } from '../domains/bill/manager.js';
import { BillUI } from '../domains/bill/ui.js';
import { MealPlanManager } from '../domains/mealplan/manager.js';
import { MealPlanUI } from '../domains/mealplan/ui.js';
import { ReisekasseManager } from '../domains/reisekasse/manager.js';
import { ReisekasseUI } from '../domains/reisekasse/ui.js';
import { HelpManager } from '../domains/help/manager.js';
import { HelpUI } from '../domains/help/ui.js';
import { AnalyticsManager } from '../domains/analytics/manager.js';
import { AnalyticsUI } from '../domains/analytics/ui.js';
import { DocumentationManager } from '../domains/documentation/manager.js';
import { DocumentationUI } from '../domains/documentation/ui.js';

// Lokale Entwicklungs-Overrides laden (nur auf localhost).
// So vermeiden wir 404-Noise auf GitHub Pages.
const isLocalDevHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
if (isLocalDevHost) {
  try {
    const localUrl = new URL('../core/config.local.js', import.meta.url).href;
    const local = await import(localUrl);
    if (local?.LOCAL_CONFIG_OVERRIDES) {
      Object.assign(CONFIG, local.LOCAL_CONFIG_OVERRIDES);
      console.debug('[Config] Lokale Overrides geladen:', Object.keys(local.LOCAL_CONFIG_OVERRIDES));
    }
  } catch {
    // Keine config.local.js im lokalen Setup -> normal
  }
}

loadStoredCloudConfig();
loadStoredGoogleTasksConfig();

function resolveChronicleManagerCtor(mod) {
  const candidates = [
    mod?.ChronicleManager,
    mod?.default,
    mod?.default?.ChronicleManager,
    mod?.default?.default
  ];

  const ctor = candidates.find(c => typeof c === 'function');
  if (ctor) return ctor;

  console.error('[Chronicle] Kein gueltiger Manager-Export gefunden:', mod);
  return class ChronicleManagerFallback {
    constructor(storage) {
      this.storage = storage;
    }
    addEntry() {}
    getEntries() { return []; }
    getEntriesByEmoji() { return []; }
    deleteEntry() { return false; }
    clearAll() {}
    getStats() {
      return { totalEntries: 0, byEmoji: {}, lastEntry: null, firstEntry: null };
    }
  };
}

const ChronicleManager = resolveChronicleManagerCtor(ChronicleModule);

class App {
  constructor() {
    this.storage = new Storage();
    this.sync = new SyncManager(this.storage);
    this.users = new UserManager(this.storage, this.sync);
    this.tracker = tracker; // Tracker-Referenz für UI
    this.shopping = new ShoppingManager(this.storage, this.sync, this.users);
    this.inventory = new InventoryManager(this.storage, this.sync);
    this.quests = new QuestManager(this.storage, this.sync, this.users, this.tracker);
    this.recipes = new RecipeManager(this.storage, this.shopping, this.sync);
    this.mealplan = new MealPlanManager(this.storage, this.sync, this.inventory, this.shopping, this.users, this.tracker);
    this.reisekasse = new ReisekasseManager(this.storage, this.sync);
    this.billOCR = new BillOCRManager(this.storage, this.shopping, this.sync, this.inventory);
    this.chronicles = new ChronicleManager(this.storage, this.sync);
    this.help = new HelpManager();
    this.analyticsManager = new AnalyticsManager(this.tracker);
    this.docManager = new DocumentationManager();

    this.shoppingUI = new ShoppingUI(this);
    this.inventoryUI = new InventoryUI(this);
    this.recipesUI = new RecipesUI(this);
    this.mealplanUI = new MealPlanUI(this);
    this.reisekasseUI = new ReisekasseUI(this);
    this.questsUI = new QuestsUI(this);
    this.tasksUI = new TasksUI(this);
    this.rewardsUI = new RewardsUI(this);
    this.chronicleUI = new ChronicleUI(this);
    this.billUI = new BillUI(this, this.billOCR);
    this.helpUI = new HelpUI(this);
    this.analyticsUI = new AnalyticsUI(this);
    this.documentationUI = new DocumentationUI(this);

    this.sync.onSyncStart = () => this.renderStatus();
    this.sync.onSyncSuccess = (data, hasChanges, cloudHadNewData) => {
      this.renderStatus();
      if (cloudHadNewData) {
        this.safeUpdateUI();
        this.toast('🔄 Synchronisiert!');
      }
    };
    this.sync.onSyncError = (err) => {
      console.error('[Sync]', err);
      this.renderStatus();           // Badge auch bei Fehler aktualisieren
    };

    // localStorage-Fehler (z.B. QuotaExceededError) für den Nutzer sichtbar machen
    window.addEventListener('storage-save-error', (e) => {
      console.error('[Storage] Kritischer Speicherfehler:', e.detail);
      this.toast('⚠️ Speicher voll! Bitte altes Backup löschen oder App-Cache bereinigen.', 'error');
    });

    this.eventsBound = false;
    this._currentSection = 'shopping';
    this._isTyping = false;
    this._dialogState = null;
  }

  async init() {
    const hasLocalState = this.storage.loadLocal();
    if (!hasLocalState) {
      await this.applyPublishedSeed();
    }
    await this.registerServiceWorker();
    this.setupEvents();
    
    if (!this.storage.data.homeName) {
      this.showSetup();
    } else {
      this.enterApp();
    }
    
    this.sync.start();
  }

  async applyPublishedSeed() {
    if (this._getPublishedSeedCandidates().length === 0) return false;

    try {
      const cleaned = await this._loadPublishedSeed();

      this.storage.importData(cleaned.state);

      const nextActiveUserId = cleaned.activeUserId || null;
      if (nextActiveUserId && this.storage.data?.users?.some(u => u.id === nextActiveUserId)) {
        this.storage.setActiveUser(nextActiveUserId);
      }

      console.log('[App] Veröffentlichten Startbestand importiert');
      return true;
    } catch (err) {
      console.warn('[App] Konnte veröffentlichten Startbestand nicht laden:', err);
      return false;
    }
  }

  async restorePublishedSeed() {
    const confirmed = await this.showDialog(
      '⚠️ Mitgelieferte Sicherung einspielen?',
      'Alle aktuellen Daten werden durch die beim Deployment mitgelieferte Sicherung ersetzt.'
    );
    if (!confirmed) return false;

    try {
      const cleaned = await this._loadPublishedSeed();
      this.applyImportedData(cleaned.state, cleaned.activeUserId || null);
      this.toast('✅ Mitgelieferte Sicherung eingespielt!', 'success');
      return true;
    } catch (err) {
      console.error('[App] Restore aus mitgelieferter Sicherung fehlgeschlagen:', err);
      this.showDialog('❌ Fehler', `Mitgelieferte Sicherung konnte nicht geladen werden: ${err.message}`);
      return false;
    }
  }

  async _loadPublishedSeed() {
    const candidates = this._getPublishedSeedCandidates();
    if (candidates.length === 0) {
      throw new Error('Kein PUBLISHED_BUNDLE_PATH konfiguriert');
    }

    let lastError = null;
    for (const path of candidates) {
      try {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) {
          lastError = new Error(`HTTP ${res.status}`);
          continue;
        }

        const bundleDoc = await res.json();
        const imported = importFromDocuments([bundleDoc], this.storage.data);

        // Bereinigung mit aktueller Bundle-Logik (Filter fuer Shopping/MealPlan usw.).
        const cleanedBundle = createBundle(imported.state, imported.activeUserId || bundleDoc.activeUserId || null);
        return importFromDocuments([cleanedBundle], this.storage.data);
      } catch (err) {
        lastError = err;
      }
    }

    const summary = candidates.join(', ');
    throw new Error(`${lastError?.message || 'Unbekannter Fehler'} (geprueft: ${summary})`);
  }

  _getPublishedSeedCandidates() {
    const primary = String(CONFIG.PUBLISHED_BUNDLE_PATH || '').trim();
    const fallback = Array.isArray(CONFIG.PUBLISHED_BUNDLE_PATHS)
      ? CONFIG.PUBLISHED_BUNDLE_PATHS
      : [];
    const all = [primary, ...fallback]
      .map(p => String(p || '').trim())
      .filter(Boolean);
    return [...new Set(all)];
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (err) {
      console.warn('[SW] Registrierung fehlgeschlagen:', err);
    }
  }

  setupEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;
    
    document.getElementById('btnCreateHome')?.addEventListener('click', () => this.createHome());
    document.getElementById('btnCloudSetup')?.addEventListener('click', () => this.setupCloud());
    document.getElementById('btnForceSync')?.addEventListener('click', () => this.forceSync());
    document.getElementById('btnAddItem')?.addEventListener('click', () => this.shoppingUI.addItem());
    
    document.getElementById('shoppingItemName')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.shoppingUI.addItem();
    });
    document.getElementById('shoppingItemNote')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.shoppingUI.addItem();
    });
    
    document.querySelectorAll('.nav__btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const section = e.target.dataset.section;
        this.showSection(section);
      });
    });
  }

  showSetup() {
    document.getElementById('setupScreen').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
  }

   createHome() {
     const homeName = document.getElementById('homeName')?.value.trim();
     const userName = document.getElementById('userName')?.value.trim();

     if (!homeName || !userName) {
       this.showDialog('⚠️ Eingaben erforderlich', 'Bitte beide Felder ausfüllen');
       return;
     }

     this.storage.data.homeName = homeName;
     this.storage.data.homeUpdatedAt = Date.now();

     const user = this.storage.data.users.find(u =>
       u.name.toLowerCase() === userName.toLowerCase()
     );

     if (user) {
       this.storage.setActiveUser(user.id);
     } else {
       this.showDialog('⚠️ Name nicht bekannt', 'Verfügbar: Julia, Christian, Helena, Elisabeth');
       return;
     }

     this.storage.saveLocal();
     this.sync.markDirty();
     this.enterApp();
   }

  enterApp() {
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('displayHomeName').textContent = this.storage.data.homeName;
    
    this.updateUI();
  }

  safeUpdateUI() {
    const activeElement = document.activeElement;
    const isInputActive = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      activeElement.tagName === 'SELECT'
    );
    
    if (this._isTyping || isInputActive) {
      setTimeout(() => this.safeUpdateUI(), 3000);
      return;
    }
    
    this.updateUI();
  }

   updateUI() {
     this.renderUserBar();
     this.renderStatus();
     
      switch(this._currentSection) {
        case 'shopping': this.shoppingUI.render(); break;
        case 'bill':     this.billUI.render(); break;
        case 'inventory': this.inventoryUI.render(); break;
        case 'recipes': this.recipesUI.render(); break;
        case 'mealplan': this.mealplanUI.render(); break;
        case 'reisekasse': this.reisekasseUI.render(); break;
        case 'quests': this.questsUI.render(); break;
        case 'tasks': this.tasksUI.render(); break;
        case 'rewards': this.rewardsUI.render(); break;
        case 'chronicle': this.chronicleUI.render(); break;
        case 'analytics': this.analyticsUI.renderDashboard(); break;
        case 'documentation': this.documentationUI.render(); break;
        case 'help': this.helpUI.render(); break;
      }
   }

  renderUserBar() {
    const container = document.getElementById('userList');
    if (!container) return;
    
    const activeUser = this.users.getActive();
    
    container.innerHTML = this.users.getAll().map(u => `
      <button class="user-btn ${u.id === this.storage.activeUserId ? 'user-btn--active' : ''}" 
              data-userid="${u.id}">
        ${u.name}
        ${u.id === this.storage.activeUserId ? `<span class="user-btn__points">${u.points}★</span>` : ''}
      </button>
    `).join('');
    
    container.querySelectorAll('.user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.storage.setActiveUser(btn.dataset.userid);
        this.updateUI();
      });
    });
    
    const hint = document.getElementById('userHint');
    if (hint) {
      hint.textContent = activeUser 
        ? `Aktionen für ${activeUser.name}`
        : '⚠️ Bitte auswählen!';
    }
  }

   renderStatus() {
     const el = document.getElementById('cloudStatus');
     if (!el) return;
     
     if (!hasConfiguredCloudCredentials(CONFIG)) {
       el.textContent = '⚠️ Cloud nicht konfiguriert';
       el.className = 'status status--warning';
     } else if (!navigator.onLine) {
       el.textContent = '🔴 OFFLINE';
       el.className = 'status status--offline';
     } else if (this.sync.isSyncing) {
       el.textContent = '🔄 Synchronisiert...';
       el.className = 'status status--warning';
     } else if (this.sync.pending) {
       el.textContent = '⏳ Ausstehend';
       el.className = 'status status--warning';
     } else {
       el.textContent = '🟢 Online';
       el.className = 'status status--online';
     }
   }

  showSection(sectionName) {
    const normalizedSection = sectionName === 'analytics'
      ? 'chronicle'
      : sectionName === 'documentation'
        ? 'help'
        : sectionName;

    this._currentSection = normalizedSection;

    document.querySelectorAll('.section').forEach(s => s.classList.remove('section--active'));
    document.querySelectorAll('.nav__btn').forEach(b => b.classList.remove('nav__btn--active'));
    
    document.getElementById(normalizedSection + 'Section')?.classList.add('section--active');
    document.querySelector(`[data-section="${normalizedSection}"]`)?.classList.add('nav__btn--active');

    this.updateUI();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _getDialogElements() {
   const overlay = document.getElementById('dialogOverlay');
   const titleEl = document.getElementById('dialogTitle');
   const msgEl = document.getElementById('dialogMessage');
   const input = document.getElementById('dialogInput');
   const btnCancel = document.getElementById('dialogBtnCancel');
   const btnOk = document.getElementById('dialogBtnOk');

   if (!overlay || !titleEl || !msgEl || !input || !btnCancel || !btnOk) return null;
   return { overlay, titleEl, msgEl, input, btnCancel, btnOk };
  }

  closeDialog() {
   const state = this._dialogState;
   if (!state) return;

   state.cleanup?.();
   state.overlay.classList.remove('dialog-overlay--active');
   state.resolve?.(false);
   this._dialogState = null;
  }

   toast(message, type = 'info') {
     const container = document.getElementById('toastContainer');
     if (!container) return;

     const toast = document.createElement('div');
     toast.className = `toast`;
     toast.textContent = message;

     // Optional: Styling je nach Typ
     if (type === 'error') {
       toast.style.background = 'rgba(255, 59, 48, 0.9)';
     } else if (type === 'warning') {
       toast.style.background = 'rgba(255, 149, 0, 0.9)';
     } else if (type === 'success') {
       toast.style.background = 'rgba(52, 199, 89, 0.9)';
     }

     container.appendChild(toast);
     setTimeout(() => toast.remove(), 3000);
   }

  showDialog(title, message) {
   return this._showDialogBase({
     title,
     content: message,
     useHtml: false
   });
  }

  showDialogWithHTML(title, html) {
   return this._showDialogBase({
     title,
     content: html,
     useHtml: true
   });
  }

  _showDialogBase({ title, content, useHtml }) {
   const elements = this._getDialogElements();
   if (!elements) return Promise.resolve(false);

   const { overlay, titleEl, msgEl, input, btnCancel, btnOk } = elements;

   this.closeDialog();
   titleEl.textContent = title;
   if (useHtml) {
     msgEl.innerHTML = content;
   } else {
     msgEl.textContent = content;
   }
   input.style.display = 'none';
   btnCancel.style.display = 'none';
   btnCancel.textContent = 'Abbrechen';
   btnOk.textContent = 'OK';
   overlay.classList.add('dialog-overlay--active');

   return new Promise((resolve) => {
     const cleanup = () => {
       if (this._dialogState?.resolve === resolve) {
         this._dialogState = null;
       }
       btnOk.onclick = null;
       btnCancel.onclick = null;
       document.removeEventListener('keydown', handleEscape);
       overlay.removeEventListener('click', handleOverlayClick);
     };

     const handleEscape = (e) => {
       if (e.key === 'Escape') {
         cleanup();
         overlay.classList.remove('dialog-overlay--active');
         resolve(false);
       }
     };

     const handleOk = () => {
       cleanup();
       overlay.classList.remove('dialog-overlay--active');
       resolve(true);
     };

     const handleOverlayClick = (e) => {
       if (e.target === overlay) {
         cleanup();
         overlay.classList.remove('dialog-overlay--active');
         resolve(false);
       }
     };

     this._dialogState = { overlay, resolve, cleanup };
     btnOk.onclick = handleOk;
     document.addEventListener('keydown', handleEscape);
     overlay.addEventListener('click', handleOverlayClick);
   });
  }

  async showInputDialog(title, message, defaultValue = '') {
   const elements = this._getDialogElements();
   if (!elements) return null;

   const { overlay, titleEl, msgEl, input, btnCancel, btnOk } = elements;

   this.closeDialog();
   titleEl.textContent = title;
   msgEl.textContent = message;
   input.style.display = 'block';
   input.value = defaultValue;
   input.maxLength = 255;
   btnCancel.style.display = 'block';
   btnCancel.textContent = 'Abbrechen';
   btnOk.textContent = 'OK';
   overlay.classList.add('dialog-overlay--active');
   input.focus();

   return new Promise((resolve) => {
     const cleanup = () => {
       if (this._dialogState?.resolve === resolve) {
         this._dialogState = null;
       }
       btnOk.onclick = null;
       btnCancel.onclick = null;
       input.removeEventListener('keydown', handleKeydown);
       overlay.removeEventListener('click', handleOverlayClick);
     };

     const handleOk = () => {
       cleanup();
       overlay.classList.remove('dialog-overlay--active');
       resolve(input.value.trim());
     };
     const handleCancel = () => {
       cleanup();
       overlay.classList.remove('dialog-overlay--active');
       resolve(null);
     };
     const handleKeydown = (e) => {
       if (e.key === 'Enter') handleOk();
       if (e.key === 'Escape') handleCancel();
     };
     const handleOverlayClick = (e) => {
       if (e.target === overlay) handleCancel();
     };

     this._dialogState = { overlay, resolve, cleanup };
     btnOk.onclick = handleOk;
     btnCancel.onclick = handleCancel;
     input.addEventListener('keydown', handleKeydown);
     overlay.addEventListener('click', handleOverlayClick);
   });
  }

   async setupCloud() {
     let apiKey = null;

     // Schritt 1: API Key abfragen
     apiKey = await this.showInputDialog('☁️ Cloud Konfiguration', 'JSONBIN API Key:', CONFIG.JSONBIN_API_KEY);
     if (!apiKey) return;

     // Schritt 2: Bin ID abfragen
     const binId = await this.showInputDialog('☁️ Cloud Konfiguration', 'JSONBIN Bin ID:', CONFIG.JSONBIN_BIN_ID);
     if (!binId) return;

     const saved = saveStoredCloudConfig(apiKey, binId);
     if (!saved) {
       this.showDialog('❌ Fehler', 'Cloud-Daten konnten auf diesem Gerät nicht gespeichert werden.');
       return;
     }

     this.renderStatus();
     this.toast('☁️ Cloud-Zugangsdaten auf diesem Gerät gespeichert', 'success');

     try {
       await this.sync.sync(true);
     } catch {
       // renderStatus/onSyncError übernehmen das Feedback
     }
   }

  async forceSync() {
    this.sync.markDirty();
    await this.sync.sync(true);
  }

  async exportShoppingToGoogleTasks() {
    const openItems = this.shopping.getItems().filter(i => i.status === 'offen');
    if (openItems.length === 0) {
      this.showDialog('ℹ️ Kein Export', 'Es gibt aktuell keine offenen Einkaufsartikel.');
      return;
    }

    let clientId = String(CONFIG.GOOGLE_TASKS_CLIENT_ID || '').trim();
    if (!hasConfiguredGoogleTasksClientId(CONFIG)) {
      clientId = await this.showInputDialog(
        '🔐 Google Tasks koppeln',
        'Bitte Google OAuth Client ID eingeben (Web-App, endet auf .apps.googleusercontent.com):',
        clientId
      );
      if (!clientId) return;
      const saved = saveStoredGoogleTasksClientId(clientId);
      if (!saved || !hasConfiguredGoogleTasksClientId(CONFIG)) {
        this.showDialog('❌ Ungültig', 'Google Client ID konnte nicht gespeichert werden.');
        return;
      }
      clientId = String(CONFIG.GOOGLE_TASKS_CLIENT_ID || '').trim();
    }

    const listTitle = buildShoppingListTitle(new Date());
    const confirmed = await this.showDialog(
      '↗ Einkauf zu Google Tasks',
      `Neue Liste "${listTitle}" mit ${openItems.length} offenen Artikeln erstellen?`
    );
    if (!confirmed) return;

    try {
      const result = await exportOpenShoppingItemsToGoogleTasks(openItems, clientId, new Date());
      this.toast(`✅ ${result.exportedCount} Artikel nach Google Tasks exportiert`, 'success');
    } catch (err) {
      this.showDialog('❌ Export fehlgeschlagen', `Google Tasks Export konnte nicht abgeschlossen werden: ${err.message}`);
    }
  }

  applyImportedData(nextState, activeUserId = null) {
    this.storage.importData(nextState);

    if (activeUserId && this.storage.data?.users?.some(u => u.id === activeUserId)) {
      this.storage.setActiveUser(activeUserId);
    }

    this.storage.data.version = Number(this.storage.data.version || 0) + 1;
    this.storage.saveLocal();
    this.updateUI();

    // Sofort zur Cloud pushen (force=true).
     // Ist das Gerät offline, bleibt pending=true und der Push
     // wird automatisch nachgeholt sobald wieder online.
     this.sync.markDirty();
     this.sync.sync(true).catch(() => {});
   }

   // ── Analytics Export ─────────────────────────────────────────────────────────

   analyticsExportJSON() {
     const data = this.analyticsManager.exportFullReport();
     const json = JSON.stringify(data, null, 2);
     const blob = new Blob([json], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = `unser-nest-analytics-${new Date().toISOString().slice(0, 10)}.json`;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     URL.revokeObjectURL(url);
     this.toast('📄 JSON exportiert');
   }

   analyticsExportCSV() {
     const csv = this.analyticsManager.exportAsCSV();
     const blob = new Blob([csv], { type: 'text/csv' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = `unser-nest-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     URL.revokeObjectURL(url);
     this.toast('📊 CSV exportiert');
   }

   analyticsExportMonthly() {
     const report = this.analyticsManager.getMonthlyReport(30);
     const json = JSON.stringify(report, null, 2);
     const blob = new Blob([json], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = `unser-nest-monthly-report-${new Date().toISOString().slice(0, 10)}.json`;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     URL.revokeObjectURL(url);
     this.toast('📋 Monatlicher Report exportiert');
   }

   clearAllAnalytics() {
     const confirmed = confirm('⚠️ Alle Tracking-Daten wirklich löschen? Das kann nicht rückgängig gemacht werden.');
     if (confirmed) {
       this.tracker.clearAll();
       this.toast('🗑️ Alle Tracking-Daten gelöscht');
       this.updateUI();
     }
   }
 }

window.app = new App();
app.init();
