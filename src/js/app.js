import { store } from './store.js';
import { createToday } from './today.js';
import { createCalendar } from './calendar.js';
import { todayKey } from './dates.js';
import { haptic } from './haptics.js';

store.init();

const VIEWS = ['today', 'calendar'];
const views = Object.fromEntries(VIEWS.map((v) => [v, document.querySelector(`[data-view="${v}"]`)]));
const tabs = [...document.querySelectorAll('[data-tab]')];
const indicator = document.querySelector('[data-tab-indicator]');
const navbar = document.querySelector('[data-navbar]');
const navTitle = document.querySelector('[data-navbar-title]');
const toastEl = document.querySelector('[data-toast]');

let active = 'today';
const scrollMemory = { today: 0, calendar: 0 };
const titles = { today: 'Oggi', calendar: '' };

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

const today = createToday({ store, onTitle: setTitle('today') });
const calendar = createCalendar({
  store,
  toast,
  onTitle: setTitle('calendar'),
  onPick: (key) => { today.open(key); show('today'); },
});

// Navigazione tra le sezioni
function show(name, { instant = false } = {}) {
  if (!views[name]) return;
  const from = VIEWS.indexOf(active);
  const to = VIEWS.indexOf(name);

  if (name !== active) {
    scrollMemory[active] = window.scrollY;
    views[active].hidden = true;
    const el = views[name];
    el.hidden = false;
    el.classList.remove('is-entering-left', 'is-entering-right');
    if (!instant) {
      void el.offsetWidth;
      el.classList.add(to > from ? 'is-entering-right' : 'is-entering-left');
    }
    active = name;
    if (name === 'calendar') calendar.refresh();
    window.scrollTo({ top: name === 'today' ? 0 : scrollMemory[name], behavior: 'instant' });
  }

  tabs.forEach((t) => {
    const on = t.dataset.tab === name;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', String(on));
  });

  // Goccia di vetro: si allunga mentre scivola
  indicator.style.setProperty('--from', `${from * 100}%`);
  indicator.style.setProperty('--to', `${to * 100}%`);
  if (from !== to && !instant) {
    indicator.classList.remove('is-moving');
    void indicator.offsetWidth;
    indicator.classList.add('is-moving');
  }

  navTitle.textContent = titles[name];
  history.replaceState(null, '', name === 'today' ? location.pathname + location.search : `#${name === 'calendar' ? 'calendario' : name}`);
  updateNavbar();
}

tabs.forEach((t) => t.addEventListener('click', () => {
  const name = t.dataset.tab;
  haptic();
  // Tocco sulla tab attiva: torna in cima (come su iOS)
  if (name === active) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  show(name);
}));
indicator.addEventListener('animationend', () => indicator.classList.remove('is-moving'));

// Barra compatta quando il titolo grande esce dallo schermo
let ticking = false;
function updateNavbar() {
  const sentinel = views[active].querySelector('[data-sentinel]');
  const limit = navbar.getBoundingClientRect().bottom;
  const visible = sentinel.getBoundingClientRect().bottom < limit;
  navbar.classList.toggle('is-visible', visible);
  navbar.setAttribute('aria-hidden', String(!visible));
}
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { updateNavbar(); ticking = false; });
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
show(location.hash === '#calendario' ? 'calendar' : 'today', { instant: true });
if (!store.persistent) toast('Il browser non permette di salvare: i dati spariranno alla chiusura');

// Service worker (offline). In sviluppo locale resta spento.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname) || location.hostname.startsWith('192.168.');
if ('serviceWorker' in navigator && location.protocol === 'https:' && !isLocal) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
