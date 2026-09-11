import { store } from './store.js';
import { createToday } from './today.js';
import { createCalendar } from './calendar.js';
import { createSettings } from './settings.js';
import { createNotebook } from './notebook.js';
import { todayKey } from './dates.js';
import { haptic } from './haptics.js';

store.init();

// Tab principali e pagine interne, ognuna con la sua tab di appartenenza
const TABS = ['today', 'calendar'];
const PARENT = { today: 'today', calendar: 'calendar', settings: 'today', notebook: 'calendar' };
const HASH = { today: '', calendar: 'calendario', settings: 'impostazioni', notebook: 'quaderno' };
const BACK_LABEL = { settings: 'Oggi', notebook: 'Calendario' };

const views = Object.fromEntries(Object.keys(PARENT).map((v) => [v, document.querySelector(`[data-view="${v}"]`)]));
const tabs = [...document.querySelectorAll('[data-tab]')];
const indicator = document.querySelector('[data-tab-indicator]');
const navbar = document.querySelector('[data-navbar]');
const navTitle = navbar.querySelector('[data-navbar-title]');
const navBack = navbar.querySelector('[data-back]');
const navBackLabel = navbar.querySelector('[data-navbar-back]');
const toastEl = document.querySelector('[data-toast]');

const isSub = (v) => PARENT[v] !== v;
const titles = { today: 'Oggi', calendar: '', settings: 'Impostazioni', notebook: 'Quaderno' };
const scrollMemory = {};
let active = 'today';

// Toast
let toastTimer;
function toast(message) {
  toastEl.querySelector('span').textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
}

const setTitle = (view) => (t) => {
  titles[view] = t;
  if (active === view) navTitle.textContent = t;
};

const openDay = (key) => { today.open(key); go('today'); };

const today = createToday({ store, onTitle: setTitle('today') });
const calendar = createCalendar({ store, toast, onTitle: setTitle('calendar'), onPick: openDay });
const settings = createSettings({ store, toast });
const notebook = createNotebook({
  store,
  onPick: openDay,
  onWrite: () => {
    openDay(todayKey());
    const field = document.getElementById('note-field');
    requestAnimationFrame(() => {
      field.scrollIntoView({ block: 'center', behavior: 'smooth' });
      field.focus({ preventScroll: true });
    });
  },
});

// Pillola della tab bar: il bordo d'attacco parte, quello di coda insegue
function moveIndicator(from, to, instant) {
  const a = TABS.indexOf(from);
  const b = TABS.indexOf(to);
  indicator.dataset.pos = b;
  if (instant) {
    indicator.style.transition = 'none';
    void indicator.offsetWidth;
    indicator.style.transition = '';
    return;
  }
  if (a === b) return;
  indicator.classList.remove('is-moving', 'is-going-left', 'is-going-right');
  void indicator.offsetWidth;
  indicator.classList.add('is-moving', b > a ? 'is-going-right' : 'is-going-left');
}
indicator.addEventListener('animationend', () => indicator.classList.remove('is-moving'));

// Navigazione: push/pop nelle pagine interne, scorrimento tra le tab
function show(name, { instant = false } = {}) {
  if (!views[name]) return;
  const prev = active;

  if (name !== prev) {
    scrollMemory[prev] = window.scrollY;
    const dir = PARENT[name] === PARENT[prev]
      ? (isSub(name) ? 'right' : 'left')
      : (TABS.indexOf(PARENT[name]) > TABS.indexOf(PARENT[prev]) ? 'right' : 'left');

    views[prev].hidden = true;
    const el = views[name];
    el.hidden = false;
    el.classList.remove('is-entering-left', 'is-entering-right');
    if (!instant) {
      void el.offsetWidth;
      el.classList.add(`is-entering-${dir}`);
    }
    active = name;

    if (name === 'calendar') calendar.refresh();
    if (name === 'settings') settings.refresh();
    if (name === 'notebook') notebook.refresh();

    // Il quaderno si apre sulla nota più recente, in fondo
    const back = PARENT[prev] === name;
    const top = name === 'notebook' ? document.documentElement.scrollHeight
      : (name === 'calendar' || back) ? (scrollMemory[name] || 0) : 0;
    window.scrollTo({ top, behavior: 'instant' });
  }

  moveIndicator(PARENT[prev], PARENT[name], instant);
  tabs.forEach((t) => {
    const on = t.dataset.tab === PARENT[name];
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', String(on));
  });

  navTitle.textContent = titles[name];
  navBackLabel.textContent = BACK_LABEL[name] || '';
  navbar.classList.toggle('has-back', isSub(name));
  updateNavbar();
}

const urlOf = (name) => (HASH[name] ? `#${HASH[name]}` : location.pathname + location.search);
const fromHash = () => Object.keys(HASH).find((k) => HASH[k] && `#${HASH[k]}` === location.hash) || 'today';

// Cambio di tab o apertura di un giorno
function go(name) {
  if (name === active) return;
  show(name);
  history.replaceState(null, '', urlOf(name));
}

// Pagina interna: entra nella cronologia, così funziona anche "indietro"
function push(name) {
  if (name === active) return;
  show(name);
  history.pushState({ sub: name }, '', urlOf(name));
}

function back() {
  if (!isSub(active)) return;
  if (history.state?.sub === active) history.back();
  else go(PARENT[active]);
}

window.addEventListener('popstate', () => show(fromHash()));

tabs.forEach((t) => t.addEventListener('click', () => {
  const name = t.dataset.tab;
  haptic();
  // Tab attiva: da una pagina interna torna alla radice, altrimenti in cima
  if (name === PARENT[active] && isSub(active)) back();
  else if (name === active) window.scrollTo({ top: 0, behavior: 'smooth' });
  else go(name);
}));

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-go]');
  if (target) { haptic(); push(target.dataset.go); return; }
  if (e.target.closest('[data-back]')) { haptic(); back(); }
});

// Barra compatta quando il titolo grande esce dallo schermo.
// Un osservatore al posto del listener di scroll: zero lavoro per frame.
let observer = null;

function setNavbar(visible) {
  navbar.classList.toggle('is-visible', visible);
  navbar.setAttribute('aria-hidden', String(!visible));
  navBack.tabIndex = visible && isSub(active) ? 0 : -1;
}

function updateNavbar() {
  const sentinel = views[active].querySelector('[data-sentinel]');
  setNavbar(sentinel.getBoundingClientRect().bottom < navbar.getBoundingClientRect().bottom);
  watchSentinel(sentinel);
}

function watchSentinel(sentinel) {
  observer?.disconnect();
  if (!('IntersectionObserver' in window)) return;
  const edge = Math.round(navbar.getBoundingClientRect().bottom);
  observer = new IntersectionObserver(([entry]) => setNavbar(!entry.isIntersecting), {
    rootMargin: `-${edge}px 0px 0px 0px`,
    threshold: 0,
  });
  observer.observe(sentinel);
}

// La safe area cambia ruotando il telefono: si rimisura il bordo
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(updateNavbar, 160);
}, { passive: true });

// Cambio di giorno (app lasciata aperta oltre la mezzanotte)
let lastToday = todayKey();
function checkDay() {
  const now = todayKey();
  if (now === lastToday) return;
  today.refreshDay(lastToday);
  calendar.refresh();
  lastToday = now;
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });
setInterval(checkDay, 60_000);

// Avvio
show(fromHash(), { instant: true });
if (!store.persistent) toast('Il browser non permette di salvare: i dati spariranno alla chiusura');

// Service worker (offline). In sviluppo locale resta spento.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname) || location.hostname.startsWith('192.168.');
if ('serviceWorker' in navigator && location.protocol === 'https:' && !isLocal) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
