# UnserNest: Senior Development Roadmap
**Datum:** Juni 2026 | **Status:** 201 Tests ✅ 0 Fehler

---

## 📋 Ehrliches UX-Review (Go-Live Zustand)

### ✅ Was SEHR gut läuft:
1. **Test-Abdeckung exzellent** – 201 Tests, alle grün. Manager-Logik ist stabil & zuverlässig
2. **Kern-Features funktionieren** – Shopping, Inventory, Quests, Reisekasse, MealPlan alle einsatzbereit
3. **Sync-System bewährt** – JSONBin-Integration läuft smooth, Merge-Logik solide
4. **Mobile-responsive Design** – CSS mit Grid/Flexbox ist gut durchdacht
5. **Dark-Mode vorbereitet** – CSS-Variablen schon da (:root)

### 🟡 Ernstzunehmende UX-Friktionen (Priorität 1-3):

#### Priorität 1 (MUSS): Stabilität & Fehlerbehandlung
- **Problem:** Alerts statt moderner Fehlerbehandlung
  - Alte `alert()` + `confirm()` blockieren UI
  - Nutzer sieht nicht, wann etwas wirklich fehl geht
- **Lösung:** Toast-Error-System ausbauen + ErrorBoundary
- **Impact:** Heute könnte ein Fehler unterschwiegen werden

- **Problem:** Input-Validierung ist Lückenhaft
  - Shopping: HTML-Escape vorhanden ✅, aber keine Länbegrenzung
  - Quests: Title kann leer sein nach dem Abspeichern (Race-condition?)
  - Reisekasse: EUR-Eingabe mit Input[type="number"] verliert Precison (0.01 EUR → 1 Cent)
- **Lösung:** Einheitliche Validator-Lib + Max-Längen
- **Impact:** Datenqualität, XSS-Prevention (auch wenn noch ok)

- **Problem:** Storage-Quota nicht überwacht
  - localStorage ist begrenzt (5-10 MB je nach Browser)
  - Alte Einträge (Chronicle, Commerce) werden nicht bereinigt
- **Lösung:** Automatisches Cleanup + Quota-Warnung
- **Impact:** App könnte "einfrieren" wenn Speicher voll

#### Priorität 2 (SOLLTE): User Experience Verbesserungen
- **Reisekasse UI zu textlastig**
  - 276 Zeilen HTML als String in 1 render()
  - Viele Modals/Forms auf einer Seite
  - Nutzer verliert Überblick
  - Empfehlung: Multi-step Form mit Modal-Pattern

- **MealPlan ist zu komplex**
  - 437 Zeilen UI-Code, viele Inline-Events
  - Picker-Overlay gut, aber Ratings-System versteckt
  - Wochennavigation könnte intuitiver sein (Swipe auf Mobile?)

- **Shopping → Inventory Flow fehlgeschliffen**
  - Dropdown auf jedem gekauften Item ist sperrig
  - Besser: Slide/Modal-Flow: "Kaufenliste → Ort wählen → Vorrat"
  - Heute ein Klick zu viel pro Artikel

- **Fehlende Batch-Aktionen**
  - "Alle gekauft" Button? "Alle in Fridge einräumen"?
  - Viele Einzelklicks = Frustration bei großen Listen

#### Priorität 3 (KÖNNTE): Polished-Features
- **Navigation Breadcrumb über die Tabs hinaus**
  - "Shopping → Gekauft (3) → Fridge wählen"
  - Hilft Orientierung bei tiefen Workflows

- **Keyboard-Navigation**
  - Tab-Order optimiert? Escape-Key zum Schließen?
  - Mobile: Swipe-Navigation?

- **Offline-Indicator**
  - Cloud-Status Badge zeigt Online/Offline, aber manchmal delayed
  - "⏳ Ausstehend" Zustand könnte klarer formatiert sein (größer, warmer)

- **Empty States**
  - Vorhanden ✅, aber generisch ("🎒 Nichts einzuräumen")
  - Könnten mit Emoji + CTA besser sein

### 🔴 Sicherheit/Tech-Debt (zu beachten):
- Base64-codierte API-Keys in `config.js` – funktional ok für PWA, aber nicht wirklich gehärtet
- Kein CSRF-Token beim Cloud-Sync (JSONBin Rest-API, daher ok, aber Mindset)
- localStorage ist synchron → kann bei großen Datenmengen UI blocken

---

## 🛣️ Roadmap: 5 Phasen (je 1-2 Tage)

### **Phase 1: Fehlerbehandlung & Stabilität (2 Tage)**
- Toast-System erweitern (Error/Warning/Success aktiv nebeneinander)
- Alle `alert()`/`confirm()` durch Modal ersetzen
- Validation-Helper centralisieren
- Storage-Quota-Monitor einbauen
- Automatisches Cleanup von alten Chronik-Einträgen (>60 Tage)
- **Tests:** Alle bestehenden Tests weiterhin grün + 20 neue Error-Cases

### **Phase 2: Form & Input Robustness (1,5 Tage)**
- HTML-Sanitization verallgemeinern (aktuell: escapeHtml nur an 5 Stellen)
- Input-Länge beschränken (z.B. max 100 Zeichen für Artikel)
- EUR-Input korrekt normalisieren (Dezimal-Handling)
- Duplikat-Check bei Shopping-Listen
- **Tests:** 15 neue Input-Validierung Tests

### **Phase 3: UX-Flow Verbesserungen (2 Tage)**
- Reisekasse: Multi-Step Modal (Nutzer → Regel/Betrag → Grund)
- Shopping: "Markiert als gekauft → Modal: Ort wählen → Speichern"
- MealPlan: Batch-Cooking UI (mehrere Slots auf einmal kochen?)
- Fehlende Batch-Actions: "Alle → [Aktion]" Buttons
- **Tests:** UX-Flow Integrationstest mit gemocktem DOM

### **Phase 4: Polish & Accessibility (1,5 Tage)**
- Keyboard-Navigation (Tab-Order, ESC zum Schließen)
- Breiter Farb-Kontrast-Check
- Mobile Swipe-Navigation für Tabs (optional)
- Icons/Emojis konsistenter einsetzen
- **Tests:** a11y Audit mit Lighthouse

### **Phase 5: Monitoring & Documentation (1 Tag)**
- Error-Logging Layer (basierend auf besteh. Toast-System)
- README aktualisiert mit neuen Features
- Developer-Guide für zukünftige Features
- Performance-Baseline etabliert (First Paint, TTI)

---

## 📊 Metriken zum Nachverfolgen

| Metrik | Heute | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|--------|-------|---------|---------|---------|---------|---------|
| Tests Passing | 201/201 | 221/221 | 236/236 | 251/251 | 266/266 | 271/271 |
| Input-Validierung Coverage | 60% | 80% | 95% | 95% | 95% | 100% |
| Fehler ohne Alert | 70% | 90% | 95% | 98% | 100% | 100% |
| UX-Fiktion-Punkte | 45 | 35 | 25 | 10 | 5 | 0 |

---

## 🚦 Strict Constraints (NICHT anfassen)

```
🚫 SYNC-SYSTEM → komplexe Merge-Logik, läuft wunderbar
🚫 Manager-Classes (Shopping, Quests, MealPlan etc.) → Ultra-stabil durch Tests
✅ UI-Layer nur → saubere, testbare Änderungen hier
✅ Config: API-Keys nur über localStorage-backup, nie in Code
```

---

## 🎯 Definition of Done (jede Phase)

- [ ] Alle neuen Tests grün
- [ ] Keine bestehenden Tests kaputt
- [ ] Code-Review selbst durchlaufen (Linting, Warnings)
- [ ] Lokal getestet auf mindestens 2 Browser (Chrome + Safari/Edge)
- [ ] Performance-Regression check (DevTools: Paint Timing)
- [ ] Git Commit mit aussagekräftiger Message
- [ ] Sicher gemacht, dass Sync-System NICHT verändert wurde

---

## 🔗 Next Action
→ **Phase 1 starten:** Error-Handling überarbeiten + Storage-Quota-Monitor
→ Timeboxing: 3-4 Stunden, dann Review + Retrospektive


