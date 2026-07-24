# Unser Nest

Offline-first Haushalts-App fuer 4 Nutzer (Julia, Christian, Helena, Elisabeth).

## Was diese App ist

- Reines Frontend (`index.html` + ES-Module in `modules/`)
- Kein Backend, keine Datenbank, keine Registrierung
- Datenhaltung lokal im Browser via `localStorage`
- Optionaler Cloud-Abgleich ueber JSONBin (kann deaktiviert bleiben)

## Kernfunktionen

- Einkaufsliste (`offen -> gekauft -> eingeraeumt`)
- Vorratsorte + Inventarverwaltung
- Quests, Punkte und Belohnungen
- Rezepte mit Verfuegbarkeitscheck gegen Inventar
- Chronik inkl. Backup-Export (1 Datei oder Konfig-Dateien) + Import
- Kassenbon-OCR (Tesseract.js, bei Erstnutzung online)

## Lokal starten (Windows/macOS/Linux)

Option A (wenn Python installiert ist):

```bash
python -m http.server 8080
```

Option B (mit Node.js, ohne Zusatzpakete):

```bash
node -e "const http=require('http');const fs=require('fs');const path=require('path');const root=process.cwd();const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.css':'text/css; charset=utf-8'};http.createServer((req,res)=>{let p=decodeURIComponent((req.url||'/').split('?')[0]);if(p==='/')p='/index.html';const f=path.join(root,p.replace(/^\//,''));if(!f.startsWith(root)){res.statusCode=403;res.end('Forbidden');return;}fs.readFile(f,(e,d)=>{if(e){res.statusCode=404;res.end('Not found');return;}res.setHeader('Content-Type',mime[path.extname(f).toLowerCase()]||'application/octet-stream');res.end(d);});}).listen(8080,()=>console.log('http://localhost:8080'));"
```

Dann im Browser oeffnen: `http://localhost:8080`

Hinweis: Nicht per `file://` starten, da ES-Module + PWA/SW einen statischen Server brauchen.

## Offline und Sync

- Standard: vollstaendig lokal/offline
- Austausch zwischen Geraeten:
  - JSON-Backup exportieren/importieren (Chronik-Bereich, auch als mehrere Konfig-Dateien)
  - oder optional JSONBin konfigurieren in `modules/core/config.js`

## Wichtige Dateien

- `modules/app/app.js`: App-Orchestrierung, Section-Rendering, SW-Registrierung
- `modules/core/storage.js`: LocalStorage + JSONBin API-Zugriff
- `modules/core/sync.js`: optionaler Merge/Sync
- `sw.js`: Offline-Cache der App-Dateien
- `AGENTS.md`: technische Arbeitskonventionen fuer Coding-Agents
