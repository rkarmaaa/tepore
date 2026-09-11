const pad = (n) => String(n).padStart(2, '0');
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Chiave locale YYYY-MM-DD (mai toISOString: sarebbe in UTC)
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => keyOf(new Date());
export const dateOf = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const daysBetween = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 864e5);

const fmtLong = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtLongYear = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtDayMonth = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });
const fmtMonth = new Intl.DateTimeFormat('it-IT', { month: 'long' });
const fmtTime = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });

export const longDate = (key) => {
  const d = dateOf(key);
  const fmt = d.getFullYear() === new Date().getFullYear() ? fmtLong : fmtLongYear;
  return cap(fmt.format(d));
};
export const dayMonth = (key) => fmtDayMonth.format(dateOf(key));
export const monthName = (y, m) => cap(fmtMonth.format(new Date(y, m, 1)));
export const timeNow = () => fmtTime.format(new Date());
