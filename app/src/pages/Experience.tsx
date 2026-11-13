// /experience — "Le Sale": fullscreen themed pages (one per photo subject:
// Ferrari, Lamborghini, Motorsport, …) with cinematic page-to-page
// transitions — the outgoing page recedes past the camera, the incoming one
// arrives from depth, DOM + CSS 3D only (no WebGL, no three.js). Photo
// subjects come from the event id's trailing brand token (…-ferrari,
// …-lamborghini): the `category` field alone is data debt (legacy events all
// default to "Motorsport"). Loaded via React.lazy from App.tsx so the main
// bundle never pays for it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Clickable from '../components/Clickable'
import type { GoFn } from '../lib/data'
import { events, photoUrl } from '../lib/events'
import type { Event } from '../lib/events'
import './Experience.css'

// "A bit less than the reference": a handful of themed rooms.
const MAX_EVENTS = 8

type Topic = {
  key: string
  label: string
  accent: string
  events: Event[]
}

const TOPIC_LABELS: Record<string, { label: string; accent: string }> = {
  ferrari: { label: 'Ferrari', accent: '#7d2f26' },
  'mercedes-amg': { label: 'Mercedes-AMG', accent: '#5a5f63' },
  lamborghini: { label: 'Lamborghini', accent: '#8a6d3a' },
  porsche: { label: 'Porsche', accent: '#77714f' },
  lotus: { label: 'Lotus', accent: '#4a5f46' },
  corvette: { label: 'Corvette', accent: '#5d4a63' },
  ducati: { label: 'Ducati', accent: '#7d3030' },
  bmw: { label: 'BMW M', accent: '#4f6b8a' },
  supercar: { label: 'Supercar', accent: '#7a5c3a' },
  reportage: { label: 'Reportage', accent: '#55514a' },
  motorsport: { label: 'Motorsport', accent: '#6b3226' },
}

const topicOf = (e: Event): Topic => {
  const tail = (e.id.split('-').pop() ?? '').toLowerCase()
  const known = TOPIC_LABELS[tail]
  if (known) return { key: tail, ...known, events: [] }
  const cat = e.category.toLowerCase().replace(/\s+/g, '-')
  const catTopic = TOPIC_LABELS[cat]
  if (catTopic) return { key: cat, ...catTopic, events: [] }
  return { key: cat || 'varie', label: e.category || 'Varie', accent: '#9a7b50', events: [] }
}

const buildTopics = (): Topic[] => {
  const recent = [...events]
    .filter((e) => !e.id.startsWith('instagram-'))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_EVENTS)
  const map = new Map<string, Topic>()
  recent.forEach((e) => {
    const t = topicOf(e)
    const bucket = map.get(t.key)
    if (bucket) bucket.events.push(e)
    else map.set(t.key, { ...t, events: [e] })
  })
  const themed = [...map.values()].filter((t) => t.events.length >= 2)
  const strays = [...map.values()].filter((t) => t.events.length < 2).flatMap((t) => t.events)
  if (strays.length > 0) {
    themed.push({ key: 'varie', label: 'Varie', accent: '#9a7b50', events: strays })
  }
  return themed
}

const STEP_LOCK_MS = 1100 // matches the CSS transition — one gesture, one room

export default function Experience({ go }: { go: GoFn }) {
  const topics = useMemo(() => buildTopics(), [])
  const [index, setIndex] = useState(0)
  const [announce, setAnnounce] = useState('')
  const lockedUntil = useRef(0)
  const indexRef = useRef(0)
  const goRef = useRef(go)
  useEffect(() => {
    goRef.current = go
  }, [go])

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(topics.length - 1, next))
      if (clamped === indexRef.current) return
      if (performance.now() < lockedUntil.current) return
      lockedUntil.current = performance.now() + STEP_LOCK_MS
      indexRef.current = clamped
      setIndex(clamped)
      setAnnounce(`Sala ${clamped + 1} di ${topics.length}: ${topics[clamped].label}`)
    },
    [topics]
  )

  // One gesture = one room: wheel, touch swipe and arrows all funnel here.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (Math.abs(e.deltaY) < 12) return
      goTo(indexRef.current + (e.deltaY > 0 ? 1 : -1))
    }
    let touchStartY: number | null = null
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) touchStartY = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY === null || e.touches.length !== 1) return
      e.preventDefault()
      const dy = touchStartY - e.touches[0].clientY
      if (Math.abs(dy) < 48) return
      touchStartY = null
      goTo(indexRef.current + (dy > 0 ? 1 : -1))
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        goRef.current('gallery')
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        goTo(indexRef.current + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        goTo(indexRef.current - 1)
      } else if (e.key === 'Home') {
        goTo(0)
      } else if (e.key === 'End') {
        goTo(topics.length - 1)
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [goTo, topics.length])

  // Immersive mode hides the site footer (the page owns wheel/touch).
  useEffect(() => {
    document.body.dataset.immersive = '1'
    return () => {
      delete document.body.dataset.immersive
    }
  }, [])

  return (
    <main className="exp">
      <div className="exp-stage" style={{ perspective: '1100px' }}>
        {topics.map((t, i) => {
          const state = i === index ? 'is-active' : i < index ? 'is-past' : 'is-far'
          const featured = t.events[0]
          return (
            <section
              key={t.key}
              className={`exp-page ${state}`}
              aria-hidden={i !== index || undefined}
              style={{ ['--room-accent' as string]: t.accent }}
            >
              <div className="exp-room-glow" aria-hidden="true" />
              <div className="exp-room-body">
                <p className="exp-kicker">
                  Sala {String(i + 1).padStart(2, '0')} / {String(topics.length).padStart(2, '0')}
                </p>
                <h1 className="exp-title">{t.label}</h1>
                <p className="exp-meta">
                  {t.events.length} {t.events.length === 1 ? 'raccolta' : 'raccolte'} ·{' '}
                  {t.events.reduce((n, e) => n + e.photos.length, 0)} foto
                </p>
                <div className="exp-shots">
                  {t.events.slice(0, 3).map((e, k) => (
                    <Clickable
                      key={e.id}
                      className={`exp-shot exp-shot-${k}`}
                      onClick={() => goRef.current('story', e.id)}
                    >
                      <img
                        src={photoUrl(e, e.cover)}
                        alt={e.title}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                      <span className="exp-shot-title">{e.title}</span>
                    </Clickable>
                  ))}
                </div>
                {featured && (
                  <div className="exp-cta">
                    <button className="btn" onClick={() => goRef.current('story', featured.id)}>
                      Apri la storia
                    </button>
                    <span className="exp-cta-note">
                      {featured.year}
                      {featured.location ? ` · ${featured.location}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {/* Screen-reader door into the same content. */}
      <nav className="exp-sr" aria-label="Sale tematiche">
        {topics.map((t) => (
          <button key={t.key} type="button" onClick={() => goTo(topics.indexOf(t))}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="exp-hud">
        <div className="exp-hud-dots" role="tablist" aria-label="Sale">
          {topics.map((t, i) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Sala ${i + 1}: ${t.label}`}
              className={`exp-dot${i === index ? ' is-on' : ''}`}
              style={i === index ? { background: t.accent } : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <div className="exp-hud-room" aria-hidden="true">
          {topics[index]?.label}
        </div>
        <Clickable className="exp-hud-back" onClick={() => go('gallery')}>
          ← Galleria <span className="exp-hud-key">ESC</span>
        </Clickable>
      </div>

      <p className="exp-sr-live" role="status" aria-live="polite">
        {announce}
      </p>
    </main>
  )
}
