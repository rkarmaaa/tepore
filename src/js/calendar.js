import { EMOTIONS, APATHY, shapeSVG, dominantOf } from './emotions.js';
import { keyOf, todayKey, monthName, dateOf, cap } from './dates.js';
import { haptic } from './haptics.js';

export function createCalendar({ store, onPick, onTitle, toast }) {
  const root = document.getElementById('view-calendar');
  const $ = (sel) => root.querySelector(sel);
  const els = {
    year: $('[data-cal-year]'),
    title: $('[data-cal-title]'),
    grid: $('[data-cal-grid]'),
    prev: $('[data-cal-prev]'),
    next: $('[data-cal-next]'),
    summary: $('[data-summary]'),
    legend: $('[data-legend]'),
  };

  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();

  els.legend.innerHTML = [...EMOTIONS, APATHY]
    .map((e) => `<li class="item" data-emo="${e.id}">${shapeSVG(e.id)}<span>${e.name}</span></li>`)
    .join('');

  function render(direction) {
    const today = todayKey();
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7; // lunedì = 0
    const total = new Date(y, m + 1, 0).getDate();
    const name = monthName(y, m);
    const nowD = new Date();
    const isCurrent = y === nowD.getFullYear() && m === nowD.getMonth();

    els.title.textContent = name;
    els.year.textContent = String(y);
    els.next.disabled = isCurrent || keyOf(new Date(y, m + 1, 1)) > today;
    onTitle?.(`${name} ${y}`);

    const cells = [];
    for (let i = 0; i < offset; i++) cells.push('<span class="day pad" aria-hidden="true"></span>');

    const counts = new Map();
    let logged = 0;
    let elapsed = 0;

    for (let d = 1; d <= total; d++) {
      const key = keyOf(new Date(y, m, d));
      const future = key > today;
      const day = store.get(key);
      const dom = dominantOf(day);
      if (!future) elapsed++;
      if (dom) { logged++; counts.set(dom.id, (counts.get(dom.id) || 0) + 1); }

      const cls = ['day', future ? 'future' : dom ? 'filled' : 'empty'];
      if (key === today) cls.push('is-today');
      const label = `${d} ${name}${dom ? `, ${dom.name.toLowerCase()}` : ''}${day?.note ? ', con nota' : ''}`;
      cells.push(`
        <button class="${cls.join(' ')}" type="button" data-date="${key}" ${dom ? `data-emo="${dom.id}"` : ''}
          style="--i:${offset + d}" aria-label="${label}" ${future ? 'disabled' : ''}>
          <span class="num">${d}</span>
          ${dom ? shapeSVG(dom.id) : ''}
          ${dom && day.note?.trim() ? '<span class="dot" aria-hidden="true"></span>' : ''}
        </button>`);
    }
    els.grid.innerHTML = cells.join('');

    els.grid.classList.remove('is-in-right', 'is-in-left');
    if (direction) {
      void els.grid.offsetWidth;
      els.grid.classList.add(direction > 0 ? 'is-in-right' : 'is-in-left');
    }

    renderSummary({ name, logged, elapsed, counts, isCurrent });
  }

  function renderSummary({ name, logged, elapsed, counts, isCurrent }) {
    if (!logged) {
      els.summary.innerHTML = `
        <p class="title">${name} è ancora da scrivere</p>
        <p class="text">${isCurrent
          ? 'Segna come ti senti oggi: qui vedrai il mese prendere colore.'
          : 'Nessuna giornata registrata in questo mese.'}</p>
        ${isCurrent ? '<button class="pill-btn ember cta" type="button" data-go-today>Segna la giornata di oggi</button>' : ''}`;
      return;
    }
    const order = [...EMOTIONS, APATHY].filter((e) => counts.has(e.id));
    const top = [...order].sort((a, b) => counts.get(b.id) - counts.get(a.id))[0];
    const n = counts.get(top.id);
    els.summary.innerHTML = `
      <p class="title">${name} ha il colore ${top.of}</p>
      <p class="text">${logged} ${logged === 1 ? 'giornata registrata' : 'giornate registrate'} su ${elapsed}.
        ${cap(top.the)} prevale in ${n} ${n === 1 ? 'giornata' : 'giornate'}.</p>
      <div class="bar" role="img" aria-label="Distribuzione delle emozioni prevalenti">
        ${order.map((e, i) => `<span data-emo="${e.id}" style="--n:${counts.get(e.id)};--i:${i}"></span>`).join('')}
      </div>`;
  }

  // Navigazione mesi
  function shift(delta) {
    const d = new Date(y, m + delta, 1);
    y = d.getFullYear();
    m = d.getMonth();
    haptic();
    render(delta);
  }
  els.prev.addEventListener('click', () => shift(-1));
  els.next.addEventListener('click', () => shift(1));

  // Scorrimento orizzontale sulla griglia per cambiare mese
  let sx = null;
  let sy = null;
  els.grid.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  els.grid.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && !els.next.disabled) shift(1);
      else if (dx > 0) shift(-1);
    }
  }, { passive: true });

  els.grid.addEventListener('click', (e) => {
    const cell = e.target.closest('[data-date]');
    if (!cell || cell.disabled) return;
    haptic();
    onPick(cell.dataset.date);
  });

  els.summary.addEventListener('click', (e) => {
    if (e.target.closest('[data-go-today]')) onPick(todayKey());
  });

  store.subscribe(() => { if (!root.hidden) render(); });

  render();

  return {
    refresh: () => render(),
    goTo(key) {
      const d = dateOf(key);
      y = d.getFullYear();
      m = d.getMonth();
      render();
    },
    get title() { return `${els.title.textContent} ${els.year.textContent}`; },
  };
}

