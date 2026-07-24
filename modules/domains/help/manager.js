// modules/domains/help/manager.js
/**
 * Help Manager
 *
 * Zentrale Dokumentation aller Features
 * In einfachem Deutsch, direkt aus der App aufrufbar
 */

export class HelpManager {
  constructor() {
    this.sections = [
      {
        id: 'overview',
        title: '🏠 UnserNest - Was ist das?',
        category: 'Start',
        content: this.getOverview()
      },
      {
        id: 'whats-new',
        title: '✨ Neue Features (Juni 2026)',
        category: 'Updates',
        content: this.getWhatsNew()
      },
      {
        id: 'shopping',
        title: '🛒 Einkauf',
        category: 'Module',
        content: this.getShoppingHelp()
      },
      {
        id: 'inventory',
        title: '📦 Vorräte',
        category: 'Module',
        content: this.getInventoryHelp()
      },
      {
        id: 'recipes',
        title: '🍳 Rezepte',
        category: 'Module',
        content: this.getRecipesHelp()
      },
      {
        id: 'mealplan',
        title: '📅 Speiseplan',
        category: 'Module',
        content: this.getMealplanHelp()
      },
      {
        id: 'reisekasse',
        title: '💰 Reisekasse',
        category: 'Module',
        content: this.getReisekasseHelp()
      },
      {
        id: 'quests',
        title: '🎯 Aufgaben (Quests) & Punkte',
        category: 'Module',
        content: this.getQuestsHelp()
      },
      {
        id: 'rewards',
        title: '🏆 Belohnungen',
        category: 'Module',
        content: this.getRewardsHelp()
      },
      {
        id: 'bill',
        title: '🧾 Kassenbon (im Einkauf)',
        category: 'Module',
        content: this.getBillHelp()
      },
      {
        id: 'chronicle',
        title: '📜 Chronik',
        category: 'Module',
        content: this.getChronicleHelp()
      },
      {
        id: 'documentation',
        title: '📚 Dokumentation (in Hilfe)',
        category: 'Module',
        content: this.getDocumentationHelp()
      },
       {
         id: 'changelog',
         title: '📝 Änderungen ansehen',
         category: 'Transparenz',
         content: this.getChangelogHelp()
       },
      {
         id: 'mobile-tips',
         title: '📱 Mobile-Tipps',
         category: 'Tipps',
         content: this.getMobileTipsHelp()
       },
       {
         id: 'offline',
         title: '🔴 Offline & Sync',
         category: 'Tipps',
         content: this.getOfflineHelp()
       }
    ];
  }

  getOverview() {
    return `
# 🏠 Willkommen bei UnserNest!

**UnserNest** ist eine alltagsnahe Haushalts-App fuer Familien und Wohngemeinschaften.
Sie hilft dabei, Aufgaben fair zu verteilen, Einkaeufe zu organisieren und den Ueberblick zu behalten.

## Was du in der App findest

**🛒 Einkauf**
Einkaufsliste mit Status (offen, gekauft, eingeraeumt) und schnellen Sammelaktionen.

**📦 Vorräte**
Welche Lebensmittel sind da, wo liegen sie und wie lange sind sie haltbar?

**🍳 Rezepte**
Rezepte mit Zutaten, Links, Schwierigkeitsgrad und Familienbewertungen.

**📅 Speiseplan**
Wochenplanung fuer Mahlzeiten: planen, kochen, bewerten.

**💰 Reisekasse**
Regeln, Zahlungen und Abrechnungen transparent dokumentiert.

**🎯 Aufgaben (Quests) & 🏆 Belohnungen**
Aufgaben erledigen, Punkte sammeln, priorisieren und Belohnungen einloesen.

**📜 Chronik**
Verlauf, Analytics und Backup/Import an einem Ort.

## So startest du schnell

1. **Person auswaehlen** (oben in der Leiste)
2. **Modul oeffnen** (Navigation)
3. **Aktion ausfuehren** (z. B. Einkauf eintragen)
4. **Automatisch speichern** (lokal) und bei Bedarf synchronisieren (Cloud)

## Warum das gut funktioniert

✅ **Offline-First:** Laeuft auch ohne Internet  
✅ **Transparent:** Aenderungen sind nachvollziehbar  
✅ **Motivierend:** Punkte und Belohnungen unterstuetzen den Alltag  
✅ **Praxisnah:** Fuer echte Familienablaeufe gemacht

**Schoen, dass du da bist - viel Freude beim Organisieren!** 📲
    `;
  }

  getWhatsNew() {
    return `
# ✨ Neue Features (Juni 2026)

Hier ist ein kompakter Ueberblick ueber die neuesten Verbesserungen:

## 🛒 Einkauf: Schnell hinzufügen + Massen-Einräumen

**Was ist neu:**
- "💡 Schnell hinzufügen" mit Standardlebensmitteln (z. B. Butter, Eier, Milch)
- "Mehr..." öffnet die komplette Standardliste
- "✅ Alle gekauft" - markiert alle offenen Artikel auf einmal
- "❄️ Alle zu Kühlschrank" - räumt alle gekauften Items ein
- "📍 Alle zu Raum..." - räumt alle gekauften Artikel in einen frei gewählten Raum

**Warum das hilft:** Weniger Klicks, mehr Uebersicht, schneller fertig.

**Wie:** Im Modul Einkauf die neuen Buttons nutzen.

---

## 🎯 Quests: Faelligkeit + klare Konsequenzen

**Was ist neu:**
- Quests koennen ein Faelligkeitsdatum haben
- Bei ueberfaelligen Quests kann eine Geldstrafe ausgeloest werden (z. B. 2 EUR)
- Die Strafe wird als Reisekasse-Transaktion gespeichert und in der Chronik protokolliert

**Warum das hilft:** Verbindlichkeit und Fairness werden sichtbar gelebt.

**Wie:** Bei überfälliger Quest erscheint ein "💰"-Button.

---

## 💶 Deutsche EUR-Eingabe

**Was:** Du kannst jetzt in der Reisekasse beide Schreibweisen nutzen:
- 5,50 EUR (mit Komma) ✅
- 5.50 EUR (mit Punkt) ✅

Beide werden automatisch korrekt verarbeitet!

**Warum:** Weil wir Deutsche sind und mit Komma rechnen. 😊

---

## ⌨️ Tastatur-Navigation (ESC)

**Was:** Drücke einfach "ESC", um Dialoge zu schließen.

**Warum:** Moderner und intuitiver - keine langen Fingerwege nötig.

**Wie:** Frag da unten unter "⌨️ Tastatur-Tipps" nach mehr!

---

## 🔴 Offline-Indicator - deutlicher!

**Was:** Der Online/Offline-Status oben rechts ist jetzt:
- Größer + übersichtlicher
- Bei Offline: **Blinkt rot** zur Aufmerksamkeit
- Mit farbigen Hintergrund-Tints

**Warum:** Du siehst sofort, ob Daten gerade synchronisieren oder wo du offline bist.

---

## ✅ Input-Validierung überall

**Was:** Die App checkt jetzt Eingaben:
- Keine leeren Felder
- Maximale Zeichenzahl (100-300)
- Nur gültige Zahlen

**Warum:** Verhindert Fehler und Datenmüll.

---

## 💬 Moderne Dialoge statt Popups

**Was:** Statt nerviger Browser-Alerts gibt es schöne, moderne Dialoge:
- Mit Animation
- Mit klaren Buttons
- Mit ESC zum Schließen
- Mit hilfreichen Fehlermeldungen

**Warum:** Deutlich bessere User Experience!

---

## 📦 Backup erweitert (Schema v2)

**Was ist neu:**
- Backup enthaelt jetzt zusaetzlich **Reisekasse** und **Chronik**
- Schema-Version wurde auf **v2** angehoben
- Changelog bleibt weiterhin ausserhalb des Konfig-Backups

**Warum das hilft:** Wichtige Verlaufsdaten gehen beim Geraetewechsel nicht verloren.

---

## 🚀 Alles zusammen

Die Neuerungen machen die App alltagstauglicher, klarer und robuster.
Danke fuer euer Vertrauen und euer Feedback - genau so wird die App besser. 💚
    `;
  }

  getShoppingHelp() {
    return `
# 🛒 Einkauf - Anleitung

## Was macht der Einkauf?

Wir sammeln hier alles, was wir kaufen müssen.
Der Status zeigt: "Offen" → "Gekauft" → "Eingeräumt"

## So funktioniert's

### 1. Artikel hinzufügen
- Oben "z.B. Milch" eingeben
- Optional: Menge/Note hinzufügen ("2 Liter", "Vollmilch")
- Optional: Kategorie wählen (oder automatisch erkennen lassen)
- Button "Zur Liste hinzufügen" drücken

✨ Tipp: Mit der Enter-Taste geht es besonders schnell.

### 1b. Gruppierte Darstellung
- Offene und gekaufte Artikel werden nach Kategorien gruppiert:
  - Frisches Obst & Gemüse
  - Gekühlte Lebensmittel
  - Konserven
  - Fertig-Lebensmittel
  - Hygieneartikel
- Innerhalb jeder Kategorie ist die Liste alphabetisch sortiert.
- Über **"🏷️ Kategorie hinzufügen"** kannst du eigene Kategorien ergänzen.

### 2. Beim Einkaufen: Markieren
- Artikel ✓ drücken → Status wird "Gekauft"

**NEU:** "✅ Alle gekauft" markiert alle offenen Artikel auf einmal.

### 3. Nach dem Einkaufen: Einräumen
- Artikel wird in "🛒 Gekauft" verschoben
- Ort wählen (🧊 Kühlschrank / 📦 Lager / etc.)
- 📦 Button drücken → Ort wählen → Fertig!

**NEU:** "❄️ Alle zu Kühlschrank" raeumt alle gekauften Artikel direkt ein.
**NEU:** "📍 Alle zu Raum..." raeumt alle gekauften Artikel in den gewaehlten Raum ein.
**NEU:** "📍 Alle zu Raum..." = räumt ALLE gekauften Artikel in den gewählten Raum ein!

### 0. Schnellstart mit Standardlebensmitteln
- Unter dem Formular findest du **"💡 Schnell hinzufuegen"**
- Ein Klick uebernimmt haeufige Artikel direkt (inklusive Standardmenge)
- Ueber **"Mehr..."** oeffnest du die komplette Vorschlagsliste

### 0b. Export zu Google Tasks (optional)
- Button **"↗ Google Tasks (offen)"** erstellt eine neue Google-Liste
- Listenname: **Einkauf KW xx/yyyy**
- Exportiert werden nur **offene** Artikel
- Jeder Artikel wird als eigener Task angelegt
- Beim ersten Mal gibst du einmalig deine Google OAuth Client ID ein

### 0c. Zutaten aus Speiseplan-Rezepten übernehmen
- Button **"🍳 Zutaten von Rezept hinzufügen"** zeigt alle geplanten Rezepte der aktuellen Woche
- Du kannst ein einzelnes Rezept oder alle geplanten Rezepte wählen
- Gleiche Zutaten werden zusammengeführt (z.B. Mayo aus mehreren Rezepten)
- Die Summe wird im Artikel angezeigt (Σ Menge), inkl. Herkunft aus den Rezepten

### 4. Artikel löschen (optional)
- 🗑️ Button → Artikel raus

## Status erklärt

- **📋 Offen:** Müssen wir noch kaufen
- **🛒 Gekauft:** Gekauft, müssen noch eingeräumt werden
- **✅ Grüne Punkte:** Wenn alle Artikel eingeräumt sind = "Alles erledigt!"

## Tipps

✅ Artikel-Namen sollten klar sein ("Butter" statt "Das")
✅ Notizen helfen ("Butter" + "für Kuchen" vs. "zum Kochen")
✅ Regelmaessig aktualisieren - je aktueller die Liste, desto entspannter der Einkauf
✅ Duplikate vermeiden - checke vor dem Hinzufügen, ob es schon da ist

## Fehler?

- **"Bitte geben Sie einen Artikelnamen ein"** → Name war leer
- **"Maximum 100 Zeichen"** → Name/Notiz zu lang (kürzen!)
- **"Bitte wählen Sie einen Ort"** → Beim Einräumen muss ein Ort gewählt sein
- **"Google Tasks Export fehlgeschlagen"** → Client ID prüfen oder Google-Anmeldung erneut bestätigen

## Wenn etwas unklar ist

"Wo ist mein gekaufter Artikel?" → In **📦 Vorraete** nachsehen.
    `;
  }

  getInventoryHelp() {
    return `
# 📦 Vorräte - Überblick

## Was macht die Vorräte-Verwaltung?

Hier sehen wir: Was haben wir Zuhause? Wo? Wie lange noch haltbar?

## Die Orte

- **🧊 Kühlschrank:** Frische Sachen, ca. 90 Tage Haltbarkeit
- **🗄️ Apothekenschrank:** Trockenware, Gewürze, 2+ Jahre
- **📦 Lager:** Vorräte, Getränke, 730 Tage (2 Jahre)
- **🌿 Terrasse:** Frische Kräuter, Gemüse aus Hochbeet
- **📦 Bad:** Hygiene-Artikel, lange haltbar

## Wie kommen Artikel da hin?

### Automatisch:
Wenn du im Einkauf einen Artikel als "Gekauft" + "Ort" markierst, wird er automatisch in die Vorräte verschoben.

### Manuell:
(Später: Du kannst auch direkt hinzufügen)

## Artikel-Info

Jeder Artikel zeigt:
- 📝 Name
- 📊 Menge / Gewicht (optional)
- ⏰ Mindesthaltbarkeitsdatum
- 📍 Wo ist es?

## Konsumieren

Wenn du ein Artikel benutzt (z.B. 3 Eier genommen statt 6):
- Menge wird aktualisiert (6 → 3 Eier)
- Artikel bleibt im Lager
- Wenn Menge = 0 → Artikel weg

## Tipps

✅ Menge beschriften: "6" Eier oder "1L" Milch
✅ Regelmäßig prüfen: Was ist bald abgelaufen?
✅ Alternativ: Nutze den Speiseplan - der rechnet Zutaten ab!

## Verbindung zu Rezepten

Wenn du "Rührei" kochen möchtest und nur 3 Eier hast (brauchst 4):
- App sagt dir: "Nur 3 Eier da, brauchst 4"
- Du kannst trotzdem kochen (best-effort)
- Oder Eier auf die Einkaufsliste setzen

## Frage?

"Wie lange hält Joghurt?" → Im Kühlschrank ca. 2-4 Wochen (App zeigt MHD)
"Was ist bald abgelaufen?" → Schau regelmäßig hier → älteste Items oben
    `;
  }

  getRecipesHelp() {
    return `
# 🍳 Rezepte - Sammlung

## Was macht die Rezepte-Sammlung?

Hier speichern wir unsere Lieblingsrezepte mit:
- Zutaten-Listen
- Links zu externen Rezepten
- Bewertungen von der Familie

## Ein Rezept anlegen

1. Titel: "Rührei", "Obstkuchen", etc.
2. Zutaten: "Eier, Milch, Butter" (komma-getrennt)
3. Link: URL zum Rezept (optional)
4. Schwierigkeitsgrad: "sehr einfach" bis "schwierig"
5. Zeit: "10 Min", "45 min", etc.
6. Portionen: "2", "4", etc.

→ Speichern!

## Ein Rezept kochen (via Speiseplan)

Im Speiseplan → Rezept auswählen → "Gekocht" drücken
→ App zieht automatisch Zutaten ab!

## Bewertungen

Nach dem Kochen: Familie kann bewerten 1-5 Sterne.
Mit Kommentar: "Zu würzig", "Kinder lieben's", etc.

→ Beste Rezepte oben im Ranking!

## Tipps

✅ Rezepte beschreibend benennen: "Nudeln mit Bolognese" statt "Pasta"
✅ Zutaten genau eintragen: App muss sie mit Vorräten abgleichen
✅ Links sammeln: Chefkoch, Rezepteseiten und andere Quellen
✅ Familie bewerten lassen: Lieblingsrezepte entstehen so!

## Verbindung zum Speiseplan

Das ist die Brücke:
Rezepte → Speiseplan (wann kochen?) → Vorräte (haben wir Zutaten?)

## Frage?

"App sagt: Zucchini nicht da - was tun?" 
→ Entweder Zutaten-Liste anpassen ODER Zucchini auf Einkaufsliste setzen
    `;
  }

  getMealplanHelp() {
    return `
# 📅 Speiseplan - Wochenplanung

## Was macht der Speiseplan?

Wir planen: Wer kocht was, für wann?
Und: Was haben wir dafür überhaupt im Lager?

## Wochennavigation

Oben Links/Rechts: Navigiere zwischen Wochen.
- ← Letzte Woche
- → Nächste Woche
- Heute wird gehighlightet

## Ein Rezept planen

1. Tag + Mahlzeit wählen (z.B. "Montag Abendessen")
2. Rezept aus der Liste wählen
3. Portionen angeben (z.B. "4")
4. Speichern

Das Rezept ist jetzt geplant!

## Rezept verschieben (neu)

Wenn sich der Koch-Tag ändert, musst du nicht löschen und neu planen.

### Variante A: Schnell per Knopf "📅↔️" (empfohlen für Firefox/iPhone)
1. Beim geplanten Rezept auf "📅↔️" tippen
2. Neues Datum im Format "YYYY-MM-DD" eingeben (z.B. "2026-06-24")
3. Bestätigen
4. Falls das Ziel schon belegt ist: Nachfrage bestätigen oder abbrechen

### Variante B: Manuell mit "↔️" und Ziel "📍"
1. Beim Quell-Slot "↔️" wählen
2. Im Ziel-Slot auf "📍" oder "📍 Hierhin verschieben" tippen
3. Bei belegtem Ziel ggf. Ersetzen bestätigen

Hinweis: Auf manchen Geräten ist klassisches Drag&Drop eingeschränkt. Die Knopf-Varianten funktionieren zuverlässig.

## Rezept kochen

Wenn es Zeit ist:
1. "Gekocht" Button drücken
2. App prüft: Haben wir alle Zutaten?
   - Grün ✅ = ja, alle vorhanden
   - Orange ⚠️ = teilweise vorhanden (trotzdem kochen möglich!)
   - Rot ❌ = Zutat ganz weg
3. Zutaten werden automatisch abgezogen

## Zutaten direkt auf den Einkaufszettel

- Bei jedem geplanten Rezept gibt es den Button **"🛒 Zutaten auf Einkaufszettel"**
- Damit übernimmst du die Zutaten dieses Rezepts direkt in die Einkaufsliste
- Bereits offene Artikel werden nicht doppelt angelegt

## Bewerten & Sterne

Nach dem Essen: Familie gibt 1-5 Sterne
Mit Kommentar: "Mega lecker!" oder "Zu salzig?"

→ Beste Rezepte werden Top-Favoriten!

## WICHTIG: Nur 14 Tage!

Der Speiseplan zeigt nur die **letzten 14 Tage**.
Alte Einträge verschwinden automatisch (aber Bewertungen bleiben!)

Warum? → Übersichtlichkeit + weniger Speicher

## Tipps

✅ Wochenend-Planung: Freitag/Sonntag kurz planen
✅ Mit der Familie absprechen: "Nächste Woche Fisch-Tag"
✅ Sterne geben: So finden wir die Lieblingsessen
✅ Fehlendes einkaufen: Die App sagt Bescheid, welche Zutaten fehlen

## Verbindung zu Rezepten & Vorräten

Speiseplan = Schnittstelle:
- Rezepte (Was können wir kochen?)
- Vorräte (Haben wir Zutaten?)
- Einkaufsliste (Was fehlt?)

Alles spricht miteinander!

## Frage?

"Wie viele Portionen sollte ich planen?"
→ Checke: Wie viele essen mit? Normal: 2-4 Portionen
    `;
  }

  getReisekasseHelp() {
    return `
# 💰 Reisekasse - Familienbudget

## Was ist die Reisekasse?

Die Reisekasse dokumentiert klar und fair:
**Wer zahlt was, warum und wann.**

Ziel ist Transparenz und gemeinsame Verbindlichkeit - nicht Bloßstellung.

## Die Regeln (aktuell)

**Christian:** 5€ wenn nicht einkaufen war (Faulheits-Motivator 😄)
**Julia:** 5€ Handy am Esstisch
**Helena:** 2€ Handy am Esstisch
**Elisabeth:** 2€ Handy am Esstisch
**Alle:** 5€ für politisch unkorrekte Äußerungen (mit Handy-Prüf-Exception!)

## Regeln gemeinsam pflegen

Regeln sind bewusst anpassbar.
Wenn sich etwas im Alltag aendert, kann die Familie Regeln besprechen und aktualisieren.

**Wichtig:** Jede Aenderung bleibt nachvollziehbar dokumentiert.

## Zahlung erfassen

1. Nutzer wählen (wer zahlt?)
2. Regel wählen (optional - auch "Freie Buchung" möglich)
3. Betrag: 5,50€ oder 5.50 - alles erlaubt!
4. Grund: "Handy am Tisch"
5. Zeitstempel: Wann war es? (Standard: Jetzt)
6. Speichern!

→ Zahlung ist sofort in der Historie sichtbar.

## Quest-Geldstrafe (neu)

Wenn eine Quest mit Strafregel ueberfaellig ist:

1. Im Modul **Quests** erscheint bei der Quest ein **💰-Button**
2. Nach Bestaetigung wird die Strafe automatisch als Zahlung in der Reisekasse eingetragen
3. Parallel wird ein Eintrag in der Chronik erstellt

So ist klar dokumentiert, dass die Konsequenz aus einer konkreten Aufgabe stammt.

## Wochenabrechnung

Jede Woche Samstag/Sonntag:
→ "Woche abrechnen" Button

Das:
- Fasst alle Zahlungen der Woche zusammen
- Zeigt wer wieviel insgesamt bezahlt hat
- Markiert als "Abgerechnet"

→ So sieht jede Person transparent den Wochenstand.

## EUR-Eingabe

NEU: Du kannst beide Schreibweisen nutzen:
- 5,50€ (mit Komma) ← Deutsches Format!
- 5.50€ (mit Punkt)

Beide werden korrekt verarbeitet!

## Transparenz & Fairness

**Warum dokumentieren wir alles?**
→ Damit Diskussionen auf Fakten basieren und Entscheidungen fair bleiben.

Jede Zahlung ist sichtbar:
- Wer hat gezahlt? ← Nutzer
- Wann? ← Zeitstempel
- Wofür? ← Grund + Regel
- Regeln geändert? ← Verlauf einsehbar

→ **Keine anonymen Vorwuerfe**
→ **Volle Transparenz**

## Backup & Sicherheit

- Backup-Format ist aktuell **Schema v2**
- Backups enthalten auch **Reisekasse** und **Chronik**
- So bleiben Zahlungen, Strafen und Verlauf beim Wiederherstellen erhalten

## Frage?

"Was ist, wenn ich eine Zahlung bestreite?"
→ In Ruhe gemeinsam klaeren. Die Dokumentation liefert die Faktenbasis.

"Kann ich die Regeln selber ändern?"
→ Ja, am besten nach gemeinsamer Absprache. Jede Aenderung wird dokumentiert.
    `;
  }

  getQuestsHelp() {
    return `
# 🎯 Aufgaben (Quests) & Punkte

## Was ist neu bei Aufgaben?

Aufgaben koennen jetzt wie ToDos genutzt werden:
- **Adressierung:** fuer eine Person oder fuer alle
- **Melder:in:** sichtbar, wer die Aufgabe eingetragen hat
- **Prioritaet/Ranking:** Sehr hoch, Hoch, Mittel, Niedrig
- **Perspektive:** Standardansicht zeigt nur Aufgaben **fuer mich oder alle**

Damit werden Absprachen sichtbar, Fortschritte nachvollziehbar und Entscheidungen alltagstauglich.

## Was bleibt gleich?

- Aufgaben geben weiterhin Punkte
- Abhaengigkeiten, Wiederholbarkeit, Rotation und Geldstrafe funktionieren wie bisher
- Belohnungen koennen weiter mit Punkten eingeloest werden

## Standard-Aufgaben

- **Wäsche waschen:** 10 Punkte, wiederholbar
- **Wäsche trocknen:** 10 Punkte, wiederholbar
- **Wäsche einräumen:** 15 Punkte, wiederholbar
- **Zimmer aufräumen:** 20 Punkte, wiederholbar
- **Müll rausbringen:** 5 Punkte, wiederholbar
- **Spülen:** 10 Punkte, wiederholbar

## Aufgabe erledigen

1. Aufgabe in der Liste oeffnen
2. Button "Erledigen" drücken
3. ✅ Erledigt! Punkte sind da!

→ Punkte werden sofort gutgeschrieben.

## Punkte sehen

Oben in der User-Bar: "Julia 35★"
Das sind deine Punkte!

Punkte kannst du einlösen für Belohnungen (siehe unten)

## Wiederholbar vs. Einmalig

**Wiederholbar:** Du kannst die Aufgabe mehrfach erledigen (z.B. "Wäsche waschen")

**Einmalig:** Mit "Abhängigkeit" - zuerst muss eine andere Aufgabe erledigt sein

Beispiel: "Wäsche trocknen" hängt von "Wäsche waschen" ab!

## Neue Aufgabe anlegen

1. "Neue Aufgabe anlegen"-Form ausfuellen
2. Titel (z.B. "Hausaufgaben machen")
3. Punkte (z.B. 10)
4. Faelligkeitsdatum setzen (optional)
5. Ziel waehlen: **fuer alle** oder **fuer eine Person**
6. Prioritaet waehlen (Niedrig/Mittel/Hoch/Sehr hoch)
7. Haengt von anderer Aufgabe ab? (optional)
8. Wiederholbar ja/nein
9. Speichern

Die App merkt automatisch, wer die Aufgabe eingetragen hat (Melder:in).

## Prioritaet und Ranking (neu)

- Aufgaben mit hoeherer Prioritaet stehen weiter oben
- Bei gleicher Prioritaet entscheiden Faelligkeit und Ueberfaelligkeit
- So bleibt Wichtiges oben, ohne weniger Dringendes zu verlieren

## Filter

**📋 Alle:** Zeigt Aufgaben, die fuer mich oder fuer alle gelten  
**🎯 Verfügbar:** Ich kann sie jetzt erledigen  
**🔒 Gesperrt:** Wartet auf Abhaengigkeit oder Faelligkeit  
**✅ Erledigt:** Bereits fertig

## Faelligkeit und Geldstrafe

- Aufgaben mit Datum koennen "Heute faellig", "Morgen faellig" oder "Ueberfaellig" sein.
- Fuer bestimmte Aufgaben kann eine Geldstrafe hinterlegt werden.
- Bei Ueberfaelligkeit erscheint ein **💰-Button**.
- Nach Bestaetigung wird die Strafe in der Reisekasse als Zahlung erfasst.
- Zusaetzlich wird ein Chronik-Eintrag erstellt.

Das Ziel ist nicht Bestrafung, sondern **klare, faire Verbindlichkeit**.

## Tipps

✅ Punkte motivieren: "Noch 30 Punkte bis zur Belohnung!"
✅ Aufgaben beschreibend benennen: "Spuelmaschine ausraeumen" statt "Arbeiten"
✅ Abhängigkeiten nutzen: Wasch → Trocknen → Einräumen (Workflow!)
✅ Prioritaet bewusst setzen: Dringendes hoch, Planbares niedriger
✅ Familie-Meeting: Was sind faire Punkte fuer eine Aufgabe?

## Verbindung zu Belohnungen

Aufgaben erledigen → Punkte sammeln → Belohnungen kaufen!

Das ist der Gamification-Kreislauf – macht allen Spaß!

## Rotierende Aufgaben (z. B. Bad putzen)

Bei Rotations-Quests zeigt die App an, wer heute dran ist.
Wenn ausnahmsweise jemand anderes übernimmt:

1. Bei der Aufgabe auf den Button "👥" tippen
2. Namen der Person eingeben, die heute übernimmt
3. Danach normal mit "🧽" abschließen

So bleibt die Reihenfolge fair, aber der Alltag flexibel.

## Ist das Logging einsehbar?

Ja. Wichtige Ereignisse sind in der **Chronik** sichtbar
(u. a. Wechsel der Rotation und Strafen).

## Wenn etwas unklar ist

"Kann ich erledigte Aufgaben nochmal machen?" → Ja, wenn "Wiederholbar" aktiv ist.
    `;
  }

  getRewardsHelp() {
    return `
# 🏆 Belohnungen - Punkte einlösen

## Was sind Belohnungen?

Dinge die Familien-Mitglieder mit ihren Punkten "kaufen" können!

## Standard-Belohnungen

- **30 Min Fernsehen:** 30 Punkte
- **60 Min Fernsehen:** 50 Punkte
- **Übernachtung bei Freund:** 80 Punkte
- **Ausflug wählen:** 100 Punkte
- **Süßigkeit nach Wahl:** 15 Punkte

## Belohnung einlösen

1. Deine Punkte checken (oben in User-Bar: "Julia 35★")
2. Belohnung wählen
3. "Einlösen" drücken
4. ✅ Erledigt! Punkte weg, Belohnung freigeschaltet!

**WICHTIG:** Punkte werden SOFORT abgezogen!

## Belohnungen bearbeiten

Du kannst Belohnungen ändern:
- Neue Belohnung erfinden: "Pizza-Abend"
- Punkte-Kosten anpassen
- Alte Belohnungen löschen

## FAQ

**"Meine Punkte sind weg!"**
→ Du hast eine Belohnung eingelöst
→ Sieh nach: Welche Belohnung? Sollen wir rückgängig machen?

**"Kann ich eine Belohnung zurückgeben?"**
→ Aktuell: Nein (wir müssen das nochmal überlegen)
→ Frag die Familie - vielleicht gibt's Ausnahmen

**"Welche Belohnung soll ich nehmen?"**
→ Deine Entscheidung! 😊 Was willst du dir gönnen?

## Tipps

✅ Belohnungen sollten motivieren
✅ Punkte-Kosten fair setzen: Schwierige Quests = höhere Punkte
✅ Kleine Belohnungen (15-30 Punkte) für schnelle Gewinne
✅ Große Belohnungen (80-100 Punkte) für längerfristige Ziele

## Verbindung zu Quests

Quests & Belohnungen = Das Gamification-System:

Quest erledigen → +10 Punkte → 3 mehr Quests → 40 Punkte gesamt → Neue Belohnung freischalten!

Macht Hausaufgaben + Haushalt viel mehr Spaß! 🎮

## Frage?

"Welche Belohnung ist die beste?"
→ Das entscheidest du! Es geht um deine Motivation 💪
    `;
  }

  getBillHelp() {
    return `
# 🧾 Kassenbon - Schnell erfassen

Hinweis: Der Kassenbon-Scanner liegt jetzt im Modul **Einkauf**
und wird dort über den Button **"🧾 Kassenbon erfassen"** geöffnet.

## Was macht das Modul?

Mit dem Kassenbon-Modul kannst du Einkäufe aus Bon-Fotos direkt in die App übernehmen.
Die erkannten Artikel landen im Einkauf und können danach normal gekauft/eingeräumt werden.

## So nutzt du es

1. Kassenbon fotografieren oder Bild auswählen
2. OCR starten
3. Erkannte Positionen prüfen
4. Übernehmen

## Was wird gespeichert?

- Bon-Text und Zusammenfassung
- Erkannte Artikel mit Preis
- Datum des Einkaufs

## Tipps

✅ Bon flach und gut beleuchtet fotografieren
✅ Unscharfe Fotos führen zu schlechter Erkennung
✅ Nach der Erkennung kurz gegenprüfen, bevor du übernimmst
    `;
  }

  getChronicleHelp() {
    return `
# 📜 Chronik - Familienverlauf

## Was ist die Chronik?

Die Chronik zeigt wichtige Ereignisse aus dem Alltag:
- Punkte erhalten/ausgegeben
- relevante Aktionen aus Modulen
- Verlauf für mehr Transparenz

## Wofuer ist sie gut?

- Schnell sehen, was zuletzt passiert ist
- Punkte-Entwicklung nachvollziehen
- Bei Rueckfragen den Verlauf pruefen

## Analytics ist jetzt hier

Die Auswertung (Events, Nutzer, Top-Feature) findest du direkt in der Chronik
im Block **"📈 Analytics (in Chronik)"**.

## Backup-Hinweis

In der Chronik findest du auch den Weg zum Backup/Import.
So kannst du den aktuellen Stand sichern oder wiederherstellen.

**Neu:** Das Backup enthält jetzt auch **Reisekasse + Chronik** (Schema v2).
So bleiben Zahlungen, Strafen und Verlauf beim Export/Import erhalten.

### Neue Funktion: ♻️ Mitgelieferte Sicherung

- In **Chronik** auf **"♻️ Mitgelieferte Sicherung"** tippen.
- Die App spielt dann die im Deployment enthaltene Backup-Datei ein.
- Alle aktuellen Daten werden dabei durch diesen Stand ersetzt.

## Fuer Aussenstehende kurz erklaert

Wenn du die App neu uebernimmst: Die Chronik ist der beste Einstieg,
um Entscheidungen und Entwicklungen im Haushalt schnell zu verstehen.
    `;
  }

  getDocumentationHelp() {
    return `
# 📚 Dokumentation - in der Hilfe gebündelt

Die technische Dokumentation ist jetzt Teil der Hilfe.
Damit bleiben Navigation und Alltag einfacher.

## Was steht dort?

- Übersicht der Features
- Datenmodell-Hinweise
- Status/Einordnung von Funktionen

## Für wen?

- Alltag: Hilfe-Schnelltexte in den Modulabschnitten
- Technik/Weiterentwicklung: dieser Dokumentationsabschnitt
    `;
  }

  getChangelogHelp() {
    return `
# 📝 Änderungslog - Transparenz

## Was bedeutet Änderungslog in UnserNest?

Mit "Änderungslog" meinen wir die nachvollziehbare Historie wichtiger Aktionen.
Der wichtigste Einstieg dafür ist die **Chronik**.

Dort siehst du zum Beispiel:
- Punkte-Aktionen
- wichtige Quest-Ereignisse
- Reisekasse-Buchungen (inklusive Strafzahlungen)
- Zeitpunkte und Kontext

## Warum ist das hilfreich?

- Entscheidungen werden transparent
- Absprachen bleiben nachvollziehbar
- Missverständnisse lassen sich ruhiger klären

## Wichtig für Backup

- Das Konfig-Backup (Schema v2) enthält **Chronik** und **Reisekasse**
- Ein eigener Changelog-Bereich ist aktuell **nicht** Teil des Backups

## Praxistipp

Wenn du neu in die App einsteigst: Öffne zuerst die **Chronik**.
So bekommst du in wenigen Minuten ein gutes Bild vom bisherigen Verlauf.
    `;
  }

  getMobileTipsHelp() {
    return `
# 📱 Mobile-Tipps & Tricks

So nutzt du UnserNest auf Android und iPhone angenehm und effizient.

## 1) Schnell und sicher bedienen

- Tippen reicht fuer fast alle Aktionen.
- Buttons sind bewusst gross gehalten und gut erreichbar.

## 2) Lesbarkeit verbessern

- Bei Bedarf Schriftgroesse im Geraet erhoehen.
- In langen Listen lieber langsam scrollen statt schnell springen.

## 3) Akku und Daten sparen

- Die App ist offline-first: Viele Aktionen funktionieren ohne Netz.
- Synchronisierung passiert automatisch, sobald wieder Internet da ist.

## 4) Orientierung und Komfort

- Hochformat ist fuer den Alltag meist am uebersichtlichsten.
- Querformat kann bei langen Tabellen hilfreich sein.

## 5) Datensicherheit im Alltag

- Geraetesperre (PIN/Fingerprint) aktiviert lassen.
- Regelmaessig Backup in der Chronik erstellen.

## Kurzantworten

"Funktioniert die App ohne Internet?"
→ Ja, lokal sofort. Sync folgt automatisch bei Verbindung.

"Wie sichere ich mich ab?"
→ In **Chronik > Backup** regelmaessig exportieren.

Die App soll dir Arbeit abnehmen - nicht neue machen. 💪
    `;
  }

  getOfflineHelp() {
    return `
# 🔴 Offline & Sync - So funktioniert es

## Online vs. Offline

Die App funktioniert mit und ohne Internet.
Das ist bewusst so gebaut, damit ihr im Alltag nicht blockiert seid.

**Online 🟢:**
- Automatische Synchronisierung mit der Cloud
- Andere Geraete sehen neue Aenderungen zeitnah

**Offline 🔴:**
- Lokales Arbeiten geht normal weiter
- Aenderungen bleiben auf dem Geraet gespeichert
- Synchronisierung folgt spaeter automatisch

## Was passiert mit deinen Aenderungen?

1. Du aenderst etwas in der App.
2. Die Aenderung wird sofort lokal gespeichert.
3. Bei Internet wird sie automatisch synchronisiert.
4. Bei Offline bleibt sie sicher lokal und wird spaeter nachgereicht.

## Status-Anzeigen

**🟢 Online:** Alles synchronisiert, aktuell
**🔴 OFFLINE:** Kein Internet, lokal speichernd
**⏳ Ausstehend:** Du warst offline, jetzt wird es hochgeladen
**🔄 Synchronisierung:** Gerade aktiv synchronisieren

## Wann wird synchronisiert?

- Nach Aenderungen (wenn online)
- Regelmaessig im Hintergrund
- Optional manuell per Sync-Button

## Speicherort deiner Daten

**Lokal (immer):** localStorage auf dem Geraet
**Cloud (optional):** JSONBin (wenn konfiguriert)

Ohne gueltige Zugangsdaten kann niemand auf eure Cloud-Daten zugreifen.

## Was bei Verbindungsproblemen passiert

- Die App versucht automatisch erneut zu synchronisieren
- Der Status bleibt auf "ausstehend", bis es klappt
- Deine Daten bleiben lokal erhalten

## Datenverlust-Schutz

Regelmaessige Backups sind weiterhin sinnvoll:
- in der Chronik exportieren
- Datei z. B. in Cloudspeicher oder extern sichern

## Cloud-Einrichtung (einmalig)

1. Cloud Setup oeffnen
2. API-Key und Bin-ID eintragen
3. Speichern und synchronisieren

Danach laeuft der Abgleich automatisch.

## Tipps

✅ Regelmaessig Backup erstellen
✅ Statusanzeige im Kopfbereich im Blick behalten
✅ Bei Bedarf manuell synchronisieren

## Kurze Antworten

"Kann ich laenger offline arbeiten?"
→ Ja. Aenderungen werden spaeter automatisch nachgeladen.

"Muss ich beim Offline-Wechsel etwas tun?"
→ Nein. Die App kuemmert sich automatisch darum.
    `;
  }

  getAllSections() {
    return this.sections;
  }

  getSection(id) {
    return this.sections.find(s => s.id === id);
  }

  getSectionsByCategory(category) {
    return this.sections.filter(s => s.category === category);
  }

  getCategories() {
    const cats = new Set(this.sections.map(s => s.category));
    return Array.from(cats);
  }
}

export default HelpManager;
