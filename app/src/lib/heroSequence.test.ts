import assert from 'node:assert/strict'
import test from 'node:test'

import { createHeroSequence, moveHeroIndex } from './heroSequence.ts'

test('createHeroSequence keeps all distinct heroes and repeats the list for page cards', () => {
  const heroes = ['a', 'b', 'c']

  assert.deepEqual(createHeroSequence(heroes, 5), ['a', 'b', 'c', 'a', 'b'])
})

test('moveHeroIndex wraps in both directions', () => {
  assert.equal(moveHeroIndex(0, -1, 3), 2)
  assert.equal(moveHeroIndex(2, 1, 3), 0)
  assert.equal(moveHeroIndex(1, 1, 3), 2)
})
