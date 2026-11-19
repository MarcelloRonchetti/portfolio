// Checks for custom high-resolution hero images placed in app/public/hero/.
// Any camera masters placed in public/hero/ (e.g. porsche.jpg, ferrari.jpg, 01.jpg)
// will be detected for the home-page carousel and the 3D print corridor.

const heroModules = import.meta.glob(
  '/public/hero/*.webp',
  { eager: true, query: '?url', import: 'default' }
)

export type CustomHero = {
  name: string
  src: string
}

export function getAllCustomHeroes(): CustomHero[] {
  const keys = Object.keys(heroModules)
  if (keys.length === 0) return []

  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  return keys.map((masterKey) => {
    const masterName = masterKey.split('/').pop()!
    const baseName = masterName.replace(/\.webp$/i, '')
    const masterSrc = `${base}/hero/${masterName}`

    return {
      name: baseName,
      src: masterSrc,
    }
  })
}

export function getRandomCustomHero(): CustomHero | null {
  const all = getAllCustomHeroes()
  if (all.length === 0) return null
  const idx = Math.floor(Math.random() * all.length)
  return all[idx]
}

export function getCustomHero(): CustomHero | null {
  return getRandomCustomHero()
}
