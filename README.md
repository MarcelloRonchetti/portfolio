# Marcello Ronchetti — Portfolio

Photography portfolio for **Marcello Ronchetti**, sports & motorsport photographer based in Modena, Italy.

**Live site:** [marcelloronchetti.github.io/portfolio](https://marcelloronchetti.github.io/portfolio/)

Sport · motorsport · reportage. A quiet, editorial design: warm paper, ink, one muted accent — the photographs are the only saturated element on the page.

## What's inside

- **Cover** — full-screen hero photograph (slow carousel of hand-picked masters) and a gallery index.
- **Galleria** — collections grouped by category, with a live index of remote collections.
- **Storie** — each collection opens as a photo story with a carousel, thumbnails and a full lightbox.
- **Video** — HD films from the archive, in dedicated tabs.
- **Contatti** — verified contacts and a one-click CV download.
- **Client rooms** (`/room/<id>`) — private, password-protected galleries for client photo proofing.

No cookies, no tracking, no third-party fonts (all typefaces are self-hosted).

## Stack

- [Vite 7](https://vitejs.dev/) + [React 19](https://react.dev/) + TypeScript
- [react-router-dom v7](https://reactrouter.com/) — multipage routing with prerendered pages per route
- Self-hosted fonts via [Fontsource](https://fontsource.org/) (Archivo Variable, IBM Plex Mono)
- Deployed to GitHub Pages via GitHub Actions

## How the content works

- **Local events** live in `app/public/photos/<id>/` — one `event.json` manifest + `cover.jpg` + photos. They are picked up at build time and drive the gallery, the stories and the generated SEO pages.
- **Google Drive archive** — photos and videos are pulled client-side from a public Drive folder (Drive API v3 with a read-only API key, no OAuth, no backend). Categories, collections and video tabs grow automatically from the Drive folder structure.
- **SEO assets** — `app/scripts/generate-seo-assets.mjs` runs after `vite build` and generates `sitemap.xml` plus prerendered pages (`/story/<id>/`, `/gallery/<slug>/`, `/videos/`, `/contact/`) with per-page title/description/JSON-LD.
- **Hero images** — full-resolution masters dropped into `app/public/hero/` (see [its README](app/public/hero/README.md)) power the cover carousel.

## Development

```bash
cd app
npm install
npm run dev       # dev server on http://localhost:3000/portfolio/
npm run lint      # eslint
npm run build     # type-check + vite build + SEO asset generation
npm test          # unit tests — requires Node ≥ 22.6 (type-stripping test runner)
```

## Deployment

Pushes to `main` build and deploy automatically to GitHub Pages through GitHub Actions.

## Copyright

All photographs and videos are © Marcello Ronchetti — all rights reserved. They may not be reproduced, distributed or used without written permission. For licensing and commissions: [ronchettimarcello@gmail.com](mailto:ronchettimarcello@gmail.com).
