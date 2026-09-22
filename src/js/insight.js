import { EMOTIONS, APATHY, MAX_LEVEL, emotion, dominantOf } from './emotions.js';
import { keyOf, dateOf, cap } from './dates.js';

// Resoconto del periodo: legge le giornate e ne ricava un clima,
// un andamento e i pattern che a occhio sfuggono. Nessun server, tutto qui.

const NEG = ['tristezza', 'paura', 'rabbia', 'disgusto', 'disprezzo'];
const WEEKDAY = ['la domenica', 'il lunedì', 'il martedì', 'il mercoledì', 'il giovedì', 'il venerdì', 'il sabato'];
const fmtShort = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });
const fmtDay = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });

// "insieme a" + articolo: alla, al, all'
const toThe = (e) => e.the.replace(/^la /, 'alla ').replace(/^il /, 'al ').replace(/^l'/, 'all\'');
const mean = (a) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : 0);
const std = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map((n) => (n - m) ** 2)));
};
const val = (day, id) => day?.values?.[id] || 0;
const giornate = (n) => `${n} ${n === 1 ? 'giornata' : 'giornate'}`;

// Tono di una giornata, da -1 (pesante) a 1 (leggera)
export function toneOf(day) {
  if (!day || day.apatia) return 0;
  const neg = Math.max(0, ...NEG.map((id) => val(day, id)));
  return (val(day, 'gioia') - neg) / MAX_LEVEL;
}

const loadOf = (day) => EMOTIONS.reduce((s, e) => s + val(day, e.id), 0);

// Le giornate della finestra, dalla più lontana alla più recente
function collect(store, end, span, back = 0) {
  const last = dateOf(end);
  const out = [];
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(last);
    d.setDate(last.getDate() - i - back);
    const key = keyOf(d);
    const day = store.get(key);
    const felt = Boolean(day) && !day.apatia && loadOf(day) > 0;
    out.push({ key, date: d, wd: d.getDay(), day, logged: Boolean(day), felt, tone: felt ? toneOf(day) : null });
  }
  return out;
}

// Andamento per il grafico: un giorno per barra, a settimane oltre il mese
function series(days) {
  const size = days.length > 31 ? 7 : 1;
  const buckets = [];
  for (let end = days.length; end > 0; end -= size) {
    const slice = days.slice(Math.max(0, end - size), end);
    const felt = slice.filter((d) => d.felt);
    const counts = new Map();
    felt.forEach((d) => {
      const dom = dominantOf(d.day);
      if (dom) counts.set(dom.id, (counts.get(dom.id) || 0) + 1);
    });
    const lead = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const first = slice[0];
    const label = size === 1
      ? cap(fmtDay.format(first.date))
      : `Settimana ${[8, 11].includes(first.date.getDate()) ? 'dall\'' : 'dal '}${fmtShort.format(first.date)}`;
    buckets.unshift({
      tone: felt.length ? mean(felt.map((d) => d.tone)) : null,
      logged: slice.filter((d) => d.logged).length,
      lead,
      label,
      size,
    });
  }
  return buckets;
}

// --- Pattern: ognuno propone una frase e un punteggio di forza ---

function weekdayPattern(felt, span) {
  if (span < 14 || felt.length < 8) return null;
  let best = null;
  EMOTIONS.forEach((e) => {
    const all = mean(felt.map((d) => val(d.day, e.id)));
    for (let w = 0; w < 7; w++) {
      const on = felt.filter((d) => d.wd === w);
      if (on.length < 2) continue;
      const diff = mean(on.map((d) => val(d.day, e.id))) - all;
      if (diff >= 1 && (!best || diff > best.diff)) best = { e, w, diff, n: on.length };
    }
  });
  if (!best) return null;
  const { e, w } = best;
  const pos = e.id === 'gioia';
  return {
    kind: 'week', tag: 'Ritmo della settimana', emo: e.id,
    score: .5 + Math.min(best.diff, 3) * .12,
    w,
    text: `${cap(WEEKDAY[w])} ${e.the} sale più che negli altri giorni.`,
    hint: pos
      ? `Cosa rende speciale ${WEEKDAY[w]}? Portarne un pezzetto negli altri giorni può aiutare.`
      : `Potresti tenere ${WEEKDAY[w]} un po' più leggero, o chiuderlo con qualcosa che ti fa stare bene.`,
  };
}

function weekendPattern(felt, span) {
  if (span < 14) return null;
  const end = felt.filter((d) => d.wd === 0 || d.wd === 6);
  const work = felt.filter((d) => d.wd > 0 && d.wd < 6);
  if (end.length < 2 || work.length < 3) return null;
  const diff = mean(end.map((d) => d.tone)) - mean(work.map((d) => d.tone));
  if (Math.abs(diff) < .25) return null;
  const up = diff > 0;
  return {
    kind: 'weekend', tag: 'Fine settimana', emo: up ? 'gioia' : 'tristezza',
    score: .45 + Math.min(Math.abs(diff), 1) * .35,
    text: up
      ? 'Nel fine settimana le tue giornate sono più leggere che nei giorni feriali.'
      : 'Nel fine settimana le tue giornate sono più pesanti che nei giorni feriali.',
    hint: up
      ? 'Cosa c\'è nel fine settimana che manca negli altri giorni? Vale la pena chiederselo.'
      : 'Il tempo libero pesa di più del previsto: forse manca qualcosa, o qualcuno.',
  };
}

function pairPattern(felt) {
  if (felt.length < 5) return null;
  const on = (d, id) => val(d.day, id) >= 2;
  let best = null;
  EMOTIONS.forEach((a) => EMOTIONS.forEach((b) => {
    if (a === b) return;
    const withA = felt.filter((d) => on(d, a.id));
    if (withA.length < 3) return;
    const both = withA.filter((d) => on(d, b.id)).length;
    const p = both / withA.length;
    const base = felt.filter((d) => on(d, b.id)).length / felt.length;
    const lift = base ? p / base : 0;
    if (p < .6 || lift < 1.25) return;
    const score = .45 + p * .25 + Math.min(lift - 1, 2) * .08;
    if (!best || score > best.score) best = { a, b, both, n: withA.length, score };
  }));
  if (!best) return null;
  const { a, b } = best;
  return {
    kind: 'pair', tag: 'Emozioni in coppia', emo: a.id, emo2: b.id, score: best.score,
    text: `Quando senti ${a.the}, spesso arriva anche ${b.the}: è successo in ${best.both} ${best.both === 1 ? 'giornata' : 'giornate'} su ${best.n}.`,
    hint: `La prossima volta che senti ${a.the}, nota se arriva anche ${b.the}: conoscere il legame aiuta ad anticiparlo.`,
  };
}

function streakPattern(days) {
  let best = null;
  let run = null;
  days.forEach((d, i) => {
    const dom = d.felt ? dominantOf(d.day) : null;
    if (dom && run && run.id === dom.id) run.len++;
    else run = dom ? { id: dom.id, len: 1, from: i } : null;
    if (run && run.len >= 3 && (!best || run.len > best.len)) best = { ...run, to: i };
  });
  if (!best) return null;
  const e = emotion(best.id);
  const a = days[best.from].date;
  const b = days[best.to].date;
  // Stesso mese: "dal 3 al 6 settembre"
  const from = a.getMonth() === b.getMonth() ? String(a.getDate()) : fmtShort.format(a);
  const to = fmtShort.format(b);
  const dal = [8, 11].includes(a.getDate()) ? 'Dall\'' : 'Dal ';
  const al = [8, 11].includes(b.getDate()) ? 'all\'' : 'al ';
  return {
    kind: 'streak', tag: 'Di fila', emo: e.id,
    score: .4 + Math.min(best.len, 8) * .06,
    text: `${dal}${from} ${al}${to} ha prevalso ${e.the}, per ${best.len} giorni di fila.`,
    hint: NEG.includes(e.id)
      ? 'Quando un\'emozione pesante dura più giorni, è un buon momento per rallentare e chiederti di cosa hai bisogno.'
      : 'Ripensa a cosa è successo in quei giorni: sono indizi utili su ciò che ti fa bene.',
  };
}

function recentPattern(days) {
  const felt = days.filter((d) => d.felt);
  if (felt.length < 8) return null;
  const tail = felt.slice(-4);
  const rest = felt.slice(0, -4);
  const diff = mean(tail.map((d) => d.tone)) - mean(rest.map((d) => d.tone));
  if (Math.abs(diff) < .3) return null;
  const up = diff > 0;
  return {
    kind: 'recent', tag: 'Ultimi giorni', emo: up ? 'gioia' : 'tristezza',
    score: .45 + Math.min(Math.abs(diff), 1) * .35,
    text: up
      ? 'Le ultime giornate sono state più leggere del resto del periodo.'
      : 'Le ultime giornate sono state più pesanti del resto del periodo.',
    hint: up
      ? 'Qualcosa è cambiato in meglio: prova a capire cosa, per tenerlo con te.'
      : 'Qualcosa negli ultimi giorni pesa di più: una nota può aiutarti a mettere ordine.',
  };
}

function shiftPattern(felt, prevFelt) {
  if (prevFelt.length < 3 || felt.length < 3) return null;
  const count = (list, id) => list.filter((d) => val(d.day, id) > 0).length;
  let best = null;
  EMOTIONS.forEach((e) => {
    const now = count(felt, e.id);
    const before = count(prevFelt, e.id);
    if (now >= 3 && before === 0) {
      const s = .5 + Math.min(now, 8) * .04;
      if (!best || s > best.score) best = { e, s, now, before, fresh: true, score: s };
    }
    if (before >= 3 && now === 0) {
      const s = .45 + Math.min(before, 8) * .04;
      if (!best || s > best.score) best = { e, s, now, before, fresh: false, score: s };
    }
  });
  if (!best) return null;
  const { e } = best;
  return {
    kind: 'shift', tag: best.fresh ? 'Novità' : 'Non c\'è più', emo: e.id, score: best.score,
    text: best.fresh
      ? `${cap(e.the)} è una novità: nel periodo prima non c'era, ora compare in ${giornate(best.now)}.`
      : `${cap(e.the)} non c'è più: nel periodo prima compariva in ${giornate(best.before)}.`,
    hint: best.fresh
      ? `Cosa è cambiato in questo periodo? A volte basta notarlo per capire da dove arriva ${e.the}.`
      : `Qualcosa che portava ${e.the} si è allontanato: vale la pena accorgersene.`,
  };
}

function backgroundPattern(felt, topId) {
  if (felt.length < 6) return null;
  let best = null;
  EMOTIONS.forEach((e) => {
    if (e.id === topId) return;
    const present = felt.filter((d) => val(d.day, e.id) > 0).length;
    const leads = felt.filter((d) => dominantOf(d.day)?.id === e.id).length;
    const share = present / felt.length;
    if (share >= .5 && leads <= 1 && (!best || share > best.share)) best = { e, share, present };
  });
  if (!best) return null;
  return {
    kind: 'background', tag: 'Sottofondo', emo: best.e.id,
    score: .4 + best.share * .3,
    text: `${cap(best.e.the)} c'è in ${giornate(best.present)} su ${felt.length}, ma quasi mai in primo piano: un sottofondo costante.`,
    hint: `Le emozioni di sottofondo si notano poco ma pesano: prova a chiederti da dove arriva ${best.e.the}.`,
  };
}

function mixedPattern(felt) {
  const mixed = felt.filter((d) => val(d.day, 'gioia') >= 3 && NEG.some((id) => val(d.day, id) >= 3));
  if (mixed.length < 2 || mixed.length / felt.length < .2) return null;
  const counts = NEG.map((id) => [id, mixed.filter((d) => val(d.day, id) >= 3).length]).sort((a, b) => b[1] - a[1]);
  const other = emotion(counts[0][0]);
  return {
    kind: 'mixed', tag: 'Giornate miste', emo: 'gioia', emo2: other.id,
    score: .4 + (mixed.length / felt.length) * .4,
    text: `In ${giornate(mixed.length)} la gioia è stata forte insieme ${toThe(other)}: emozioni lontane possono convivere.`,
    hint: 'Le giornate miste sono normali: non serve scegliere quale emozione è quella "vera".',
  };
}

function notesPattern(felt) {
  const withNote = felt.filter((d) => d.day.note?.trim());
  const without = felt.filter((d) => !d.day.note?.trim());
  if (withNote.length < 3 || without.length < 3) return null;
  const dTone = mean(withNote.map((d) => d.tone)) - mean(without.map((d) => d.tone));
  const dLoad = mean(withNote.map((d) => loadOf(d.day))) - mean(without.map((d) => loadOf(d.day)));
  if (dTone <= -.25) {
    return {
      kind: 'notes', tag: 'Le tue note', emo: 'tristezza', score: .5 + Math.min(-dTone, 1) * .3,
      text: 'Scrivi soprattutto nelle giornate più difficili del periodo: la nota sembra il tuo modo di fare ordine.',
      hint: 'Prova a scrivere due righe anche nei giorni buoni: rileggerle nei momenti no fa bene.',
    };
  }
  if (dTone >= .25) {
    return {
      kind: 'notes', tag: 'Le tue note', emo: 'gioia', score: .45 + Math.min(dTone, 1) * .3,
      text: 'Scrivi soprattutto nelle giornate migliori del periodo: fissare i momenti buoni aiuta a ritrovarli.',
      hint: 'Anche due righe in un giorno difficile possono aiutarti a vederlo più chiaro.',
    };
  }
  if (dLoad >= 2.5) {
    return {
      kind: 'notes', tag: 'Le tue note', emo: 'sorpresa', score: .45,
      text: 'Le note arrivano nelle giornate più intense, quando c\'è più da dire.',
      hint: '',
    };
  }
  return null;
}

// --- Lettura completa della finestra ---
export function analyze(store, end, span) {
  const days = collect(store, end, span);
  const prev = collect(store, end, span, span);
  const logged = days.filter((d) => d.logged);
  const felt = days.filter((d) => d.felt);
  const prevFelt = prev.filter((d) => d.felt);
  const apathy = logged.length - felt.length;
  const chart = series(days);

  if (felt.length < 3) {
    return {
      mood: 'few', chart, patterns: [], hint: '', care: '',
      headline: logged.length ? 'Ancora poche emozioni per una lettura.' : 'Ancora nessuna giornata da leggere.',
      summary: 'Con almeno tre giornate segnate, qui trovi il clima del periodo e i pattern che a occhio sfuggono.',
    };
  }

  const tones = felt.map((d) => d.tone);
  const balance = mean(tones);
  const swing = std(tones);
  const half = Math.floor(felt.length / 2);
  const drift = felt.length >= 4 ? mean(tones.slice(half)) - mean(tones.slice(0, half)) : 0;
  const dir = drift >= .2 ? 'up' : drift <= -.2 ? 'down' : 'flat';

  let mood = balance > .2 ? 'light' : balance < -.2 ? 'heavy' : 'mixed';
  if (apathy / logged.length >= .5) mood = 'flat';

  const HEAD = {
    light: { up: 'Un periodo luminoso, e in crescita.', down: 'Un periodo buono, un po\' più pesante sul finale.', flat: 'Un periodo sereno, nel complesso.' },
    mixed: { up: 'Un periodo altalenante, che sta andando meglio.', down: 'Un periodo altalenante, in calo nelle ultime giornate.', flat: 'Un periodo in equilibrio, fra luci e ombre.' },
    heavy: { up: 'Un periodo impegnativo, ma in ripresa.', down: 'Un periodo pesante, che si sta facendo sentire.', flat: 'Un periodo impegnativo.' },
    flat: { up: 'Un periodo quieto, con poche emozioni in primo piano.', down: 'Un periodo quieto, con poche emozioni in primo piano.', flat: 'Un periodo quieto, con poche emozioni in primo piano.' },
  };

  // Chi ha dato il tono
  const leads = new Map();
  felt.forEach((d) => {
    const dom = dominantOf(d.day);
    if (dom && dom.id !== APATHY.id) leads.set(dom.id, (leads.get(dom.id) || 0) + 1);
  });
  const [topId, topN] = [...leads].sort((a, b) => b[1] - a[1])[0] || [null, 0];
  const top = topId ? emotion(topId) : null;

  const lines = [];
  if (top) lines.push(`A dare il tono è stata ${top.the}, in primo piano in ${topN} ${topN === 1 ? 'giornata' : 'giornate'} su ${felt.length}.`);
  if (swing >= .45) lines.push('Le giornate sono state molto diverse fra loro, con alti e bassi anche a pochi giorni di distanza.');
  else if (swing <= .18) lines.push('Le giornate si somigliano: poche oscillazioni, un clima stabile.');
  if (prevFelt.length >= 3) {
    const vs = balance - mean(prevFelt.map((d) => d.tone));
    if (vs >= .15) lines.push('Rispetto al periodo prima, il clima è più leggero.');
    else if (vs <= -.15) lines.push('Rispetto al periodo prima, il clima è più pesante.');
    else lines.push('Rispetto al periodo prima, il clima è simile.');
  }
  if (apathy >= 2) lines.push(`${cap(giornate(apathy))} senza emozioni in primo piano: calma o stanchezza, puoi saperlo solo tu.`);

  // I pattern più forti, uno per tipo
  const week = weekdayPattern(felt, span);
  const patterns = [
    week,
    // Se il giorno forte è già sabato o domenica, il fine settimana si ripeterebbe
    week && (week.w === 0 || week.w === 6) ? null : weekendPattern(felt, span),
    pairPattern(felt),
    streakPattern(days),
    recentPattern(days),
    shiftPattern(felt, prevFelt),
    backgroundPattern(felt, topId),
    mixedPattern(felt),
    notesPattern(felt),
  ].filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 4);

  // Peso che dura: un invito gentile, mai una diagnosi
  const negLead = [...leads].filter(([id]) => NEG.includes(id)).reduce((s, [, n]) => s + n, 0);
  const care = span >= 14 && felt.length >= 7 && mood === 'heavy' && negLead / felt.length >= .6
    ? 'Se questo peso dura da un po\', parlarne con una persona di fiducia, o con un professionista, può fare la differenza.'
    : '';

  return {
    mood,
    headline: HEAD[mood][dir],
    summary: lines.join(' '),
    patterns,
    hint: patterns.find((p) => p.hint)?.hint || '',
    care,
    chart,
    balance,
  };
}
