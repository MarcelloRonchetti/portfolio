import assert from 'node:assert/strict'
import test from 'node:test'

import { createHeroSequence, moveHeroIndex } from './heroSequence.ts'
import { HERO_ROTATION_INTERVAL_MS } from './heroRotation.ts'

test('createHeroSequence keeps all distinct heroes and repeats the list for page cards', () => {
  const heroes = ['a', 'b', 'c']

  assert.deepEqual(createHeroSequence(heroes, 5), ['a', 'b', 'c', 'a', 'b'])
})

test('moveHeroIndex wraps in both directions', () => {
  assert.equal(moveHeroIndex(0, -1, 3), 2)
  assert.equal(moveHeroIndex(2, 1, 3), 0)
  assert.equal(moveHeroIndex(1, 1, 3), 2)
})

test('the hero rotation is intentionally slow', () => {
  assert.equal(HERO_ROTATION_INTERVAL_MS, 20_000)
})
