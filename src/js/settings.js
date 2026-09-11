import { todayKey } from './dates.js';
import { VERSION } from './version.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Impostazioni: backup e ripristino dei dati
export function createSettings({ store, toast }) {
  const root = document.getElementById('view-settings');
  const $ = (sel) => root.querySelector(sel);

  const els = {
    stats: $('[data-data-stats]'),
    exportBtn: $('[data-export]'),
    importBtn: $('[data-import]'),
    importInput: $('[data-import-input]'),
  };

  function render() {
    const days = Object.values(store.all());
    const notes = days.filter((d) => d.note?.trim()).length;
    els.stats.textContent = days.length
      ? `${plural(days.length, 'giornata', 'giornate')} · ${plural(notes, 'nota', 'note')}`
      : 'Nessuna giornata';
  }

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
      toast(n ? `Backup importato: ${plural(n, 'giornata', 'giornate')}` : 'Il backup non contiene giornate');
    } catch {
      toast('File non valido: scegli un backup di Tepore (.json)');
    }
  });

  $('[data-version]').textContent = `Versione ${VERSION}`;
  store.subscribe(render);
  render();

  return { refresh: render };
}
