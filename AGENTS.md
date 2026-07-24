# AGENTS Guide for unserNest

## Projektbild in 60 Sekunden
- Reine Frontend-PWA ohne Build-Step, Backend oder DB; Zustand lebt in `localStorage` (`modules/core/storage.js`, `modules/core/config.js`).
- Einstieg ist `index.html` + ES-Module aus `modules/app/app.js`; die App orchestriert alle Manager/UI-Module.
- Optionaler Cloud-Abgleich läuft gegen JSONBin (`modules/core/storage.js`, `modules/core/sync.js`).
- Kern-Domänen: Einkauf, Vorrat, Quests, Belohnungen, Rezepte, Chronik, Kassenbon-OCR.

## Architektur-Pattern (wichtig)
- **Manager-Klassen** kapseln Datenlogik (z.B. `ShoppingManager`, `QuestManager`).
- **UI-Klassen** rendern HTML-Strings und rufen Manager über `app` auf (z.B. `modules/domains/shopping/ui.js`).
- `App.updateUI()` rendert immer nur die aktive Section (`_currentSection` Switch in `modules/app/app.js`).
- Viele UI-Aktionen nutzen inline `onclick="app..."`; globale Instanz ist `window.app`.

## Persistenz- und Sync-Konventionen
- Bei jeder fachlichen Mutation: `storage.data.version++` -> `storage.saveLocal()` -> `sync.markDirty()`.
- Soft-Delete wird über `_deleted` genutzt (z.B. `shoppingList`, `quests`, `chronicle`).
- Sync-Merge ist feldspezifisch implementiert (Shopping/User/Locations) in `SyncManager.merge()`.
- Migrationen passieren beim Laden in `Storage.loadLocal()` (fehlende Felder auffuellen, alte Shopping-Eintraege erweitern).

## Datenfluss-Beispiele (cross-component)
- Einkauf `offen -> gekauft -> eingeraeumt`: `modules/domains/shopping/manager.js` schreibt in `shoppingList` und `locations[*].items`.
- Punkte/Chronik: `UserManager.addPoints()` und `spendPoints()` schreiben gleichzeitig User-Punkte und Chronik.
- Quests vergeben Punkte ueber `users.addPoints(...)` (`modules/domains/quests/manager.js`).
- OCR speichert Bills und legt erkannte Artikel in der Einkaufsliste an (`modules/domains/bill/manager.js` -> `shopping.add(...)`).

## Entwickler-Workflow (realistisch fuer dieses Repo)
- Kein `package.json`, keine Tests, kein Linter im Repo gefunden.
- Lokal starten am besten mit statischem Server (statt `file://`) wegen ES-Modules/PWA:
  - `python -m http.server 8080`
- Danach im Browser `http://localhost:8080` oeffnen; Debugging primär ueber DevTools-Konsole.
- Bei Cache-/SW-Problemen den Reset-Button in `index.html` nutzen (unregister + Cache delete + reload).

## Aenderungen sicher einbauen
- Neue Feature-Sektion immer an 4 Stellen verknuepfen:
  1. Navigation + `<section>` in `index.html`
  2. Instanziierung in `modules/app/app.js`
  3. `updateUI()` Switch in `modules/app/app.js`
  4. Cache-Liste in `sw.js` (`ASSETS`) + ggf. `CACHE_NAME` anheben
- Wenn du neue persistente Felder einfuehrst, in `createInitialState()` und ggf. in `loadLocal()`-Migration beruecksichtigen.
- HTML aus Nutzereingaben i.d.R. mit `app.escapeHtml(...)` ausgeben (siehe `shoppingUI`, `recipesUI`, `questsUI`).

## Integrationspunkte & Stolpersteine
- JSONBin-Zugangsdaten liegen in `modules/core/config.js`; Platzhalterwerte werden in `app.renderStatus()` erkannt.
- OCR laedt Tesseract dynamisch von jsDelivr (`modules/domains/bill/manager.js`), first-use kann online benoetigen.
- Legacy-Module einer alten Architektur wurden entfernt; aktiver Einstieg ist `index.html` -> `modules/app/app.js`.
- `manifest.json` und `sw.js` muessen konsistent mit realen Dateinamen gehalten werden, sonst PWA-Assets fehlen offline.


