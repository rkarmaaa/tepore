import { EMOTIONS, APATHY, MAX_LEVEL, shapeSVG, dominantOf } from './emotions.js';
import { keyOf, todayKey, dateOf, cap } from './dates.js';
import { haptic } from './haptics.js';

const MIN_TREND = .35;

// Finestre di lettura: la prima è quella di partenza
export const PERIODS = [
  { id: 'settimana', label: 'Settimana', days: 7, lede: 'negli ultimi 7 giorni', span: 'gli ultimi 7 giorni', prev: 'ai 7 giorni prima' },
  { id: 'mese', label: 'Mese', days: 30, lede: 'negli ultimi 30 giorni', span: 'gli ultimi 30 giorni', prev: 'ai 30 giorni prima' },
  { id: 'trimestre', label: 'Trimestre', days: 90, lede: 'negli ultimi 3 mesi', span: 'gli ultimi 3 mesi', prev: 'ai 3 mesi prima' },
  { id: 'anno', label: 'Anno', days: 365, lede: 'nell\'ultimo anno', span: 'l\'ultimo anno', prev: 'all\'anno prima' },
];

const one = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtDayMonth = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });
const fmtDayMonthYear = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
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

// Direzione rispetto al periodo precedente: solo più o meno, nessun numero
function trendLine(now, before, period) {
  if (!before.logged || !now.logged) return '';
  const deltas = EMOTIONS
    .map((e) => ({ e, d: now.avg(e.id) - before.avg(e.id) }))
    .sort((a, b) => b.d - a.d);
  const up = deltas[0];
  const down = deltas.at(-1);
  const parts = [];
  if (up && up.d >= MIN_TREND) parts.push(`più ${up.e.the.replace(/^(la |il |l')/, '')}`);
  if (down && down.d <= -MIN_TREND) parts.push(`meno ${down.e.the.replace(/^(la |il |l')/, '')}`);
  if (!parts.length) return `Rispetto ${period.prev}, l'equilibrio è rimasto lo stesso.`;
  return `Rispetto ${period.prev}: ${parts.join(', ')}.`;
}

export function createReport({ store, onPick }) {
  const root = document.getElementById('view-report');
  const $ = (sel) => root.querySelector(sel);
  const els = {
    range: $('[data-report-range]'),
    lede: $('[data-report-lede]'),
    lead: $('[data-lead]'),
    leadAside: $('[data-lead-aside]'),
    leadFoot: $('[data-lead-foot]'),
    ranks: $('[data-ranks]'),
  };

  let period = PERIODS[0];

  // Fuori schermo l'alone si ferma: niente animazioni a vuoto
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      els.lead.classList.toggle('is-idle', !entry.isIntersecting);
    }, { rootMargin: '80px' }).observe(els.lead);
  }

  // --- Emozione del periodo ---
  function renderLead() {
    const end = todayKey();
    const days = period.days;
    const now = windowStats(store, end, days);
    const before = windowStats(store, end, days, days);
    const from = new Date(dateOf(end));
    from.setDate(from.getDate() - (days - 1));

    els.lede.textContent = `Come sono andate le tue giornate ${period.lede}.`;
    // L'anno compare solo quando la finestra esce da quello corrente
    const fmt = from.getFullYear() === new Date().getFullYear() ? fmtDayMonth : fmtDayMonthYear;
    els.range.textContent = `${fmt.format(from)} → oggi`;
    els.leadAside.textContent = now.logged ? `${now.logged}/${days}` : '';

    const ranked = EMOTIONS
      .map((e) => ({ e, total: now.totals.get(e.id) || 0 }))
      .sort((a, b) => b.total - a.total);
    const top = ranked[0];

    if (!now.logged || !top.total) {
      els.lead.innerHTML = `
        <div class="blank">
          <span class="icon">${shapeSVG(APATHY.id)}</span>
          <p class="title">${now.logged ? 'Un periodo in pausa' : 'Ancora nessuna giornata'}</p>
          <p class="text">${now.logged
            ? 'Hai segnato le giornate, ma nessuna emozione è emersa. Va bene anche così.'
            : 'Segna come ti senti: dopo qualche giorno qui comparirà il tuo resoconto.'}</p>
          <button class="pill-btn ember" type="button" data-go-today>Segna la giornata di oggi</button>
        </div>`;
      els.leadFoot.textContent = `Il resoconto guarda ${period.span}.`;
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
    else text = `È l'emozione che è salita più in alto in ${period.span}.`;

    const trend = trendLine(now, before, period);
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
    els.leadFoot.textContent = `Hai segnato ${giorni(now.logged)} su ${days}.${pause}`;
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

  root.addEventListener('click', (e) => {
    const cell = e.target.closest('[data-date]');
    if (cell) { onPick(cell.dataset.date); return; }
    if (e.target.closest('[data-go-today]')) onPick(todayKey());
  });

  store.subscribe(() => { if (!root.hidden) renderLead(); });
  renderLead();

  return {
    refresh: renderLead,
    get period() { return period.id; },

    // Cambio di finestra dalla sottobarra
    setPeriod(id) {
      const next = PERIODS.find((p) => p.id === id);
      if (!next || next === period) return;
      period = next;
      haptic('tick');
      els.lead.classList.remove('is-swapping');
      void els.lead.offsetWidth;
      els.lead.classList.add('is-swapping');
      renderLead();
    },
  };
}
