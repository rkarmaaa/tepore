import { timeNow } from './dates.js';

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>';
const DEBOUNCE = 600;
const PLACEHOLDER = 'Cosa ti porti via da questa giornata?';

// Editor della nota del giorno: si salva da solo mentre si scrive.
// Stesso componente in Oggi e nel Quaderno, su chiavi diverse.
export function createNote({ store, mount, key, id = 'note-field', placeholder = PLACEHOLDER }) {
  const el = document.createElement('div');
  el.className = 'editor';
  el.innerHTML = `
    <label class="sr-only" for="${id}">Nota della giornata</label>
    <textarea class="field" id="${id}" rows="4" placeholder="${placeholder}"></textarea>
    <div class="meta">
      <span class="status" data-note-status></span>
      <span class="count" data-note-count></span>
    </div>`;
  mount.appendChild(el);

  const field = el.querySelector('.field');
  const status = el.querySelector('[data-note-status]');
  const count = el.querySelector('[data-note-count]');
  let timer = null;

  function meta(state) {
    const n = field.value.length;
    count.textContent = n ? `${n} caratteri` : '';
    status.classList.toggle('is-saved', state === 'saved');
    if (state === 'saving') status.innerHTML = 'Salvataggio…';
    else if (state === 'saved') status.innerHTML = `${CHECK}Salvata alle ${timeNow()}`;
    else status.innerHTML = n ? `${CHECK}Salvata` : 'Si salva da sola, mentre scrivi.';
  }

  function autosize() {
    field.style.height = 'auto';
    field.style.height = `${field.scrollHeight}px`;
  }

  function flush() {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    store.update(key, { note: field.value });
  }

  function load(next = key) {
    flush();
    key = next;
    field.value = store.get(key)?.note || '';
    autosize();
    meta();
  }

  field.addEventListener('input', () => {
    autosize();
    meta('saving');
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      store.update(key, { note: field.value });
      meta('saved');
    }, DEBOUNCE);
  });
  field.addEventListener('blur', flush);
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  load(key);

  return {
    el,
    field,
    get key() { return key; },
    load,
    flush,
    autosize,

    // Riallinea con lo store, ma mai mentre si sta scrivendo
    sync() {
      if (document.activeElement === field || timer) return;
      const value = store.get(key)?.note || '';
      if (value === field.value) return;
      field.value = value;
      autosize();
      meta();
    },

    focus() { field.focus({ preventScroll: true }); },
  };
}
