# 📝 UnserNest - Änderungs-Dokumentation
**Audit-Log für alle Module**

---

## 🎯 ÜBERSICHT

Alle Benutzer-Aktionen werden von jetzt an dokumentiert:
- **WAS** wird geändert (Modul + Action)
- **WER** macht die Änderung (Nutzer-Name)
- **WANN** passiert es (Timestamp + formatiert)
- **WARUM** (Beschreibung + Metadaten)

Das ermöglicht der Familie:
✅ **Transparenz:** Wer hat was gemacht?  
✅ **Audit-Trail:** Vollständige Änderungshistorie  
✅ **Konflikt-Lösung:** "War das Isabella oder Helena?"  
✅ **Regelverstöße:** Für Reisekasse-Disputes  

---

## 🛒 EINKAUFSLISTE (Shopping)

### Dokumentierte Mutationen:

| Action | Beschreibung | Wann geloggt | Metadaten |
|--------|-------------|-------------|-----------|
| **add** | "Artikel hinzugefügt" | Sofort beim Hinzufügen | `{ itemId, itemName, itemNote }` |
| **update** | "Status geändert: offen→gekauft" | Bei markBought() | `{ itemId, itemName, oldStatus, newStatus }` |
| **update** | "Status geändert: gekauft→offen" | Bei undo() | `{ itemId, itemName, oldStatus, newStatus }` |
| **use** | "Eingeräumt zu Kühlschrank/Bad/Lager" | Bei markStored() | `{ itemId, itemName, locationId, locationName }` |
| **delete** | "Gelöscht von Liste" | Bei remove() | `{ itemId, itemName, reason: "manual_delete" }` |
| **use** | "Batch: Alle gekauft (6 Artikel)" | Bei markAllBought() | `{ count: 6, batchAction: true }` |
| **use** | "Batch: Alle eingeräumt (6 Artikel)" | Bei markAllStoredToLocation() | `{ count: 6, locationId, locationName, batchAction: true }` |

### Familie sieht:

```
🛒 Einkaufsliste
─────────────────────────────────────────
📝 Aktivität (letzte 7 Tage):

🛒 ➕ Julia hat "Milch" hinzugefügt
   12.06.2026 14:23

🛒 ✏️ Christian hat Status geändert: offen → gekauft
   "Butter"
   12.06.2026 14:15

🛒 ✓ Helena hat "Käse" eingeräumt zu 🧊 Kühlschrank
   12.06.2026 14:05

🛒 ✓ Julia hat Batch-Aktion: 6 Artikel gekauft
   12.06.2026 13:45
```

---

## 📦 VORRÄTE (Inventory)

### Dokumentierte Mutationen:

| Action | Beschreibung | Wann geloggt | Metadaten |
|--------|-------------|-------------|-----------|
| **add** | "Artikel eingeräumt" | Bei addItem() | `{ itemId, itemName, locationId, amount, expiresAt }` |
| **update** | "Artikel bearbeitet" | Bei updateItem() | `{ itemId, oldName, newName, oldAmount, newAmount }` |
| **use** | "Artikel konsumiert (3 Stk → 2 Stk)" | Bei consumeItem() | `{ itemId, itemName, amountBefore, amountAfter }` |
| **delete** | "Artikel gelöscht (vollständig aufgebraucht)" | Bei consumeItem() wenn Menge=0 | `{ itemId, itemName, reason: "consumed_fully" }` |
| **update** | "Ort hinzugefügt: Apothekenschrank" | Bei addLocation() | `{ locationId, locationName, maxAgeDays }` |
| **update** | "Ort gelöscht: Bad (leer)" | Bei removeLocation() | `{ locationId, locationName }` |
| **use** | "Artikel verschoben: Kühlschrank → Lager" | Bei moveItem() | `{ itemId, itemName, fromLocation, toLocation }` |

### Familie sieht:

```
📦 Vorräte
─────────────────────────────────────────
📝 Aktivität pro Ort:

🧊 Kühlschrank:
  📦 ➕ Elisabeth hat "Eier (6)" eingeräumt
     12.06.2026 14:30

  📦 ✓ Christian hat "Butter" konsumiert
     (1 Stk übrig)
     12.06.2026 13:00

  📦 ✓ Julia hat "Joghurt" vollständig aufgebraucht
     12.06.2026 10:15

📦 Lager:
  📦 ➕ Helena hat "Kartoffeln" eingeräumt
     12.06.2026 09:30
```

---

## 🍳 REZEPTE (Recipes)

### Dokumentierte Mutationen:

| Action | Beschreibung | Wann geloggt | Metadaten |
|--------|-------------|-------------|-----------|
| **add** | "Neues Rezept angelegt" | Bei addRecipe() | `{ recipeId, recipeName, ingredients, difficulty }` |
| **update** | "Rezept bearbeitet" | Bei updateRecipe() | `{ recipeId, recipeName, changedFields[] }` |
| **delete** | "Rezept gelöscht" | Bei deleteRecipe() | `{ recipeId, recipeName, reason: "user_deleted" }` |
| **use** | "Rezept bewertet: 5 ⭐" | Bei rateRecipe() | `{ recipeId, recipeName, userId, stars, ratedAt }` |

### Familie sieht:

```
🍳 Rezepte
─────────────────────────────────────────
📝 Änderungshistorie:

🍳 ➕ Julia hat Rezept "Obstkuchen" angelegt
   Schwierigkeitsgrad: mittel, 45 min
   12.06.2026 14:00

🍳 ✏️ Christian hat "Rührei" bearbeitet
   (Zutaten aktualisiert)
   12.06.2026 10:30

🍳 ✓ Elisabeth hat "Nudel-Wurst-Rettung" mit 4⭐ bewertet
   "Sehr lecker, alle Kinder haben probiert!"
   11.06.2026 19:45

🍳 ✓ Helena hat "Pfannkuchen" mit 3⭐ bewertet
   11.06.2026 19:30
```

---

## 📅 SPEISEPLAN (MealPlan)

**WICHTIG:** Nur letzte 14 Tage + Ratings behalten!

### Dokumentierte Mutationen:

| Action | Beschreibung | Wann geloggt | Metadaten |
|--------|-------------|-------------|-----------|
| **add** | "Rezept geplant: Montag Abendessen" | Bei setSlot() | `{ slotKey, recipeId, recipeName, servings }` |
| **delete** | "Plan gelöscht: Donnerstag Mittagessen" | Bei removeSlot() | `{ slotKey, recipeId, recipeName }` |
| **use** | "Rezept gekocht: Nudel-Wurst (4 Portionen)" | Bei cookSlot() | `{ slotKey, recipeId, recipeName, servings, cookedAt }` |
| **use** | "Rezept bewertet: 4⭐" | Bei rateSlot() | `{ userId, stars, ratedAt, comment? }` |

### Familie sieht:

```
📅 Speiseplan - letzte 14 Tage
─────────────────────────────────────────
📝 Was war los?

📅 ✓ Julia hat "Obstkuchen" for 12.06 Nachtisch gekocht
   4 Portionen, 14:30 Uhr
   
📅 ✓ Elisabeth hat mit 5⭐ bewertet:
   "Mega lecker! Der Obstkuchen war ein Hit"
   14:33 Uhr

📅 ✓ Christian hat mit 4⭐ bewertet:
   "Gut, aber ein bisschen zu süß"
   19:00 Uhr

📅 ➕ Helena hat "Nudel-Wurst" für 11.06 Abend geplant
   (4 Portionen)

📅 ✓ Christian hat gekocht
   Alle Zutaten vorhanden ✓
   19:15 Uhr
```

---

## 💰 REISEKASSE (Reisekasse)

**WICHTIG:** Hier ist Transparenz KRITISCH für Familie-Akzeptanz!

### Dokumentierte Mutationen:

| Action | Beschreibung | Wann geloggt | Metadaten |
|--------|-------------|-------------|-----------|
| **add** | "Neue Regel angelegt: Julia 5€/Handy" | Bei addRule() | `{ ruleId, ruleName, amount, appliesToUsers[], description }` |
| **update** | "Regel geändert: Christian 5€ → 3€" | Bei updateRule() | `{ ruleId, ruleName, oldAmount, newAmount, changedBy }` |
| **update** | "Regel deaktiviert/aktiviert" | Bei toggleRule() | `{ ruleId, ruleName, newStatus: active/inactive }` |
| **delete** | "Regel gelöscht: [alte Test-Regel]" | Bei deleteRule() | `{ ruleId, ruleName, deletedBy }` |
| **use** | "Zahlung erfasst: Julia 5,00€" | Bei addPayment() | `{ txId, userId, amount, reason, ruleId, timestamp }` |
| **use** | "Zahlung storniert: Christian 5,00€" | Bei deleteTransaction() | `{ txId, userId, amount, reason, currentWeek }` |
| **settle** | "Woche abgerechnet (11.06-17.06)" | Bei createWeeklyStatement() | `{ statementId, weekStart, weekEnd, totalCents, transactionIds[], totalsByUser{} }` |

### Familie sieht:

```
💰 Reisekasse - Änderungsprotokoll
─────────────────────────────────────────
📝 REGELÄNDERUNGEN (für Diskussionen wichtig!):

💰 ➕ Julia hat Regel angelegt: "Handy am Tisch = 5€"
   Gilt für: Julia, Helena, Elisabeth, Christian
   12.06.2026 08:00
   Status: AKTIV

💰 ✏️ Christian hat Regel geändert:
   "Nicht einkaufen 5€" → "Nicht einkaufen 3€"
   Grund: "War zu streng"
   (Abstimmung: Julia ✓, Helena ✓, Elisabeth ✓)
   11.06.2026 19:00

💰 ✓ Julia hat 5,00€ gezahlt
   Grund: "Handy am Esstisch"
   Zeitstempel: 12.06.2026 14:15

💰 ✓ Christian hat 3,00€ gezahlt
   Grund: "Nicht einkaufen" (3€ Regel)
   Zeitstempel: 11.06.2026 22:00

💰 📊 Elisabeth hat Wochenabrechnung erstellt
   Woche: 05.06-11.06.2026
   ✓ 4 Zahlungen verarbeitet (18,50€ total)
   - Julia: 5,00€
   - Christian: 3,00€
   - Helena: 5,00€
   - Elisabeth: 5,50€
   12.06.2026 20:00
```

---

## 🎯 QUESTS (Quests)

### Dokumentierte Mutationen:

| Action | Beschreibung | Wann geloggt | Metadaten |
|--------|-------------|-------------|-----------|
| **add** | "Quest angelegt: Hausaufgaben/lernen" | Bei addCustomQuest() | `{ questId, questName, points, repeatable, dependsOn? }` |
| **update** | "Quest bearbeitet: Punkte 10→20" | Bei updateQuest() | `{ questId, questName, changedFields[] }` |
| **complete** | "Quest erledigt: Wäsche waschen" | Bei completeQuest() | `{ questId, questName, points, completedBy, timestamp, pointsAwarded }` |
| **delete** | "Quest gelöscht: [alte Test-Quest]" | Bei deleteQuest() | `{ questId, questName, deletedBy }` |
| **use** | "Quest zurückgesetzt: Zimmer aufräumen" (wiederholbar) | Bei resetQuest() | `{ questId, questName, resetBy }` |

### Familie sieht:

```
🎯 Quests - Activity Log
─────────────────────────────────────────
📝 Wer macht was?

🎯 ➕ Julia hat Quest angelegt: "Hausaufgaben/lernen"
   10 Punkte, Wiederholbar
   12.06.2026 08:30

🎯 ✅ Helena hat Quest "Zimmer aufräumen" erledigt
   +10 Punkte (Helena jetzt 35⭐)
   12.06.2026 14:45

🎯 ✅ Christian hat Quest "Müll rausbringen" erledigt
   +5 Punkte (Christian jetzt 18⭐)
   12.06.2026 10:30

🎯 ✏️ Elisabeth hat Quest bearbeitet:
   "Wäsche waschen"
   Punkte: 10 → 15 (weil anstrengender)
   11.06.2026 19:00
```

---

## 🏆 BELOHNUNGEN (Rewards)

### Dokumentierte Mutationen:

| Action | Beschreibung | Wann geloggt | Metadaten |
|--------|-------------|-------------|-----------|
| **add** | "Belohnung hinzugefügt: Übernachtung bei Freund" | Bei addReward() | `{ rewardId, rewardName, cost }` |
| **update** | "Belohnung bearbeitet: 30min TV" | Bei updateReward() | `{ rewardId, rewardName, oldCost, newCost }` |
| **use** | "Belohnung eingelöst: Julia nutzt 60min Fernsehen" | Bei redeemReward() | `{ userId, rewardId, rewardName, pointsSpent, newBalance }` |
| **delete** | "Belohnung gelöscht: [veraltete Belohnung]" | Bei deleteReward() | `{ rewardId, rewardName, deletedBy }` |

### Familie sieht:

```
🏆 Belohnungen - Activity
─────────────────────────────────────────
📝 Wer hat was eingelöst?

🏆 ➕ Christian hat Belohnung hinzugefügt:
   "Ausflug wählen" (100 Punkte)
   12.06.2026 09:00

🏆 ✓ Julia hat "60 Minuten Fernsehen" eingelöst
   Punkte: 50 (Julia jetzt 5⭐)
   12.06.2026 19:30

🏆 ✓ Helena hat "Süßigkeit nach Wahl" eingelöst
   Punkte: 15 (Helena jetzt 20⭐)
   11.06.2026 18:00

🏆 ✏️ Elisabeth hat Belohnung bearbeitet:
   "30min TV": 30 Punkte → 25 Punkte (großzügiger)
   10.06.2026 20:00
```

---

## 📊 DASHBOARD-ANSICHT

### "Wer war aktiv in dieser Woche?"

```
📝 AKTIVITÄTS-ÜBERSICHT (letzte 7 Tage)
═════════════════════════════════════════

Julia:
  🛒 3x Einkauf hinzugefügt
  📦 2x Vorrat konsumiert
  🎯 1x Quest erledigt (+10⭐)
  💰 1x Zahlung in Reisekasse
  🏆 1x Belohnung eingelöst
  ──────────
  Gesamt: 8 Aktivitäten

Christian:
  🛒 2x Einkauf hinzugefügt
  🎯 2x Quests erledigt (+25⭐)
  💰 2x Zahlungen in Reisekasse
  ──────────
  Gesamt: 6 Aktivitäten

Helena:
  📦 3x Vorrat eingeräumt
  📅 2x Rezepte bewertet
  🎯 1x Quest erledigt
  ──────────
  Gesamt: 6 Aktivitäten

Elisabeth:
  📝 1x Regel in Reisekasse hinzugefügt
  💰 1x Wochenabrechnung erstellt
  ──────────
  Gesamt: 2 Aktivitäten
```

---

## 🔧 TECHNISCHE IMPLEMENTIERUNG

### Wo wird geloggt?

Jeder Manager (Shopping, Inventory, etc.) ruft auf:

```javascript
// In ShoppingManager.add():
if (this.changeLog) {
  this.changeLog.log('shopping', 'add', userId, 
    `"${name}" zur Einkaufsliste hinzugefügt`,
    { itemId: item.id, itemName: name, itemNote: note }
  );
}

// In ReisekasseManager.addPayment():
this.changeLog.log('reisekasse', 'use',
  userId,
  `${amount/100}€ gezahlt: "${reason}"`,
  { txId: tx.id, amount, reason, ruleId }
);
```

### Speicherung

```json
{
  "changelog": [
    {
      "id": "log-1781184700000-abc123def",
      "module": "reisekasse",
      "action": "use",
      "userId": "julia",
      "description": "5.00€ gezahlt: Handy am Tisch",
      "metadata": {
        "amount": 500,
        "reason": "Handy am Tisch",
        "ruleId": "rule-1781184625371"
      },
      "timestamp": 1781184700000,
      "_deleted": false
    }
  ]
}
```

---

## 🎯 FAMILIE-MEHRWERT

### Warum ist das wichtig?

1. **Transparenz bei Reisekasse:** 
   - "Wer hat die 5€-Regel aufgelöst?"
   - "War das wirklich Handy am Tisch?"
   - Vollständiges Audit-Trail

2. **Verständnis der Punkte:**
   - Wer kriegt wieviele Punkte wofür?
   - Historische Vergleiche möglich

3. **Regeln-Diskussionen:**
   - "Christian hat die Regel geändert auf 3€"
   - Abstimmungs-Prozess nachvollziehbar
   - Rückverfolgung von Änderungen

4. **Familienkultur:**
   - Wer ist am aktivsten?
   - Wer kümmert sich um was?
   - Gegenseitiges Verständnis

---

## 📝 NÄCHSTE SCHRITTE

Diese Dokumentation wird implementiert durch:

1. ✅ **ChangeLogManager** (`modules/core/changelog.js`)
2. ✅ **Integration in alle Manager** (Shopping, Inventory, etc.)
3. ⏳ **UI-Modul:** `modules/domains/changelog/ui.js` (separat neue Sektion)
4. ⏳ **Reisekasse-Special:** Mehr Details für Regel-Änderungen

Die Familie bekommt dann eine neue **📝 "Änderungen"-Sektion** in der App!

