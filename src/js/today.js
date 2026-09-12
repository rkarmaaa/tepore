import { EMOTIONS, APATHY, MAX_LEVEL, shapeSVG, topEmotions } from './emotions.js';
import { todayKey, longDate, dayMonth, daysBetween, timeNow, cap } from './dates.js';
import { MoodSlider } from './slider.js';
import { openSheet } from './sheet.js';
import { haptic } from './haptics.js';

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>';
const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>';
const COLLAPSE_MS = 700;

export function createToday({ store, onTitle }) {
  const root = document.getElementById('view-today');
  const $ = (sel) => root.querySelector(sel);
  const els = {
    date: $('[data-today-date]'),
    title: $('[data-today-title]'),
    lede: $('[data-today-lede]'),
    actions: $('[data-today-actions]'),
    bloom: $('[data-bloom]'),
    stage: $('[data-bloom-stage]'),
    caption: $('[data-bloom-caption]'),
    moods: $('[data-moods]'),
    list: $('[data-mood-list]'),
    aside: $('[data-moods-aside]'),
    apathy: $('[data-apathy]'),
    note: $('[data-note]'),
    status: $('[data-note-status]'),
    count: $('[data-note-count]'),
  };

  let key = todayKey();
  let noteTimer = null;
  const live = {};

  // Ritratto del giorno
  const bloomItems = new Map();
  const aura = root.querySelector('[data-bloom-aura]');
  EMOTIONS.forEach((e, i) => {
    const item = document.createElement('span');
    item.className = 'item';
    item.dataset.emo = e.id;
    item.style.cssText = `--x:${e.x};--y:${e.y};--i:${i};--p:0`;
    item.innerHTML = shapeSVG(e.id);
    els.stage.appendChild(item);
    const blob = document.createElement('span');
    blob.className = 'blob';
    blob.dataset.emo = e.id;
    blob.style.cssText = item.style.cssText;
    aura.appendChild(blob);
    item.blob = blob;
    item.p = 0;
    bloomItems.set(e.id, item);
  });
  root.querySelector('[data-apathy-icon]').innerHTML = shapeSVG(APATHY.id);

  // Fuori schermo il ritratto si ferma: niente animazioni a vuoto
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      els.bloom.classList.toggle('is-idle', !entry.isIntersecting);
    }, { rootMargin: '80px' }).observe(els.bloom);
  }

  // Slider
  const sliders = EMOTIONS.map((e, i) => {
    const s = new MoodSlider(e, i, {
      onInput: (v, p) => { live[e.id] = { v, p }; paintBloom(); },
      onChange: (v) => store.update(key, { values: { [e.id]: v } }),
    });
    els.list.appendChild(s.el);
    return s;
  });

  // Pulsante "i" della riga: apre la scheda dell'emozione
  els.list.addEventListener('click', (e) => {
    const info = e.target.closest('[data-info]');
    if (!info) return;
    haptic();
    openSheet(info.dataset.info);
  });

  const current = () => {
    const values = {};
    EMOTIONS.forEach((e) => { values[e.id] = live[e.id]?.v ?? 0; });
    return { values, apatia: els.apathy.checked };
  };

  let lastCaption = '';
  let lastAside = '';
  function paintBloom() {
    const day = current();
    const tops = day.apatia ? [] : topEmotions(day);
    const past = key !== todayKey();
    const only = tops.length === 1 ? tops[0].id : null;

    // Si scrive solo ciò che è cambiato davvero
    bloomItems.forEach((item, id) => {
      const p = live[id]?.p ?? 0;
      if (p !== item.p) {
        item.p = p;
        item.style.setProperty('--p', p);
        item.blob.style.setProperty('--p', p);
      }
      item.classList.toggle('is-dominant', only === id);
    });
    els.bloom.classList.toggle('is-apathy', day.apatia);
    els.bloom.style.setProperty('--bloom-c', day.apatia
      ? 'var(--emo-apatia)'
      : tops.length ? `var(--emo-${tops[0].id})` : 'transparent');

    const felt = EMOTIONS.filter((e) => day.values[e.id] > 0).length;
    const aside = felt ? `${felt} di ${EMOTIONS.length}` : '';
    if (aside !== lastAside) {
      lastAside = aside;
      els.aside.textContent = aside;
    }

    let text;
    if (day.apatia) text = 'Una giornata in pausa. Va bene anche così.';
    else if (!tops.length) text = past ? 'Nessuna emozione segnata per questo giorno.' : 'Muovi gli slider: la giornata prende forma.';
    else if (tops.length === 1) text = `${past ? 'Prevaleva' : 'Prevale'} ${tops[0].the}.`;
    else if (tops.length === 2) text = `${cap(tops[0].the)} e ${tops[1].the}, alla pari.`;
    else text = 'Una giornata dalle mille sfumature.';

    if (text !== lastCaption) {
      lastCaption = text;
      els.caption.textContent = text;
      els.caption.classList.remove('is-changing');
      void els.caption.offsetWidth;
      els.caption.classList.add('is-changing');
    }
  }

  function paintHero() {
    const today = todayKey();
    const diff = daysBetween(key, today);
    let title = 'Oggi';
    let lede = 'Come ti senti oggi?';
    if (diff === 1) { title = 'Ieri'; lede = 'Com\'è andata ieri?'; }
    else if (diff > 1 && diff < 7) { title = `${diff} giorni fa`; lede = 'Come ti sentivi quel giorno?'; }
    else if (diff >= 7) { title = cap(dayMonth(key)); lede = 'Come ti sentivi quel giorno?'; }

    els.date.textContent = longDate(key);
    els.title.textContent = title;
    els.lede.textContent = lede;
    els.actions.innerHTML = diff > 0
      ? `<button class="chip" type="button" data-go-today>${BACK}Torna a oggi</button>`
      : '';
    onTitle?.(title);
  }

  function paintNoteMeta(state) {
    const n = els.note.value.length;
    els.count.textContent = n ? `${n} caratteri` : '';
    els.status.classList.toggle('is-saved', state === 'saved');
    if (state === 'saving') els.status.innerHTML = 'Salvataggio…';
    else if (state === 'saved') els.status.innerHTML = `${CHECK}Salvata alle ${timeNow()}`;
    else els.status.innerHTML = n ? `${CHECK}Salvata` : 'Si salva da sola, mentre scrivi.';
  }

  function autosize() {
    els.note.style.height = 'auto';
    els.note.style.height = `${els.note.scrollHeight}px`;
  }

  // Apre e chiude la sezione misurandone l'altezza: i dati restano dove sono
  let collapseTimer = null;
  function collapse(el, on, instant) {
    clearTimeout(collapseTimer);
    if (instant) {
      el.style.height = '';
      el.classList.toggle('is-collapsed', on);
      return;
    }
    if (el.classList.contains('is-collapsed') === on) return;

    const start = el.getBoundingClientRect().height;
    let end = 0;
    if (!on) {
      el.classList.remove('is-collapsed');
      el.style.height = 'auto';
      end = el.getBoundingClientRect().height;
      el.classList.add('is-collapsed');
    }
    el.style.height = `${start}px`;
    void el.offsetHeight;
    el.classList.toggle('is-collapsed', on);
    el.style.height = `${end}px`;
    collapseTimer = setTimeout(() => { el.style.height = ''; }, COLLAPSE_MS);
  }

  function setApathy(flag, instant) {
    root.classList.toggle('is-apathy', flag);
    sliders.forEach((s) => s.setDisabled(flag));
    collapse(els.moods, flag, instant);
  }

  function load(nextKey = key) {
    flushNote();
    key = nextKey;
    const day = store.get(key);
    sliders.forEach((s) => {
      const v = day?.values?.[s.emotion.id] || 0;
      s.set(v, { silent: true });
      live[s.emotion.id] = { v, p: v / MAX_LEVEL };
    });
    els.apathy.checked = Boolean(day?.apatia);
    setApathy(els.apathy.checked, true);
    els.note.value = day?.note || '';
    autosize();
    paintNoteMeta();
    paintHero();
    paintBloom();
  }

  function flushNote() {
    if (!noteTimer) return;
    clearTimeout(noteTimer);
    noteTimer = null;
    store.update(key, { note: els.note.value });
  }

  // Eventi
  els.apathy.addEventListener('change', () => {
    haptic();
    setApathy(els.apathy.checked);
    store.update(key, { apatia: els.apathy.checked });
    paintBloom();
  });

  els.note.addEventListener('input', () => {
    autosize();
    paintNoteMeta('saving');
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      noteTimer = null;
      store.update(key, { note: els.note.value });
      paintNoteMeta('saved');
    }, 600);
  });
  els.note.addEventListener('blur', flushNote);
  window.addEventListener('pagehide', flushNote);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushNote(); });

  els.actions.addEventListener('click', (e) => {
    if (e.target.closest('[data-go-today]')) { haptic(); load(todayKey()); }
  });

  // Aggiornamenti esterni (import, altre schede)
  store.subscribe((changed) => { if (changed === null) load(key); });

  load(key);

  return {
    get key() { return key; },
    open(k) { load(k); },
    // Dopo la mezzanotte "Oggi" diventa il giorno nuovo
    refreshDay(prevToday) {
      if (key === prevToday) load(todayKey());
      else paintHero();
    },
    get title() { return els.title.textContent; },
  };
}
