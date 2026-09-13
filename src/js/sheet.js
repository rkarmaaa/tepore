import { emotion, shapeSVG } from './emotions.js';
import { haptic } from './haptics.js';

const CLOSE_DISTANCE = 96;
const CLOSE_SPEED = .55;

const root = document.querySelector('[data-sheet]');
const card = root.querySelector('[data-sheet-card]');
const els = {
  icon: root.querySelector('[data-sheet-icon]'),
  title: root.querySelector('[data-sheet-title]'),
  lede: root.querySelector('[data-sheet-lede]'),
  text: root.querySelector('[data-sheet-text]'),
};
const app = document.getElementById('app');

let open = false;
let restoreFocus = null;
let hideTimer = null;

// Scheda dell'emozione: contenuto, apertura e chiusura
export function openSheet(id) {
  const e = emotion(id);
  if (!e || open) return;

  card.dataset.emo = e.id;
  els.icon.innerHTML = shapeSVG(e.id);
  els.title.textContent = e.name;
  els.lede.textContent = e.pair || '';
  els.text.textContent = e.desc || '';

  haptic('soft');
  clearTimeout(hideTimer);
  restoreFocus = document.activeElement;
  root.hidden = false;
  app.setAttribute('aria-hidden', 'true');
  app.inert = true;
  open = true;

  // Reflow: il browser deve vedere lo stato chiuso, altrimenti non c'e transizione
  void root.offsetHeight;
  root.classList.add('is-open');
  card.focus({ preventScroll: true });
}

export function closeSheet() {
  if (!open) return;
  open = false;
  root.classList.remove('is-open');
  card.style.translate = '';
  card.classList.remove('is-dragging');
  app.removeAttribute('aria-hidden');
  app.inert = false;
  restoreFocus?.focus?.({ preventScroll: true });
  restoreFocus = null;
  hideTimer = setTimeout(() => { root.hidden = true; }, 620);
}

// Chiusura: tocco sullo sfondo, pulsante, Esc
root.addEventListener('click', (e) => {
  if (e.target.closest('[data-sheet-close]')) closeSheet();
});
document.addEventListener('keydown', (e) => {
  if (open && e.key === 'Escape') closeSheet();
});

// Gesture: si trascina verso il basso e si stacca
let drag = null;
card.addEventListener('pointerdown', (e) => {
  if (!open || e.target.closest('button')) return;
  drag = { y: e.clientY, t: performance.now(), dy: 0, id: e.pointerId, armed: false };
  card.setPointerCapture?.(e.pointerId);
});

card.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dy = e.clientY - drag.y;
  // Verso l'alto oppone resistenza, verso il basso segue il dito
  drag.dy = dy > 0 ? dy : dy / 6;
  // Superata la soglia di chiusura si sente uno scatto, come nei fogli di iOS
  const armed = drag.dy > CLOSE_DISTANCE;
  if (armed !== drag.armed) {
    drag.armed = armed;
    if (armed) haptic('tick');
  }
  if (!card.classList.contains('is-dragging') && Math.abs(dy) > 3) card.classList.add('is-dragging');
  card.style.translate = `0 ${drag.dy}px`;
});

const release = (e) => {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  const speed = drag.dy / Math.max(1, performance.now() - drag.t);
  const far = drag.dy > CLOSE_DISTANCE || (drag.dy > 24 && speed > CLOSE_SPEED);
  card.classList.remove('is-dragging');
  card.style.translate = '';
  drag = null;
  if (far) { haptic('soft'); closeSheet(); }
};
card.addEventListener('pointerup', release);
card.addEventListener('pointercancel', release);
