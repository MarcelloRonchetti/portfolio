import { useState } from 'react'
import type { Route } from '../lib/data'
import { DATA } from '../lib/data'
import { featuredEvent, photoUrl } from '../lib/events'

export function Cover({ go }: { go: (next: Route, ref?: string) => void }) {
  const featured = featuredEvent

  // The build writes a 3× upscale (hero.jpg) of the featured cover for the
  // full-screen banner; the original 1080px cover.jpg stays the fallback when
  // the upscale is missing (dev server, or a build without ffmpeg).
  const [heroFailed, setHeroFailed] = useState(false)
  const src = featured
    ? heroFailed
      ? photoUrl(featured, featured.cover)
      : photoUrl(featured, 'hero.jpg')
    : undefined

  return (
    <main>
      <section className="hero">
        <div className="hero-photo">
          {featured && (
            <img
              src={src}
              alt={DATA.identity.role}
              fetchPriority="high"
              onError={() => setHeroFailed(true)}
            />
          )}
        </div>
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="hero-role">{DATA.identity.role}</div>
          <h1 className="hero-name">{DATA.identity.name}</h1>
          <div className="hero-location">{DATA.identity.location}</div>
          <div style={{ marginTop: 14 }}>
            <button className="btn" onClick={() => go('gallery')}>
              Vedi la galleria
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
