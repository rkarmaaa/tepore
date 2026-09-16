// Avvia sass in watch e browser-sync, e stampa il QR del link LAN.
// Spawna a mano invece di passare da `concurrently`: su Windows il comando
// combinato perdeva le virgolette intorno ai glob di --files e browser-sync
// falliva subito. Passando gli argomenti come array, la shell non li tocca.
import { spawn } from 'node:child_process';
import { lanIP, printQR } from './qr.mjs';

const PORT = 3000;
const COLORS = { sass: 33, web: 36 };

function run(name, cmd, args) {
  const child = spawn(cmd, args, { shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
  const tag = `\x1b[${COLORS[name]}m[${name}]\x1b[0m`;
  const forward = (stream) => (chunk) => {
    chunk.toString().split('\n').filter(Boolean).forEach((line) => stream.write(`${tag} ${line}\n`));
  };
  child.stdout.on('data', forward(process.stdout));
  child.stderr.on('data', forward(process.stderr));
  return child;
}

const sass = run('sass', 'sass', ['--watch', '--no-source-map', 'src/scss/main.scss', 'src/css/main.css']);
const web = run('web', 'browser-sync', [
  'start', '--server', 'src', '--port', String(PORT),
  '--files', 'src/css/*.css', 'src/js/*.js', 'src/index.html',
  '--no-notify', '--no-open',
]);

const children = [sass, web];
let stopping = false;
function stopAll(code) {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill());
  process.exitCode = code;
}

// Un processo caduto per errore vero si porta dietro l'altro
children.forEach((c) => c.on('exit', (code) => { if (code) stopAll(code); }));
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

// QR una volta sola, quando i server hanno avuto tempo di partire
setTimeout(() => {
  const ip = lanIP();
  if (ip) printQR(`http://${ip}:${PORT}`);
  else console.log('\n⚠️  Nessuna rete Wi-Fi trovata: collega questo computer e riprova.\n');
}, 1500);
