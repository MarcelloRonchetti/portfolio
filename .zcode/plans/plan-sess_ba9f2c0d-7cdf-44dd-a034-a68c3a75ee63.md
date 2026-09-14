# Redesign professionale — semplice, sobrio, "da persona vera"

Direzione: via di mezzo — palette neutra e professionale (bianco caldo + antracite + bronzo scurito), stesse font (Italiana/Cormorant/Mono ma usate con sobrietà), zero effetti teatrali. Copy in italiano asciutto e onesto. Commit e push su GitHub alla fine.

## 1. Palette e base CSS (`index.css` riscritto)
- Nuove variabili semantiche: `--bg` #faf9f7 (bianco caldo), `--ink` #1c1915, `--muted` #6f6a62, `--accent` #9a7b50 (bronzo), hairline #e4e0d8; sezione galleria sempre scura: `--bg-dark` #14120f + testo #f5f3ef.
- Vengono rimossi: oxblood/bone/leather, cursore custom (stili e componente), tendina (curtain), shimmer, gradienti "frame" teatrali, gradienti della chrome.
- Tipografia: niente più titoli a 200px — display max ~72px, meta label ridotti. Resta `prefers-reduced-motion`, `:focus-visible`, breakpoint responsive (adattati alle nuove classi).
- Unica animazione: fade-in leggero all'apparizione.

## 2. Componenti
- **Eliminati**: `Typewriter`, `NameReveal`, `CustomCursor`, `Curtain`+`useCurtain`, `BottomBar` (niente più "PAG. 01 — sfoglia la prefazione").
- **TopBar** semplificata: "Marcello Ronchetti" testo a sinistra, nav a destra (Galleria · Contatti). Via il toggle chiaro/scuro e IT/EN (gia via): un solo tema coerente.
- **App.tsx**: route `cover / gallery / story / contact` (via `about`), transizione = semplice fade, niente sigilli; route persistite validate (come già fatto).
- **PhotoFrame** resta (placeholder neutro), **Clickable** resta per accessibilità.

## 3. Pagine
- **Copertina**: hero full-bleed con la foto in evidenza, nome + "Fotografo — Sport & Motorsport" + "Modena, Italia", un solo bottone "Vedi la galleria". Via: typewriter, motto, "VOLUME II", "UN AUTORE · DUE LINGUAGGI", lettere animate, card capitoli, prefazione/INDICE.
- **Galleria** (ex ChapterFoto): intestazione sobria ("Galleria — Sport e motorsport, in pista e fuori"), griglia di raccolte con **foto di copertina vera** su ogni card, nome e numero scatti. Via: "LA LENTE" gigante, pull-quote, "Le stagioni / una stagione viva", numeri romani, "SHOT COUNT", lista "Selezioni".
- **Storia** (ex PhotoStory): titolo a dimensione normale, riga meta (data · luogo · evento), link Instagram, descrizione come semplice paragrafo (niente "DIARIO DI BORDO"), foto grande + strip di miniature con contatore "01 / 12" (niente "FIG. 01"/"HERO"), pager "← Precedente / Successiva →".
- **Contatti** (sostituisce Placeholder/about): riga unica di presentazione + link reali: `mailto:ronchettimarcello@gmail.com`, Instagram `@marc.roads`, TikTok `@marc.roads`. Via "L'AUTORE"/"SCRIVIMI" e handle finti.

## 4. Copy e dati
- `data.ts`: niente motto né pull-quote; `role: 'Fotografo — Sport & Motorsport'`; intro galleria in una frase sobria.
- `index.html`: title "Marcello Ronchetti — Fotografo", meta description sobria.
- `events.ts`: rimossa l'assegnazione dei numeri romani (e il loro uso in UI).

## 5. Verifica e pubblicazione
- `npm run lint` + `npm run build`.
- Screenshot browser a 1440px e 390px: copertina, galleria, storia, contatti.
- Commit + **push su origin/main** (github.com/MarcelloRonchetti/portfolio) come richiesto — il deploy GitHub Pages parte dal workflow esistente.