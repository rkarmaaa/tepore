import { todayKey } from './dates.js';

const KEY = 'tepore:reminder';
const SEEN = 'tepore:reminder:seen';
const HOUR = 22;
const MAX_DELAY = 2 ** 31 - 1;

// Inviti gentili, mai giudicanti: uno a caso ogni sera
const LINES = [
  'Com\'è andata oggi? Bastano pochi secondi.',
  'La giornata è quasi finita: le dai un colore?',
  'Un momento per te, prima di spegnere tutto.',
  'Che cosa ti porti via da oggi?',
  'Il diario è qui, senza fretta.',
];

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage non disponibile */
  }
};

// Notification esiste solo nell'app installata (iOS 16.4+), non nella scheda di Safari
const supported = () => typeof Notification !== 'undefined';
const granted = () => supported() && Notification.permission === 'granted';

function nextEvening() {
  const d = new Date();
  d.setHours(HOUR, 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

const pastEvening = () => new Date().getHours() >= HOUR;
const line = () => LINES[Math.floor(Math.random() * LINES.length)];

// Promemoria serale: una notifica locale alle 22, solo se la giornata è vuota
export function createReminder({ store, onInvite }) {
  const listeners = new Set();
  let timer = null;

  const on = () => read(KEY) === 'on' && granted();
  const emit = () => listeners.forEach((fn) => fn(state()));

  function state() {
    return {
      supported: supported(),
      enabled: on(),
      blocked: supported() && Notification.permission === 'denied',
      hour: HOUR,
    };
  }

  // Giornata ancora intonsa: lo store cancella i giorni senza nulla dentro
  const empty = () => !store.get(todayKey());
  const done = () => read(SEEN) === todayKey();

  // Restituisce sempre un esito leggibile: la pagina Sviluppatore lo mostra
  async function notify(body = line(), mark = true) {
    if (!supported()) return 'Notification non esiste (app non installata?)';
    if (Notification.permission !== 'granted') return `permesso ${Notification.permission}`;
    const options = {
      body,
      tag: 'tepore-sera',
      icon: 'icons/icon-192.png',
      badge: 'icons/favicon-48.png',
      lang: 'it',
      data: { url: './' },
    };
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      // Su iOS il costruttore Notification non mostra nulla: serve il service worker
      if (reg?.showNotification) await reg.showNotification('Tepore', options);
      else if (typeof Notification === 'function') new Notification('Tepore', options);
      else return 'nessun service worker registrato';
      if (mark) write(SEEN, todayKey());
      return 'ok';
    } catch (err) {
      return String(err?.message || err);
    }
  }

  // Sera arrivata. Con l'app aperta la notifica di sistema non comparirebbe
  // comunque: l'invito lo diamo dentro l'app, e vale come promemoria del giorno.
  function maybe() {
    if (!on() || done() || !pastEvening()) return;
    if (!empty()) { write(SEEN, todayKey()); return; }
    if (document.visibilityState === 'visible') {
      write(SEEN, todayKey());
      onInvite?.(line());
      return;
    }
    notify();
  }

  function arm() {
    clearTimeout(timer);
    timer = null;
    if (!on()) return;
    timer = setTimeout(() => { maybe(); arm(); }, Math.min(nextEvening() - Date.now(), MAX_DELAY));
  }

  // I timer si fermano quando iOS sospende la pagina: si ricontrolla a ogni risveglio
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) maybe();
    else arm();
  });

  arm();

  return {
    get state() { return state(); },

    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    // Il permesso si chiede solo dentro un tocco dell'utente
    async setEnabled(want) {
      if (!want) {
        write(KEY, 'off');
        arm();
        emit();
        return 'off';
      }
      if (!supported()) { emit(); return 'unsupported'; }
      let permission = Notification.permission;
      if (permission === 'default') {
        try {
          permission = await Notification.requestPermission();
        } catch {
          permission = 'denied';
        }
      }
      if (permission !== 'granted') {
        write(KEY, 'off');
        emit();
        return 'blocked';
      }
      write(KEY, 'on');
      arm();
      emit();
      return 'on';
    },

    // --- Strumenti della pagina Sviluppatore ---
    debug() {
      return {
        enabled: read(KEY) === 'on',
        permission: supported() ? Notification.permission : 'assente',
        seen: read(SEEN) || 'mai',
        empty: empty(),
        past: pastEvening(),
      };
    },

    async ask() {
      if (!supported()) return 'unsupported';
      try {
        return await Notification.requestPermission();
      } catch {
        return 'denied';
      }
    },

    fire(body) { return notify(body, false); },

    clearSeen() { write(SEEN, null); },

    // Quando la notifica non è potuta partire, il promemoria aspetta all'apertura
    greet() {
      if (!on() || done() || !pastEvening() || !empty()) return '';
      write(SEEN, todayKey());
      return line();
    },
  };
}
