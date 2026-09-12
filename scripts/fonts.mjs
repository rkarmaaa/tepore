// Scarica Fraunces e Figtree in src/fonts/: niente richieste a Google a runtime.
// Gira da solo prima di dev e build; se i file ci sono gia non fa nulla.
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../src/fonts/', import.meta.url));

// Un browser recente: Google serve woff2 variabili solo a chi li sa leggere
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';

const FAMILIES = [
  {
    name: 'fraunces',
    query: 'Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..700,0..100,0..1;1,9..144,300..700,0..100,0..1',
  },
  {
    name: 'figtree',
    query: 'Figtree:ital,wght@0,300..900',
  },
];

const SUBSETS = ['latin', 'latin-ext'];

// Ogni @font-face di Google e preceduto dal commento con il nome del sottoinsieme
function parse(css) {
  const out = [];
  const blocks = css.split('/*').slice(1);
  for (const block of blocks) {
    const subset = block.slice(0, block.indexOf('*/')).trim();
    if (!SUBSETS.includes(subset)) continue;
    const url = block.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
    const italic = /font-style:\s*italic/.test(block);
    if (url) out.push({ subset, url, style: italic ? 'italic' : 'normal' });
  }
  return out;
}

async function grab(family) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.query}&display=swap`, {
    headers: { 'User-Agent': UA },
  });
  if (!css.ok) throw new Error(`css ${css.status}`);
  const faces = parse(await css.text());
  if (!faces.length) throw new Error('nessun woff2 trovato');

  for (const face of faces) {
    const file = `${DIR}${family.name}-${face.style}-${face.subset}.woff2`;
    const res = await fetch(face.url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${face.url} ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`  ${family.name}-${face.style}-${face.subset}.woff2`);
  }
}

const WANTED = [
  'fraunces-normal-latin.woff2',
  'fraunces-italic-latin.woff2',
  'figtree-normal-latin.woff2',
];

mkdirSync(DIR, { recursive: true });

if (WANTED.every((f) => existsSync(DIR + f))) {
  console.log('Font gia presenti in src/fonts/');
} else {
  try {
    console.log('Scarico i font in src/fonts/');
    for (const family of FAMILIES) await grab(family);
    console.log('Fatto: ricordati di aggiungerli a git.');
  } catch (err) {
    // Senza rete l'app parte lo stesso, con i caratteri di sistema
    console.warn(`Font non scaricati (${err.message}): l'app usera i fallback di sistema.`);
  }
}
