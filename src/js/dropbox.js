import { DROPBOX_APP_KEY, BACKUP_FILE } from './config.js';

// Dropbox con PKCE, senza server e senza segreti nel codice.
// Il collegamento passa dal codice da incollare: in una web app iOS
// il redirect tornerebbe in Safari, fuori dal contenitore dell'app.
const KEY = 'tepore:dropbox';
const PKCE = 'tepore:pkce';
const AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const UPLOAD_URL = 'https://content.dropboxapi.com/2/files/upload';
const DOWNLOAD_URL = 'https://content.dropboxapi.com/2/files/download';

let session = load();

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

function save(next) {
  session = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage non disponibile */
  }
}

export const configured = () => Boolean(DROPBOX_APP_KEY);
export const linked = () => Boolean(session?.refresh);
export const account = () => session?.account || '';
export const lastSync = () => session?.lastSync || 0;

export function noteSync(time = Date.now()) {
  if (session) save({ ...session, lastSync: time });
}

export function unlink() {
  save(null);
}

// PKCE
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function randomVerifier() {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

const challengeOf = async (verifier) =>
  b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));

// Passo 1: l'utente apre questo indirizzo e autorizza
export async function authorizeUrl() {
  const verifier = randomVerifier();
  localStorage.setItem(PKCE, verifier);
  const params = new URLSearchParams({
    client_id: DROPBOX_APP_KEY,
    response_type: 'code',
    token_access_type: 'offline',
    code_challenge: await challengeOf(verifier),
    code_challenge_method: 'S256',
  });
  return `${AUTH_URL}?${params}`;
}

// Passo 2: il codice mostrato da Dropbox diventa un refresh token
export async function redeem(code) {
  const verifier = localStorage.getItem(PKCE);
  if (!verifier) throw new Error('pkce');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code.trim(),
      grant_type: 'authorization_code',
      client_id: DROPBOX_APP_KEY,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error('code');
  const data = await res.json();
  localStorage.removeItem(PKCE);
  save({
    refresh: data.refresh_token,
    access: data.access_token,
    expires: Date.now() + (data.expires_in || 14400) * 1000,
    account: data.account_id || '',
    lastSync: 0,
  });
}

// Token valido, rinnovato quando serve
async function token() {
  if (!session?.refresh) throw new Error('unlinked');
  if (session.access && session.expires > Date.now() + 60_000) return session.access;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refresh,
      client_id: DROPBOX_APP_KEY,
    }),
  });
  if (!res.ok) {
    if (res.status === 400 || res.status === 401) save(null);
    throw new Error('refresh');
  }
  const data = await res.json();
  save({ ...session, access: data.access_token, expires: Date.now() + (data.expires_in || 14400) * 1000 });
  return session.access;
}

// Scarica il backup: null se il file non esiste ancora
export async function download() {
  const res = await fetch(DOWNLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await token()}`,
      'Dropbox-API-Arg': JSON.stringify({ path: BACKUP_FILE }),
    },
  });
  if (res.status === 409) return null;
  if (!res.ok) throw new Error('download');
  return res.json();
}

export async function upload(payload) {
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await token()}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({ path: BACKUP_FILE, mode: 'overwrite', mute: true }),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('upload');
  noteSync();
}
