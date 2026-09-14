# Portfolio — Marcello Ronchetti

Portfolio fotografico (sport · motorsport · reportage). Design sobrio e professionale: palette neutra (bianco caldo + antracite + bronzo), hero fotografico, galleria a raccolte con coperture reali. Nessun effetto teatrale (niente typewriter, curtain, cursor custom, numeri di pagina).

## Stato attuale (aggiornato a settembre 2026)

### Struttura
- **Vite 7 + React 19 + TypeScript** in `app/`, deploy su GitHub Pages (base `/portfolio/`).
- Routing **state-based** con persistenza `localStorage` (`mr.route`, `mr.storyId`). Deep link: `/?p=gallery` e `/?p=story/<id>` (404.html reindirizza; le route persistite non valide cadono su `cover`).
- Route: `cover` (hero con foto in evidenza) · `gallery` (raccolte) · `story` (evento: foto grande + miniature + pager) · `contact` (email/Instagram/TikTok reali). La parte tech è stata rimossa; la sezione "L'autore" è stata rimossa nella redesign professionale.

### Design
- Palette in `src/index.css`: `--bg` #faf9f6, `--ink` #1c1915, `--accent` #9a7b50; sezione galleria/storia sempre scura (`--bg-dark` #14120f).
- Font: Italiana (display), Cormorant Garamond (testo), JetBrains Mono (meta). Il trattino lungo nei titoli va reso con `.t-dash` (serif) — quello di Italiana è quasi invisibile.
- Componenti: `PhotoFrame` (immagine + fallback neutro), `Clickable` (accessibile), `TopBar`. Niente BottomBar/CustomCursor/Curtain/Typewriter/NameReveal.

### Contenuti foto
- Eventi in `app/public/photos/<id>/` con `event.json` + `cover.jpg` + `NN.jpg`; caricati da `src/lib/events.ts` (glob).
- Script di manutenzione dati in `app/scripts/`: `clean-events.mjs` (pulizia import IG), `retitle-events.mjs` (titoli italiani "Soggetto — Luogo, anno"), `polish-events.mjs` (cover-collage → singola foto, disambiguazione titoli). Tutti idempotenti, `--dry-run` disponibile.
- Regola: le cover di Instagram possono essere collage a più pannelli con giunzioni — verificare/sostituire con una foto singola dell'evento.

### Verifica
- `npm run lint` e `npm run build` puliti. Bundle ~246 kB JS (75 kB gzip), ~9 kB CSS.
- Design validato con review a punteggio: 6.3 → 7.0 → 8.6 → **8.7/10** (round 4, approvato).

### Workflow
- `cd app && npm run dev` (porta 3000).
- Skill contenuti foto: `foto-new-event`, `foto-add-photos`, `foto-edit-event`, `foto-fetch-instagram-graph`, `foto-import-instagram-export`.
