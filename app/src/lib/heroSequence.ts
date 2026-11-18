export function createHeroSequence<T>(heroes: readonly T[], length: number): T[] {
  if (heroes.length === 0 || length <= 0) return []
  return Array.from({ length }, (_, index) => heroes[index % heroes.length])
}

export function moveHeroIndex(current: number, direction: number, length: number): number {
  if (length <= 0) return 0
  return ((current + direction) % length + length) % length
}
