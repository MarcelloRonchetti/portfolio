import type { Route } from './data'
import { getAllCustomHeroes } from './customHero'
import { createHeroSequence } from './heroSequence'

// ── L'indice della home: le pagine del sito come stampe ─────────────────────
// Condiviso da Cover (orchestratore + HUD), FlyDeck (riserva CSS) e HomeScene
// (scena WebGL): stessi testi, stesso ordine, stesse immagini segnaposto.
// Le anteprime sono studi di luce generati finché le animazioni non sono
// chiuse: sostituirle con foto vere = campo `img` di FlyTarget.

export type FlyTarget = {
  route: Route
  label: string
  note: string
  img: string
}

// Riserva: usa un unico SVG finché non ci sono foto locali nella cartella
// hero/. Quando le foto sono presenti, le 4 stampe ricevono immagini reali.
function flyPlaceholder(i: number): string {
  const angle = -16 + i * 8
  const glowX = 36 + i * 9
  const svg = [
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 1000' preserveAspectRatio='xMidYMid slice'>",
    '<defs>',
    "<linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>",
    "<stop offset='0' stop-color='#332b22'/><stop offset='.55' stop-color='#1d1712'/><stop offset='1' stop-color='#110d0a'/>",
    '</linearGradient>',
    `<radialGradient id='glow' cx='${glowX}%' cy='30%' r='70%'>`,
    "<stop offset='0' stop-color='rgba(212,183,138,.34)'/><stop offset='1' stop-color='rgba(212,183,138,0)'/>",
    '</radialGradient>',
    "<linearGradient id='beam' x1='0' y1='0' x2='1' y2='0'>",
    "<stop offset='.38' stop-color='rgba(255,240,218,0)'/><stop offset='.5' stop-color='rgba(255,240,218,.14)'/><stop offset='.62' stop-color='rgba(255,240,218,0)'/>",
    '</linearGradient>',
    "<radialGradient id='vig' cx='50%' cy='46%' r='78%'>",
    "<stop offset='.55' stop-color='rgba(0,0,0,0)'/><stop offset='1' stop-color='rgba(0,0,0,.44)'/>",
    '</radialGradient>',
    "<filter id='grain' x='0' y='0' width='100%' height='100%'>",
    "<feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/>",
    "<feColorMatrix type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .05 0'/>",
    '</filter>',
    '</defs>',
    "<rect width='1600' height='1000' fill='url(#bg)'/>",
    "<rect width='1600' height='1000' fill='url(#glow)'/>",
    `<g transform='rotate(${angle} 800 500)'><rect x='-300' y='360' width='2200' height='280' fill='url(#beam)'/></g>`,
    "<rect width='1600' height='1000' fill='#000' filter='url(#grain)'/>",
    "<rect width='1600' height='1000' fill='url(#vig)'/>",
    "<rect x='16' y='16' width='1568' height='968' fill='none' stroke='rgba(255,255,255,.05)' stroke-width='1'/>",
    '</svg>',
  ].join('')
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const customHeroUrls = createHeroSequence(
  getAllCustomHeroes().map((hero) => hero.src),
  4
)

export const FLY_TARGETS: FlyTarget[] = [
  {
    route: 'gallery',
    label: 'Galleria',
    note: 'Le raccolte per categoria',
    img: customHeroUrls[0] ?? flyPlaceholder(0),
  },
  {
    route: 'videos',
    label: 'Video',
    note: 'I filmati dell’archivio',
    img: customHeroUrls[1] ?? flyPlaceholder(1),
  },
  {
    route: 'experience',
    label: 'Le sale immersive',
    note: 'Il percorso 3D per tema',
    img: customHeroUrls[2] ?? flyPlaceholder(2),
  },
  {
    route: 'contact',
    label: 'Contatti',
    note: 'Commissioni e collaborazioni',
    img: customHeroUrls[3] ?? flyPlaceholder(3),
  },
]

// La scena WebGL parte solo se il dispositivo ha un contesto GL: altrimenti
// resta la pila CSS (FlyDeck), che è già un degradamento accettabile. La
// sonda rilascia il proprio contesto (i browser ne contano pochi per pagina)
// e il risultato è memoizzato: Cover monta una volta sola.
let glProbeCache: boolean | null = null
export function webglSupported(): boolean {
  if (glProbeCache !== null) return glProbeCache
  try {
    const probe = document.createElement('canvas')
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl')
    glProbeCache = Boolean(gl)
    if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    glProbeCache = false
  }
  return glProbeCache
}
