// Versione app (1.<numero di commit>) e cache del service worker, a ogni build
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const src = (p) => new URL(`../src/${p}`, import.meta.url);

let commits = '0';
try { commits = execSync('git rev-list --count HEAD').toString().trim(); } catch {}
const version = `1.${commits}`;
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 12);

writeFileSync(src('js/version.js'), `// Generato da scripts/stamp.mjs: non modificare a mano\nexport const VERSION = '${version}';\n`);

const sw = src('sw.js');
writeFileSync(sw, readFileSync(sw, 'utf8').replace(/const VERSION = 'tepore-[^']*'/, `const VERSION = 'tepore-${version}-${stamp}'`));

console.log(`Tepore v${version}`);
