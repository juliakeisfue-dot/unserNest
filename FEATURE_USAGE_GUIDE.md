# 🚀 Bedienungsanleitung - Die 3 neuen Features (29.06.2026)

## 1️⃣ Feature: Geldstrafen für überfällige Quests 💸

### Situation
Helena soll das Bad bis Sonntag Abend putzen. Wenn bis dahin nicht erledigt → 2 EUR Strafe in Urlaubskasse.

### So funktioniert es

#### Für den Admin/Eltern
- Das Bad-Putzen Quest ist bereits mit Strafe konfiguriert:
  - **Fällig am**: Sonntag (29.06.2026, 23:59)
  - **Strafe**: 2,00 EUR
  - **Grund**: "Nicht rechtzeitig gereinigt"

#### Für die Nutzer
1. Gehe zu **🎯 Quests**
2. Suche nach "Bad putzen (reihum)"
3. Wenn die Quest überfällig ist (nach dem DueDate) UND nicht erledigt:
   - Du siehst einen roten Button **"💰 2.00€"**
4. Klick den Button
5. Dialog fragt: "Geldstrafe für [Name]? Betrag: 2.00€"
6. Bestätigung → Strafe wird in Reisekasse eingetragen 📋

#### Wo die Strafe sichtbar ist
- ✅ **Reisekasse** → "💰 Reisekasse" Tab → Transaktion sichtbar
- ✅ **Chronik** → "📜 Chronik" → Eintrag: "Geldstrafe: Helena zahlt €2.00 wegen 'Bad putzen'"
- ✅ **Journal** → Alle Transaktionen dokumentiert

#### Wichtig
- ⚠️ **Strafe nur 1x pro Quest möglich** (nicht mehrmals drücken!)
- ⚠️ **Erst anwenden, wenn klar ist, dass die Task nicht erfüllt wird**
- ✅ Problem: Quest wird gültig erledigt, Strafe geht weg

---

## 2️⃣ Feature: Massenraum-Funktion 📍

### Situation
Du warst allein einkaufen und hast viele Artikel gekauft. Statt jeden einzeln in einen Raum zu räumen, wählst Du den Raum einmal und alles wird automatisch dorthin geräumt.

### So funktioniert es

1. Gehe zu **🛒 Einkauf**
2. Markiere alle Artikel als gekauft (**✓** Button oder "✅ Alle gekauft")
   - Sie erscheinen unter "🛒 Gekauft"
3. Du siehst zwei Buttons:
   - **❄️ Alle zu Kühlschrank** (Quick-Button für häufigen Fall)
   - **📍 Alle zu Raum...** (für andere Räume)
4. Klick **"📍 Alle zu Raum..."**
5. Dialog: "Wählen Sie einen Raum"
6. Dropdown mit allen Räumen:
   - 🧊 Kühlschrank
   - 🗄️ Apothekenschrank
   - 📦 Lager
   - 🌿 Terrasse
   - 📖 Weitere benutzerdefinierte Räume...
7. Raum wählen → **Einräumen**
8. Toast: "📦 12 Artikel eingeräumt" ✅

#### Beispiel-Workflow
```
Einkaufszettel:
□ Butter        → markiert ✓
□ Eier          → markiert ✓
□ Tomaten       → markiert ✓
□ Zucker        → markiert ✓

Alles gekauft → "📍 Alle zu Raum..." →
Dialog: Welcher Raum?
[Dropdown: Lager] → Einräumen

Alle 4 Artikel sind jetzt im Lager! ✨
```

---

## 3️⃣ Feature: Autovervollständigung + Standardlebensmittel 💡

### Situation
Du möchtest schnell häufig gekaufte Lebensmittel mit typischen Mengen hinzufügen.

### So funktioniert es

#### Schritt 1: Schnellbuttons sehen
Gehe zu **🛒 Einkauf** und schaue unter dem Eingabeformular:

**💡 Schnell hinzufügen:**
- **Butter** | **Eier** | **Milch** | **Hafermilch** | **Käse** | **Joghurt** | **Mehr...**

#### Schritt 2: Artikel schnell hinzufügen
1. Klick auf einen Button z.B. **"Butter"**
   - Voila! "Butter" mit Menge "2" wird hinzugefügt ✨
   - Direkt gekauft (abhängig von deiner Einstellung)
2. Wiederhole für weitere Artikel

#### Schritt 3: Mehr Artikel sehen
Klick **"Mehr..."** um alle 25 Standardlebensmittel zu sehen:

Dialog öffnet sich mit Grid-Layout:
```
[Butter 2]    [Eier 10]    [Milch 1l]
[Hafermilch]  [Käse]       [Joghurt]
[Quark 500g]  [Mehl 1kg]   [Roggenmehl 1kg]
[Haferflocken][Zucker]     [Honig]
[Öl]          [Sojasoße 50ml] [Sesamöl 20ml]
...und 10 weitere
```

#### Was wird eingetragen?
Jeder Button zeigt:
- **Name** (z.B. "Butter")
- **Standardmenge** (z.B. "2" - typischerweise 2 Packungen)

Wenn keine Standardmenge: Du gibst Sie ein (oder leer).

#### Beispiel-Workflow
```
Ich brauche: Butter, Eier, Milch, Käse

1. Klick Butter → "Butter" + "2" hinzugefügt ✓
2. Klick Eier → "Eier" + "10" hinzugefügt ✓
3. Klick Milch → "Milch" + "1l" hinzugefügt ✓
4. Klick Mehr → Dialog mit allen Items
5. Im Dialog: Klick Käse → "Käse" hinzugefügt ✓

Fertig! 4 Artikel in Sekunden! ⏱️
```

---

## 🎰 Alle Features zusammen

### Beispiel-Szenario

**Montag, Julia kauft ein:**
1. Erstellt Einkaufsliste mit **Schnell-Buttons** (Butter, Eier, Milch, Käse)
2. Geht einkaufen
3. Markiert alles als gekauft
4. Klick **"📍 Alle zu Raum..."** → Wählt "Lager"
5. Alle 4 Artikel sind im Lager ✅

**Sonntag Abend, Helena hat das Bad nicht geputzt:**
1. Im **🎯 Quests** Tab sieht man das rote **"💰 2.00€"** Button
2. Klick → "Geldstrafe für Helena? 2.00€"
3. Bestätigung
4. Strafe in **💰 Reisekasse** sichtbar
5. Eintrag in **📜 Chronik**

---

## 🛠️ Technische Details (für Entwickler)

### Datenmodel Updates

#### Quest-Felder (neu)
```javascript
{
  id: "bad-putzen-rotation",
  title: "Bad putzen (reihum)",
  dueDate: "2026-06-29",           // ← NEU
  penaltyAmountCents: 200,         // ← NEU (2,00 EUR)
  penaltyDescription: "Nicht rechtzeitig gereinigt", // ← NEU
  rotation: { ... }
}
```

#### Reisekasse-Transaktion (automatisch erstellt)
```javascript
{
  id: "rk-tx-...",
  reason: "Geldstrafe: Bad putzen (Nicht rechtzeitig gereinigt)",
  amountCents: 200,
  userId: "helena",
  occurredAt: Date.now()
  // Wird automatisch beim "Strafe anwenden" erstellt
}
```

#### Config-Standardlebensmittel
```javascript
STANDARD_GROCERIES: [
  { name: "Butter", suggestion: "2", category: "Kühlschrank" },
  { name: "Eier", suggestion: "10", category: "Kühlschrank" },
  // ... 23 weitere
]
```

---

## ⚙️ Konfiguration anpassen

### Strafe ändern?
**Datei**: `modules/core/config.js`
```javascript
{
  id: 'bad-putzen-rotation',
  penaltyAmountCents: 200,  // ← Hier andern (in Cents: 100 = 1 EUR)
  dueDate: '2026-06-29',    // ← Hier DueDate andern
}
```

### Standardlebensmittel erweitern?
**Datei**: `modules/core/config.js`
```javascript
STANDARD_GROCERIES: [
  // ... existierende Items
  { name: 'Neu Item', suggestion: '2', category: 'Kategorie' },
]
```

### Automatische Strafen?
Aktuell: **Manuell** (Geldstrafe anwenden Button)
Zukünftig möglich: Automatisches Triggering beim Server-Check

---

## 📱 Auf mobilen Geräten

✅ Alle Features funktionieren auf Smartphone/Tablet
- Buttons sind touch-freundlich (>44px)
- Dialoge sind responsive
- Grid-Layout passt sich an

---

## 🐛 Troubleshooting

### Problem: "💰-Button wird nicht angezeigt"
- ✅ Überprüfe ob Quest wirklich **überfällig** ist (nach DueDate)
- ✅ Überprüfe ob Quest **nicht abgeschlossen** ist
- ✅ Überprüfe ob penaltyAmountCents in config > 0 ist

### Problem: "Strafe wird mehrfach angewendet"
- ✅ Das ist unmöglich! Nach 1x Strafe ist das Flag `_penaltyApplied = true` gesetzt

### Problem: "Massenraum-Button funktioniert nicht"
- ✅ Muss mindestens 1 Artikel im "Gekauft" Status haben
- ✅ Raum muss gültig sein (nicht gelöscht)

### Problem: "Schnell-Buttons zeigen nicht die richtigen Mengen"
- ✅ Überprüfe STANDARD_GROCERIES in config.js
- ✅ Suggestion = Menge (leer = beliebig)

---

## 📋 Checkliste vor Deploy

- [x] Alle 3 Features implementiert
- [x] Chronik-Integration getestet
- [x] Reisekasse-Integration getestet
- [x] UI-Buttons angezeigt
- [x] Dialog-Bestätigung funktioniert
- [x] localStorage Persistierung OK
- [x] Cloud-Sync markiert
- [x] Mobile-freundlich
- [x] Fehler-Handling

---

**Status**: ✅ Production Ready (29.06.2026)  
**Tester**: Senior Development Agent  
**Dokumentation**: Vollständig  
**Backup empfohlen**: JA! (vor dem "Strafe anwenden" erste Zeit)

Viel Erfolg! 🎉

