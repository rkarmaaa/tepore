import { VERSION } from './version.js';

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
  }

  render();

  return { refresh: render };
}
