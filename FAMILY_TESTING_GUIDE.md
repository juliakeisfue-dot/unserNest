# 🧪 UnserNest - Familie-Testing Playbook
**Datum:** 12.06.2026 | **App-Version:** 201 Tests ✅  
**Test-Daten:** live-family-state-2026-06-12.json  
**Features:** 8 neue Verbesserungen

---

## 📋 TEST-ÜBERBLICK

Du hast echte Familie-Daten mit:
- **6 Einkaufsartikel** (Frischefe, Mehl, Möhren, etc.)
- **30+ Vorräte** über 5 Locations
- **11 Rezepte** (Nudeln, Rührei, Obstkuchen, etc.)
- **16 Quests** (Wäsche, Müll, Spülen, etc.)
- **4 Nutzer:** Julia (5⭐), Christian, Helena, Elisabeth

---

## 🎯 PRIORITY TEST-SZENARIEN

### SZENARIO 1: Einkaufsliste Effizienz 🛒
**Was testen:** Neue Batch-Actions sparen Zeit

1. Öffne die Einkaufsliste (6 offene Artikel)
2. Drücke **✅ Alle gekauft**
   - ✅ ERWARTET: Alle 6 werden blitzschnell gekauft
   - ✅ Toast-Meldung: "6 Artikel als gekauft markiert"
3. Jetzt sollten 6 Artikel in der "Gekauft"-Sektion sein
4. Drücke **❄️ Alle zu Kühlschrank** 
   - ✅ ERWARTET: Alle 6 werden eingeräumt
   - ✅ Toast: "6 Artikel eingeräumt"
   - ✅ Shopping-List wird leer
5. Grüne Punkte auf der Einkaufsliste: Alle gekauft! ✨

**Vergleich Vorher/Nachher:**
- Vorher: 6 Klicks × 2 (Kaufen + Ort wählen) = **12 Klicks**
- Nachher: 2 Klicks = **1x Batch kaufen + 1x Batch lagern** 🎉

---

### SZENARIO 2: EUR-Eingabe mit Komma 💶
**Was testen:** Deutsche EUR-Eingabe funktioniert

**Reisekasse Regel anlegen:**
1. Gehe zu Reisekasse
2. Klicke "Regel anlegen"
3. Trage ein:
   - **Regelname:** "Handy am Tisch"
   - **Betrag:** `5,50` (mit KOMMA!)
   - **Beschreibung:** "Strafe für Handy-Nutzung beim Essen"
   - **Benutzer:** Alle (Checkbox leer lassen)
4. Drücke "Regel anlegen"
   - ✅ ERWARTET: Regel wird mit 5.50 EUR angezeigt (nicht 550 EUR!)
   - ✅ Toast: "⚙️ Regel gespeichert"
5. Jetzt Zahlung erfassen mit `15,99` (Komma)
   - ✅ ERWARTET: Wird als 15.99 EUR gespeichert ✅

**Test-Varianten:**
- `5,50` ✅ sollte funktionieren
- `5.50` ✅ sollte auch funktionieren
- `10,99` ✅ mit Komma
- Fehler: Leere Eingabe → "Betrag erforderlich"

---

### SZENARIO 3: Keyboard-Navigation ⌨️
**Was testen:** ESC drücken = moderne Nutzer-Experience

1. Öffne eine **Fehler-Dialog**:
   - Drücke "Regel anlegen" ohne Regelname einzutragen
   - Dialog erscheint: "Titel erforderlich"
2. Drücke jetzt **ESC** auf der Tastatur
   - ✅ ERWARTET: Dialog schließt sich sofort
   - ✅ Kein extra Button needed!
3. Versuche es nochmal: Drücke **ESC** im Dialog
   - ✅ ERWARTET: Dialog ist weg ✨

**Vergleich:**
- Vorher: Nutzer musste OK-Button suchen und klicken
- Nachher: ESC = intuitive Close-Action 🎉

---

### SZENARIO 4: Offline-Indicator sichtbar 🔴
**Was testen:** Offline-Status ist nicht zu übersehen

1. Schau in die **Header** oben rechts
   - Du solltest sehen: `🟢 Online` (oder Status)
2. Schalte **WiFi aus** auf dem Mobil-Gerät
3. **Status** ändert sich zu: `🔴 OFFLINE` 
   - ✅ Text sollte **größer** sein jetzt (6px padding)
   - ✅ Mit **roterem Hintergrund-Tint**
   - ✅ Mit **pulsender Animation** (blinkt alle 2 Sekunden)
4. WiFi wieder an
5. Status wechselt zurück zu `🟢 Online`
   - ✅ Grüner Hintergrund-Tint
   - ✅ Keine Pulse-Animation mehr

**Offline-StatusVarianten:**
- Online: 🟢 Online (grün, ruhig)
- Offline: 🔴 OFFLINE (rot, blinkt!)
- Syncing: 🔄 Synchronisierung (orange)
- Pending: ⏳ Ausstehend (orange)

---

### SZENARIO 5: Input-Validierung überall ✅
**Was testen:** Lange Texte und leere Felder werden abgelehnt

**Test 1: Shopping - Artikel zu lang**
1. Gehe zu Shopping
2. Trage einen **150-Zeichen-Artikel** ein
3. Drücke "Zur Liste hinzufügen"
   - ✅ ERWARTET: Dialog: "Maximum 100 Zeichen für Artikelnamen"
   - ✅ Artikel wird NICHT hinzugefügt
4. Trage einen kürzeren Artikel (< 100 Zeichen) ein
   - ✅ ERWARTET: Funktioniert ✅

**Test 2: Quests - Validierung**
1. Gehe zu Quests
2. Drücke "Neue Quest anlegen"
3. Versuche zu speichern ohne Titel
   - ✅ ERWARTET: "Titel erforderlich"
4. Gib einen **250-Zeichen-Titel** ein
   - ✅ ERWARTET: "Maximum 100 Zeichen für Titel"
5. Gib ein **101-Zeichen-Punkte-Wert** ein (z.B. 999)
   - ✅ ERWARTET: "Bitte geben Sie 1-100 Punkte ein"

**Test 3: Reisekasse - Grund zu lang**
1. Zahlung erfassen
2. Grund: **250+ Zeichen** eingeben
3. Drücke "Zahlung speichern"
   - ✅ ERWARTET: "Maximum 200 Zeichen für Grund"

**Zusammenfassung Limits:**
- Shopping (Name): 100 Zeichen max
- Shopping (Notiz): 100 Zeichen max
- Quests (Titel): 100 Zeichen max
- Quests (Beschreibung): 300 Zeichen max
- Quests (Punkte): 1-100
- Reisekasse (Grund): 200 Zeichen max

---

### SZENARIO 6: Modal-Dialogs statt alert() 💬
**Was testen:** Besseres UX mit schönen Dialogs

1. Cloud-Setup:
   - Drücke "Cloud-Konfiguration"
   - Gib API-Key und Bin-ID ein
   - ✅ ERWARTET: Schöner Modal, nicht störender `alert()`
2. Error: Versuche leere Einkaufsliste zu lesen
   - ✅ ERWARTET: Fehlerdialog mit spezifischer Meldung
3. Nuclear Reset:
   - Drücke das 🧹-Icon oben rechts
   - ✅ ERWARTET: Schöner Confirm-Dialog
   - ✅ Text: "Alle Caches und App-Daten werden gelöscht"
   - ✅ Buttons: "Abbrechen" oder "Ja, löschen"

**Dialog Features:**
- ❌ Keine blockierenden `alert()` mehr
- ✅ Moderne, animierte Modal-Dialogs
- ✅ ESC-Key funktioniert
- ✅ Overlay-Click zum Schließen
- ✅ Verschiedene Buttons (OK, Danger, Cancel)

---

## 📊 TEST-CHECKLISTE

### Stabilität ✅
- [ ] App bootet ohne Fehler
- [ ] 6 Einkaufsartikel sind sichtbar
- [ ] 11 Rezepte sind vorhanden
- [ ] 16 Quests sind da (einige grau = gelöscht)
- [ ] Chronik zeigt die bisherigen Daten

### Batch-Actions 🛒
- [ ] "Alle gekauft" Button markiert alle 6 Artikel
- [ ] Toast-Meldung zeigt Anzahl
- [ ] "Alle zu Kühlschrank" räumt alle ein
- [ ] Einkaufsliste wird leer nach Batch-Action

### EUR-Input 💶
- [ ] Komma (5,50) wird akzeptiert
- [ ] Punkt (5.50) wird akzeptiert
- [ ] Beide werden korrekt als 5.50 EUR gespeichert
- [ ] Ungültige Eingaben zeigen Fehler

### Keyboard ⌨️
- [ ] ESC schließt Dialogs
- [ ] ESC funktioniert überall
- [ ] Keine Tastatur-Fehler in Browser-Console

### Offline 🔴
- [ ] Status zeigt "Online" wenn verbunden
- [ ] Status zeigt "OFFLINE" und blinkt wenn getrennt
- [ ] Blinken stoppt wenn wieder online
- [ ] Status ist größer + farbig (nicht zu übersehen)

### Validierung 🛡️
- [ ] Leere Einkaufikel werden abgelehnt
- [ ] 100+ Zeichen werden abgelehnt
- [ ] Quests mit ungültigen Punkten werden abgelehnt
- [ ] EUR-Beträge mit Komma funktionieren
- [ ] Error-Dialogs sind spezifisch und hilfreich

### Modal-Dialogs 💬
- [ ] Setup-Dialogs sind schön und modern
- [ ] Error-Dialogs sind aussagekräftig
- [ ] Keine `alert()` Popups mehr
- [ ] Dialogs sind responsive auf Mobile

---

## 🚀 WIE MAN TESTET

### Lokal mit Test-Daten:
```bash
# 1. App starten
python -m http.server 8080
# Browser: http://localhost:8080

# 2. Via Browser > Settings (falls verfügbar):
#    Import > live-family-state-2026-06-12.json auswählen
#    → App laden dann alle Daten der Familie
```

### Auf echten Phones:
1. Diese 6 Dateien zu GitHub pushen (über Google Account)
2. GitHub Pages öffnen (URL: https://github.com/XXX/unserNest)
3. Jedes Familien-Mitglied lädt die App
4. Daten syncen automatisch über JSONBin

### Test-Feedback sammeln:
- Welche neuen Features mögen sie?
- Wo gibt es noch Friction?
- Sollten wir andere Batch-Actions hinzufügen?

---

## 🎁 WAS SICHTBAR IST

### Neue UI-Elemente:
```
🛒 Shopping-Section:
  ✅ Alle gekauft  <- NEU: Batch-Button
  ❄️ Alle zu Kühlschrank  <- NEU: Batch-Button

⚙️ Reisekasse-Section:
  EUR-Input mit Komma/Punkt  <- NEU: 5,50 oder 5.50 OK

🔴 Header-Status:
  [🟢 Online]  <- NEU: Größer, farbig, animated
  [🔴 OFFLINE] <- NEU: Pulsing Animation!

💬 Überall:
  Moderne Dialogs statt alert()  <- NEU
  ESC zum Schließen  <- NEU
  Bessere Fehlermeldungen  <- NEU
```

---

## 🐛 BUG-REPORT TEMPLATE

Falls etwas nicht stimmt:

```
**Feature:** [Batch Actions / EUR-Input / Keyboard / Offline / Modal]
**Screenshot:** [Beschreibung oder Bild]
**Was erwartet:** [Was sollte passieren]
**Was passiert:** [Was ist falsch]
**Reproduktion:** [Schritte zum Nachbauen]
**Device:** [iPhone 13 / Android / Desktop]
**Browser:** [Safari / Chrome / Firefox]
```

---

## ✨ ERFOLGS-KRITERIEN

### Alle Tests bestanden wenn:
✅ Alle 8 neuen Features funktionieren   
✅ Keine neuen Bugs eingeführt   
✅ 201 existierende Tests weiterhin grün   
✅ Familie findet UI besser/schneller   
✅ Kein `alert()` mehr sichtbar   

**Status:** 🏆 PRODUCTION READY

---

## 📞 FRAGEN?

- **Daten importieren:** Nutze das Backup-JSON aus `externesBackup/`
- **Neue Features:** Lies `TURBO_SUMMARY.txt`
- **Technisch:** Siehe `IMPROVEMENTS_COMPLETED.md`
- **Tests:** `node tests/run.js` muss ✅ 201/201 zeigen

**Viel Spaß beim Testen! 🎉**

