// Checks for custom high-resolution hero images placed in app/public/hero/.
// Any camera masters placed in public/hero/ (e.g. porsche.jpg, ferrari.jpg, 01.jpg)
// will be detected for the home-page carousel and the 3D print corridor.

const heroModules = import.meta.glob(
  '/public/hero/*.{jpg,jpeg,png,webp,avif}',
  { eager: true, query: '?url', import: 'default' }
)

export type CustomHero = {
  name: string
  src: string
  srcSet?: string
}

export function getAllCustomHeroes(): CustomHero[] {
  const keys = Object.keys(heroModules)
  if (keys.length === 0) return []

  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  // Ignore generated derivative variants (-1440, -2560, -3840) to find only original masters
  const nonVariants = keys.filter((k) => !/-(1440|2560|3840)\./i.test(k))

  return nonVariants.map((masterKey) => {
    const masterName = masterKey.split('/').pop()!
    const baseName = masterName.replace(/\.[^.]+$/, '')
    const ext = masterName.split('.').pop() ?? 'jpg'
    const masterSrc = `${base}/hero/${masterName}`

    const variants = [1440, 2560, 3840]
    const foundVariants = variants.filter((w) =>
      keys.some((k) => k.endsWith(`/${baseName}-${w}.${ext}`))
    )

    let srcSet: string | undefined
    if (foundVariants.length > 0) {
      srcSet = foundVariants.map((w) => `${base}/hero/${baseName}-${w}.${ext} ${w}w`).join(', ')
    }

    return {
      name: baseName,
      src: masterSrc,
      srcSet,
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
