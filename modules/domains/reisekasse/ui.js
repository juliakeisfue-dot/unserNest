// modules/domains/reisekasse/ui.js

function formatEUR(cents) {
  return `${((Number(cents) || 0) / 100).toFixed(2)} EUR`;
}

function toDatetimeLocal(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

export class ReisekasseUI {
  constructor(app) {
    this.app = app;
  }

  render() {
    const container = document.getElementById('reisekasseContent');
    if (!container) return;

    const users = this.app.users.getAll();
    const rules = this.app.reisekasse.getRules();
    const transactions = this.app.reisekasse.getTransactions({ includeSettled: true }).slice(0, 40);
    const openSummary = this.app.reisekasse.getOpenWeeklySummary();
    const statements = this.app.reisekasse.getStatements(8);

    const userMap = new Map(users.map(u => [u.id, u.name]));

    const openTotalsHtml = users.map(u => {
      const cents = Number(openSummary.totalsByUser[u.id] || 0);
      return `<div class="item"><div class="item__content"><div class="item__name">${this.app.escapeHtml(u.name)}</div></div><div><strong>${formatEUR(cents)}</strong></div></div>`;
    }).join('');

    const ruleOptions = ['<option value="">Freie Buchung</option>']
      .concat(rules.filter(r => r.active).map(r => `<option value="${r.id}">${this.app.escapeHtml(r.title)} (${formatEUR(r.amountCents)})</option>`))
      .join('');

    const rulesHtml = rules.length === 0
      ? '<div class="empty">Noch keine Regeln vorhanden.</div>'
      : rules.map(rule => {
          const applies = rule.appliesToAll
            ? 'Alle'
            : (rule.userIds || []).map(id => userMap.get(id) || id).join(', ');
          return `
            <div class="item" style="${!rule.active ? 'opacity:0.6;' : ''}">
              <div class="item__content">
                <div class="item__name">${this.app.escapeHtml(rule.title)} - ${formatEUR(rule.amountCents)}</div>
                ${rule.description ? `<div class="item__meta">${this.app.escapeHtml(rule.description)}</div>` : ''}
                <div class="item__meta">Gilt fuer: ${this.app.escapeHtml(applies || 'Alle')}</div>
                ${rule.exceptionNote ? `<div class="item__meta">Ausnahme: ${this.app.escapeHtml(rule.exceptionNote)}</div>` : ''}
              </div>
              <div class="item__actions" style="flex-wrap:wrap;">
                <button class="btn btn--small" onclick="app.reisekasseUI.toggleRule('${rule.id}')">${rule.active ? 'Deaktivieren' : 'Aktivieren'}</button>
                <button class="btn btn--small" onclick="app.reisekasseUI.editRule('${rule.id}')">Bearbeiten</button>
                <button class="btn btn--small btn--danger" onclick="app.reisekasseUI.deleteRule('${rule.id}')">Loeschen</button>
              </div>
            </div>
          `;
        }).join('');

    const txHtml = transactions.length === 0
      ? '<div class="empty">Noch keine Zahlungen erfasst.</div>'
      : transactions.map(tx => {
          const settled = tx.settledAt
            ? ` | abgerechnet am ${new Date(tx.settledAt).toLocaleDateString('de-DE')}`
            : ' | offen';
          const who = userMap.get(tx.userId) || tx.userName || tx.userId;
          return `
            <div class="item" style="${tx.settledAt ? 'opacity:0.7;' : ''}">
              <div class="item__content">
                <div class="item__name">${this.app.escapeHtml(who)} - ${formatEUR(tx.amountCents)}</div>
                <div class="item__meta">${new Date(tx.occurredAt).toLocaleString('de-DE')} | ${this.app.escapeHtml(tx.reason)}${this.app.escapeHtml(settled)}</div>
              </div>
              <div class="item__actions">
                <button class="btn btn--small btn--danger" onclick="app.reisekasseUI.deleteTransaction('${tx.id}')">Loeschen</button>
              </div>
            </div>
          `;
        }).join('');

    const statementsHtml = statements.length === 0
      ? '<div class="empty">Noch keine Wochenabrechnung erstellt.</div>'
      : statements.map(st => {
          const perUser = Object.entries(st.totalsByUser || {})
            .map(([id, cents]) => `${this.app.escapeHtml(userMap.get(id) || id)}: ${formatEUR(cents)}`)
            .join(' | ');
          return `
            <div class="item">
              <div class="item__content">
                <div class="item__name">${this.app.escapeHtml(st.title || 'Wochenabrechnung')}</div>
                <div class="item__meta">${new Date(st.createdAt).toLocaleString('de-DE')} | Gesamt: ${formatEUR(st.totalCents)} | ${st.transactionIds?.length || 0} Buchungen</div>
                <div class="item__meta">${perUser}</div>
              </div>
            </div>
          `;
        }).join('');

    container.innerHTML = `
      <div class="card">
        <h2 class="card__title">💰 Reisekasse</h2>
        <div class="card__subtitle">Regeln, Zahlungen und woechentliche Abrechnung</div>

        <div class="item" style="margin-bottom:12px;">
          <div class="item__content">
            <div class="item__name">Offene Woche: ${new Date(openSummary.weekStart).toLocaleDateString('de-DE')} - ${new Date(openSummary.weekEnd).toLocaleDateString('de-DE')}</div>
            <div class="item__meta">Offene Buchungen: ${openSummary.count} | Gesamt offen: ${formatEUR(openSummary.totalCents)}</div>
          </div>
          <button class="btn btn--primary btn--small" onclick="app.reisekasseUI.runWeeklySettlement()">Woche abrechnen</button>
        </div>

        ${openTotalsHtml}
      </div>

      <div class="card">
        <h3 class="card__title" style="font-size:1rem;">➕ Zahlung erfassen</h3>
        <div class="form">
          <div class="form__row">
            <select id="rkUser" class="form__input">
              ${users.map(u => `<option value="${u.id}" ${u.id === this.app.storage.activeUserId ? 'selected' : ''}>${this.app.escapeHtml(u.name)}</option>`).join('')}
            </select>
            <select id="rkRule" class="form__input" onchange="app.reisekasseUI.applyRuleTemplate()">
              ${ruleOptions}
            </select>
          </div>
          <div class="form__row">
            <input type="number" id="rkAmount" class="form__input" min="0.01" step="0.01" placeholder="Betrag in EUR">
            <input type="datetime-local" id="rkWhen" class="form__input" value="${toDatetimeLocal(Date.now())}">
          </div>
          <input type="text" id="rkReason" class="form__input" placeholder="Wofuer wurde gezahlt?">
          <button class="btn btn--success btn--small" onclick="app.reisekasseUI.addPayment()">Zahlung speichern</button>
        </div>
      </div>

      <div class="card">
        <h3 class="card__title" style="font-size:1rem;">⚙️ Regeln</h3>
        <div class="form" style="margin-bottom:12px;">
          <input type="text" id="rkRuleTitle" class="form__input" placeholder="Regelname">
          <input type="text" id="rkRuleDescription" class="form__input" placeholder="Beschreibung">
          <div class="form__row">
            <input type="number" id="rkRuleAmount" class="form__input" min="0.01" step="0.01" placeholder="Betrag in EUR">
            <input type="text" id="rkRuleException" class="form__input" placeholder="Ausnahme (optional)">
          </div>
          <div class="text--small text--soft">Gilt fuer (leer = alle):</div>
          <div class="form__row">
            ${users.map(u => `<label><input type="checkbox" name="rkRuleUser" value="${u.id}"> ${this.app.escapeHtml(u.name)}</label>`).join('')}
          </div>
          <button class="btn btn--primary btn--small" onclick="app.reisekasseUI.addRule()">Regel anlegen</button>
        </div>
        ${rulesHtml}
      </div>

      <div class="card">
        <h3 class="card__title" style="font-size:1rem;">🧾 Zahlungsverlauf</h3>
        ${txHtml}
      </div>

      <div class="card">
        <h3 class="card__title" style="font-size:1rem;">📅 Abrechnungs-Historie</h3>
        ${statementsHtml}
      </div>
    `;
  }

  applyRuleTemplate() {
    const ruleId = document.getElementById('rkRule')?.value;
    const rules = this.app.reisekasse.getRules();
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const amountEl = document.getElementById('rkAmount');
    const reasonEl = document.getElementById('rkReason');
    if (amountEl && !Number(amountEl.value)) amountEl.value = ((rule.amountCents || 0) / 100).toFixed(2);
    if (reasonEl && !reasonEl.value.trim()) reasonEl.value = rule.title;
  }

   addPayment() {
     const userId = document.getElementById('rkUser')?.value;
     const ruleId = document.getElementById('rkRule')?.value || null;
     const amountStr = document.getElementById('rkAmount')?.value;
     const reason = document.getElementById('rkReason')?.value?.trim();
     const whenInput = document.getElementById('rkWhen')?.value;
     const occurredAt = whenInput ? new Date(whenInput).getTime() : Date.now();

     // Validierung
     if (!userId || !amountStr || !reason) {
       this.app.showDialog('⚠️ Eingaben erforderlich', 'Bitte Nutzer, Betrag und Grund angeben.');
       return;
     }
     if (reason.length > 200) {
       this.app.showDialog('⚠️ Text zu lang', 'Maximum 200 Zeichen für Grund.');
       return;
     }

     // EUR normalisieren: "5.50" -> 550 Cent, "5,50" -> 550 Cent
     const normalized = String(amountStr).replace(',', '.');
     const amount = parseFloat(normalized);
     if (isNaN(amount) || amount <= 0) {
       this.app.showDialog('⚠️ Ungültiger Betrag', 'Bitte geben Sie einen gültigen Betrag ein (z.B. 5.50).');
       return;
     }

     const created = this.app.reisekasse.addPayment({ userId, amount, reason, ruleId, occurredAt });
     if (!created) {
       this.app.showDialog('❌ Fehler', 'Zahlung konnte nicht gespeichert werden. Prüfen Sie die Eingaben.');
       return;
     }

     // Eingaben zurücksetzen
     document.getElementById('rkAmount').value = '';
     document.getElementById('rkReason').value = '';
     document.getElementById('rkRule').value = '';

     this.app.updateUI();
     this.app.toast('💰 Zahlung gespeichert', 'success');
   }

   addRule() {
     const title = document.getElementById('rkRuleTitle')?.value.trim();
     const description = document.getElementById('rkRuleDescription')?.value.trim();
     const amountStr = document.getElementById('rkRuleAmount')?.value;
     const exceptionNote = document.getElementById('rkRuleException')?.value.trim();
     const userIds = Array.from(document.querySelectorAll('input[name="rkRuleUser"]:checked')).map(i => i.value);

     // Validierung
     if (!title || !amountStr) {
       this.app.showDialog('⚠️ Eingaben erforderlich', 'Bitte geben Sie mindestens einen Regeln-Namen und einen Betrag ein.');
       return;
     }
     if (title.length > 100) {
       this.app.showDialog('⚠️ Text zu lang', 'Maximum 100 Zeichen für Regelname.');
       return;
     }
     if (description && description.length > 200) {
       this.app.showDialog('⚠️ Text zu lang', 'Maximum 200 Zeichen für Beschreibung.');
       return;
     }

     // EUR normalisieren
     const normalized = String(amountStr).replace(',', '.');
     const amount = parseFloat(normalized);
     if (isNaN(amount) || amount <= 0) {
       this.app.showDialog('⚠️ Ungültiger Betrag', 'Bitte geben Sie einen gültigen Betrag ein (z.B. 5.50).');
       return;
     }

     const ok = this.app.reisekasse.addRule({ title, description, amount, userIds, exceptionNote, active: true });
     if (!ok) {
       this.app.showDialog('❌ Fehler', 'Regel konnte nicht gespeichert werden. Prüfen Sie die Eingaben.');
       return;
     }

     // Eingaben zurücksetzen
     document.getElementById('rkRuleTitle').value = '';
     document.getElementById('rkRuleDescription').value = '';
     document.getElementById('rkRuleAmount').value = '';
     document.getElementById('rkRuleException').value = '';
     Array.from(document.querySelectorAll('input[name="rkRuleUser"]:checked')).forEach(i => i.checked = false);

     this.app.updateUI();
     this.app.toast('⚙️ Regel gespeichert', 'success');
   }

   async editRule(ruleId) {
     const rule = this.app.reisekasse.getRules().find(r => r.id === ruleId);
     if (!rule) return;

     const title = await this.app.showInputDialog('⚙️ Regel bearbeiten', 'Regelname:', rule.title);
     if (!title) return;

     const amountStr = await this.app.showInputDialog('⚙️ Regel bearbeiten', 'Betrag in EUR:', ((rule.amountCents || 0) / 100).toFixed(2));
     if (!amountStr) return;

     const description = await this.app.showInputDialog('⚙️ Regel bearbeiten', 'Beschreibung:', rule.description || '');
     if (description === null) return;

     const exceptionNote = await this.app.showInputDialog('⚙️ Regel bearbeiten', 'Ausnahme (optional):', rule.exceptionNote || '');
     if (exceptionNote === null) return;

     // Validierung
     if (title.length > 100) {
       this.app.showDialog('⚠️ Text zu lang', 'Maximum 100 Zeichen für Regelname.');
       return;
     }
     if (description && description.length > 200) {
       this.app.showDialog('⚠️ Text zu lang', 'Maximum 200 Zeichen für Beschreibung.');
       return;
     }
     if (isNaN(amountStr) || parseFloat(amountStr) <= 0) {
       this.app.showDialog('⚠️ Ungültiger Betrag', 'Bitte geben Sie einen gültigen Betrag ein.');
       return;
     }

     const ok = this.app.reisekasse.updateRule(ruleId, { title, amount: amountStr, description, exceptionNote, userIds: rule.userIds || [] });
     if (!ok) {
       this.app.showDialog('❌ Fehler', 'Regel konnte nicht gespeichert werden.');
       return;
     }

     this.app.updateUI();
     this.app.toast('✏️ Regel aktualisiert', 'success');
   }

   async deleteRule(ruleId) {
     const overlay = document.getElementById('dialogOverlay');
     const titleEl = document.getElementById('dialogTitle');
     const msgEl = document.getElementById('dialogMessage');
     const input = document.getElementById('dialogInput');
     const btnCancel = document.getElementById('dialogBtnCancel');
     const btnOk = document.getElementById('dialogBtnOk');

     titleEl.textContent = '⚠️ Regel löschen?';
     msgEl.textContent = 'Diese Regel wird gelöscht und kann nicht wiederhergestellt werden.';
     input.style.display = 'none';
     btnCancel.style.display = 'block';
     btnCancel.textContent = 'Abbrechen';
     btnOk.textContent = 'Ja, löschen';
     btnOk.className = 'dialog__button dialog__button--danger';

     overlay.classList.add('dialog-overlay--active');

     const confirmed = await new Promise((resolve) => {
       const handleOk = () => { cleanup(); resolve(true); };
       const handleCancel = () => { cleanup(); resolve(false); };
       const handleOverlayClick = (e) => { if (e.target === overlay) handleCancel(); };
       const cleanup = () => {
         overlay.classList.remove('dialog-overlay--active');
         btnOk.onclick = null;
         btnCancel.onclick = null;
         overlay.removeEventListener('click', handleOverlayClick);
         btnOk.className = 'dialog__button dialog__button--primary';
       };

       btnOk.onclick = handleOk;
       btnCancel.onclick = handleCancel;
       overlay.addEventListener('click', handleOverlayClick);
     });

     if (confirmed) {
       this.app.reisekasse.deleteRule(ruleId);
       this.app.updateUI();
       this.app.toast('🗑️ Regel gelöscht', 'success');
     }
   }

   async deleteTransaction(txId) {
     const overlay = document.getElementById('dialogOverlay');
     const titleEl = document.getElementById('dialogTitle');
     const msgEl = document.getElementById('dialogMessage');
     const input = document.getElementById('dialogInput');
     const btnCancel = document.getElementById('dialogBtnCancel');
     const btnOk = document.getElementById('dialogBtnOk');

     titleEl.textContent = '⚠️ Buchung löschen?';
     msgEl.textContent = 'Diese Buchung wird gelöscht und kann nicht wiederhergestellt werden.';
     input.style.display = 'none';
     btnCancel.style.display = 'block';
     btnCancel.textContent = 'Abbrechen';
     btnOk.textContent = 'Ja, löschen';
     btnOk.className = 'dialog__button dialog__button--danger';

     overlay.classList.add('dialog-overlay--active');

     const confirmed = await new Promise((resolve) => {
       const handleOk = () => { cleanup(); resolve(true); };
       const handleCancel = () => { cleanup(); resolve(false); };
       const handleOverlayClick = (e) => { if (e.target === overlay) handleCancel(); };
       const cleanup = () => {
         overlay.classList.remove('dialog-overlay--active');
         btnOk.onclick = null;
         btnCancel.onclick = null;
         overlay.removeEventListener('click', handleOverlayClick);
         btnOk.className = 'dialog__button dialog__button--primary';
       };

       btnOk.onclick = handleOk;
       btnCancel.onclick = handleCancel;
       overlay.addEventListener('click', handleOverlayClick);
     });

     if (confirmed) {
       this.app.reisekasse.deleteTransaction(txId);
       this.app.updateUI();
       this.app.toast('🗑️ Buchung gelöscht', 'success');
     }
   }

  runWeeklySettlement() {
    const statement = this.app.reisekasse.createWeeklyStatement();
    if (!statement) {
      this.app.toast('Keine offenen Buchungen fuer die Abrechnung.', 'warning');
      return;
    }

    this.app.updateUI();
    this.app.toast('🧾 Wochenabrechnung erstellt', 'success');
  }

   toggleRule(ruleId) {
     this.app.reisekasse.toggleRule(ruleId);
     this.app.updateUI();
   }
}
