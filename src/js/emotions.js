// Le 7 emozioni di base (Ekman, con il disprezzo): colore via CSS, forma via SVG.
// x/y = posizione nel "ritratto del giorno" (percentuali), in cerchio.
// role = a cosa serve, in una riga; desc = spiegazione mostrata nella scheda.
export const EMOTIONS = [
  {
    id: 'gioia', name: 'Gioia', the: 'la gioia', of: 'della gioia', x: 50, y: 15,
    role: 'Ti dice che stai bene e ti invita a restarci',
    path: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18z',
    desc: 'La gioia arriva quando qualcosa va come speravi: una bella notizia, una persona cara, un momento tranquillo. Il corpo si rilassa e tutto sembra più leggero. Non servono grandi occasioni, conta anche un momento piccolo. Serve a tenerti vicino a ciò che ti fa bene.',
  },
  {
    id: 'tristezza', name: 'Tristezza', the: 'la tristezza', of: 'della tristezza', x: 79, y: 31,
    role: 'Ti aiuta a fermarti dopo una perdita',
    path: 'M12 2.4c4 4.7 7.2 8.6 7.2 12.3a7.2 7.2 0 0 1-14.4 0c0-3.7 3.2-7.6 7.2-12.3z',
    desc: 'La tristezza arriva quando perdi qualcosa o qualcuno, o quando una cosa finisce. Ti fa rallentare e ti porta a pensare. Non è un errore da correggere: è il modo in cui la mente affronta un momento difficile. Se le lasci spazio, di solito passa prima.',
  },
  {
    id: 'paura', name: 'Paura', the: 'la paura', of: 'della paura', x: 85, y: 64,
    role: 'Ti avvisa di un pericolo e ti prepara a reagire',
    path: 'M12 2.2 21.8 12 12 21.8 2.2 12z',
    desc: 'La paura si accende quando senti che qualcosa potrebbe farti male. Il cuore accelera, l\'attenzione si stringe e il corpo si prepara a scappare o ad agire. Spesso riguarda qualcosa che deve ancora succedere. Darle un nome la rende già un po\' più piccola.',
  },
  {
    id: 'rabbia', name: 'Rabbia', the: 'la rabbia', of: 'della rabbia', x: 65, y: 86,
    role: 'Difende i tuoi confini quando qualcosa non è giusto',
    path: 'M12 3.2 21.6 20H2.4z',
    desc: 'La rabbia nasce quando subisci un torto o vedi qualcosa di ingiusto. Porta energia e voglia di reagire. Non è un difetto: ti segnala che un tuo limite è stato superato. Ascoltarla ti aiuta a capire cosa conta per te, prima di decidere cosa farne.',
  },
  {
    id: 'disgusto', name: 'Disgusto', the: 'il disgusto', of: 'del disgusto', x: 35, y: 86,
    role: 'Ti tiene lontano da ciò che ti fa male',
    path: 'M12 2.3 20.4 7.15v9.7L12 21.7 3.6 16.85v-9.7z',
    desc: 'Il disgusto è una reazione di rifiuto. Nasce per proteggerci da cibi e odori che fanno male, ma vale anche per gesti, parole o situazioni che senti sbagliate. È un modo veloce per dire "questo no", anche prima di sapere spiegare il perché.',
  },
  {
    id: 'sorpresa', name: 'Sorpresa', the: 'la sorpresa', of: 'della sorpresa', x: 15, y: 64,
    role: 'Porta subito la tua attenzione su qualcosa di inatteso',
    path: 'M12 1.8c.95 5.6 4.6 9.25 10.2 10.2-5.6.95-9.25 4.6-10.2 10.2-.95-5.6-4.6-9.25-10.2-10.2 5.6-.95 9.25-4.6 10.2-10.2z',
    desc: 'La sorpresa arriva quando succede qualcosa che non ti aspettavi. Dura pochissimo, il tempo di capire cosa sta succedendo. Può essere bella o brutta, e spesso lascia il posto a un\'altra emozione. Segnarla racconta una giornata che ha preso una strada diversa dal previsto.',
  },
  {
    id: 'disprezzo', name: 'Disprezzo', the: 'il disprezzo', of: 'del disprezzo', x: 21, y: 31,
    role: 'Prende le distanze da chi giudichi scorretto',
    path: 'M15.5 3.7A9 9 0 1 0 15.5 20.3A10 10 0 0 1 15.5 3.7z',
    desc: 'Il disprezzo nasce quando senti qualcuno sotto di te o lontano dai tuoi valori, spesso per come si è comportato. Ti fa prendere le distanze. A volte protegge ciò in cui credi, a volte chiude il dialogo. Accorgertene ti aiuta a capire cosa ti ha deluso davvero.',
  },
];

// Emozioni del vecchio set: non si mostrano più, ma i valori salvati restano
export const LEGACY = ['fiducia', 'attesa'];

export const APATHY = {
  id: 'apatia', name: 'Apatia', the: 'l\'apatia', of: 'dell\'apatia',
  role: 'Nessuna emozione in primo piano',
  path: 'M12 4.6a7.4 7.4 0 1 1 0 14.8a7.4 7.4 0 1 1 0-14.8z',
  desc: 'Ci sono giornate in cui non senti niente di particolare: nessuna emozione spicca sulle altre. Va bene così. Segnarle è utile quanto il resto, perché mostra i tuoi momenti di calma o di stanchezza.',
};

export const MAX_LEVEL = 5;
export const LEVELS = ['Per niente', 'Appena', 'Un po\'', 'Abbastanza', 'Molto', 'Moltissimo'];

const byId = new Map([...EMOTIONS, APATHY].map((e) => [e.id, e]));
export const emotion = (id) => byId.get(id);

export function shapeSVG(id, extra = '') {
  const e = byId.get(id);
  return `<svg class="shape ${extra}" data-emo="${id}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${e.path}"/></svg>`;
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
