const KEY = 'tepore:haptics';

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

// Aptica leggera: vibrate dove esiste, altrimenti il trucco dello
// switch nativo che su iOS 18+ produce un "tap" tattile.
export function haptic() {
  if (!enabled) return;
  try {
    if (navigator.vibrate) {
      navigator.vibrate(8);
      return;
    }
    const label = document.createElement('label');
    label.ariaHidden = 'true';
    label.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.appendChild(input);
    document.head.appendChild(label);
    label.click();
    label.remove();
  } catch {
    /* nessuna aptica disponibile */
  }
}
