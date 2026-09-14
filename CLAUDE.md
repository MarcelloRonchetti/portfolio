# Portfolio — Marcello Ronchetti

Portfolio fotografico (sport · motorsport · reportage). Design editoriale "Diptych" (bone + brass + oxblood), metafora del libro: copertina → prefazione → capitoli.

## Stato attuale (aggiornato a settembre 2026)

### Struttura
- **Vite 7 + React 19 + TypeScript** in `app/`, deploy su GitHub Pages (base `/portfolio/`).
- Routing **state-based** con persistenza `localStorage` (`mr.route`, `mr.storyId`, `mr.theme`). Il toggle IT/EN è stato rimosso: il sito è solo italiano.
- Route: `cover` · `foto` (Capitolo Primo — La Lente) · `story` (foglio di contatto) · `about` · `contact`. La parte tech/informatica (capitolo "Il Lab", progetti, skills, certificazioni) è stata **rimossa** su richiesta: il portfolio è solo fotografia.
- Deep link: `404.html` reindirizza a `/?p=<path>`, `App.tsx` ripristina la route (le route persistite non valide cadono su `cover`).

### Contenuti foto
- Ogni evento vive in `app/public/photos/<id>/` con `event.json` + `cover.jpg` + `NN.jpg`; caricati a build time da `src/lib/events.ts` (glob).
- I numeri romani delle raccolte sono assegnati in un'unica passata (`tagNumerals`) per tag, in ordine di data desc.
- Gli eventi importati da Instagram sono stati riparati da `app/scripts/clean-events.mjs` (titoli completati, emoji/hashtag/mention rimossi, descrizioni ripulite, locazione/soggetto derivati). Rilanciabile con `--dry-run`.

### Componenti chiave
- `components/PhotoFrame.tsx` — unico componente frame (placeholder cinematografico + `<img>` reale con fallback onError).
- `components/Clickable.tsx` — div cliccabile accessibile (role=button, keyboard, data-cursor).
- `components/useCurtain.ts` + `Curtain.tsx` — transizione a tendina.
- `lib/data.ts` — `DATA` (identità + capitolo foto) e `ROUTE_META` (numero pagina, sigillo, hint per route).
- CSS: tutto in `src/index.css` (variabili palette, scale tipografiche con clamp mobile-safe, classi hover condivise `.hover-card/.hover-row/.hover-rise/.pill`, griglie con breakpoint ≤900/640/480, reduced-motion, focus-visible).

### Verifica
- `npm run lint` e `npm run build` puliti. Bundle ~267 kB JS (81 kB gzip), ~14 kB CSS.

## Cose da fare
- Riempire about/contact (`Placeholder.tsx`) con biografia completa, link social funzionanti, CV.
- La tagline di copertina ("Una mano scrive codice…") è rimasta: se non la si vuole più, cambiarla in `data.ts` (`identity.tagline`) e in `index.html` (meta description).
- Il codice fiscale dei contenuti: alcune descrizioni evento sono vuote (titoli autoportanti) — la UI nasconde il blocco "Diario di bordo" quando vuoto.
- Considerare `content-visibility: auto` per i blocchi sotto la fold nelle pagine lunghe.
- Open Graph / Twitter Cards per la condivisione (serve un'immagine di anteprima).

### Workflow
- `cd app && npm run dev` (porta 3000).
- Skill per i contenuti foto: `foto-new-event`, `foto-add-photos`, `foto-edit-event`, `foto-fetch-instagram-graph`, `foto-import-instagram-export`.
