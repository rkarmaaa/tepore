const KEY = 'tepore:theme';
const BAR = { light: '#F5ECE0', dark: '#1F1713' };
const media = matchMedia('(prefers-color-scheme: dark)');

export const THEMES = [
  { id: 'auto', label: 'Come sul dispositivo' },
  { id: 'light', label: 'Tema chiaro' },
  { id: 'dark', label: 'Tema scuro' },
];

export function getTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

const resolve = (t) => (t === 'auto' ? (media.matches ? 'dark' : 'light') : t);

// data-theme sulla radice: lo leggono i mixin dark e dark-root
export function applyTheme(theme = getTheme()) {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = BAR[resolve(theme)];
}

export function setTheme(theme) {
  try {
    if (theme === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    /* niente da salvare */
  }
  applyTheme(theme);
}

// Seguendo il dispositivo, la barra di stato cambia insieme al sistema
media.addEventListener('change', () => {
  if (getTheme() === 'auto') applyTheme('auto');
});
