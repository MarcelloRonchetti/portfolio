# Portfolio — Marcello Ronchetti

Riassunto dello stato del repo dopo l'implementazione del design "Diptych" esportato da Claude Design (handoff `sitopersonale`).

## Cosa è stato fatto

### Architettura adottata
- Sostituito il vecchio portfolio (HeroSection/ProfiloSection/ProgettiSection… + ThreeBackground) con il nuovo design editoriale "diptych" (bone + brass + oxblood).
- Mantenuto lo stack esistente: **Vite + React 19 + TypeScript + Tailwind** (le utility Tailwind restano disponibili, ma il design usa principalmente CSS variables + inline styles, come il prototipo).
- Routing **state-based** + transizione "curtain" (5 pannelli, sigillo centrale) — niente `react-router` per ora: la navigazione è single-state con persistenza in `localStorage` (chiavi `mr.route`, `mr.projectId`, `mr.storyTag`, `mr.lang`, `mr.theme`).

### File creati / modificati
- [app/index.html](app/index.html) — fonts Google (Italiana, Cormorant Garamond, JetBrains Mono), theme-color `#1a130e`.
- [app/src/index.css](app/src/index.css) — port completo di `portfolio.css`: variabili palette, scale tipografica, animazioni `riseFade`/`fadeIn`/`shimmer`, classi `t-display`/`t-italic`/`t-meta`/`t-micro`, chrome top/bottom, custom cursor, curtain transition, `.frame` placeholder fotografici.
- [app/src/main.tsx](app/src/main.tsx) — rimosso `BrowserRouter` (non più necessario).
- [app/src/lib/data.ts](app/src/lib/data.ts) — `DATA` tipizzato (Project, Collection, Route) con contenuto placeholder italiano.
- Components (in [app/src/components/](app/src/components/)):
  - `TopBar.tsx` — brand M—R, nav, switch IT/EN + light/dark.
  - `BottomBar.tsx` — numero pagina, scroll-hint, pager.
  - `CustomCursor.tsx` — cursore custom con lerp + hover variants (`default`/`lg`/`xl`/`text`) via `data-cursor` / `data-cursor-label`.
  - `Curtain.tsx` — pannelli di transizione + hook `useCurtain`.
  - `FramePhoto.tsx`, `NameReveal.tsx`, `Typewriter.tsx` — helper visuali.
- Pages (in [app/src/pages/](app/src/pages/)):
  - `Cover.tsx` — `<Cover>` (copertina con nome animato + tagline typewriter + 2 chapter card) e `<Preface>` (prefazione + INDICE cliccabile).
  - `ChapterTech.tsx` — `<ChapterTech>` (capitolo I — "Il Lab" con featured project, lista altri lavori, skills cluster, certificazioni) e `<ProjectDetail>` (caso-studio + estratto codice).
  - `ChapterFoto.tsx` — `<ChapterFoto>` (capitolo II — "La Lente": hero scuro full-bleed, pull-quote, raccolte, selezioni) e `<PhotoStory>` (storia foto con contact-sheet).
  - `Placeholder.tsx` — about/contact provvisori.
- [app/src/App.tsx](app/src/App.tsx) — root: routing + curtain + persistenza tema/lingua.

### File rimossi (vecchio design)
- `src/sections/*` (Navbar, HeroSection, Profilo, Competenze, Progetti, Formazione, Certificazioni, Footer).
- `src/components/{ThreeBackground,ProjectCard,SectionLabel,SkillTag,DownloadCVButton}.tsx`.
- `src/pages/Home.tsx`, `src/App.css`.

### Verifica
- `npm run build` passa pulito (tsc -b + vite build, 41 moduli, ~256 kB JS / ~85 kB CSS prima della gzip).

## Cose da fare

### Contenuti / dati reali
- Sostituire i placeholder in [app/src/lib/data.ts](app/src/lib/data.ts) con CV reale (progetti, summary, problem/approach/outcome, stats).
- Riempire about/contact (`Placeholder.tsx`) con biografia vera, link social funzionanti, possibilmente con un piccolo form.
- Tradurre i testi quando l'utente cambia lingua: oggi `lang` è solo uno state visuale, i contenuti `_it` sono cablati. Servono varianti `_en` complete e una funzione di selezione (es. `t(key, lang)`).

### Immagini reali
- Le foto sono attualmente "placeholder cinematici" (gradient via `.frame`). Sostituire con immagini vere:
  - Hero capitolo II (curva di Borgo San Lorenzo).
  - Hero progetto in featured (PCB greenhouse).
  - Contact-sheet 16 thumbnail nel `PhotoStory`.
  - Le secondary spreads 4:5 (paddock alba / scarperia).
- Le foto vanno in `app/public/photos/` (la cartella `/photos` esiste già a root del repo: spostala in `app/public/photos/` per servirle da Vite).
- Aggiungere `loading="lazy"` e formati moderni (AVIF/WebP) per le immagini di galleria.

### Routing / SEO / share
- Valutare il passaggio a `react-router` (è già nelle deps): vantaggi — URL condivisibili (`/lab`, `/foto/MotoGP`, `/progetti/greenhouse-controller`), back-button del browser, SEO.
- Con routing reale: aggiungere `<meta>` per Open Graph e Twitter Cards (un png/jpeg di anteprima per chapter).
- L'attuale routing state-based vive in `localStorage`: ottimo per UX di sfoglio, pessimo per condivisione.

### Funzionalità incompiute nel design
- I bottoni "I · II · III →" nel `BottomBar` non hanno ancora dei target — sono solo decorativi.
- Sub-nav di `ChapterTech` (`progetti / skills / esperienza / certificazioni / playground`) non ha state di selezione, le altre voci sono inerti.
- Le frecce di pager in `ProjectDetail` e `PhotoStory` puntano sempre indietro al chapter (← rtos-audio-synth / pose-bike-fitter →): da implementare next/prev reale derivato da `DATA.tech.projects`.
- Light/Dark toggle è implementato a livello CSS (`data-theme="dark"`), ma le palette dei chapters scuri (foto/story) sono cablate sul tema chiaro. In dark mode pure rimangono comunque scuri — verificare se è il comportamento desiderato.

### Accessibilità / UX
- Custom cursor: aggiungere `@media (pointer: coarse) { body.has-custom-cursor * { cursor: auto !important; } }` per i touch device. Oggi su mobile il cursore custom è invisibile ma rimane il `cursor: none`.
- Aggiungere `:focus-visible` styles sui bottoni della nav (oggi sono `border: 0; background: transparent`).
- `aria-current` sulla voce attiva nel `TopBar`.
- Reduced motion: avvolgere le animazioni `riseFade`/`fadeIn`/`Typewriter`/`Curtain` in `@media (prefers-reduced-motion: reduce)` con varianti istantanee.
- I clic su righe (ProjectRow, CollectionCard, story rows) sono su `<div>`: sostituire con `<button>` o aggiungere `role="button"` + `tabIndex={0}` + keyboard handler.

### Performance
- Le animazioni del curtain triggerano layout: già usano `transform`, ma su pagine lunghe (Tech, Foto) considerare `content-visibility: auto` per i blocchi sotto la fold.
- Font: si caricano tutti i pesi 300–700 di Cormorant + le italic. Restringere ai pesi davvero usati (400, 500, italic 400) per ridurre il peso del woff2.
- Build attuale: 256 kB JS / 85 kB CSS — la maggior parte è React + Tailwind reset. Tailwind purga già il prod, ma molte utility importate via `tailwind.config.js`/shadcn potrebbero essere droppate se non più usate (vedi prossima sezione).

### Pulizia residua
- Le 40+ componenti `shadcn` in [app/src/components/ui/](app/src/components/ui/) **non sono più usate** dal nuovo design. Decidere se rimuoverle (riduce drasticamente il footprint del repo) o tenerle disponibili per about/contact futuri.
- `tailwind.config.js` definisce colori (`mint`, `electric-blue`, `void`…) ereditati dal vecchio design: ora obsoleti. Allinearli alla palette diptych (`bone`, `brass`, `oxblood`, `ink`, `leather`) — oppure rimuoverli del tutto, dato che il nuovo design usa CSS vars direttamente.
- `package.json` ha `gsap`, `three`, `@types/three`, `recharts` — non più usati. Possibile rimozione.

## Consigli

### Sul design
- Il prototipo era HTML/JSX renderizzato via Babel-in-browser. Nel porto a React 19+TS abbiamo perso `<Babel>` (vantaggio: build più veloce, type-safety); abbiamo guadagnato strict types ma anche più boilerplate sugli inline styles. Se in futuro si rifattorizzano i blocchi più ripetuti (`.frame`, `t-meta`, le righe di lista), conviene fare 2–3 componenti riusabili (`<Row>`, `<MetaTag>`) per dimezzare i file.
- Le **misure verticali** (clamp + vh) sono testate solo su desktop wide. Sotto i ~900px di larghezza la composizione "diptych" 2 colonne va riscritta a 1 colonna in più punti (Cover, Preface, ChapterTech featured, PhotoStory hero+sidebar). Aggiungere media queries in `index.css`.
- Le animazioni "anim-rise" partono `both`: il primo paint mostra opacity 0 finché il delay scatta. Per i contenuti critici (intro), considerare un fallback `prefers-reduced-motion` o ridurre i delay massimi (oggi 1.05s).

### Workflow consigliato
- `cd app && npm run dev` per il dev server.
- Tieni aperto il bundle del design originale (`/tmp/design_extract/sitopersonale/project/`) come riferimento — il `portfolio-app.jsx` mostra il pattern di routing, `portfolio-data.jsx` è la fonte di verità per il dataset.
- Quando aggiungi una nuova sezione (`playground`, ad esempio), copia il pattern di `Placeholder.tsx`: stesso shell + stessa breadcrumb stylesheet.

### Deploy
- Esiste già un workflow GitHub Pages ([deploy.yml](deploy.yml)). Quando si abbandona il sub-path `/portfolio/`, ricordarsi di aggiornare `base` in `vite.config.ts` e l'eventuale `basename` di `react-router` (oggi assente).

### Rischi noti
- Lo state-routing salva `route='project'` in `localStorage` ma `projectId` è una stringa libera — se si rinomina un progetto in `DATA`, gli utenti che ricaricano restano su uno state inconsistente (fallback già gestito: prende `DATA.tech.projects[0]`).
- `data-cursor` lavora con `closest()` su ogni `mouseover`: ok per il volume del portfolio, ma se aggiungi liste molto lunghe valuta un throttle.
