import { hasConfiguredGoogleTasksClientId } from './config.js';

const GOOGLE_TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks';
const GOOGLE_GSI_URL = 'https://accounts.google.com/gsi/client';

function toDateOnly(dateValue) {
  if (!dateValue) return new Date();
  const d = new Date(dateValue);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function getIsoWeekInfo(dateValue = new Date()) {
  const date = toDateOnly(dateValue);
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - day + 3);

  const weekYear = utc.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);

  const week = 1 + Math.round((utc.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return { week, year: weekYear };
}

export function buildShoppingListTitle(dateValue = new Date()) {
  const { week, year } = getIsoWeekInfo(dateValue);
  return `Einkauf KW ${String(week).padStart(2, '0')}/${year}`;
}

export function buildOpenShoppingTasks(items = []) {
  return (items || [])
    .filter(i => i && !i._deleted && i.status === 'offen' && String(i.name || '').trim())
    .map(i => ({
      title: String(i.name || '').trim(),
      notes: String(i.note || '').trim() || undefined
    }));
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Script konnte nicht geladen werden')), { once: true });
      return;
    }

    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      s.dataset.loaded = 'true';
      resolve();
    };
    s.onerror = () => reject(new Error('Google Script konnte nicht geladen werden'));
    document.head.appendChild(s);
  });
}

async function getAccessToken(clientId) {
  if (!hasConfiguredGoogleTasksClientId({ GOOGLE_TASKS_CLIENT_ID: clientId })) {
    throw new Error('Google Client ID fehlt');
  }
  await loadScript(GOOGLE_GSI_URL);

  const googleOAuth = window.google?.accounts?.oauth2;
  if (!googleOAuth?.initTokenClient) {
    throw new Error('Google OAuth nicht verfügbar');
  }

  return await new Promise((resolve, reject) => {
    const tokenClient = googleOAuth.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_TASKS_SCOPE,
      callback: (response) => {
        if (response?.error) {
          if (response.error === 'popup_closed_by_user') {
            reject(new Error('Google-Anmeldung abgebrochen'));
            return;
          }
          reject(new Error(response.error_description || response.error || 'Google Login fehlgeschlagen'));
          return;
        }
        if (!response?.access_token) {
          reject(new Error('Kein Access Token erhalten'));
          return;
        }
        resolve(response.access_token);
      }
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

async function apiJson(url, token, method = 'GET', body = null) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Tasks API Fehler (${res.status}): ${text}`);
  }
  return res.json();
}

export async function exportOpenShoppingItemsToGoogleTasks(items, clientId, dateValue = new Date()) {
  const tasks = buildOpenShoppingTasks(items);
  if (tasks.length === 0) {
    throw new Error('Keine offenen Einkaufsartikel');
  }

  const token = await getAccessToken(clientId);
  const listTitle = buildShoppingListTitle(dateValue);
  const list = await apiJson('https://tasks.googleapis.com/tasks/v1/users/@me/lists', token, 'POST', {
    title: listTitle
  });
  if (!list?.id) {
    throw new Error('Google Tasks Liste konnte nicht erstellt werden');
  }

  for (const t of tasks) {
    await apiJson(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(list.id)}/tasks`,
      token,
      'POST',
      { title: t.title, notes: t.notes }
    );
  }

  return { listTitle, listId: list.id, exportedCount: tasks.length };
}
