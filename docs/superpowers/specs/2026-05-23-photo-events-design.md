# Photo events — content system & skills

Stato: 2026-05-23. Sostituisce i placeholder del capitolo II ("La Lente") con un sistema content-driven per gli eventi fotografici.

## Obiettivo

L'utente deve poter aggiungere/modificare eventi fotografici (raccolte) senza toccare il codice TypeScript. Ogni evento ha:
- descrizione e metadati,
- una cover + una lista di foto,
- link opzionali a galleria esterna (Google Photos / Drive / Flickr) e a un post Instagram.

Tre operazioni vanno comandate via skill globale: creare evento, aggiungere foto, modificare metadati.

## Architettura

### Storage

```
app/public/photos/<event-id>/
  event.json     ← manifest tipizzato
  cover.jpg
  01.jpg, 02.jpg, ...
```

Una cartella = un evento. L'`event-id` è il nome cartella (kebab-case, es. `mugello-2025-motogp`).

### Manifest `event.json`

```ts
type Event = {
  id: string                  // = nome cartella (validato a load time)
  tag: string                 // 'MotoGP' | 'WRC' | 'F1' | 'MX' | ... (libero)
  title: string               // 'Mugello'
  year: string                // '2025'
  subtitle: string            // 'MotoGP — Gran Premio d\'Italia'
  location: string
  date: string                // ISO 'YYYY-MM-DD'
  hue: 'oxblood' | 'brass' | 'leather'
  no?: string                 // numero romano 'I' | 'II' | ... (auto-assegnato se omesso)
  description_it: string
  description_en?: string
  specs?: string              // exposure info dello scatto principale
  gear?: { body?: string; lens?: string }
  cover: string               // nome file relativo nella cartella, es. 'cover.jpg'
  photos: string[]            // ['01.jpg', '02.jpg', ...]
  links?: {
    gallery_url?: string
    instagram_url?: string
    external_url?: string
  }
  featured?: boolean          // se true, è l'evento mostrato nell'hero del chapter
  base_url?: string           // opzionale: prefisso CDN custom (default: cartella locale)
}
```

### Loader: `app/src/lib/events.ts`

Usa `import.meta.glob('/photos/*/event.json', { eager: true })` per importare tutti i manifest a build time. Espone:

```ts
export const events: Event[]                       // ordinato per date desc
export const collections: Collection[]              // derivato da events (tag, count, hue, no, desc)
export const featuredEvent: Event | undefined       // events.find(e => e.featured) ?? events[0]
export function eventByTag(tag: string): Event[]    // tutti gli eventi di un tag
export function eventById(id: string): Event | undefined
export function photoUrl(e: Event, file: string): string  // base_url ?? `/photos/${e.id}/` + file
```

Validazione a load time: se mancano campi obbligatori, errore in console + skip dell'evento.

### Modifiche pagine

**`ChapterFoto.tsx`**:
- `featured` block → consuma `featuredEvent` da `events.ts` (hero image = `photoUrl(featuredEvent, featuredEvent.cover)`)
- `collections` grid → `collections` da `events.ts`
- `selezioni` list → primi N eventi non-featured ordinati per data desc
- `CollectionCard` renderizza piccola icona IG / link gallery se l'evento di quel tag ce l'ha (footer della card)

**`PhotoStory.tsx`**:
- Riceve `eventId` invece di `tag`. Fallback: se gli arriva un tag, prende il primo evento di quel tag.
- Hero = cover reale (`<img>` dentro `.frame`)
- Foglio contatto = `event.photos.map(...)` (non più `Array.from({length:16})`)
- Diario di bordo = `event.description_it`
- Footer link: se `event.links.instagram_url` o `gallery_url`, mostra bottoni dedicati
- Prev/next pager: deriva da posizione in `events` ordinati per data

**`data.ts`**: rimuove `DATA.foto` (sostituito da `events.ts`), mantiene `identity` e `tech`.

### Hue auto-assign del numero romano

Per non costringere l'utente a scegliere `no` manualmente: ordinato `events` per data desc, assegna `I, II, III, ...` in ordine di apparizione fra le **collezioni uniche per tag**.

## Skills (in `~/.claude/skills/`)

Tutte e tre validano CWD: devono trovarsi sotto `/home/marci/Projects/portfolio` o segnalare errore.

### `foto-new-event`

Trigger: "nuovo evento foto", "aggiungi evento", "crea raccolta foto", "/foto-new-event".

Flusso:
1. Chiede in sequenza: title, year, tag, subtitle, location, date (YYYY-MM-DD), hue, description_it, instagram_url (opt), gallery_url (opt), featured (default false).
2. Calcola `id` da `slugify(title + '-' + year + '-' + tag)`.
3. Verifica che la cartella `app/public/photos/<id>/` non esista. Se esiste, errore + propone variazione.
4. Crea cartella + scrive `event.json` con `photos: []` e `cover: "cover.jpg"`.
5. Stampa istruzioni: "ora droppa la cover come `cover.jpg` e altre foto, poi lancia `/foto-add-photos <id>`".

### `foto-add-photos`

Trigger: "aggiungi foto", "/foto-add-photos", "metti foto nell'evento X".

Flusso:
1. Chiede `id` (o lo deduce dall'argomento). Lista eventi esistenti se ambiguo.
2. Chiede percorso di origine (file o directory).
3. Per ogni immagine: copia in `app/public/photos/<id>/` con nome sequenziale `01.jpg`, `02.jpg`, ... (continuando dal max esistente).
4. Aggiorna `photos[]` nell'`event.json`.
5. Se `cwebp` / `sharp-cli` disponibili: chiede se ottimizzare (resize max 2400px lato lungo, quality 82, JPEG progressive). Salta se non installati.
6. Stampa risultato e nuovo conteggio foto.

### `foto-edit-event`

Trigger: "modifica evento foto", "edita raccolta", "/foto-edit-event".

Flusso:
1. Lista eventi disponibili, chiede quale modificare.
2. Mostra `event.json` attuale, chiede quale campo cambiare (menu).
3. Applica modifica, re-scrive il JSON formattato.
4. Validazione: se cambia `featured: true`, azzera `featured` su tutti gli altri.

## Seed iniziale

Due cartelle esempio che dimostrano il pattern, **senza immagini reali**:

- `app/public/photos/mugello-2025-motogp/event.json` (featured: true, deriva dai placeholder esistenti in `data.ts`)
- `app/public/photos/sardegna-2025-wrc/event.json`

Le foto `cover.jpg`, `01.jpg`, ... vengono droppate dall'utente. Finché mancano, il `<img>` cade su un fallback (manteniamo `.frame` come placeholder visivo quando il file 404a — onError handler).

## Hosting

V1: foto in `app/public/photos/`. Deploy via GitHub Pages, dimensioni stimate < 500 MB tollerabili.

V2 (futuro, non in scope): migrazione a Cloudflare R2. Basta valorizzare `base_url` nell'`event.json` (es. `https://cdn.marcello.dev/photos/mugello-2025-motogp/`) — il loader concatena `base_url + file`. Nessun cambio di codice.

## Out of scope (esplicito)

- Per-photo metadata (caption, specs per scatto): no.
- Caricamento foto da UI in-browser: no.
- Galleria lightbox: no (basta il foglio contatto attuale, con eventuale `gallery_url` esterno).
- Internationalization completa: solo `description_it`/`description_en`, il resto resta IT.
- Editing dei testi del chapter (intro, pull quote): restano in `data.ts` (sezione `foto_chapter`).

## Verifica finale

- `npm run build` deve passare con 0 errori type-check.
- Con 0 eventi nel manifest: pagina foto mostra empty state, non si rompe.
- Con 1 evento featured: appare nell'hero del chapter.
- Con eventi senza link: card non renderizza icone (no broken UI).
- `<img onError>` ricade su placeholder `.frame` se la cover manca.
