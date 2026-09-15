const KEY = 'tepore:haptics';

// Intensità disponibili: dal tocco appena percepibile alla doppia conferma
const PATTERNS = {
  tick: 7,
  soft: 12,
  firm: 20,
  double: [12, 60, 12],
  warn: [24, 70, 24],
};

// Preferenza dell'utente: attiva finche non viene spenta
let enabled = true;
try {
  enabled = localStorage.getItem(KEY) !== 'off';
} catch {
  /* storage non disponibile: resta attiva */
}

export const hapticsEnabled = () => enabled;

export function setHaptics(on) {
  enabled = Boolean(on);
  try {
    localStorage.setItem(KEY, enabled ? 'on' : 'off');
  } catch {
    /* niente da salvare */
  }
}

// Su iOS non esiste navigator.vibrate: l'unico tocco disponibile arriva
// dallo switch nativo di WebKit, che però deve essere davvero renderizzato.
const hasVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

// Niente rilevamento del supporto: WebKit non riflette sempre l'attributo
// `switch` in IDL, e un controllo sbagliato spegnerebbe tutta l'aptica.
export const hapticsSupported = () => true;

let rig = null;
function switchRig() {
  if (rig || !document.body) return rig;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'haptic-rig';
  input.setAttribute('switch', '');
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;
  document.body.append(input);
  rig = input;
  return rig;
}

// Niente raffiche: due tocchi troppo vicini si sentono come uno sporco
let last = 0;

export function haptic(kind = 'tick') {
  if (!enabled) return;
  const now = performance.now();
  if (now - last < 18) return;
  last = now;

  const pattern = PATTERNS[kind] || PATTERNS.tick;
  try {
    if (hasVibrate) {
      navigator.vibrate(pattern);
      return;
    }
    const el = switchRig();
    if (!el) return;
    el.click();
    // I pattern a due colpi si ripetono a mano: lo switch ha una sola voce
    if (Array.isArray(pattern)) setTimeout(() => el.click(), pattern[1] || 60);
  } catch {
    /* nessuna aptica disponibile */
  }
}
