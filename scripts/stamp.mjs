// Aggiorna la versione del service worker a ogni build
import { readFileSync, writeFileSync } from 'node:fs';
const f = new URL('../src/sw.js', import.meta.url);
const v = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
writeFileSync(f, readFileSync(f, 'utf8').replace(/const VERSION = 'tepore-[^']*'/, `const VERSION = 'tepore-${v}'`));
console.log(`sw → tepore-${v}`);
