// Chiave dell'app Dropbox usata per il backup automatico.
// Si crea in due minuti su https://www.dropbox.com/developers/apps:
//   1. Create app → Scoped access → App folder → nome "Tepore"
//   2. Permissions → spunta files.content.write e files.content.read → Submit
//   3. Settings → copia "App key" e incollala qui sotto
// Senza chiave l'app funziona lo stesso, il backup resta semplicemente spento.
export const DROPBOX_APP_KEY = "d4ae2xc3ftkk6yp";

// Nome del file dentro la cartella dell'app (Dropbox/App/Tepore)
export const BACKUP_FILE = "/tepore.json";
