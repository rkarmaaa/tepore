import { EMOTIONS, APATHY, shapeSVG, dominantOf } from './emotions.js';
import { keyOf, todayKey, monthName, cap } from './dates.js';
import { haptic } from './haptics.js';

const fmtShortMonth = new Intl.DateTimeFormat('it-IT', { month: 'short' });
const giorni = (n) => `${n} ${n === 1 ? 'giornata' : 'giornate'}`;

// Vista anno: dodici mini-mesi, un segno per ogni giornata segnata
export function createYear({ store, root, onPick }) {
  const $ = (sel) => root.querySelector(sel);
  const els = {
    label: $('[data-year-label]'),
    aside: $('[data-year-aside]'),
    prev: $('[data-year-prev]'),
    next: $('[data-year-next]'),
    months: $('[data-year-grid]'),
    recap: $('[data-year-recap]'),
  };

  let year = new Date().getFullYear();

  const span = () => {
    const keys = Object.keys(store.all());
    const now = new Date().getFullYear();
    if (!keys.length) return { first: now, last: now };
    const first = Number(keys.reduce((a, b) => (a < b ? a : b)).slice(0, 4));
    return { first: Math.min(first, now), last: now };
  };

  function render(direction) {
    const today = todayKey();
    const range = span();
    year = Math.min(Math.max(year, range.first), range.last);
    els.label.textContent = String(year);
    els.prev.disabled = year <= range.first;
    els.next.disabled = year >= range.last;

    const counts = new Map();
    let logged = 0;
    let html = '';

    for (let m = 0; m < 12; m++) {
      const first = new Date(year, m, 1);
      const offset = (first.getDay() + 6) % 7;
      const total = new Date(year, m + 1, 0).getDate();
      let cells = '';
      for (let i = 0; i < offset; i++) cells += '<span class="cell pad"></span>';

      for (let d = 1; d <= total; d++) {
        const key = keyOf(new Date(year, m, d));
        if (key > today) { cells += '<span class="cell future"></span>'; continue; }
        const day = store.get(key);
        const dom = dominantOf(day);
        if (!dom) { cells += '<span class="cell void"></span>'; continue; }
        logged++;
        counts.set(dom.id, (counts.get(dom.id) || 0) + 1);
        cells += `<button class="cell filled" type="button" data-haptic="off" data-emo="${dom.id}" data-date="${key}"
          aria-label="${d} ${monthName(year, m).toLowerCase()}, ${dom.name.toLowerCase()}">${shapeSVG(dom.id)}</button>`;
      }

      html += `
        <div class="mini" style="--i:${m}">
          <span class="label">${cap(fmtShortMonth.format(first)).replace('.', '')}</span>
          <div class="cells">${cells}</div>
        </div>`;
    }

    els.months.innerHTML = html;
    els.months.classList.remove('is-in-right', 'is-in-left');
    if (direction) {
      void els.months.offsetWidth;
      els.months.classList.add(direction > 0 ? 'is-in-right' : 'is-in-left');
    }

    els.aside.textContent = logged ? `${logged} segnate` : '';

    if (!logged) {
      els.recap.innerHTML = `<p class="text">Nessuna giornata registrata nel ${year}.</p>`;
      return;
    }
    const order = [...EMOTIONS, APATHY].filter((e) => counts.has(e.id));
    const top = [...order].sort((a, b) => counts.get(b.id) - counts.get(a.id))[0];
    els.recap.innerHTML = `
      <p class="text">${giorni(logged)} nel ${year}. ${cap(top.the)} prevale in ${giorni(counts.get(top.id))}.</p>
      <div class="bar" role="img" aria-label="Distribuzione delle emozioni prevalenti dell'anno">
        ${order.map((e, i) => `<span data-emo="${e.id}" style="--n:${counts.get(e.id)};--i:${i}"></span>`).join('')}
      </div>`;
  }

  function shift(delta) {
    const range = span();
    const next = year + delta;
    if (next < range.first || next > range.last) return;
    year = next;
    render(delta);
  }

  els.prev.addEventListener('click', () => shift(-1));
  els.next.addEventListener('click', () => shift(1));

  // Scorrimento orizzontale per cambiare anno, come nel calendario
  let sx = null;
  let sy = null;
  els.months.addEventListener('touchstart', (e) => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  els.months.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      haptic('soft');
      shift(dx < 0 ? 1 : -1);
    }
  }, { passive: true });

  els.months.addEventListener('click', (e) => {
    const cell = e.target.closest('[data-date]');
    if (cell) onPick(cell.dataset.date);
  });

  render();

  return { refresh: () => render() };
}
