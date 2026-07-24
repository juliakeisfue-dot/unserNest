# 📊 Analytics & Dokumentations-System für unserNest

## ✅ Was wurde implementiert?

### Phase 1: Dokumentation
- **`modules/core/documentation.js`** - Zentraler Feature-Katalog mit allen Funktionen, Statusangaben, Datenmodellen und Berechtigungen
- **`modules/domains/documentation/manager.js`** - Manager für Dokumentations-Zugriff
- **`modules/domains/documentation/ui.js`** - UI-Rendering der Feature-Dokumentation

### Phase 2: Automatisches Tracking
- **`modules/core/tracker.js`** - Tracking-Engine für Funktionsnutzung: 
  - `trackFeatureUsage(featureId, eventName, userId, metadata)` - Hauptmethode
  - `getAnalytics()` - Aggregierte Statistiken pro Feature
  - `getUserActivity(userId)` - Nutzer-zentrische View
  - `getEventsByDate(featureId)` - Zeitliche Trends
  - `exportAsJSON()` / `exportAsCSV()` - Export-Funktionen
  - Speichert lokal in localStorage unter `unser-nest-analytics-v1`

### Phase 3: Analytics Dashboard
- **`modules/domains/analytics/manager.js`** - Report-Generierung:
  - `getDashboard()` - Zusammenfassung für Hauptseite
  - `getUserReport(userId)` - Pro-Nutzer Analytics
  - `getTrendsByDay(days)` - Zeitliche Trends
  - `getMonthlyReport(daysBack)` - 1-Monat-Report für Verkauf
  - `exportFullReport()` - Kompletter Export

- **`modules/domains/analytics/ui.js`** - Dashboard-Visualisierung:
  - `renderDashboard()` - Feature-Ranking, Event-Statistiken, Export-Buttons
  - `renderMonthlyReport()` - Detaillierter Monatsbericht mit Trends
  - `renderUserReport(userId)` - Nutzer-spezifische Aktivität

### Integration in App
- Tracker wird in `app.js` initialisiert und ist global verfügbar
- Neue Navigation-Buttons: `📊 Analytics` und `📚 Dokumentation`
- Export-Funktionen: JSON, CSV, 1-Monat-Report
- Analytics-Daten können jederzeit gelöscht werden

## 🎯 Benutzen im Hintergrund

Der Tracker läuft **non-invasiv im Hintergrund**. Um Funktionsnutzung zu verfolgen, müssen Sie in den jeweiligen Managern (z.B. `shopping/manager.js`) folgende Aufrufe hinzufügen:

```javascript
// Beispiel in shopping/manager.js
add(name, note) {
  // ...existing logic...
  this.app.tracker?.trackFeatureUsage('shopping', 'item_added', 
    this.app.storage.activeUserId, { itemName: name });
}
```

**Fertig zu trackende Events** (aus `documentation.js`):
```javascript
shopping: ['item_added', 'item_marked_bought', 'item_marked_shelved', 'item_deleted']
inventory: ['item_added', 'item_updated', 'item_removed', 'location_viewed']
quests: ['quest_created', 'quest_assigned', 'quest_completed', 'points_earned']
mealplan: ['slot_set', 'slot_moved', 'slot_cooked', 'slot_rated', 'week_viewed']
// ...und mehr in modules/core/documentation.js
```

## 📈 Daten-Aufbewahrung & Export

### Lokal (Browser)
- Alle Tracking-Daten in `localStorage` unter `unser-nest-analytics-v1`
- **Keine Server-Uploads** (sofern nicht manuell exportiert)
- Speicher-Limit: ~5-10MB pro Browser (abhängig vom Device)
- Alte Events werden automatisch entfernt wenn > 1000 pro Feature

### Export-Optionen
1. **JSON Export** - Vollständiger Datensatz für externe Tools
2. **CSV Export** - Für Excel/Google Sheets Analyse
3. **Monatlicher Report** - Strukturierter 30-Tage-Überblick

```javascript
// Manual export via Browser Console:
app.analyticsManager.exportFullReport()  // JSON-Report
app.tracker.exportAsCSV()               // CSV-Format
```

## 📋 In einem Monat beantwortbar:

### ✅ Welche Funktionen gibt es?
- **Dokumentation-Tab** zeigt alle 8 Core-Features mit Beschreibungen, Status und use-cases

### ✅ Was ist fertig?
- Status je Feature in Dokumentation: `fertig | planung | inarbeit`
- Alle Core-Features sind als `fertig` markiert

### ✅ Was ist geplant?
- In `modules/core/documentation.js` den Status auf `planung` setzen
- Wird automatisch in Dokumentation sichtbar

### ✅ Welche Daten werden gespeichert?
- **Data-Schema Tab** in Dokumentation listet alle Felder pro Feature
- Speicher-Auslastung sichtbar im Browser DevTools (Application > localStorage)

### ✅ Wie funktioniert die Anmeldung?
- **Authentication-Sektion** in Dokumentation erklärt: Keine zentrale Authentifizierung erforderlich
- Lokale User-Verwaltung, optional Cloud-Sync über JSONBin

### ✅ Welche Rechte haben Benutzer?
- **Permissions-Sektion** pro Feature (z.B. `add: ['all']`, `edit: ['creator']`)
- Admin-Role vorgesehen (noch nicht vollständig implementiert)

### ✅ Wer nutzt welche Funktion wie oft?
- **Analytics Dashboard** zeigt:
  - Feature-Ranking nach Event-Anzahl
  - User-spezifische Aktivität (wer was nutzt)
  - Daily trends (Aktivität pro Tag)
  - Monatliche Reports mit Ø Events/Tag

## 🔍 Testing / Debug

```javascript
// Browser Console:

// Events manuell tracken
app.tracker.trackFeatureUsage('shopping', 'item_added', 'julia', { itemName: 'Milch' });

// Analytics anschauen
app.analyticsManager.getDashboard();

// User-Report
app.analyticsManager.getUserReport('julia');

// Alle Events der letzten 7 Tage
app.analyticsManager.getTrendsByDay(7);

// Tracking-Daten löschen
app.tracker.clearAll();
```

## 📦 Next Steps für Integration

1. **Tracking in Managern einbauen** (Phase 3 der Planung):
   - ShoppingManager.add() → `trackFeatureUsage('shopping', 'item_added', ...)`
   - QuestManager.complete() → `trackFeatureUsage('quests', 'quest_completed', ...)`
   - MealPlanManager.cookSlot() → `trackFeatureUsage('mealplan', 'slot_cooked', ...)`
   - (Siehe AGENTS.md für vollständige Liste)

2. **Cloud-Backup für Analytics** (optional):
   - Monatliche Reports zu JSONBin hochladen
   - Tracking-Daten lokal behalten, Reports in Cloud

3. **Verkaufs-Dokumentation**:
   - `docs/DOCUMENTATION.md` aus `modules/core/documentation.js` generieren
   - Screenshots für Features hinzufügen
   - Feature-Demo-Videos verlinken

## 🎯 Architektur-Highlights

- **Non-invasiv**: Tracker blockiert niemals die App (try-catch, silent-fail)
- **Speicher-effizient**: ~50 bytes pro Event, auto-cleanup bei > 1000 pro Feature
- **Offline-arbeitsbereit**: Alles lokal, keine API-Abhängigkeit
- **DSGVO-konform**: Daten bleiben im Device, nur optional manueller Export

---

**Status**: ✅ Dokumentation + Analytics-System funktionsbereit  
**Nächste Phase**: Tracker-Integration in bestehende Manager (1-2 Tage Arbeit)

