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

// Android e desktop hanno navigator.vibrate. iOS no, e da iOS 26 nessun
// click da codice produce più un tocco: resta solo lo switch nativo toccato dal dito.
const hasVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const hapticsSupported = () => true;

// Niente raffiche: due tocchi troppo vicini si sentono come uno sporco
let last = 0;

export function haptic(kind = 'tick') {
  if (!enabled || !hasVibrate) return;
  const now = performance.now();
  if (now - last < 18) return;
  last = now;
  try {
    navigator.vibrate(PATTERNS[kind] || PATTERNS.tick);
  } catch {
    /* nessuna aptica disponibile */
  }
}

// --- La via di iOS: uno switch nativo invisibile sopra il comando ---
// Il tocco arriva a lui e WebKit suona; il click prosegue comunque
// verso il pulsante, quindi niente si rompe.
export function hapticTap(el) {
  if (!el || el.querySelector(':scope > .haptic-tap')) return;
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'haptic-tap';
  input.setAttribute('switch', '');
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;
  el.append(input);
}

// Arma tutti i pulsanti di un sottoalbero. Si esclude con data-haptic="off"
export function armHaptics(root = document) {
  if (!enabled || hasVibrate) return;
  const scope = root.nodeType === 1 || root.nodeType === 9 ? root : document;
  scope.querySelectorAll?.('button:not([data-haptic="off"])').forEach(hapticTap);
  if (scope.matches?.('button:not([data-haptic="off"])')) hapticTap(scope);
}
