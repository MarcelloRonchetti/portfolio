import test from 'node:test'
import assert from 'node:assert/strict'
import { captionToEvent, expandMedia, planEvent } from '../lib/instagram-sync.mjs'

test('captionToEvent uses the first meaningful caption line and normalizes hashtags', () => {
  assert.deepEqual(captionToEvent({
    id: '1789',
    caption: 'Ferrari 296 Challenge at Imola\nUn giro al tramonto. #Motorsport #Ferrari #motorsport',
    permalink: 'https://www.instagram.com/p/example/',
    timestamp: '2026-09-08T08:30:00+0000',
  }), {
    id: 'instagram-1789',
    title: 'Ferrari 296 Challenge at Imola',
    description_it: 'Un giro al tramonto.',
    tags: ['Motorsport', 'Ferrari'],
    date: '2026-09-08',
  })
})

test('captionToEvent strips hashtag-only lines from the title', () => {
  const ev = captionToEvent({
    id: '1',
    caption: '#cars #carspotter\nBella giornata in pista',
    permalink: 'https://www.instagram.com/p/x/',
    timestamp: '2026-01-02T00:00:00+0000',
  })
  assert.equal(ev.title, 'Bella giornata in pista')
})

test('captionToEvent falls back to a generic title on an empty caption', () => {
  const ev = captionToEvent({ id: '2', caption: '', timestamp: '2026-01-02T00:00:00+0000' })
  assert.equal(ev.title, 'Instagram')
  assert.deepEqual(ev.tags, ['Instagram'])
})

test('expandMedia keeps carousel images and uses a thumbnail-only plan for video', () => {
  const carousel = expandMedia({ media_type: 'CAROUSEL_ALBUM', children: { data: [
    { id: 'one', media_type: 'IMAGE', media_url: 'https://img/one.jpg' },
    { id: 'two', media_type: 'IMAGE', media_url: 'https://img/two.jpg' },
  ] } })
  assert.equal(carousel.length, 2)
  assert.equal(expandMedia({ media_type: 'VIDEO', thumbnail_url: 'https://img/thumb.jpg' })[0].kind, 'thumbnail')
})

test('expandMedia returns nothing for unsupported types', () => {
  assert.equal(expandMedia({ media_type: 'VIDEO' }).length, 0)
})

test('planEvent skips already-imported media by id or permalink', () => {
  assert.equal(planEvent({ id: '1789', media_type: 'IMAGE' }, new Set(['1789'])).action, 'skip')
  assert.equal(
    planEvent({ id: 'x', permalink: 'https://www.instagram.com/p/ABC/', media_type: 'IMAGE' }, new Set(['https://www.instagram.com/p/ABC/'])).action,
    'skip'
  )
})

test('planEvent builds a manifest with cover, photos and source', () => {
  const plan = planEvent({
    id: '1790',
    caption: 'Test day\n#Ferrari',
    media_type: 'CAROUSEL_ALBUM',
    permalink: 'https://www.instagram.com/p/xyz/',
    timestamp: '2026-09-10T10:00:00+0000',
    children: { data: [
      { id: 'a', media_type: 'IMAGE', media_url: 'https://img/a.jpg' },
      { id: 'b', media_type: 'IMAGE', media_url: 'https://img/b.jpg' },
    ] },
  }, new Set())
  assert.equal(plan.action, 'create')
  assert.equal(plan.folder, 'instagram-1790')
  assert.equal(plan.manifest.cover, 'cover.jpg')
  assert.deepEqual(plan.manifest.photos, ['01.jpg'])
  assert.equal(plan.manifest.source.media_id, '1790')
  assert.equal(plan.manifest.date, '2026-09-10')
  assert.deepEqual(plan.manifest.tags, ['Ferrari'])
})

test('planEvent marks video-only posts as unsupported', () => {
  assert.equal(planEvent({ id: '9', media_type: 'VIDEO' }, new Set()).action, 'unsupported')
})
