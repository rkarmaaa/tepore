// Le 8 emozioni primarie (Plutchik): colore via CSS, forma via SVG.
// x/y = posizione nel "ritratto del giorno" (percentuali).
// pair = emozione opposta, desc = spiegazione mostrata nella scheda.
export const EMOTIONS = [
  {
    id: 'gioia', name: 'Gioia', the: 'la gioia', of: 'della gioia', x: 50, y: 15,
    pair: 'Opposta alla tristezza',
    path: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18z',
    desc: 'La gioia è l\'emozione che allarga: il respiro si apre, il corpo si alleggerisce, il tempo sembra bastare. Nasce quando qualcosa che desideravi arriva davvero, anche in dose piccolissima — una notizia, una persona, una luce giusta. Non ha bisogno di grandi occasioni: segnarla alta significa che oggi, da qualche parte, c\'era spazio per te.',
  },
  {
    id: 'fiducia', name: 'Fiducia', the: 'la fiducia', of: 'della fiducia', x: 79, y: 31,
    pair: 'Opposta al disgusto',
    path: 'M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z',
    desc: 'La fiducia è la sensazione di poter appoggiare il peso su qualcosa senza controllarlo di continuo: una persona, un luogo, una decisione presa. Abbassa la guardia e lascia respirare l\'attenzione. Quando è alta, la giornata costa meno fatica; quando cala, tutto richiede una verifica in più.',
  },
  {
    id: 'paura', name: 'Paura', the: 'la paura', of: 'della paura', x: 85, y: 64,
    pair: 'Opposta alla rabbia',
    path: 'M12 2.2 21.8 12 12 21.8 2.2 12z',
    desc: 'La paura è l\'emozione che restringe il campo: il corpo si prepara, l\'attenzione si punta su un solo punto. Parla di qualcosa che potrebbe accadere, non di qualcosa che è già accaduto — per questo vive al futuro. Riconoscerla non la aumenta: le dà un nome, e un nome è già un confine.',
  },
  {
    id: 'sorpresa', name: 'Sorpresa', the: 'la sorpresa', of: 'della sorpresa', x: 65, y: 86,
    pair: 'Opposta all\'attesa',
    path: 'M12 1.8c.95 5.6 4.6 9.25 10.2 10.2-5.6.95-9.25 4.6-10.2 10.2-.95-5.6-4.6-9.25-10.2-10.2 5.6-.95 9.25-4.6 10.2-10.2z',
    desc: 'La sorpresa è la più breve di tutte: dura il tempo di accorgersi che le cose non stanno come pensavi. È neutra per natura — prepara il terreno a un\'altra emozione, che arriva subito dopo. Segnarla alta racconta una giornata che ha cambiato direzione senza chiedere il permesso.',
  },
  {
    id: 'tristezza', name: 'Tristezza', the: 'la tristezza', of: 'della tristezza', x: 35, y: 86,
    pair: 'Opposta alla gioia',
    path: 'M12 2.4c4 4.7 7.2 8.6 7.2 12.3a7.2 7.2 0 0 1-14.4 0c0-3.7 3.2-7.6 7.2-12.3z',
    desc: 'La tristezza rallenta di proposito: chiede tempo per stare accanto a qualcosa che manca o che è finito. Non è un guasto da riparare in fretta, è il modo in cui una perdita viene riconosciuta. Quando la lasci esistere, di solito si muove; quando la spingi via, resta ferma più a lungo.',
  },
  {
    id: 'disgusto', name: 'Disgusto', the: 'il disgusto', of: 'del disgusto', x: 15, y: 64,
    pair: 'Opposto alla fiducia',
    path: 'M12 2.3 20.4 7.15v9.7L12 21.7 3.6 16.85v-9.7z',
    desc: 'Il disgusto allontana: nato per proteggere il corpo da ciò che fa male, protegge anche da situazioni, gesti e parole che senti sbagliati. È l\'emozione dei confini — spesso dice "questo non mi appartiene" molto prima che tu riesca a spiegarne il motivo.',
  },
  {
    id: 'rabbia', name: 'Rabbia', the: 'la rabbia', of: 'della rabbia', x: 21, y: 31,
    pair: 'Opposta alla paura',
    path: 'M12 3.2 21.6 20H2.4z',
    desc: 'La rabbia compare dove c\'è un ostacolo tra te e qualcosa che conta: un limite superato, un\'ingiustizia, un bisogno ignorato. È energia che spinge in avanti, non un difetto di carattere. Sotto, quasi sempre, c\'è qualcosa di più fragile che merita di essere ascoltato.',
  },
  {
    id: 'attesa', name: 'Attesa', the: 'l\'attesa', of: 'dell\'attesa', x: 50, y: 53,
    pair: 'Opposta alla sorpresa',
    path: 'M2.4 17a9.6 9.6 0 0 1 19.2 0z',
    desc: 'L\'attesa è lo sguardo puntato su ciò che deve ancora arrivare: prepara, immagina, organizza. Può prendere il colore della speranza o quello della tensione, a seconda di quanto ti fidi del finale. Quando occupa tutta la giornata, vale la pena chiedersi cosa sta rimandando.',
  },
];

export const APATHY = {
  id: 'apatia', name: 'Apatia', the: 'l\'apatia', of: 'dell\'apatia',
  pair: 'Nessuna emozione in primo piano',
  path: 'M12 4.6a7.4 7.4 0 1 1 0 14.8a7.4 7.4 0 1 1 0-14.8z',
  desc: 'Ci sono giornate senza rilievo: niente che spinga, niente che tiri. L\'apatia non è il vuoto, è il piatto — e registrarla è un dato prezioso quanto gli altri, perché racconta i ritmi che le emozioni forti coprono.',
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
