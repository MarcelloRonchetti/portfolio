// Plumbing del morph card → storia (view-transition-name: story-hero).
// La card registra PRIMA di navigare quale evento sta aprendo; la pagina
// storia lo consuma al mount e applica il nome solo se combacia (deep link e
// rail-hop non fanno morph). I nomi devono restare unici per snapshot, quindi
// la storia ritira il flag dopo la VT (≈ 1s, il tempo della zoom-through).
let pendingHeroId: string | null = null

export function setStoryHero(id: string) {
  pendingHeroId = id
}

export function consumeStoryHero(): string | null {
  const id = pendingHeroId
  pendingHeroId = null
  return id
}
