import { EMOTIONS, APATHY, MAX_LEVEL, shapeSVG, dominantOf } from './emotions.js';
import { keyOf, todayKey, dateOf, monthName, cap } from './dates.js';
import { haptic } from './haptics.js';

const WINDOW = 14;
const MIN_TREND = .35;

const one = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtShortMonth = new Intl.DateTimeFormat('it-IT', { month: 'short' });
const fmtDayMonth = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });
const giorni = (n) => `${n} ${n === 1 ? 'giornata' : 'giornate'}`;

// Somme, presenze e giorni di prevalenza in una finestra che finisce a `end`
function windowStats(store, end, span, back = 0) {
  const last = dateOf(end);
  const totals = new Map();
  const present = new Map();
  const leads = new Map();
  let logged = 0;
  let apathy = 0;

  for (let i = 0; i < span; i++) {
    const d = new Date(last);
    d.setDate(last.getDate() - i - back);
    const day = store.get(keyOf(d));
    if (!day) continue;
    logged++;
    if (day.apatia) apathy++;
    EMOTIONS.forEach((e) => {
      const v = day.values?.[e.id] || 0;
      if (!v) return;
      totals.set(e.id, (totals.get(e.id) || 0) + v);
      present.set(e.id, (present.get(e.id) || 0) + 1);
    });
    const dom = dominantOf(day);
    if (dom && dom.id !== APATHY.id) leads.set(dom.id, (leads.get(dom.id) || 0) + 1);
  }

  const felt = Math.max(1, logged - apathy);
  const avg = (id) => (totals.get(id) || 0) / felt;
  return { totals, present, leads, logged, apathy, felt, avg, span };
}

// Direzione rispetto alle due settimane precedenti: solo più o meno, nessun numero
function trendLine(now, before) {
  if (!before.logged || !now.logged) return '';
  const deltas = EMOTIONS
    .map((e) => ({ e, d: now.avg(e.id) - before.avg(e.id) }))
    .sort((a, b) => b.d - a.d);
  const up = deltas[0];
  const down = deltas.at(-1);
  const parts = [];
  if (up && up.d >= MIN_TREND) parts.push(`più ${up.e.the.replace(/^(la |il |l')/, '')}`);
  if (down && down.d <= -MIN_TREND) parts.push(`meno ${down.e.the.replace(/^(la |il |l')/, '')}`);
  if (!parts.length) return 'Rispetto alle due settimane prima, l\'equilibrio è rimasto lo stesso.';
  return `Rispetto alle due settimane prima: ${parts.join(', ')}.`;
}

export function createReport({ store, onPick }) {
  const root = document.getElementById('view-report');
  const $ = (sel) => root.querySelector(sel);
  const els = {
    range: $('[data-report-range]'),
    lead: $('[data-lead]'),
    leadAside: $('[data-lead-aside]'),
    leadFoot: $('[data-lead-foot]'),
    ranks: $('[data-ranks]'),
    yearLabel: $('[data-year-label]'),
    yearAside: $('[data-year-aside]'),
    yearPrev: $('[data-year-prev]'),
    yearNext: $('[data-year-next]'),
    months: $('[data-year-grid]'),
    yearRecap: $('[data-year-recap]'),
  };

  let year = new Date().getFullYear();

  // Fuori schermo l'alone si ferma: niente animazioni a vuoto
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      els.lead.classList.toggle('is-idle', !entry.isIntersecting);
    }, { rootMargin: '80px' }).observe(els.lead);
  }

  // --- Ultimi 14 giorni ---
  function renderLead() {
    const end = todayKey();
    const now = windowStats(store, end, WINDOW);
    const before = windowStats(store, end, WINDOW, WINDOW);
    const from = new Date(dateOf(end));
    from.setDate(from.getDate() - (WINDOW - 1));

    els.range.textContent = `${fmtDayMonth.format(from)} → oggi`;
    els.leadAside.textContent = now.logged ? `${now.logged}/${WINDOW}` : '';

    const ranked = EMOTIONS
      .map((e) => ({ e, total: now.totals.get(e.id) || 0 }))
      .sort((a, b) => b.total - a.total);
    const top = ranked[0];

    if (!now.logged || !top.total) {
      els.lead.innerHTML = `
        <div class="blank">
          <span class="icon">${shapeSVG(APATHY.id)}</span>
          <p class="title">${now.logged ? 'Due settimane in pausa' : 'Ancora nessuna giornata'}</p>
          <p class="text">${now.logged
            ? 'Hai segnato le giornate, ma nessuna emozione è emersa. Va bene anche così.'
            : 'Segna come ti senti: dopo qualche giorno qui comparirà il tuo resoconto.'}</p>
          <button class="pill-btn ember" type="button" data-go-today>Segna la giornata di oggi</button>
        </div>`;
      els.leadFoot.textContent = 'Il resoconto guarda sempre le ultime due settimane.';
      renderRanks(ranked, now);
      return;
    }

    const { e } = top;
    const present = now.present.get(e.id) || 0;
    const leads = now.leads.get(e.id) || 0;
    const avg = now.avg(e.id);

    let text;
    if (leads >= Math.ceil(now.felt / 2)) text = 'Ha dato il tono a quasi tutte le tue giornate.';
    else if (present >= Math.ceil(now.felt * .7)) text = 'Torna quasi ogni giorno, anche quando non è la più forte.';
    else text = 'È l\'emozione che è salita più in alto in queste due settimane.';

    const trend = trendLine(now, before);
    els.lead.innerHTML = `
      <div class="crown" data-emo="${e.id}">
        <span class="halo" aria-hidden="true"></span>
        <span class="mark">${shapeSVG(e.id)}</span>
        <p class="name">${cap(e.the)}</p>
        <p class="text">${text}</p>
      </div>
      <dl class="stats">
        <div class="cell">
          <dt>Presente in</dt>
          <dd>${present}<small>/${now.felt}</small></dd>
        </div>
        <div class="cell">
          <dt>Intensità media</dt>
          <dd>${one.format(avg)}<small>/${MAX_LEVEL}</small></dd>
        </div>
        <div class="cell">
          <dt>Prevale in</dt>
          <dd>${leads}<small>/${now.felt}</small></dd>
        </div>
      </dl>
      ${trend ? `<p class="trend">${trend}</p>` : ''}`;

    const pause = now.apathy ? ` ${giorni(now.apathy)} in pausa.` : '';
    els.leadFoot.textContent = `Hai segnato ${giorni(now.logged)} su ${WINDOW}.${pause}`;
    renderRanks(ranked, now);
  }

  // --- Classifica delle otto emozioni ---
  function renderRanks(ranked, now) {
    const max = ranked[0]?.total || 0;
    els.ranks.innerHTML = ranked.map(({ e, total }, i) => {
      const avg = now.avg(e.id);
      const p = max ? total / max : 0;
      const days = now.present.get(e.id) || 0;
      return `
        <li class="rank${total ? '' : ' off'}" data-emo="${e.id}" style="--i:${i};--p:${p.toFixed(3)}">
          <span class="icon">${shapeSVG(e.id)}</span>
          <span class="name">${e.name}</span>
          <span class="meter" aria-hidden="true"><span class="fill"></span></span>
          <span class="value" aria-label="intensità media ${one.format(avg)} su ${MAX_LEVEL}, in ${giorni(days)}">${one.format(avg)}</span>
        </li>`;
    }).join('');
  }

  // --- Vista anno ---
  const years = () => {
    const keys = Object.keys(store.all());
    const thisYear = new Date().getFullYear();
    if (!keys.length) return { first: thisYear, last: thisYear };
    const first = Number(keys.reduce((a, b) => (a < b ? a : b)).slice(0, 4));
    return { first: Math.min(first, thisYear), last: thisYear };
  };

  function renderYear(direction) {
    const today = todayKey();
    const span = years();
    year = Math.min(Math.max(year, span.first), span.last);
    els.yearLabel.textContent = String(year);
    els.yearPrev.disabled = year <= span.first;
    els.yearNext.disabled = year >= span.last;

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

    els.yearAside.textContent = logged ? `${logged} segnate` : '';

    if (!logged) {
      els.yearRecap.innerHTML = `<p class="text">Nessuna giornata registrata nel ${year}.</p>`;
      return;
    }
    const order = [...EMOTIONS, APATHY].filter((e) => counts.has(e.id));
    const top = [...order].sort((a, b) => counts.get(b.id) - counts.get(a.id))[0];
    els.yearRecap.innerHTML = `
      <p class="text">${giorni(logged)} nel ${year}. ${cap(top.the)} prevale in ${giorni(counts.get(top.id))}.</p>
      <div class="bar" role="img" aria-label="Distribuzione delle emozioni prevalenti dell'anno">
        ${order.map((e, i) => `<span data-emo="${e.id}" style="--n:${counts.get(e.id)};--i:${i}"></span>`).join('')}
      </div>`;
  }

  function shiftYear(delta) {
    const span = years();
    const next = year + delta;
    if (next < span.first || next > span.last) return;
    year = next;
    renderYear(delta);
  }

  els.yearPrev.addEventListener('click', () => shiftYear(-1));
  els.yearNext.addEventListener('click', () => shiftYear(1));

  // Scorrimento orizzontale sull'anno, come nel calendario
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
      shiftYear(dx < 0 ? 1 : -1);
    }
  }, { passive: true });

  root.addEventListener('click', (e) => {
    const cell = e.target.closest('[data-date]');
    if (cell) { onPick(cell.dataset.date); return; }
    if (e.target.closest('[data-go-today]')) onPick(todayKey());
  });

  function render() {
    renderLead();
    renderYear();
  }

  store.subscribe(() => { if (!root.hidden) render(); });
  render();

  return { refresh: render };
}
