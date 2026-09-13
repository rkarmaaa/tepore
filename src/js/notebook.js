import { dominantOf, shapeSVG } from './emotions.js';
import { dateOf, todayKey, daysBetween, monthName, cap } from './dates.js';

const fmtDay = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric' });
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ESC[c]);
const plural = (n) => `${n} ${n === 1 ? 'nota' : 'note'}`;

const ago = (key) => {
  const n = daysBetween(key, todayKey());
  return n <= 0 ? 'oggi' : n === 1 ? 'ieri' : `${n} giorni fa`;
};

const BOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-10A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M8.5 3.5v17M11.5 8.5h4M11.5 11.5h4"/></svg>';

// Quaderno: tutte le note, dalla più lontana alla più recente
export function createNotebook({ store, onPick, onWrite }) {
  const root = document.getElementById('view-notebook');
  const list = root.querySelector('[data-notebook]');
  const lede = root.querySelector('[data-notebook-lede]');
  const end = root.querySelector('[data-notebook-end]');
  const card = document.querySelector('[data-notebook-card]');
  const meta = card.querySelector('[data-notebook-meta]');
  const quote = card.querySelector('[data-notebook-quote]');

  const entries = () => Object.entries(store.all())
    .filter(([, d]) => d.note?.trim())
    .sort(([a], [b]) => a.localeCompare(b));

  function renderCard(all) {
    const last = all.at(-1);
    meta.textContent = last ? `${plural(all.length)} · l'ultima ${ago(last[0])}` : 'Tutte le tue note, giorno dopo giorno';
    quote.hidden = !last;
    quote.textContent = last ? last[1].note.trim() : '';
  }

  function renderList(all) {
    end.hidden = !all.length;
    if (!all.length) {
      lede.textContent = 'Qui si raccolgono le tue note.';
      list.innerHTML = `
        <li class="empty">
          <span class="icon">${BOOK}</span>
          <strong>Il quaderno è ancora vuoto</strong>
          <p>Ogni nota che scrivi nella giornata trova posto qui, una dopo l'altra.</p>
          <button class="pill-btn ember" type="button" data-write>Scrivi la nota di oggi</button>
        </li>`;
      return;
    }

    lede.textContent = `${cap(plural(all.length))}, dalla più lontana alla più recente.`;
    const year = new Date().getFullYear();
    let html = '';
    let month = '';

    all.forEach(([key, day], idx) => {
      const d = dateOf(key);
      if (key.slice(0, 7) !== month) {
        if (month) html += '</ol></li>';
        month = key.slice(0, 7);
        const y = d.getFullYear();
        html += `<li class="period"><h2 class="label">${monthName(y, d.getMonth())}${y !== year ? ` ${y}` : ''}</h2><ol class="entries">`;
      }
      const dom = dominantOf(day);
      // Cascata dal basso: le più recenti entrano per prime
      const i = Math.min(all.length - 1 - idx, 10);
      html += `
        <li class="entry${dom ? '' : ' plain'}"${dom ? ` data-emo="${dom.id}"` : ''} style="--i:${i}">
          <button class="btn" type="button" data-key="${key}">
            <span class="node" aria-hidden="true">${dom ? shapeSVG(dom.id) : ''}</span>
            <span class="paper">
              <span class="head">
                <time datetime="${key}">${cap(fmtDay.format(d))}</time>
                ${dom ? `<span class="mood">${dom.name}</span>` : ''}
              </span>
              <span class="text">${esc(day.note.trim())}</span>
            </span>
          </button>
        </li>`;
    });
    list.innerHTML = `${html}</ol></li>`;
  }

  function render({ list: withList = !root.hidden } = {}) {
    const all = entries();
    renderCard(all);
    if (withList) renderList(all);
  }

  root.addEventListener('click', (e) => {
    const entry = e.target.closest('[data-key]');
    if (entry) { onPick(entry.dataset.key); return; }
    if (e.target.closest('[data-write]')) onWrite();
  });

  store.subscribe(() => render());
  render();

  return { refresh: () => render({ list: true }) };
}
