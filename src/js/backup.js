import * as cloud from './dropbox.js';

const DEBOUNCE = 6000;

// Backup automatico: unisce le giornate per data, vince la più recente
export function createBackup({ store, toast }) {
  const listeners = new Set();
  let state = { status: 'idle', error: '' };
  let timer = null;
  let running = false;
  let merging = false;

  const emit = () => listeners.forEach((fn) => fn(snapshot()));

  function snapshot() {
    return {
      configured: cloud.configured(),
      linked: cloud.linked(),
      lastSync: cloud.lastSync(),
      status: state.status,
      error: state.error,
    };
  }

  function setStatus(status, error = '') {
    state = { status, error };
    emit();
  }

  // Scarica, unisce, ricarica: una sola direzione per volta
  async function sync({ silent = true } = {}) {
    if (running || !cloud.linked() || !navigator.onLine) return false;
    running = true;
    setStatus('syncing');
    try {
      const remote = await cloud.download();
      if (remote?.days) {
        merging = true;
        store.merge(remote.days);
        merging = false;
      }
      await cloud.upload(JSON.parse(store.exportJSON()));
      setStatus('done');
      if (!silent) toast?.('Backup aggiornato');
      return true;
    } catch (err) {
      merging = false;
      const gone = err?.message === 'refresh' || err?.message === 'unlinked';
      setStatus('error', gone ? 'Collegamento scaduto: ricollega Dropbox.' : 'Backup non riuscito: riprovo più tardi.');
      if (!silent) toast?.(gone ? 'Ricollega Dropbox per riprendere i backup' : 'Backup non riuscito');
      return false;
    } finally {
      running = false;
    }
  }

  function schedule() {
    if (!cloud.linked()) return;
    clearTimeout(timer);
    setStatus('pending');
    timer = setTimeout(() => sync(), DEBOUNCE);
  }

  function flush() {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    sync();
  }

  // Ogni modifica fa partire un salvataggio, senza rincorrere ogni tasto
  store.subscribe(() => { if (!merging) schedule(); });
  window.addEventListener('online', () => sync());
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); else sync(); });

  if (cloud.linked()) sync();

  return {
    get state() { return snapshot(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    sync,
    authorizeUrl: () => cloud.authorizeUrl(),
    async link(code) {
      setStatus('syncing');
      try {
        await cloud.redeem(code);
      } catch {
        setStatus('error', 'Codice non valido: riprova a copiarlo per intero.');
        return false;
      }
      const ok = await sync({ silent: false });
      if (ok) toast?.('Dropbox collegato');
      return ok;
    },
    unlink() {
      clearTimeout(timer);
      cloud.unlink();
      setStatus('idle');
      toast?.('Dropbox scollegato');
    },
  };
}
