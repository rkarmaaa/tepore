import { dominantOf, shapeSVG } from './emotions.js';
import { dateOf, todayKey, monthName, cap } from './dates.js';
import { createNote } from './note.js';

const fmtDay = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric' });
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ESC[c]);
const plural = (n) => `${n} ${n === 1 ? 'nota' : 'note'}`;

const BOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-10A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M8.5 3.5v17M11.5 8.5h4M11.5 11.5h4"/></svg>';

// Quaderno: tutte le note dalla più lontana alla più recente,
// e in fondo l'editor della nota di oggi, dove si apre la pagina.
export function createNotebook({ store, onPick }) {
  const root = document.getElementById('view-notebook');
  const list = root.querySelector('[data-notebook]');
  const lede = root.querySelector('[data-notebook-lede]');
  const tally = root.querySelector('[data-notebook-tally]');

  const note = createNote({
    store,
    mount: root.querySelector('[data-notebook-note]'),
    key: todayKey(),
    id: 'notebook-note',
  });

  const entries = () => Object.entries(store.all())
    .filter(([, d]) => d.note?.trim())
    .sort(([a], [b]) => a.localeCompare(b));

  function renderList(all) {
    tally.textContent = all.length ? plural(all.length) : '';

    if (!all.length) {
      lede.textContent = 'Qui si raccolgono le tue note, una dopo l\'altra.';
      list.innerHTML = `
        <li class="empty">
          <span class="icon">${BOOK}</span>
          <strong>Il quaderno è ancora vuoto</strong>
          <p>Scrivi qui sotto la nota di oggi: da domani troverai questa pagina piena.</p>
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
          <button class="btn" type="button" data-key="${key}" data-haptic="off">
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

  function render() {
    renderList(entries());
  }

  list.addEventListener('click', (e) => {
    const entry = e.target.closest('[data-key]');
    if (entry) onPick(entry.dataset.key);
  });

  store.subscribe(() => { if (!root.hidden) render(); });
  render();

  return {
    // La nota di oggi resta sempre l'ultima cosa della pagina
    refresh() {
      note.load(todayKey());
      render();
    },
    focusNote: () => note.focus(),
  };
}
