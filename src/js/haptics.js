// Aptica leggera: vibrate dove esiste, altrimenti il trucco dello
// switch nativo che su iOS 18+ produce un "tap" tattile.
export function haptic() {
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
