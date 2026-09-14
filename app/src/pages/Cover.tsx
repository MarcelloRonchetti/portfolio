import type { Route } from '../lib/data'
import { DATA } from '../lib/data'
import { featuredEvent, photoUrl } from '../lib/events'

export function Cover({ go }: { go: (next: Route, ref?: string) => void }) {
  const featured = featuredEvent

  return (
    <main>
      <section className="hero">
        <div className="hero-photo">
          {featured && <img src={photoUrl(featured, featured.cover)} alt={DATA.identity.role} />}
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
