# Photo Portfolio & Instagram Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a photo-first, accessible portfolio that imports the owner's Instagram media daily through the official API while keeping all credentials off the public site.

**Architecture:** The Vite frontend renders local event manifests and images only. A Node 20 import script runs in GitHub Actions, uses the `INSTAGRAM_ACCESS_TOKEN` repository secret to retrieve and download eligible Instagram media, creates deterministic `app/public/photos/instagram-<media-id>/event.json` manifests, and commits only new or changed content. The state-based router is simplified to photography, biography, contact, and privacy routes; the legacy technology chapter is retained but unreachable.

**Tech Stack:** React 19, TypeScript, Vite 7, CSS custom properties, Node 20 `node:test`, GitHub Actions, Meta Instagram API.

**Spec:** `docs/superpowers/specs/2026-09-08-photo-portfolio-instagram-design.md`

## Global Constraints

- Do not expose `INSTAGRAM_ACCESS_TOKEN`, the app secret, API responses containing tokens, or `.env` files in client code, commits, or workflow logs.
- Use only the official Instagram API; do not scrape public profiles or automate messages, comments, or publication.
- Preserve existing event manifests and downloaded photographs if one import run fails or returns partial results.
- Avoid new third-party runtime dependencies for the importer; use Node 20 built-ins.
- Use sentence-case visible labels, meaningful `alt` text, native interactive elements, visible focus, WCAG-conscious contrast, and `prefers-reduced-motion` fallbacks.
- Do not add analytics, cookie banners, payment/refund copy, reviews, or unsupported claims.
- Keep the technology chapter in the repository but remove every public route and navigation entry to it.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `scripts/lib/instagram-sync.mjs` | Pure caption, tag, pagination, manifest, and file-planning helpers for the importer. |
| `scripts/sync-instagram.mjs` | CLI entry point: authenticated API fetch, media download, safe file writes, and summary logging. |
| `scripts/__tests__/instagram-sync.test.mjs` | Node built-in tests for parsing, deduplication, carousels, and safe failure behavior. |
| `.github/workflows/sync-instagram.yml` | Daily/manual scheduled importer with write-only-when-changed Git commit. |
| `.env.example` | Publicly safe list of required local importer variables, with blank values. |
| `app/src/lib/events.ts` | Event source metadata and query helpers for imported Instagram events. |
| `app/src/lib/site.ts` | Photo-only identity, contact, and policy facts rendered by public pages. |
| `app/src/pages/PhotoHome.tsx` | Professional home sequence: hero, featured event, collections, latest imported posts. |
| `app/src/pages/InfoPage.tsx` | Biography, contact, and privacy views using real site facts. |
| `app/src/components/InstagramStrip.tsx` | Accessible latest-Instagram list with explicit external links. |
| `app/src/components/SiteFooter.tsx` | Information routes, copyright, and policy navigation. |
| `app/src/App.tsx` | Photo-only routes and document title/section state. |
| `app/src/components/TopBar.tsx` | Photo-first primary navigation with `aria-current`. |
| `app/src/pages/Cover.tsx` | Removed from active build after its photo-first home replacement is wired. |
| `app/src/pages/ChapterTech.tsx` | Moved to `app/src/archive/ChapterTech.tsx`; retained but unreachable. |
| `app/src/pages/ChapterFoto.tsx` | Collection and photo-story improvements; native action elements and source links. |
| `app/src/index.css` | Paddock palette tokens, responsive composition, focus, contrast, touch cursor, and reduced-motion rules. |

### Task 1: Test and build the Instagram import domain

**Files:**
- Create: `scripts/lib/instagram-sync.mjs`
- Create: `scripts/__tests__/instagram-sync.test.mjs`
- Create: `scripts/sync-instagram.mjs`
- Create: `.env.example`

**Interfaces:**
- Produces `captionToEvent(media: InstagramMedia): EventDraft`, `expandMedia(media: InstagramMedia): InstagramAsset[]`, `isImportedEvent(path: string): boolean`, `planEvent(media: InstagramMedia, existingIds: Set<string>): ImportPlan`, and `runImport(options): Promise<{ created: number; skipped: number }>`.
- Consumes Meta media objects containing `id`, `caption`, `media_type`, `media_url`, `thumbnail_url`, `permalink`, `timestamp`, and optional `children.data`.
- Produces an `ImportPlan` with a deterministic folder name `instagram-<id>`, a valid event manifest object, and assets that later workflow code can write.

- [ ] **Step 1: Write the failing tests for caption and tag normalization**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { captionToEvent } from '../lib/instagram-sync.mjs'

test('captionToEvent uses the first meaningful caption line and normalizes hashtags', () => {
  assert.deepEqual(captionToEvent({
    id: '1789',
    caption: 'Ferrari 296 Challenge at Imola\nUn giro al tramonto. #Motorsport #Ferrari #motorsport',
    permalink: 'https://www.instagram.com/p/example/',
    timestamp: '2026-09-08T08:30:00+0000',
  }), {
    id: 'instagram-1789',
    title: 'Ferrari 296 Challenge at Imola',
    description_it: 'Un giro al tramonto.',
    tags: ['Motorsport', 'Ferrari'],
    date: '2026-09-08',
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/__tests__/instagram-sync.test.mjs`

Expected: FAIL because `scripts/lib/instagram-sync.mjs` does not exist.

- [ ] **Step 3: Add failing tests for images, carousels, videos, and deduplication**

```js
test('expandMedia keeps carousel images and uses a thumbnail-only plan for video', () => {
  const carousel = expandMedia({ media_type: 'CAROUSEL_ALBUM', children: { data: [
    { id: 'one', media_type: 'IMAGE', media_url: 'https://img/one.jpg' },
    { id: 'two', media_type: 'IMAGE', media_url: 'https://img/two.jpg' },
  ] } })
  assert.equal(carousel.length, 2)
  assert.equal(expandMedia({ media_type: 'VIDEO', thumbnail_url: 'https://img/thumb.jpg' })[0].kind, 'thumbnail')
})

test('planEvent does not replace an existing imported event', () => {
  const plan = planEvent({ id: '1789', media_type: 'IMAGE' }, new Set(['1789']))
  assert.equal(plan.action, 'skip')
})
```

- [ ] **Step 4: Implement the pure helper module**

Implement the exported helpers with these rules:

```js
export function captionToEvent({ id, caption = '', permalink = '', timestamp = '' }) {
  const lines = caption.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const title = lines.find((line) => !line.startsWith('#'))?.slice(0, 90) || 'Instagram'
  const description_it = lines.filter((line) => line !== title && !line.startsWith('#')).join('\n')
  const tags = [...new Map([...caption.matchAll(/#([\p{L}\p{N}_-]+)/gu)]
    .map((match) => [match[1].toLocaleLowerCase(), match[1].replace(/_/g, ' ')]))].map(([, tag]) => tag)
  return { id: `instagram-${id}`, title, description_it, tags: tags.length ? tags : ['Instagram'], date: timestamp.slice(0, 10), permalink }
}
```

Use the media ID, not an event title, as the identity key. `expandMedia` must retain image children in carousel order, use a thumbnail only for a video, and return no downloadable asset for an unsupported type. `planEvent` must return `{ action: 'skip' }` whenever the source media ID is already known.

- [ ] **Step 5: Run the tests to verify the helper module passes**

Run: `node --test scripts/__tests__/instagram-sync.test.mjs`

Expected: PASS with all caption, carousel, video, and duplicate cases green.

- [ ] **Step 6: Write the importer CLI and safe local configuration example**

`scripts/sync-instagram.mjs` must:

```js
const token = process.env.INSTAGRAM_ACCESS_TOKEN
if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN is required')
// Fetch paginated media with the documented media fields, pass each record to
// planEvent, write each new manifest and numbered assets atomically, and log
// only counts and permalink hostnames.
```

Use `fetch`, `fs/promises`, and `path` from Node. Write first to a temporary
folder inside `app/public/photos`, rename it only after every asset succeeds,
and leave the previous event folders untouched on every error. Generate
`event.json` with `id`, `title`, `date`, `year`, `tags`, `description_it`,
`cover`, `photos`, `links.instagram_url`, and `source: { provider: 'instagram',
media_id, media_type }`. `.env.example` contains only:

```dotenv
INSTAGRAM_ACCESS_TOKEN=
```

Export `runImport({ token, dryRun = false, fetchImpl = fetch, photosRoot })`
from this module even though the command-line entry point calls it directly;
Task 6 will use that same function for end-to-end dry-run coverage.

- [ ] **Step 7: Run import tests and a no-token smoke test**

Run: `node --test scripts/__tests__/instagram-sync.test.mjs && node scripts/sync-instagram.mjs`

Expected: tests PASS; second command exits non-zero with exactly `INSTAGRAM_ACCESS_TOKEN is required` and no secret value.

- [ ] **Step 8: Commit the importer domain**

```bash
git add scripts .env.example
git commit -m "feat: add safe Instagram media importer"
```

### Task 2: Schedule the private importer in GitHub Actions

**Files:**
- Create: `.github/workflows/sync-instagram.yml`
- Modify: `.gitignore`

**Interfaces:**
- Consumes the `INSTAGRAM_ACCESS_TOKEN` GitHub Actions secret created by the repository owner.
- Produces repository commits containing only `app/public/photos/instagram-*` additions or updates.
- Depends on: `scripts/sync-instagram.mjs` from Task 1.

- [ ] **Step 1: Write a workflow validation fixture before the workflow**

Create `scripts/__tests__/workflow.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Instagram workflow is scheduled, manually runnable, and never prints the token', async () => {
  const workflow = await readFile('.github/workflows/sync-instagram.yml', 'utf8')
  assert.match(workflow, /schedule:/)
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /INSTAGRAM_ACCESS_TOKEN/)
  assert.doesNotMatch(workflow, /echo\s+\$\{\{\s*secrets\.INSTAGRAM_ACCESS_TOKEN/i)
})
```

- [ ] **Step 2: Run the workflow test to verify it fails**

Run: `node --test scripts/__tests__/workflow.test.mjs`

Expected: FAIL because the workflow file is absent.

- [ ] **Step 3: Create the scheduled workflow**

Create a workflow with the exact high-level shape:

```yaml
name: Import Instagram media
on:
  schedule:
    - cron: '17 04 * * *'
  workflow_dispatch:
permissions:
  contents: write
jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: node scripts/sync-instagram.mjs
        env:
          INSTAGRAM_ACCESS_TOKEN: ${{ secrets.INSTAGRAM_ACCESS_TOKEN }}
      - run: |
          git diff --quiet || (
            git config user.name 'portfolio-sync[bot]'
            git config user.email 'portfolio-sync[bot]@users.noreply.github.com'
            git add app/public/photos
            git commit -m 'chore: import Instagram media'
            git push
          )
```

Set `concurrency.group` to `instagram-import` and `cancel-in-progress: false` so two runs cannot write the same event folders simultaneously. The workflow must not run `npm install`; the importer uses Node built-ins. Add an explicit `.env` comment to `.gitignore` only if the existing secret rule does not already cover `.env` and `.env.*`.

- [ ] **Step 4: Run the workflow validation test**

Run: `node --test scripts/__tests__/workflow.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the automation**

```bash
git add .github/workflows/sync-instagram.yml scripts/__tests__/workflow.test.mjs .gitignore
git commit -m "ci: schedule Instagram media import"
```

### Task 3: Make imported events first-class gallery content

**Files:**
- Modify: `app/src/lib/events.ts`
- Create: `app/src/components/InstagramStrip.tsx`
- Modify: `app/src/pages/ChapterFoto.tsx`
- Test: `app/src/lib/events.test.ts`

**Interfaces:**
- Extends `RawEvent` with optional `source?: { provider: 'instagram'; media_id: string; media_type: string }`.
- Produces `instagramEvents(limit?: number): Event[]`, ordered by `date` descending.
- `InstagramStrip` consumes `Event[]` and `onOpen(eventId: string)` and emits normal internal buttons plus a normal external Instagram anchor.

- [ ] **Step 1: Add a failing event-query test**

```ts
import { describe, expect, it } from 'vitest'
import { selectInstagramEvents } from './events'

it('returns only Instagram sourced events in newest-first order', () => {
  expect(selectInstagramEvents([
    { id: 'old', date: '2025-01-01', source: { provider: 'instagram', media_id: '1', media_type: 'IMAGE' } },
    { id: 'manual', date: '2026-01-01' },
    { id: 'new', date: '2026-02-01', source: { provider: 'instagram', media_id: '2', media_type: 'IMAGE' } },
  ]).map((event) => event.id)).toEqual(['new', 'old'])
})
```

Add `vitest` as a dev dependency and a `test` script in `app/package.json`; preserve existing build/lint scripts.

- [ ] **Step 2: Run the event-query test to verify it fails**

Run: `npm run test -- --run app/src/lib/events.test.ts`

Expected: FAIL because `selectInstagramEvents` is not exported.

- [ ] **Step 3: Implement source-aware event selection**

Add the optional source type without changing how manual manifests load. Export a pure `selectInstagramEvents(list: Event[], limit = 6)` that filters `source?.provider === 'instagram'`, sorts newest-first, and slices after sorting. Derive the public `instagramEvents` constant from `events`.

- [ ] **Step 4: Build the accessible Instagram strip**

Implement `InstagramStrip` with one `<button>` per event to open the local story and a separate `<a target="_blank" rel="noopener noreferrer">Apri il post originale</a>` only when `links.instagram_url` exists. Each preview image uses `event.title` as a baseline alt description; it is lazy-loaded and an image failure falls back to the event title/date without a decorative placeholder.

- [ ] **Step 5: Integrate the strip in the photo chapter**

Place it after the featured/collection content in `ChapterFoto`, use `instagramEvents`, and retain the existing route callback for opening a story. Do not change manual collection sorting or the existing external collection links.

- [ ] **Step 6: Run focused tests, lint, and build**

Run: `npm run test -- --run app/src/lib/events.test.ts && npm run lint && npm run build`

Expected: all commands pass.

- [ ] **Step 7: Commit gallery integration**

```bash
git add app/package.json app/package-lock.json app/src/lib/events.ts app/src/lib/events.test.ts app/src/components/InstagramStrip.tsx app/src/pages/ChapterFoto.tsx
git commit -m "feat: show imported Instagram stories"
```

### Task 4: Replace the public architecture with a photo-first home

**Files:**
- Create: `app/src/pages/PhotoHome.tsx`
- Create: `app/src/lib/site.ts`
- Modify: `app/src/lib/data.ts`
- Modify: `app/src/App.tsx`
- Modify: `app/src/components/TopBar.tsx`
- Modify: `app/src/components/BottomBar.tsx`
- Move: `app/src/pages/ChapterTech.tsx` to `app/src/archive/ChapterTech.tsx`
- Modify: `app/src/pages/Cover.tsx`
- Test: `app/src/App.test.tsx`

**Interfaces:**
- Replaces route union with `'home' | 'foto' | 'story' | 'about' | 'contact' | 'privacy'`.
- `PhotoHome` consumes `{ go: (route: Route, ref?: string) => void }`, `featuredEvent`, `collections`, and `instagramEvents`.
- `SITE` supplies real, centralized labels, Instagram URL, email address, copyright name, and privacy facts.

- [ ] **Step 1: Write failing router tests for public routes and removed technology routes**

```tsx
it('does not render a public technology navigation item', () => {
  render(<App />)
  expect(screen.queryByRole('button', { name: /lab|tecnologia|ingegnere/i })).not.toBeInTheDocument()
})

it('renders the photo-first home entry point', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /marcello ronchetti/i })).toBeVisible()
  expect(screen.getByRole('link', { name: /instagram/i })).toHaveAttribute('href', expect.stringContaining('instagram.com'))
})
```

Configure the existing Vite React test environment with `jsdom` and Testing Library dev dependencies; add a `test` script that runs Vitest.

- [ ] **Step 2: Run the router tests to verify they fail**

Run: `npm run test -- --run app/src/App.test.tsx`

Expected: FAIL because the current app exposes “il lab” and has no `PhotoHome`.

- [ ] **Step 3: Create the centralized photo-only site facts**

`app/src/lib/site.ts` must export:

```ts
export const SITE = {
  name: 'Marcello Ronchetti',
  location: 'Modena, Italia',
  disciplines: 'Motorsport · Sport · Reportage',
  instagramUrl: 'https://www.instagram.com/mr.lens/',
  email: 'marcello@ronchetti.dev',
  privacyFacts: ['Il sito non usa analytics.', 'Le preferenze di lingua e tema restano nel browser.', 'I link a Instagram aprono un servizio esterno.'],
} as const
```

Move `DATA.tech` out of the active data contract; do not delete it. Move the existing technology page into `src/archive`, add a short archive README explaining that it is intentionally not imported, and remove active references to `Project` and the former `project` route.

- [ ] **Step 4: Build the photo-first home sequence**

`PhotoHome` has native semantic sections for: hero, featured event, collections, latest Instagram imports, and a short photographer introduction. Use a primary button labelled `Esplora le raccolte`, an explicit Instagram anchor labelled `Seguimi su Instagram`, and a contact button labelled `Scrivimi`. The home must render well with no imported Instagram events and with no featured event.

Update `App`, `TopBar`, and `BottomBar` so public navigation contains Home, Raccolte, Il fotografo, Contatti, and Instagram; it must expose `aria-current="page"` on the active in-app item. Delete no source content other than unreferenced import statements; `Cover.tsx` may be removed from the active module graph after `PhotoHome` is in use.

- [ ] **Step 5: Run router tests, lint, and build**

Run: `npm run test -- --run app/src/App.test.tsx && npm run lint && npm run build`

Expected: all commands pass and the production build has no public technology route.

- [ ] **Step 6: Commit the photo-first architecture**

```bash
git add app/src
git commit -m "feat: make photography the public portfolio"
```

### Task 5: Add professional information pages and accessibility polish

**Files:**
- Create: `app/src/pages/InfoPage.tsx`
- Create: `app/src/components/SiteFooter.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/src/pages/ChapterFoto.tsx`
- Modify: `app/src/index.css`
- Test: `app/src/pages/InfoPage.test.tsx`

**Interfaces:**
- `InfoPage` consumes `kind: 'about' | 'contact' | 'privacy'`, `SITE`, and `go`.
- `SiteFooter` consumes `onNavigate(route: 'about' | 'contact' | 'privacy'): void`.
- Produces policy text that matches only `SITE.privacyFacts`; no marketing claims or legal promises are fabricated.

- [ ] **Step 1: Write failing information-page tests**

```tsx
it('explains actual browser storage and external Instagram links on the privacy page', () => {
  render(<InfoPage kind="privacy" go={vi.fn()} />)
  expect(screen.getByRole('heading', { name: /privacy/i })).toBeVisible()
  expect(screen.getByText(/preferenze di lingua e tema/i)).toBeVisible()
  expect(screen.queryByText(/cookie banner/i)).not.toBeInTheDocument()
})

it('uses a direct email link instead of an unimplemented form', () => {
  render(<InfoPage kind="contact" go={vi.fn()} />)
  expect(screen.getByRole('link', { name: /scrivi via email/i })).toHaveAttribute('href', expect.stringMatching(/^mailto:/))
})
```

- [ ] **Step 2: Run the information-page tests to verify they fail**

Run: `npm run test -- --run app/src/pages/InfoPage.test.tsx`

Expected: FAIL because `InfoPage` does not exist.

- [ ] **Step 3: Implement accurate biography, contact, and privacy pages**

Implement a single semantic `InfoPage` with `<main>`, one `<h1>`, normal paragraphs/lists, a `mailto:` contact link, the real Instagram URL, and no data-submitting form. The privacy page must say that local theme/language preferences use browser storage, no analytics is enabled, and Instagram is an external service once a visitor follows its link. Add `SiteFooter` to every public route with buttons for About, Contatti, and Privacy plus copyright text from `SITE`.

- [ ] **Step 4: Replace non-native collection interactions**

Change all clickable collection/story wrappers in `ChapterFoto` to `<button type="button">` elements or named `<a>` elements. Preserve layout styles, add visible labels, and ensure an external Instagram link does not trigger the enclosing internal story action.

- [ ] **Step 5: Add focused accessibility and responsive CSS**

Add:

```css
:focus-visible { outline: 2px solid var(--brass); outline-offset: 4px; }
@media (pointer: coarse) { body.has-custom-cursor, body.has-custom-cursor * { cursor: auto !important; } .cursor { display: none; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; } }
```

Add mobile breakpoints that turn the hero/text split, collection grid, top navigation, and information-page columns into one-column layouts before overflow occurs. Use the approved paddock tokens from the spec and keep solid, readable surfaces behind text laid over photography.

- [ ] **Step 6: Run information tests, full test suite, lint, and build**

Run: `npm run test -- --run && npm run lint && npm run build`

Expected: all commands pass.

- [ ] **Step 7: Perform visual QA**

Run the Vite preview and inspect at 1440px and 390px wide. Confirm: full navigation is visible or deliberately collapsed; focus is visible; no text sits on an unreadable photo area; empty Instagram state is clear; original post links show as external; privacy text matches the implemented behavior.

- [ ] **Step 8: Commit the professional finish**

```bash
git add app/src
git commit -m "feat: add accessible portfolio information"
```

### Task 6: Verify the end-to-end automation and deploy behavior

**Files:**
- Modify: `.github/workflows/sync-instagram.yml` only if validation finds a defect
- Modify: `README.md` only if a user-facing repository setup note is absent

**Interfaces:**
- Consumes `INSTAGRAM_ACCESS_TOKEN` secret and the generated static manifests.
- Produces an import commit that triggers the existing `.github/workflows/deploy.yml` deployment workflow.

- [ ] **Step 1: Add a dry-run importer test case**

```js
test('dry-run reports planned writes without creating a media folder', async () => {
  const result = await runImport({ token: 'test', dryRun: true, fetchImpl: fakeFetch, photosRoot: temporaryDirectory })
  assert.equal(result.created, 1)
  assert.equal(await exists(join(temporaryDirectory, 'instagram-1789')), false)
})
```

- [ ] **Step 2: Run the dry-run test to verify it fails**

Run: `node --test scripts/__tests__/instagram-sync.test.mjs`

Expected: FAIL because the CLI does not yet expose injectable dry-run execution.

- [ ] **Step 3: Extend `runImport` with `--dry-run`**

Extend the exported `runImport({ token, dryRun = false, fetchImpl = fetch, photosRoot })` function so the command-line entry point can parse `--dry-run`; this mode may fetch metadata but never downloads assets, makes directories, or writes manifests. The normal path calls the same function, so its tested behavior is exactly the scheduled behavior.

- [ ] **Step 4: Run all importer and workflow tests**

Run: `node --test scripts/__tests__/*.test.mjs`

Expected: PASS, including missing token, captions, carousel, videos, duplicate source IDs, workflow safety, and dry run.

- [ ] **Step 5: Trigger and inspect the workflow manually in GitHub**

From the Actions tab, run “Import Instagram media” once. Confirm it either commits at least one `instagram-*` event folder or reports “0 new media”; confirm the GitHub Pages deployment workflow then starts only if an import commit was created. If Meta returns an authorization error, stop and renew the token in the repository secret; do not weaken workflow logging or add the secret to any file.

- [ ] **Step 6: Commit only required final corrections**

```bash
git add .github/workflows/sync-instagram.yml scripts README.md
git commit -m "fix: verify Instagram import automation"
```
