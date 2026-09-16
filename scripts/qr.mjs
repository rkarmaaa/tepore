// Trova l'IP di rete locale e stampa il QR di un URL: si apre al volo su iPhone.
import os from 'node:os';
import qrcode from 'qrcode-terminal';

export function lanIP() {
  const nets = Object.values(os.networkInterfaces()).flat();
  return nets.find((n) => n.family === 'IPv4' && !n.internal)?.address || null;
}

export function printQR(url) {
  console.log(`\n📱  Apri su iPhone (stessa rete Wi-Fi): ${url}\n`);
  qrcode.generate(url, { small: true });
}
