// Le 8 emozioni primarie (Plutchik): colore via CSS, forma via SVG.
// x/y = posizione nel "ritratto del giorno" (percentuali).
export const EMOTIONS = [
  { id: 'gioia', name: 'Gioia', the: 'la gioia', of: 'della gioia', x: 50, y: 15,
    path: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18z' },
  { id: 'fiducia', name: 'Fiducia', the: 'la fiducia', of: 'della fiducia', x: 79, y: 31,
    path: 'M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z' },
  { id: 'paura', name: 'Paura', the: 'la paura', of: 'della paura', x: 85, y: 64,
    path: 'M12 2.2 21.8 12 12 21.8 2.2 12z' },
  { id: 'sorpresa', name: 'Sorpresa', the: 'la sorpresa', of: 'della sorpresa', x: 65, y: 86,
    path: 'M12 1.8c.95 5.6 4.6 9.25 10.2 10.2-5.6.95-9.25 4.6-10.2 10.2-.95-5.6-4.6-9.25-10.2-10.2 5.6-.95 9.25-4.6 10.2-10.2z' },
  { id: 'tristezza', name: 'Tristezza', the: 'la tristezza', of: 'della tristezza', x: 35, y: 86,
    path: 'M12 2.4c4 4.7 7.2 8.6 7.2 12.3a7.2 7.2 0 0 1-14.4 0c0-3.7 3.2-7.6 7.2-12.3z' },
  { id: 'disgusto', name: 'Disgusto', the: 'il disgusto', of: 'del disgusto', x: 15, y: 64,
    path: 'M12 2.3 20.4 7.15v9.7L12 21.7 3.6 16.85v-9.7z' },
  { id: 'rabbia', name: 'Rabbia', the: 'la rabbia', of: 'della rabbia', x: 21, y: 31,
    path: 'M12 3.2 21.6 20H2.4z' },
  { id: 'attesa', name: 'Attesa', the: "l'attesa", of: "dell'attesa", x: 50, y: 53,
    path: 'M2.4 17a9.6 9.6 0 0 1 19.2 0z' },
];

export const APATHY = {
  id: 'apatia', name: 'Apatia', the: "l'apatia", of: "dell'apatia",
  path: 'M12 4.6a7.4 7.4 0 1 1 0 14.8a7.4 7.4 0 1 1 0-14.8z',
};

export const MAX_LEVEL = 5;
export const LEVELS = ['Per niente', 'Appena', "Un po'", 'Abbastanza', 'Molto', 'Moltissimo'];

const byId = new Map([...EMOTIONS, APATHY].map((e) => [e.id, e]));
export const emotion = (id) => byId.get(id);

export function shapeSVG(id, extra = '') {
  const e = byId.get(id);
  return `<svg class="shape shape--${id} ${extra}" data-emo="${id}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${e.path}"/></svg>`;
}

// Emozioni con l'intensità più alta (vuoto se tutto a zero)
export function topEmotions(day) {
  if (!day || !day.values) return [];
  const max = Math.max(0, ...EMOTIONS.map((e) => day.values[e.id] || 0));
  if (max === 0) return [];
  return EMOTIONS.filter((e) => (day.values[e.id] || 0) === max);
}

// Icona del calendario: apatia, emozione prevalente o nulla
export function dominantOf(day) {
  if (!day) return null;
  if (day.apatia) return APATHY;
  return topEmotions(day)[0] || null;
}
