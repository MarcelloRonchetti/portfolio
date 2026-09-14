// Portfolio data — Italian.
// Photography-first portfolio.

export type Route =
  | 'cover'
  | 'foto'
  | 'story'
  | 'about'
  | 'contact'

// Single source for the per-route book chrome: page number, curtain seal, scroll hint.
export const ROUTE_META: Record<Route, { page: string; seal: string; hint: string }> = {
  cover: { page: '01', seal: 'MR', hint: 'sfoglia la prefazione' },
  foto: { page: '04', seal: 'I', hint: 'capitolo primo' },
  story: { page: '12', seal: 'I·a', hint: 'foglio contatto' },
  about: { page: '24', seal: 'II', hint: "l'autore" },
  contact: { page: '32', seal: 'III', hint: 'contatti' },
}

export const DATA = {
  identity: {
    name: 'Marcello Ronchetti',
    initials: 'MR',
    location: 'Modena, IT',
    year: '2026',
    volume: 'VOLUME II',
    tagline: 'Una mano scrive codice.\nL\'altra alza la macchina.',
  },

  foto_chapter: {
    title: 'Il fotografo',
    subtitle: 'Sport · Motorsport · Reportage',
    intro:
      'Sport e motorsport in pista e fuori — un decimo di secondo alla volta. Pista, fango, asfalto, neve, podio.',
    pull_quote: 'L\'unica differenza tra una fotografia e un ricordo è chi la sta guardando.',
    since: '2019',
  },
}
