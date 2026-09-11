# Tepore — guida di progetto per Claude

Leggi questo file prima di qualsiasi modifica. Descrive visione, funzioni, design system e convenzioni: ogni aggiornamento deve restare coerente con quanto scritto qui. Rispondi sempre in italiano.

---

## 1. Visione

Tepore è un diario delle emozioni tascabile, pensato per iPhone e installato come web app sulla schermata Home. Ogni giorno si registra quanto si è sentita ciascuna delle 8 emozioni primarie di Plutchik; il calendario si colora giorno dopo giorno con l'emozione prevalente.

Il tono è quello di un oggetto caldo e intimo, non di uno strumento clinico: carta, cacao e brace, tipografia editoriale, movimenti morbidi. L'ispirazione estetica è Claude (calore, accoglienza) unita alla cura dei dettagli Apple (liquid glass, aptica, gesture fluide). L'app non giudica: frasi gentili, nessun punteggio, nessuna gamification.

Principi da non tradire:
- **Calore**: nessun colore freddo puro, nessun grigio neutro (i "grigi" sono sempre sabbia/cacao).
- **Vita**: tutto è animato con misura (ingressi a cascata, molle, respiro), ma rispetta "Riduci movimento".
- **Privacy**: nessun backend, nessun tracciamento; i dati restano sul dispositivo.
- **Nativa**: deve sembrare un'app iOS, non un sito.

## 2. Funzioni

**Oggi** (tab 1)
- Hero con data, titolo grande "Oggi" e sottotitolo. Scorrendo, il titolo passa nella navbar compatta in alto (pattern iOS large title, via `data-sentinel`).
- **Ritratto del giorno** (`.bloom`): le 8 forme disposte in cerchio (coordinate `x/y` in `emotions.js`) crescono e si illuminano con l'intensità. Sotto, l'**aura**: una macchia sfocata per emozione, grande quanto l'intensità, fuse in un unico bagliore che respira (`plus-lighter` nel tema scuro). L'emozione dominante unica "respira" con glow. Una didascalia in corsivo commenta la giornata ("Prevale la gioia.").
- **8 slider** (`MoodSlider`), ispirati al selettore modello dell'app ChatGPT: 6 livelli 0–5 (`LEVELS`: Per niente → Moltissimo), riempimento del colore dell'emozione, tacche, tick aptico a ogni scatto, drag col dito, frecce da tastiera, `role="slider"` con `aria-valuenow`. Il pomello ha `touch-action: none` e area di presa allargata; sulla traccia un gesto orizzontale blocca lo scroll (touchmove non passivo).
- **Apatia**: switch "Oggi non ho sentito nulla". Attenua gli slider, spegne l'aura, mostra un alone grigio caldo.
- **Nota della giornata**: textarea con salvataggio automatico (debounce), ora dell'ultimo salvataggio e conteggio caratteri.
- Si possono modificare anche i giorni passati: dal calendario si apre il giorno nella vista Oggi ("5 giorni fa", chip "Torna a oggi").
- Ingranaggio in alto a destra: apre la pagina **Impostazioni**.

**Calendario** (tab 2)
- Mese corrente, settimana da lunedì, frecce per cambiare mese con animazione direzionale.
- Ogni giorno mostra la forma + colore dell'emozione prevalente; casella vuota se nessun dato; anello grigio per l'apatia; oggi evidenziato con bordo brace.
- Card riassuntiva del mese ("Settembre ha il colore della tristezza") con barra.
- Legenda delle forme.
- Card **Quaderno** in fondo: numero di note e anteprima dell'ultima.

**Impostazioni** (pagina interna di Oggi)
- I tuoi dati: conteggio, esporta/importa backup JSON (share sheet su iOS).
- Firma dell'app con icona e versione.

**Quaderno** (pagina interna di Calendario)
- Timeline verticale di tutte le note: la più vecchia in alto, la più recente in fondo; si apre già in fondo.
- Etichetta del mese sticky in vetro, nodo con la forma dell'emozione prevalente; tocco su una nota: apre il giorno in Oggi.

**Navigazione** (`app.js`)
- `PARENT` lega ogni pagina alla sua tab; le pagine interne entrano con `pushState` (funziona "indietro"). Hash: `#calendario`, `#impostazioni`, `#quaderno`.
- Link con `data-go="pagina"`, ritorno con `data-back`; la tab attiva, da una pagina interna, riporta alla radice.

**Regole di calcolo** (`emotions.js`)
- `topEmotions(day)`: emozioni con il valore massimo (vuoto se tutto a 0).
- `dominantOf(day)`: apatia se attiva, altrimenti la prima delle top in ordine `EMOTIONS`, altrimenti `null`.

## 3. Stack e struttura

HTML + SCSS + JavaScript vanilla a moduli ES. Nessun framework, nessun bundler. L'unica dipendenza è `sass` (dev).

```
tepore/
├─ CLAUDE.md
├─ package.json            # dev (sass watch + server live), build (compressed + stamp)
├─ scripts/stamp.mjs       # versione app (n. di commit) + cache del SW
├─ .github/workflows/deploy.yml  # push su main → build → GitHub Pages
└─ src/                    # ← cartella pubblicata
   ├─ index.html           # markup di entrambe le viste, tab bar, toast
   ├─ manifest.webmanifest # start_url e scope RELATIVI (./)
   ├─ sw.js                # cache offline dell'app shell + font
   ├─ icons/               # icon.svg, apple-touch-icon, 192, 512, maskable, favicon
   ├─ css/main.css         # COMPILATO: non modificare a mano
   ├─ js/
   │  ├─ app.js            # bootstrap, tab, navbar, toast, registrazione SW
   │  ├─ store.js          # persistenza localStorage + pub/sub + export/import
   │  ├─ emotions.js       # dati delle emozioni, forme SVG, regole di dominanza
   │  ├─ dates.js          # chiavi data locali, formattazione it-IT
   │  ├─ haptics.js        # aptica (vibrate / trucco switch iOS 18+)
   │  ├─ slider.js         # classe MoodSlider
   │  ├─ today.js          # vista Oggi (bloom, aura, slider, apatia, nota)
   │  ├─ calendar.js       # vista Calendario
   │  ├─ settings.js       # pagina Impostazioni (backup, versione)
   │  ├─ notebook.js       # pagina Quaderno + card nel calendario
   │  └─ version.js        # GENERATO dalla build
   └─ scss/
      ├─ main.scss         # @use base, layout, components, pages
      ├─ abstracts/        # _variables, _mixins (forward da _index)
      ├─ base/             # _root (custom property), _reset, _typography, _animations, _utilities
      ├─ layout/           # _app, _navbar, _tabbar
      ├─ components/       # _group, _slider, _switch, _shape, _hero, _button, _toast
      └─ pages/            # _today, _calendar, _settings, _notebook
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
- Se cambia lo schema: incrementa la versione, scrivi una migrazione in `store.js` e non perdere mai i dati esistenti. Il backup esportato ha la forma `{ app: 'tepore', version, exportedAt, days }`.

## 5. Design system

I token vivono in `scss/abstracts/_variables.scss`; i colori a runtime sono custom property in `base/_root.scss`, con override automatico per `prefers-color-scheme: dark`. **Nei componenti usa sempre le custom property** (`var(--ink)`, `var(--emo)`…), non i colori `$c-*` diretti, così il tema scuro funziona da solo.

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
- Scala: `$fs-2xs` .6875 · `xs` .75 · `sm` .875 · `base` 1 · `md` 1.0625 · `lg` 1.25 · `xl` 1.625 · `2xl` 2.25 · `3xl` 2.875rem. Pesi 400/500/600/700.
- Campi di input con font-size ≥ 16px, altrimenti Safari fa zoom.

### Spazi, raggi, layout

- Spaziatura base 4: `$sp-1` 4 · 2 8 · 3 12 · 4 16 · 5 20 · 6 24 · 7 28 · 8 32 · 10 40 · 12 48 · 16 64px.
- Raggi: `$r-xs` 8 · `sm` 12 · `md` 18 · `lg` 26 (card) · `xl` 34 · `pill` 999.
- Layout: colonna max `$app-max` 540px centrata, `$gutter` 20px, navbar 48px, tab bar 62px flottante a 10px dal bordo + safe area.
- Breakpoint (`mq`/`mq-down`): xs 360 · sm 400 · md 640 · lg 960. Mobile first.
- z-index solo tramite variabili: `$z-bloom` 1 · `$z-navbar` 40 · `$z-tabbar` 50 · `$z-toast` 60.

### Motion

- Curve: `$ease-out` (default), `$ease-in-out`, `$ease-spring` (pop, scale, tab), `$ease-bounce` (piccoli rimbalzi), `$ease-liquid` (pillola della tab bar, lieve overshoot).
- Durate: `$dur-fast` .18s · `$dur-base` .34s · `$dur-slow` .62s · `$dur-lazy` 1.1s.
- Ingressi a cascata con `@include enter($name, $dur, $step, $base)` e la variabile `--i` (indice).
- Keyframe in `base/_animations.scss`: rise, fade, pop, float, breathe, aura-drift, aura-breathe, view-in-left/right, month-in-left/right, pill-lift, tab-bounce, tick, toast-in.
- Custom property animabili registrate con `@property`: `--p` (progresso 0–1), `--bloom-c`, `--glow`.
- Ogni animazione continua va disattivata dentro `@include reduced-motion`.

### Componenti firma

- **Liquid glass** (`@include liquid-glass($radius, $blur)`): vetro caldo con blur + saturazione, bordo a gradiente luminoso (`::before` mascherato) e riflesso speculare (`::after`). Usato per tab bar, chip e controlli flottanti. Occupa entrambi gli pseudo-elementi: non aggiungerne altri sullo stesso elemento.
- **Tab bar**: capsula di vetro flottante in basso, icona + etichetta, aptica al cambio. La pillola si muove come una goccia animando `left`/`right`: il bordo d'attacco parte subito, quello di coda insegue (`is-going-left/right`), con lieve sollevamento (`pill-lift`); l'icona attiva fa `tab-bounce`. Non animarla con transform e `var()` nei keyframe.
- **Navbar**: invisibile in cima, compare in vetro con il titolo quando il large title esce dallo schermo.
- **Group** (`.group`, `__head`, `__title`, `__aside`, `__body`, `__foot`): sezione stile Impostazioni iOS; il body è una card `@include surface`.
- **Slider**: traccia sabbia alta `$slider-h` 34px, riempimento `var(--emo)` di larghezza `calc(var(--h) + (100% - var(--h)) * var(--p))`, pomello bianco con vetro, tacche per ogni livello.
- **Switch**: stile iOS, tinta brace.
- **Shape** (`.shape--{id}`): SVG con `fill: var(--emo)`.
- **Toast**: pillola in vetro sopra la tab bar per le conferme (export, import).
- **Ember tile** (`@include ember-tile($size, $radius)`): tessera a gradiente brace stile icona iOS (card Quaderno, stati vuoti).

## 6. Convenzioni SCSS (obbligatorie)

- Commenti corti: massimo 2 righe.
- Nesting pesante e alta specificità: ogni vista sotto il suo scope (`.view--today { … }`, `.view--calendar { … }`), elementi BEM nidificati con `&__` e figli annidati.
- Media query **dentro** il singolo selettore nidificato (`@include mq(sm) { … }`), mai blocchi responsive separati a fondo file.
- Usa sempre mixin e variabili esistenti prima di scrivere valori a mano (`flex`, `size`, `cover`, `grid-center`, `pressable`, `focus-ring`, `button-reset`, `tap-reset`, `visually-hidden`, `surface`, `liquid-glass`, `emo-tint`, `ember-tile`, `enter`, `safe-top`, `safe-bottom`, `dark`, `hover`, `standalone`, `reduced-motion`). Se un valore si ripete, diventa una variabile o un mixin.
- Stati con classi `is-*` (`is-active`, `is-dominant`, `is-apathy`, `is-today`…); aggancio JS con attributi `data-*`, mai con le classi di stile.
- `:hover` solo dentro `@include hover` (evita hover appiccicati su touch).
- Non modificare mai `src/css/main.css` a mano: si genera con `npm run dev` / `npm run build`.

## 7. Convenzioni JavaScript

- Moduli ES nativi con import relativi `./x.js`; nessuna dipendenza esterna.
- Ogni vista è una factory (`createToday`, `createCalendar`) che riceve `store` e callback; comunica con `app.js` solo tramite callback e store.
- Selettori `data-*`; stato visivo con classi `is-*` o custom property (`--p`, `--bloom-c`).
- Testi UI in italiano, tono gentile e mai giudicante. Etichette dei livelli in `LEVELS`.
- Accessibilità: ruoli ARIA corretti (slider, tablist, status), focus visibile (`focus-ring`), tutto usabile da tastiera.
- Aptica con `haptic()` solo su azioni significative (scatto slider, cambio tab, toggle), mai in raffica.

## 8. Requisiti Apple / PWA

- `viewport-fit=cover` + safe area (`env(safe-area-inset-*)`, mixin `safe-top` / `safe-bottom`).
- `apple-mobile-web-app-capable`, status bar `black-translucent`, `theme-color` distinto per chiaro e scuro, `apple-touch-icon` 180px senza trasparenza.
- Percorsi sempre relativi (`./`): l'app vive in una sottocartella su GitHub Pages.
- Service worker: cache dell'app shell (lista `SHELL` in `sw.js`) + font. **Ogni nuovo file JS/CSS/icona va aggiunto a `SHELL`**, altrimenti offline non funziona.
- `-webkit-backdrop-filter` insieme a `backdrop-filter`; `touch-action` corretto sugli elementi trascinabili; niente evidenziazione al tap.
- Supporto minimo: iOS 16.4+ (color-mix, `@property`). Testare sempre sia tema chiaro che scuro.

## 9. Deploy e aggiornamenti

- Il push su `main` avvia la GitHub Action: `npm install` → `npm run build` (SCSS compresso + nuova versione del SW) → pubblicazione di `src/` su Pages.
- Sull'iPhone l'app si aggiorna da sola: il nuovo SW si installa alla prima apertura e la nuova versione appare alla riapertura.
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

## 11. Da non fare

- Colori freddi puri, grigi neutri, nero puro per le ombre nel tema chiaro.
- Framework, librerie UI, CDN aggiuntive, tracciamento, backend.
- Percorsi assoluti (`/`), `localStorage` con chiavi nuove senza prefisso `tepore:`.
- Media query separate dal selettore, commenti lunghi, valori "magici" ripetuti.
- Rimuovere le forme delle emozioni o l'etichetta testuale del livello.
