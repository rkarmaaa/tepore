import { VERSION } from './version.js';
import { hapticsEnabled } from './haptics.js';

// Prove dell'aptica: su iOS l'unica sorgente è uno <input switch> nativo.
// Ognuna prova una strada diversa per farlo suonare.
const TRIALS = [
  {
    name: 'navigator.vibrate',
    desc: 'L\'API standard. Su iOS di norma non esiste nemmeno.',
    run: () => { if (navigator.vibrate) navigator.vibrate(30); },
  },
  {
    name: 'Switch sovrapposto al pulsante',
    desc: 'Il dito tocca direttamente uno switch nativo trasparente. Nessun codice in mezzo.',
    overlay: true,
    run: () => {},
  },
  {
    name: 'input.click() da codice',
    desc: 'Switch vero, a misura piena, disegnato ma trasparente, cliccato da JavaScript.',
    run: (rig) => rig.click(),
  },
  {
    name: 'checked = !checked',
    desc: 'Stesso switch, cambiato di stato senza click, con l\'evento change a mano.',
    run: (rig) => {
      rig.checked = !rig.checked;
      rig.dispatchEvent(new Event('change', { bubbles: true }));
    },
  },
  {
    name: 'Switch usa e getta in head',
    desc: 'Il metodo storico: creato con display none dentro head, cliccato e rimosso.',
    run: () => {
      const label = document.createElement('label');
      label.style.display = 'none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.append(input);
      document.head.append(label);
      label.click();
      label.remove();
    },
  },
  {
    name: 'Switch nuovo a ogni tocco',
    desc: 'Creato in body a misura piena, cliccato subito e tolto dopo un istante.',
    run: () => {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.className = 'haptic-rig';
      document.body.append(input);
      input.click();
      setTimeout(() => input.remove(), 60);
    },
  },
];

const SWITCH = '<input type="checkbox" switch aria-hidden="true" tabindex="-1">';

const iosVersion = () => {
  const m = navigator.userAgent.match(/OS (\d+)[._](\d+)/);
  return m ? `${m[1]}.${m[2]}` : 'non iOS';
};

const yn = (v) => (v ? 'sì' : 'no');

// Pagina Sviluppatore: si apre toccando cinque volte la versione
export function createDev({ toast, reminder }) {
  const root = document.getElementById('view-dev');
  const $ = (sel) => root.querySelector(sel);
  const els = {
    env: $('[data-env]'),
    trials: $('[data-trials]'),
    trialsAside: $('[data-trials-aside]'),
    out: $('[data-trials-out]'),
    track: $('[data-dev-track]'),
    fill: $('[data-dev-fill]'),
    level: $('[data-dev-level]'),
    drags: $('[data-dev-drags]'),
    notifFacts: $('[data-notif-facts]'),
    notifState: $('[data-notif-state]'),
  };

  const rows = (pairs) => pairs
    .map(([k, v]) => `<div class="fact"><dt>${k}</dt><dd>${v}</dd></div>`)
    .join('');

  // --- Ambiente ---
  function renderEnv() {
    const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    els.env.innerHTML = rows([
      ['Versione', VERSION],
      ['iOS', iosVersion()],
      ['App installata', yn(standalone)],
      ['navigator.vibrate', yn(typeof navigator.vibrate === 'function')],
      ['switch in IDL', yn('switch' in HTMLInputElement.prototype)],
      ['Notification', typeof Notification === 'undefined' ? 'assente' : Notification.permission],
      ['Service worker', navigator.serviceWorker?.controller ? 'attivo' : 'nessuno'],
    ]);
  }

  // --- Prove dell'aptica ---
  const verdicts = new Map();
  const rig = document.createElement('input');
  rig.type = 'checkbox';
  rig.className = 'haptic-rig';
  rig.setAttribute('switch', '');
  rig.setAttribute('aria-hidden', 'true');
  rig.tabIndex = -1;
  document.body.append(rig);

  els.trials.innerHTML = TRIALS.map((t, i) => `
    <li class="trial" style="--i:${i}">
      <span class="n">${i + 1}</span>
      <span class="text">
        <strong>${t.name}</strong>
        <span>${t.desc}</span>
      </span>
      <div class="acts">
        <button class="pill-btn ember go" type="button" data-trial="${i}" data-haptic="off">
          Prova${t.overlay ? SWITCH : ''}
        </button>
        <span class="verdict" role="group" aria-label="Hai sentito la prova ${i + 1}?">
          <button class="pill-btn" type="button" data-felt="si" data-n="${i + 1}" data-haptic="off">Sì</button>
          <button class="pill-btn" type="button" data-felt="no" data-n="${i + 1}" data-haptic="off">No</button>
        </span>
      </div>
    </li>`).join('');

  function renderVerdicts() {
    const si = [];
    const no = [];
    [...verdicts.keys()].sort((a, b) => a - b).forEach((n) => {
      (verdicts.get(n) === 'si' ? si : no).push(n);
    });
    els.trialsAside.textContent = verdicts.size ? `${verdicts.size}/${TRIALS.length + 1}` : '';
    els.out.textContent = verdicts.size
      ? `Sentite: ${si.length ? si.join(', ') : 'nessuna'}${no.length ? ` · non sentite: ${no.join(', ')}` : ''}`
      : 'Tocca ogni prova e segna se l\'hai sentita.';
  }

  root.addEventListener('click', (e) => {
    const go = e.target.closest('[data-trial]');
    if (go) {
      if (!hapticsEnabled()) toast('Il feedback aptico è spento in Impostazioni');
      TRIALS[Number(go.dataset.trial)].run(rig);
      return;
    }
    const felt = e.target.closest('[data-felt]');
    if (felt) {
      const n = Number(felt.dataset.n);
      verdicts.set(n, felt.dataset.felt);
      felt.closest('.verdict').querySelectorAll('[data-felt]').forEach((b) => {
        b.classList.toggle('is-on', b === felt);
        b.setAttribute('aria-pressed', String(b === felt));
      });
      renderVerdicts();
    }
  });

  // --- Prova 7: slider identico a quelli di Oggi, con lo switch sulla traccia ---
  let value = 0;
  let drags = 0;
  let dragging = false;

  const paint = (v) => {
    value = v;
    els.fill.style.width = `${(v / 5) * 100}%`;
    els.level.textContent = v;
  };

  const levelAt = (x) => {
    const r = els.track.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(1, (x - r.left) / r.width)) * 5);
  };

  els.track.addEventListener('pointerdown', (e) => {
    dragging = true;
    els.track.setPointerCapture?.(e.pointerId);
    paint(levelAt(e.clientX));
  });
  els.track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const v = levelAt(e.clientX);
    if (v === value) return;
    paint(v);
    drags++;
    els.drags.textContent = `${drags} ${drags === 1 ? 'scatto' : 'scatti'} trascinando`;
  });
  const stop = () => { dragging = false; };
  els.track.addEventListener('pointerup', stop);
  els.track.addEventListener('pointercancel', stop);

  // --- Notifiche ---
  function renderNotif() {
    const d = reminder.debug();
    els.notifState.textContent = d.permission;
    els.notifFacts.innerHTML = rows([
      ['Permesso', d.permission],
      ['Promemoria acceso', yn(d.enabled)],
      ['Giornata vuota', yn(d.empty)],
      ['Passate le 22', yn(d.past)],
      ['Invito già mostrato', d.seen],
    ]);
  }

  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-notif]');
    if (!btn) return;
    const what = btn.dataset.notif;

    if (what === 'ask') {
      const outcome = await reminder.ask();
      toast(outcome === 'granted' ? 'Permesso concesso' : `Permesso: ${outcome}`);
    } else if (what === 'now') {
      const outcome = await reminder.fire('Se leggi questo, le notifiche funzionano.');
      toast(outcome === 'ok' ? 'Notifica inviata' : `Non inviata: ${outcome}`);
    } else if (what === 'later') {
      toast('Fra 10 secondi. Torna subito alla schermata Home.');
      setTimeout(async () => {
        const outcome = await reminder.fire('Notifica differita di 10 secondi.');
        if (outcome !== 'ok') toast(`Non inviata: ${outcome}`);
      }, 10_000);
    } else if (what === 'clear') {
      reminder.clearSeen();
      toast('Segno "già vista" azzerato');
    }
    renderNotif();
  });

  function render() {
    renderEnv();
    renderNotif();
    renderVerdicts();
  }

  render();

  return { refresh: render };
}
