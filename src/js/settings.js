import { todayKey } from './dates.js';
import { VERSION } from './version.js';
import { haptic, hapticsEnabled, hapticsSupported, setHaptics } from './haptics.js';
import { getTheme, setTheme } from './theme.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const fmtTime = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });
const fmtDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });

// "oggi alle 21:40", "ieri alle 8:12", "3 settembre"
function when(ms) {
  if (!ms) return 'mai';
  const d = new Date(ms);
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(ms).setHours(0, 0, 0, 0)) / 864e5);
  if (days === 0) return `oggi alle ${fmtTime.format(d)}`;
  if (days === 1) return `ieri alle ${fmtTime.format(d)}`;
  return fmtDate.format(d);
}

// Impostazioni: backup manuale, promemoria, aptica, backup automatico
export function createSettings({ store, toast, backup, reminder }) {
  const root = document.getElementById('view-settings');
  const $ = (sel) => root.querySelector(sel);

  const els = {
    stats: $('[data-data-stats]'),
    exportBtn: $('[data-export]'),
    importBtn: $('[data-import]'),
    importInput: $('[data-import-input]'),
    theme: $('[data-theme-select]'),
    haptics: $('[data-haptics]'),
    hapticsState: $('[data-haptics-state]'),
    hapticsGroup: $('.group.options'),
    reminder: $('[data-reminder]'),
    reminderState: $('[data-reminder-state]'),
    reminderGroup: $('.group.reminder'),
    backup: $('[data-backup]'),
    backupState: $('[data-backup-state]'),
    backupTitle: $('[data-backup-title]'),
    backupDetail: $('[data-backup-detail]'),
    backupActions: $('[data-backup-actions]'),
  };

  // Tema: la scelta è già applicata dallo script in testa a index.html
  els.theme.value = getTheme();
  els.theme.addEventListener('change', () => {
    setTheme(els.theme.value);
    haptic('firm');
  });

  // Feedback aptico: attivo di default, la scelta resta salvata
  const canHaptic = hapticsSupported();
  els.haptics.checked = hapticsEnabled() && canHaptic;
  els.haptics.disabled = !canHaptic;
  els.hapticsGroup.classList.toggle('is-off', !canHaptic);
  els.hapticsState.textContent = !canHaptic ? 'Non disponibile' : els.haptics.checked ? 'Attivo' : 'Non attivo';

  els.haptics.addEventListener('change', () => {
    setHaptics(els.haptics.checked);
    els.hapticsState.textContent = els.haptics.checked ? 'Attivo' : 'Non attivo';
    haptic('double');
  });

  // --- Promemoria serale ---
  function paintReminder(s = reminder.state) {
    els.reminder.checked = s.enabled;
    els.reminder.disabled = !s.supported;
    els.reminderGroup.classList.toggle('is-off', !s.supported);
    els.reminderState.textContent = !s.supported
      ? 'Non disponibile'
      : s.enabled ? `Ogni sera alle ${s.hour}` : 'Non attivo';
  }

  // Il permesso si puo chiedere solo qui dentro, nel tocco dell'utente
  els.reminder.addEventListener('change', async () => {
    haptic('firm');
    const outcome = await reminder.setEnabled(els.reminder.checked);
    paintReminder();
    if (outcome === 'on') toast('Promemoria attivo alle 22');
    else if (outcome === 'blocked') { haptic('warn'); toast('Le notifiche sono bloccate: riattivale per Tepore nelle impostazioni di iPhone'); }
    else if (outcome === 'unsupported') { haptic('warn'); toast('Serve Tepore installata sulla schermata Home'); }
  });

  reminder.subscribe(paintReminder);
  paintReminder();

  function render() {
    const days = Object.values(store.all());
    const notes = days.filter((d) => d.note?.trim()).length;
    els.stats.textContent = days.length
      ? `${plural(days.length, 'giornata', 'giornate')} · ${plural(notes, 'nota', 'note')}`
      : 'Nessuna giornata';
  }

  // --- Backup su Dropbox ---
  let authUrl = '';
  let asking = false;
  let linking = false;

  const SPINNER = '<span class="spinner" aria-hidden="true"></span>';
  const WORKING = `<div class="working">${SPINNER}<span>Verifico il codice…</span></div>`;
  const LINK_BTN = '<button class="pill-btn ember" type="button" data-link>Collega Dropbox</button>';
  const CODE_FORM = `
    <label class="sr-only" for="backup-code">Codice di Dropbox</label>
    <input class="code" id="backup-code" type="text" inputmode="text" autocomplete="off"
      autocapitalize="off" spellcheck="false" placeholder="Incolla qui il codice" data-code>
    <div class="pair">
      <button class="pill-btn" type="button" data-cancel>Annulla</button>
      <button class="pill-btn ember" type="button" data-confirm>Conferma</button>
    </div>`;
  const LINKED_BTNS = `
    <div class="pair">
      <button class="pill-btn" type="button" data-unlink>Scollega</button>
      <button class="pill-btn ember" type="button" data-now>Salva adesso</button>
    </div>`;

  // Si ridisegna solo quando cambia davvero: altrimenti il codice incollato sparirebbe
  function setActions(mode, html) {
    if (els.backupActions.dataset.mode === mode) return;
    els.backupActions.dataset.mode = mode;
    els.backupActions.innerHTML = html;
    if (mode === 'code') els.backupActions.querySelector('[data-code]')?.focus({ preventScroll: true });
  }

  function paintBackup(s = backup.state) {
    const busy = s.status === 'syncing';

    if (!s.configured) {
      els.backupState.textContent = 'Da configurare';
      els.backupTitle.textContent = 'Backup spento';
      els.backupDetail.textContent = 'Manca la chiave dell\'app Dropbox in js/config.js.';
      setActions('none', '');
      return;
    }

    if (!s.linked) {
      els.backupState.innerHTML = linking ? `${SPINNER}<span>Collegamento…</span>` : 'Non attivo';
      els.backupTitle.textContent = linking ? 'Un attimo' : asking ? 'Incolla il codice' : 'Non collegato';
      els.backupDetail.textContent = linking
        ? 'Sto verificando il codice con Dropbox.'
        : s.status === 'error' && s.error ? s.error
          : asking ? 'Dropbox ti mostra un codice: copialo e torna qui.'
            : 'Una copia delle tue giornate al sicuro nel tuo Dropbox.';
      if (linking) setActions('working', WORKING);
      else setActions(asking ? 'code' : 'link', asking ? CODE_FORM : LINK_BTN);
      return;
    }

    els.backupState.innerHTML = busy
      ? `${SPINNER}<span>Salvataggio…</span>`
      : s.status === 'error' ? 'Da controllare' : 'Attivo';
    els.backupTitle.textContent = 'Dropbox collegato';
    els.backupDetail.textContent = s.status === 'error'
      ? s.error
      : `Ultimo backup ${when(s.lastSync)}.`;
    setActions('linked', LINKED_BTNS);
    els.backupActions.querySelector('[data-now]').disabled = busy;
  }

  // L'indirizzo si prepara prima: dopo un await il tap non aprirebbe piu la finestra
  async function prepare() {
    if (!backup.state.configured || backup.state.linked) return;
    try {
      authUrl = await backup.authorizeUrl();
    } catch {
      authUrl = '';
    }
  }

  els.backup.addEventListener('click', async (e) => {
    if (e.target.closest('[data-link]')) {
      if (authUrl) window.open(authUrl, '_blank', 'noopener');
      asking = true;
      paintBackup();
      return;
    }
    if (e.target.closest('[data-cancel]')) {
      asking = false;
      paintBackup();
      return;
    }
    if (e.target.closest('[data-confirm]')) {
      const code = els.backupActions.querySelector('[data-code]')?.value || '';
      if (!code.trim()) return;
      linking = true;
      paintBackup();
      const ok = await backup.link(code);
      linking = false;
      if (ok) asking = false;
      haptic(ok ? 'double' : 'warn');
      paintBackup();
      prepare();
      return;
    }
    if (e.target.closest('[data-now]')) { backup.sync({ silent: false }); return; }
    if (e.target.closest('[data-unlink]')) { backup.unlink(); prepare(); }
  });

  backup.subscribe(paintBackup);
  prepare();
  paintBackup();

  // --- Backup manuale ---
  els.exportBtn.addEventListener('click', async () => {
    const name = `tepore-backup-${todayKey()}.json`;
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const file = new File([blob], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Backup di Tepore' });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Backup esportato');
  });

  els.importBtn.addEventListener('click', () => els.importInput.click());
  els.importInput.addEventListener('change', async () => {
    const file = els.importInput.files?.[0];
    els.importInput.value = '';
    if (!file) return;
    try {
      const n = store.importJSON(await file.text());
      haptic(n ? 'double' : 'warn');
      toast(n ? `Backup importato: ${plural(n, 'giornata', 'giornate')}` : 'Il backup non contiene giornate');
    } catch {
      haptic('warn');
      toast('File non valido: scegli un backup di Tepore (.json)');
    }
  });

  $('[data-version]').textContent = `Versione ${VERSION}`;
  store.subscribe(render);
  render();

  return { refresh: render };
}
