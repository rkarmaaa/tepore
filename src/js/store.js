import { EMOTIONS, MAX_LEVEL } from './emotions.js';

const KEY = 'tepore:v1';
const listeners = new Set();
let data = { version: 1, days: {} };
let persistent = true;

const clamp = (n) => Math.max(0, Math.min(MAX_LEVEL, Math.round(Number(n) || 0)));

function sanitize(day) {
  const values = {};
  for (const e of EMOTIONS) {
    const v = clamp(day?.values?.[e.id]);
    if (v) values[e.id] = v;
  }
  return {
    values,
    note: typeof day?.note === 'string' ? day.note.slice(0, 4000) : '',
    apatia: Boolean(day?.apatia),
    updatedAt: Number(day?.updatedAt) || Date.now(),
  };
}

const isEmpty = (d) => !d.apatia && !d.note.trim() && !Object.values(d.values).some(Boolean);

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.days === 'object') data = { version: 1, days: parsed.days };
  } catch {
    persistent = false;
  }
}

function write() {
  if (!persistent) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    persistent = false;
  }
}

const emit = (key) => listeners.forEach((fn) => fn(key));

export const store = {
  init() {
    read();
    // Chiede al browser di non sfrattare i dati
    navigator.storage?.persist?.().catch(() => {});
    // Sincronizza più schede aperte
    window.addEventListener('storage', (e) => {
      if (e.key === KEY) { read(); emit(null); }
    });
  },

  get persistent() { return persistent; },

  get(key) { return data.days[key] || null; },

  all() { return data.days; },

  update(key, patch) {
    const cur = data.days[key] || { values: {}, note: '', apatia: false };
    const next = sanitize({ ...cur, ...patch, values: { ...cur.values, ...(patch.values || {}) }, updatedAt: Date.now() });
    if (isEmpty(next)) delete data.days[key];
    else data.days[key] = next;
    write();
    emit(key);
    return next;
  },

  exportJSON() {
    return JSON.stringify({ app: 'tepore', version: 1, exportedAt: new Date().toISOString(), days: data.days }, null, 2);
  },

  importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed.days !== 'object') throw new Error('invalid');
    let count = 0;
    for (const [key, day] of Object.entries(parsed.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      const clean = sanitize(day);
      if (isEmpty(clean)) continue;
      data.days[key] = clean;
      count++;
    }
    write();
    emit(null);
    return count;
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
