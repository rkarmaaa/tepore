# Tepore — guida di progetto per Claude

Leggi questo file prima di qualsiasi modifica. Descrive visione, funzioni, design system e convenzioni: ogni aggiornamento deve restare coerente con quanto scritto qui. Rispondi sempre in italiano.

---

## 1. Visione

Tepore è un diario delle emozioni tascabile, pensato per iPhone e installato come web app sulla schermata Home. Ogni giorno si registra quanto si è sentita ciascuna delle 8 emozioni primarie di Plutchik; il calendario si colora giorno dopo giorno con l'emozione prevalente.

Il tono è quello di un oggetto caldo e intimo, non di uno strumento clinico: carta, cacao e brace, tipografia editoriale, movimenti morbidi. L'ispirazione estetica è Claude (calore, accoglienza) unita alla cura dei dettagli Apple (liquid glass, aptica, gesture fluide). L'app non giudica: frasi gentili, nessun punteggio, nessuna gamification.

Principi da non tradire:
- **Calore**: nessun colore freddo puro, nessun grigio neutro (i "grigi" sono sempre sabbia/cacao).
- **Vita**: tutto è animato con misura (ingressi a cascata, molle, respiro), ma rispetta "Riduci movimento".
- **Privacy**: nessun server nostro, nessun tracciamento. I dati restano sul dispositivo; l'unica copia esterna è il backup nel Dropbox dell'utente, solo se lo collega.
- **Nativa**: deve sembrare un'app iOS, non un sito.

## 2. Funzioni

**Oggi** (tab 1)
- Hero con data, titolo grande "Oggi" e sottotitolo. Scorrendo, il titolo passa nella navbar compatta in alto (pattern iOS large title, via `data-sentinel`).
- **Ritratto del giorno** (`.bloom`): le 8 forme disposte in cerchio (coordinate `x/y` in `emotions.js`) crescono e si illuminano con l'intensità. Sotto, l'**aura**: una macchia sfocata per emozione, grande quanto l'intensità, fuse in un unico bagliore che respira (`plus-lighter` nel tema scuro). L'emozione dominante unica "respira" con glow. Una didascalia in corsivo commenta la giornata ("Prevale la gioia.").
- **8 slider** (`MoodSlider`), ispirati al selettore modello dell'app ChatGPT: 6 livelli 0–5 (`LEVELS`: Per niente → Moltissimo), riempimento del colore dell'emozione, tacche, tick aptico a ogni scatto, drag col dito, frecce da tastiera, `role="slider"` con `aria-valuenow`. Il pomello ha `touch-action: none` e area di presa allargata; sulla traccia un gesto orizzontale blocca lo scroll (touchmove non passivo).
- **Scheda dell'emozione**: pulsante `.info` (cerchietto "i") in fondo a destra della riga `.head` di uno slider. Si apre un foglio in stile iOS con forma, nome, emozione opposta e la descrizione (`desc` in `emotions.js`). Si chiude trascinandolo verso il basso, toccando lo sfondo, dal pulsante o con Esc. Tutto in `sheet.js`. Niente tocco prolungato: su iOS entrava in conflitto con selezione e menu di sistema.
- **Apatia**: switch "Oggi non ho sentito nulla". Richiude l'intera sezione degli slider (`.group.moods.collapsible`, altezza misurata da JS), spegne l'aura e mostra un alone grigio caldo. **I valori restano nello store e tornano al primo sblocco**: l'apatia non cancella mai nulla.
- **Nota della giornata**: textarea con salvataggio automatico (debounce), ora dell'ultimo salvataggio e conteggio caratteri.
- Si possono modificare anche i giorni passati: dal calendario si apre il giorno nella vista Oggi ("5 giorni fa", chip "Torna a oggi").
- Ingranaggio in alto a destra: apre la pagina **Impostazioni**.

**Calendario** (tab 2)
- Mese corrente, settimana da lunedì, frecce per cambiare mese con animazione direzionale.
- Ogni giorno mostra la forma + colore dell'emozione prevalente; casella vuota se nessun dato; anello grigio per l'apatia; oggi evidenziato con bordo brace.
- Card riassuntiva del mese ("Settembre ha il colore della tristezza") con barra.
- Legenda delle forme.
- Card **Quaderno** in fondo: numero di note e anteprima dell'ultima.

**Emozioni** (tab 3) — il resoconto, in `report.js`
- **Ultimi 14 giorni**: l'emozione con la somma di intensità più alta, con la sua forma su un alone del proprio colore, una frase che ne racconta il peso e tre misure (presente in N giornate, intensità media, prevale in N). Sotto, la direzione rispetto alle due settimane precedenti: solo "più" e "meno", mai percentuali.
- **Tutte e otto**: classifica con barra e intensità media; le emozioni mai sentite restano in elenco, in punta di piedi.
- **Vista anno**: dodici mini-mesi, ogni giornata un quadratino con la forma e il colore dell'emozione prevalente. Frecce e scorrimento orizzontale per cambiare anno (mai oltre l'anno in corso o prima della prima giornata registrata); il tocco su un giorno lo apre in Oggi. In fondo il riepilogo dell'anno con la barra delle prevalenze.
- Le finestre si calcolano con `windowStats(store, end, span, back)`: `felt` = giornate segnate meno quelle in apatia, ed è il denominatore di tutte le medie.

**Impostazioni** (pagina interna di Oggi) — nell'ordine:
- I tuoi dati: conteggio, esporta/importa backup JSON (share sheet su iOS).
- **Promemoria**: interruttore **Promemoria serale** (`reminder.js`). Alle 22 una notifica locale gentile, solo se la giornata è ancora vuota e una sola volta al giorno (`tepore:reminder`, `tepore:reminder:seen`). Il permesso si chiede dentro il tocco sull'interruttore. Quando la notifica non può partire — iOS sospende la pagina — `reminder.greet()` mostra l'invito come toast alla prima apertura.
- **Tema** (`theme.js`): tendina Aspetto con "Come sul dispositivo" (predefinito), "Tema chiaro", "Tema scuro". La scelta sta in `localStorage['tepore:theme']` e mette `data-theme` sulla radice; uno script in testa a `index.html` la applica **prima del primo disegno**, aggiornando anche `<meta name="theme-color">` (una sola, senza `media`).
- Interazione: interruttore **Feedback aptico**, attivo di default, salvato in `localStorage['tepore:haptics']`. Dove il sistema non offre aptica (`hapticsSupported()` falso) il gruppo si spegne da solo e l'etichetta dice "Non disponibile".
- **Backup automatico** su Dropbox, per ultimo: collegamento PKCE con codice da incollare, poi salvataggio da sé a ogni modifica (`backup.js`, `dropbox.js`, chiave in `config.js`). Mentre verifica il codice il box mostra uno `.spinner`; `setActions(mode, html)` ridisegna i comandi solo al cambio di stato, altrimenti il codice appena incollato sparirebbe. Serve perché iOS cancella il contenitore dati della web app quando la si rimuove dalla Home.
- Firma dell'app con icona e versione.

**Quaderno** (pagina interna di Calendario)
- Timeline verticale di tutte le note: la più vecchia in alto, la più recente in fondo; si apre già in fondo.
- Etichetta del mese sticky in vetro, nodo con la forma dell'emozione prevalente; tocco su una nota: apre il giorno in Oggi.

**Navigazione** (`app.js`)
- Tre tab (`TABS`: `today`, `calendar`, `report`) e due pagine interne. `PARENT` lega ogni pagina alla sua tab; le pagine interne entrano con `pushState` (funziona "indietro"). Hash: `#calendario`, `#emozioni`, `#impostazioni`, `#quaderno`.
- Link con `data-go="pagina"`, ritorno con `data-back`; la tab attiva, da una pagina interna, riporta alla radice.

**Regole di calcolo** (`emotions.js`)
- `topEmotions(day)`: emozioni con il valore massimo (vuoto se tutto a 0).
- `dominantOf(day)`: apatia se attiva, altrimenti la prima delle top in ordine `EMOTIONS`, altrimenti `null`.

## 3. Stack e struttura

HTML + SCSS + JavaScript vanilla a moduli ES. Nessun framework, nessun bundler. L'unica dipendenza è `sass` (dev).

```
tepore/
├─ CLAUDE.md
├─ README.md              # presentazione pubblica del progetto
├─ IDEE.md                # idee per aggiornamenti futuri
├─ package.json            # dev (sass watch + server live), build (compressed + stamp)
├─ scripts/stamp.mjs       # versione app (n. di commit) + cache del SW
├─ scripts/fonts.mjs       # scarica i font in src/fonts/ (gira prima di dev e build)
├─ .github/workflows/deploy.yml  # push su main → build → GitHub Pages
└─ src/                    # ← cartella pubblicata
   ├─ index.html           # markup di tutte le viste, tab bar, toast, schermata di avvio in linea
   ├─ manifest.webmanifest # start_url e scope RELATIVI (./)
   ├─ sw.js                # cache offline dell'app shell + font
   ├─ icons/               # icon.svg (sorgente 1024) + png generati: favicon-16/32/48,
   │                        # favicon.ico, icon-192, icon-512, icon-maskable-512,
   │                        # apple-touch-icon (180, opaco)
   │  └─ splash/            # schermate di avvio iPhone, 12 formati x chiaro/scuro
   ├─ fonts/               # Fraunces e Figtree woff2 variabili (scaricati, poi versionati)
   ├─ css/main.css         # COMPILATO: non modificare a mano
   ├─ js/
   │  ├─ app.js            # bootstrap, tab, navbar (observer), toast, SW
   │  ├─ store.js          # persistenza localStorage + pub/sub + export/import
   │  ├─ emotions.js       # dati delle emozioni, forme SVG, regole di dominanza
   │  ├─ dates.js          # chiavi data locali, formattazione it-IT
   │  ├─ haptics.js        # aptica (vibrate / trucco switch iOS 18+)
   │  ├─ theme.js          # chiaro / scuro / come il dispositivo
   │  ├─ slider.js         # classe MoodSlider
   │  ├─ sheet.js          # foglio modale iOS (gesture di chiusura, aptica)
   │  ├─ config.js         # chiave dell'app Dropbox (da compilare a mano)
   │  ├─ dropbox.js        # OAuth PKCE, download e upload del backup
   │  ├─ backup.js         # sincronizzazione automatica con debounce
   │  ├─ reminder.js       # promemoria serale (notifica locale alle 22)
   │  ├─ today.js          # vista Oggi (bloom, aura, slider, apatia, nota)
   │  ├─ calendar.js       # vista Calendario
   │  ├─ report.js         # vista Emozioni (14 giorni, classifica, vista anno)
   │  ├─ settings.js       # pagina Impostazioni (backup, versione)
   │  ├─ notebook.js       # pagina Quaderno + card nel calendario
   │  └─ version.js        # GENERATO dalla build
   └─ scss/
      ├─ main.scss         # @use base, layout, components, pages
      ├─ abstracts/        # _variables, _mixins (forward da _index)
      ├─ base/             # _fonts (@font-face locali), _root (custom property), _reset, _typography, _animations, _utilities
      ├─ layout/           # _app, _navbar, _tabbar
      ├─ components/       # _group, _slider, _switch, _toggle, _shape, _hero, _button, _spinner, _toast, _sheet
      └─ pages/            # _today, _calendar, _report, _settings, _notebook
```

Ogni partial SCSS inizia con `@use '../abstracts' as *;`. Un nuovo partial va aggiunto al `_index.scss` della sua cartella.

## 4. Modello dati

`localStorage['tepore:v1']`:

```json
{
  "version": 1,
  "days": {
    "2026-09-10": {
      "values": { "tristezza": 4, "rabbia": 3 },
      "note": "testo libero",
      "apatia": false,
      "updatedAt": 1789059266063
    }
  }
}
```

- Chiavi data **locali** `YYYY-MM-DD` via `keyOf()` (mai `toISOString`, che è UTC).
- `values` contiene solo le emozioni toccate; assente = 0. Intervallo 0–`MAX_LEVEL` (5).
- Scrivere sempre tramite `store.update(key, patch)`: fa merge, salva e notifica i listener (sincronizza anche tra schede).
- `store.merge(days)` unisce un backup remoto giornata per giornata: vince la versione con `updatedAt` più alto. Non esistono tombstone, quindi una giornata cancellata su un dispositivo può tornare dal backup.
- **Attenzione**: su iOS il contenitore dati della web app installata è separato da Safari e viene eliminato insieme all'icona. Nessuno storage del browser sopravvive alla rimozione: l'unica difesa è il backup su Dropbox.
- Se cambia lo schema: incrementa la versione, scrivi una migrazione in `store.js` e non perdere mai i dati esistenti. Il backup esportato ha la forma `{ app: 'tepore', version, exportedAt, days }`.

## 5. Design system

I token vivono in `scss/abstracts/_variables.scss`; i colori a runtime sono custom property in `base/_root.scss`. Il tema scuro arriva da `prefers-color-scheme` **salvo scelta contraria dell'utente**: `@include dark` genera sia `prefers-color-scheme: dark` con `:root:not([data-theme='light']) &`, sia `:root[data-theme='dark'] &`. Dentro `:root` (dove `&` è già la radice) si usa `@include dark-root`. **Nei componenti usa sempre le custom property** (`var(--ink)`, `var(--emo)`…), non i colori `$c-*` diretti, così il tema scuro funziona da solo.

### Palette

| Ruolo | Custom property | Chiaro | Scuro (espresso) |
|---|---|---|---|
| Fondo | `--paper` | `#F5ECE0` carta | `#1F1713` |
| Superficie card | `--surface` | `#FFF9F1` | `#2B211C` |
| Sabbia (tracce, riempimenti) | `--sand` / `--sand-deep` | `#EBDDCB` / `#DDCAB4` | `#3D3029` / `#4B3B32` |
| Testo | `--ink` | `#33241D` cacao | `#F5EADD` |
| Testo secondario | `--ink-soft` | `#715B4C` | `#C9B3A1` |
| Testo terziario | `--ink-faint` | `#A8927F` | `#8E7867` |
| Accento brand | `--ember` | `#D2603A` brace | `#F2A46E` brace chiara |
| Separatori | `--line` | ink al 9% | ink al 10% |

Ombre (`--shadow-soft`, `--shadow-lift`) sempre tinte di marrone, mai nere nel tema chiaro. `--aura` è il bagliore caldo di sfondo in alto nella pagina. Le tinte si derivano con `color-mix(in oklab, …)`.

### Emozioni: colore + forma

Ogni emozione ha un colore (`--emo-{id}`) e una forma SVG 24×24 (`path` in `emotions.js`). Qualsiasi elemento con `data-emo="{id}"` riceve `--emo`, da usare per tinte (`@include emo-tint`), riempimenti e glow. Colore e forma insieme garantiscono leggibilità anche a chi non distingue i colori: non rimuovere mai la forma.

| id | Colore | Forma |
|---|---|---|
| gioia | `#EEB02F` ambra | cerchio |
| fiducia | `#7FA05D` salvia | quadrato arrotondato |
| paura | `#8F6293` prugna | rombo |
| sorpresa | `#EF8C5C` albicocca | stella a 4 punte |
| tristezza | `#6F89A8` ardesia (unico blu, polveroso e caldo) | goccia |
| disgusto | `#93633F` nocciola | esagono |
| rabbia | `#C93B2F` rosso mattone | triangolo |
| attesa | `#DB869C` rosa antico | semicerchio (alba) |
| apatia | `#B3A89E` grigio caldo | anello |

### Tipografia

- **Display**: Fraunces (variabile, assi `SOFT` e `WONK`) via `@include font-display($size, $weight, $soft)`. Titoli grandi, date, didascalie in corsivo, numeri del mese.
- **UI**: Figtree con fallback `-apple-system` via `@include font-ui($size, $weight)`. Tutto il resto.
- I due file vivono in `src/fonts/` (woff2 variabili, sottoinsiemi latin e latin-ext): nessuna richiesta a Google, prima apertura istantanea e offline davvero completo. Li scarica `scripts/fonts.mjs` e vanno versionati; i `@font-face` stanno in `base/_fonts.scss`.
- Scala: `$fs-2xs` .6875 · `xs` .75 · `sm` .875 · `base` 1 · `md` 1.0625 · `lg` 1.25 · `xl` 1.625 · `2xl` 2.25 · `3xl` 2.875rem. Pesi 400/500/600/700.
- Campi di input con font-size ≥ 16px, altrimenti Safari fa zoom.

### Spazi, raggi, layout

- Spaziatura base 4: `$sp-1` 4 · 2 8 · 3 12 · 4 16 · 5 20 · 6 24 · 7 28 · 8 32 · 10 40 · 12 48 · 16 64px.
- Raggi: `$r-xs` 8 · `sm` 12 · `md` 18 · `lg` 26 (card) · `xl` 34 · `pill` 999.
- Layout: colonna max `$app-max` 540px centrata, `$gutter` 20px, navbar 48px, tab bar 58px flottante (sole icone) + safe area.
- Breakpoint (`mq`/`mq-down`): xs 360 · sm 400 · md 640 · lg 960. Mobile first.
- z-index solo tramite variabili: `$z-bloom` 1 · `$z-navbar` 40 · `$z-tabbar` 50 · `$z-toast` 60 · `$z-sheet` 70.

### Motion

- Curve: `$ease-out` (default), `$ease-in-out`, `$ease-spring` (pop, scale, tab), `$ease-bounce` (piccoli rimbalzi), `$ease-liquid` (pillola della tab bar, lieve overshoot).
- Durate: `$dur-fast` .18s · `$dur-base` .34s · `$dur-slow` .62s · `$dur-lazy` 1.1s.
- Ingressi a cascata con `@include enter($name, $dur, $step, $base)` e la variabile `--i` (indice).
- Keyframe in `base/_animations.scss`: rise, fade, pop, float, breathe, aura-drift, aura-breathe, view-in-left/right, month-in-left/right, pill-lift, tab-bounce, tick, toast-in.
- Custom property animabili registrate con `@property`: `--p` (progresso 0–1), `--bloom-c`, `--glow`.
- Ogni animazione continua va disattivata dentro `@include reduced-motion`.

### Componenti firma

- **Liquid glass** (`@include liquid-glass($radius, $blur)`): vetro caldo con blur + saturazione, bordo a gradiente luminoso (`::before` mascherato) e riflesso speculare (`::after`). Usato per tab bar, chip e controlli flottanti. Occupa entrambi gli pseudo-elementi: non aggiungerne altri sullo stesso elemento.
- **Tab bar**: capsula di vetro flottante in basso, **solo icone** (il nome resta in `.sr-only` per VoiceOver), tre destinazioni, aptica al cambio. Le posizioni della pillola si generano con un `@for` su `$tab-count`: cambiando il numero di tab non serve toccare altro. La pillola si muove come una goccia animando `left`/`right`: il bordo d'attacco parte subito, quello di coda insegue (`is-going-left/right`), con lieve sollevamento (`pill-lift`); l'icona attiva fa `tab-bounce`. Non animarla con transform e `var()` nei keyframe.
- **Navbar**: invisibile in cima, compare in vetro con il titolo quando il large title esce dallo schermo.
- **Group** (`.group` con `.head`, `.title`, `.aside`, `.body`, `.foot` annidati): sezione stile Impostazioni iOS; il body è una card `@include surface`. Con `.collapsible` si richiude: il JS misura l'altezza e commuta `is-collapsed`.
- **Slider**: traccia sabbia alta `$slider-h` 34px, riempimento `var(--emo)` di larghezza `calc(var(--h) + (100% - var(--h)) * var(--p))`, pomello bianco con vetro, tacche per ogni livello.
- **Switch**: stile iOS, tinta brace.
- **Toggle** (`.toggle` con `.icon`, `.text` e uno `.switch`): riga completa usata dall'apatia e dalle opzioni.
- **Shape** (`.shape` con `data-emo="{id}"`): SVG con `fill: var(--emo)`; l'apatia è un anello vuoto.
- **Sheet** (`.sheet` con `.scrim` e `.card`): foglio modale iOS, vive fuori da `.app`, con maniglia, tinta dell'emozione e gesture di chiusura. Si apre con `openSheet(id)`, che dà anche il tocco aptico; trascinandolo oltre la soglia si sente uno scatto, come nei fogli di iOS.
- **Spinner** (`.spinner`): anello brace che gira, per le attese brevi (verifica del codice Dropbox, salvataggio in corso).
- **Toast**: pillola in vetro sopra la tab bar per le conferme (export, import, promemoria serale). `toast(msg, { action, onAction, hold })`: con `action` compare un pulsante brace, il toast resta aperto e diventa toccabile (`has-action`). Lo usa l'avviso di nuova versione.
- **Barra delle prevalenze** (`@include emo-bar($h)`): una fetta per emozione larga quanto `--n`, condivisa fra il riepilogo del mese e quello dell'anno.
- **Ember tile** (`@include ember-tile($size, $radius)`): tessera a gradiente brace stile icona iOS (card Quaderno, stati vuoti).

## 6. Convenzioni SCSS (obbligatorie)

- Commenti corti: massimo 2 righe.
- **Nomi di classe semplici: niente `--` e niente `__`.** Una parola quando basta (`head`, `body`, `title`, `track`, `fill`), al massimo con un trattino singolo (`mood-list`, `glass-btn`, `notebook-card`). I nomi generici si disambiguano con il nesting, non con i prefissi.
- Nesting pesante e alta specificità: ogni vista sotto il suo scope (`.view.today { … }`, `.view.calendar { … }`) e dentro ogni componente i figli annidati per nome (`.group { .head { .title { … } } }`). È il nesting a dare il significato: `.mood .head` e `.entry .head` convivono senza conflitti.
- Le varianti sono classi affiancate, non modificatori: `.pill-btn.ember`, `.day.filled`, `.glass-btn.gear`.
- Media query **dentro** il singolo selettore nidificato (`@include mq(sm) { … }`), mai blocchi responsive separati a fondo file.
- Usa sempre mixin e variabili esistenti prima di scrivere valori a mano (`flex`, `size`, `cover`, `grid-center`, `pressable`, `focus-ring`, `button-reset`, `tap-reset`, `visually-hidden`, `surface`, `liquid-glass`, `emo-tint`, `ember-tile`, `enter`, `safe-top`, `safe-bottom`, `dark`, `hover`, `standalone`, `reduced-motion`). Se un valore si ripete, diventa una variabile o un mixin.
- Stati con classi `is-*` (`is-active`, `is-dominant`, `is-apathy`, `is-today`…); aggancio JS con attributi `data-*`, mai con le classi di stile.
- `:hover` solo dentro `@include hover` (evita hover appiccicati su touch).
- Non modificare mai `src/css/main.css` a mano: si genera con `npm run dev` / `npm run build`.

### Prestazioni (l'app deve stare a 60 fps)

- Animazioni continue in pausa fuori schermo: `@include idle-pause` più un `IntersectionObserver` che aggiunge `is-idle`.
- Niente listener di `scroll` per la navbar: la comanda un `IntersectionObserver` sul `[data-sentinel]`.
- Niente `mix-blend-mode` su strati a tutto schermo: la grana di carta (`--grain`) è già tinta per tema.
- `backdrop-filter` solo quando l'elemento è davvero visibile (navbar in `is-visible`).
- `contain` sulle card, `@include offscreen-skip($h)` sulle liste lunghe. Mai `contain: paint` né `content-visibility` dove ci sono ombre o glow che escono dal riquadro: il ritratto del giorno, e le note del quaderno (l'ombra e l'anello dei nodi della timeline).
- Dal JS si scrivono solo le custom property che cambiano davvero: confronta prima di assegnare.

## 7. Convenzioni JavaScript

- Moduli ES nativi con import relativi `./x.js`; nessuna dipendenza esterna.
- Ogni vista è una factory (`createToday`, `createCalendar`) che riceve `store` e callback; comunica con `app.js` solo tramite callback e store.
- Selettori `data-*`; stato visivo con classi `is-*` o custom property (`--p`, `--bloom-c`).
- Testi UI in italiano, tono gentile e mai giudicante. Etichette dei livelli in `LEVELS`.
- Accessibilità: ruoli ARIA corretti (slider, tablist, status), focus visibile (`focus-ring`), tutto usabile da tastiera.
- **Aptica**: `haptic(kind)` con cinque intensità — `tick` (scatto), `soft` (estremi, gesture, cambio tab), `firm` (interruttori), `double` (conferma riuscita), `warn` (qualcosa non è andato). Un guardiano interno scarta due tocchi a meno di 18 ms l'uno dall'altro.
  - **Un solo aggancio per i pulsanti**: `app.js` ascolta `pointerdown` in delega su `button:not([disabled])` e produce il tocco subito, come nelle app native. Si regola con `data-haptic="soft|firm|double|warn"` e si esclude con `data-haptic="off"`. **Non aggiungere `haptic()` dentro il click di un pulsante**: sarebbe doppio.
  - Restano espliciti solo i gesti che non passano da un pulsante: scatti e presa dello slider, `change` degli interruttori, apertura/soglia/chiusura del foglio, swipe di calendario e vista anno, e gli esiti (import, collegamento Dropbox).
  - Su iOS non esiste `navigator.vibrate`: l'unica sorgente è uno `<input switch>` nativo, che per suonare deve essere **davvero renderizzato**. `haptics.js` ne tiene uno solo, `.haptic-rig`, fuori vista ma dipinto (mai `display: none`, mai dentro `<head>`).
  - `hapticsEnabled()`, `setHaptics(on)`, `hapticsSupported()`: se l'utente la spegne o il sistema non la offre, `haptic()` non fa nulla.
- `sheet.js` espone `openSheet(id)` e `closeSheet()`. La scheda si apre dal pulsante `[data-info]` della riga, con delega dell'evento su `.mood-list`.
- `report.js` è una factory come le altre: riceve `store` e `onPick(key)`, e non conosce la navigazione.
- `reminder.js` non tocca la vista: espone `state`, `subscribe`, `setEnabled(on)` (che restituisce `on` / `off` / `blocked` / `unsupported`) e `greet()`. Il timer si riarma a ogni ritorno in primo piano, perché iOS sospende i `setTimeout` lunghi.

## 8. Requisiti Apple / PWA

- `viewport-fit=cover` + safe area (`env(safe-area-inset-*)`, mixin `safe-top` / `safe-bottom`).
- `apple-mobile-web-app-capable`, status bar `black-translucent`, `theme-color` distinto per chiaro e scuro, `apple-touch-icon` 180px senza trasparenza.
- Percorsi sempre relativi (`./`): l'app vive in una sottocartella su GitHub Pages.
- Service worker: cache dell'app shell (lista `SHELL` in `sw.js`), font locali compresi. **Ogni nuovo file JS/CSS/font/icona va aggiunto a `SHELL`**, altrimenti offline non funziona. Unica eccezione voluta: le schermate di avvio in `icons/splash/`, che carica iOS all'installazione e che appesantirebbero inutilmente l'install del SW. L'install usa `Promise.allSettled`: un file mancante non fa saltare tutta la cache.
- **Schermate di avvio, due livelli**:
  1. `<link rel="apple-touch-startup-image">` per 12 formati iPhone, in chiaro e in scuro (`prefers-color-scheme` dentro il `media`). **iOS le scarica e le mette da parte quando l'app viene aggiunta alla schermata Home, non agli aggiornamenti successivi**: chi ha installato l'app prima che esistessero continua a vedere il nero finché non la reinstalla (e reinstallare cancella i dati: prima il backup).
  2. Una **schermata di avvio dipinta dall'app** (`.splash` in `index.html`): CSS in linea nel `<head>` e segno brace in SVG in linea, così è già a video al primo frame, prima che arrivino `main.css` e i moduli. La toglie `app.js` quando i caratteri sono pronti (al massimo dopo 1,2 s); se il JS non parte, un'animazione CSS la fa sparire comunque dopo 2,6 s. Insieme a `<meta name="color-scheme">` e a `html { background }` in linea, fra il lancio e il primo disegno non resta nessuna finestra nera.
- **Notifiche**: `Notification` esiste solo nell'app installata (iOS 16.4+), mai nella scheda di Safari. Il tocco sulla notifica è gestito da `notificationclick` nel service worker, che riporta alla finestra già aperta.
- **Niente zoom**: viewport con `maximum-scale=1, user-scalable=no`, `touch-action: pan-y` su `html`, `body` e `.app` (esclude pinch e doppio tocco), e `gesturestart/change/end` annullati in `app.js`. Conseguenza da tenere a mente: il testo non si può più ingrandire con le dita, quindi le dimensioni devono reggere da sole.
- `-webkit-backdrop-filter` insieme a `backdrop-filter`; `touch-action` corretto sugli elementi trascinabili; niente evidenziazione al tap.
- Supporto minimo: iOS 16.4+ (color-mix, `@property`). Testare sempre sia tema chiaro che scuro.

## 9. Deploy e aggiornamenti

- Il push su `main` avvia la GitHub Action: `npm install` → `npm run build` (SCSS compresso + nuova versione del SW) → pubblicazione di `src/` su Pages.
- Sull'iPhone l'app si aggiorna da sola: il nuovo SW si installa alla prima apertura e prende il posto del vecchio alla riapertura successiva. `sw.js` **non** chiama più `skipWaiting()` da solo: resta in attesa e lo fa solo su `postMessage({ type: 'skip-waiting' })`.
- Quando il nuovo SW è pronto (`installed` con un controller già attivo), `app.js` mostra il toast **"Nuova versione di Tepore" · Ricarica**: il tocco manda il messaggio, `controllerchange` fa il `location.reload()`. Ignorandolo non si perde niente. A ogni ritorno in primo piano parte un `registration.update()`.
- `npm run fonts` scarica i font in `src/fonts/`; gira da solo prima di `dev` e di `build` e non fa nulla se i file ci sono già.
- In locale: `npm run dev` avvia sass in watch e il server live (browser-sync). Nel terminale compaiono i link Local ed External: il secondo si apre dall'iPhone sulla stessa Wi-Fi.
- Versione `1.<numero di commit>`: la scrive `scripts/stamp.mjs` in `src/js/version.js` durante la build (la Action usa `fetch-depth: 0`). In dev si vede `dev`.

## 10. Checklist per ogni modifica

1. La modifica rispetta visione e principi (calore, vita, privacy, nativa)?
2. Colori da custom property, spazi/raggi/durate da variabili, pattern da mixin esistenti.
3. Funziona in chiaro e in scuro, su 375–430px di larghezza, con safe area.
4. Animazioni continue disattivate con `reduced-motion`.
5. Nuovi file aggiunti a `_index.scss` e/o a `SHELL` in `sw.js`.
6. Schema dati invariato, oppure migrazione scritta.
7. Accessibilità: ruoli, etichette, tastiera, contrasto.
8. Nessun listener per frame, nessuna animazione continua fuori schermo, nessuno strato fisso che si ricompone durante lo scroll.

## 11. Da non fare

- Colori freddi puri, grigi neutri, nero puro per le ombre nel tema chiaro.
- Framework, librerie UI, CDN aggiuntive, tracciamento, backend propri (il backup usa il Dropbox dell'utente, non un nostro server).
- Percorsi assoluti (`/`), `localStorage` con chiavi nuove senza prefisso `tepore:`.
- Media query separate dal selettore, commenti lunghi, valori "magici" ripetuti.
- Classi con `--` o `__`: la nomenclatura è semplice e il significato lo dà il nesting.
- Scorrimento orizzontale: `html`, `body` e `.app` stanno in `overflow-x: clip` con `touch-action: pan-y`. Non introdurre elementi più larghi della colonna: nelle griglie usa `minmax(0, 1fr)`, altrimenti la dimensione naturale delle forme SVG le allarga.
- Rimuovere le forme delle emozioni o l'etichetta testuale del livello.
- Aggiungere `haptic()` dentro il click di un pulsante: ci pensa già la delega in `app.js`.
