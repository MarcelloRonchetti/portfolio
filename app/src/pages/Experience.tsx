// /experience — "Le Sale": fullscreen themed pages (one per photo subject:
// Ferrari, Lamborghini, Motorsport, …) with a continuous cinematic camera.
// Scrolling doesn't swap pages: it drives a camera position (pos ∈ [0, N-1])
// that slides in depth — rooms fly toward the viewer, the passed ones swell
// past the camera — then magnetically snaps to the nearest room when the
// input goes quiet. DOM + CSS 3D only (no WebGL, no three.js). Photo
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

// Motion tuning — the wheel nudges the camera position directly (a couple of
// detents per room) plus a little velocity for the glide; the loop damps and
// the magnetic snap (SNAP_S) settles on the nearest room when idle.
const WHEEL_POS = 0.0016
const WHEEL_VEL = 0.0011
const TOUCH_POS = 0.0032
const SNAP_S = 6
const VEL_DAMP = 5
const IDLE_MS = 260
const DEPTH = 1400 // px of z-distance between rooms

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
    // key guard: a category literally named "Varie" must not collide
    const key = map.has('varie') ? 'varie-alt' : 'varie'
    themed.push({ key, label: 'Varie', accent: '#9a7b50', events: strays })
  }
  return themed
}

// Room shots prefer the first photo AFTER the cover: IG collages live in the
// cover (AGENTS.md — giunzioni a più pannelli) while photos[1] is a single
// panel; manual events without a cover in `photos` just fall back to it.
const shotUrl = (e: Event) =>
  e.photos.length > 1 ? photoUrl(e, e.photos[1] || e.cover) : photoUrl(e, e.cover)

export default function Experience({ go }: { go: GoFn }) {
  const topics = useMemo(() => buildTopics(), [])
  const count = topics.length
  const [room, setRoom] = useState(0)
  const [announce, setAnnounce] = useState('')
  const posRef = useRef(0)
  const velRef = useRef(0)
  const snapRef = useRef<number | null>(null)
  const lastInputRef = useRef(0)
  const roomRef = useRef(0)
  const pageRefs = useRef<(HTMLElement | null)[]>([])
  const stageRef = useRef<HTMLDivElement>(null)
  const mxTRef = useRef(0)
  const myTRef = useRef(0)
  // Live preference: flipping the OS setting must not require a remount.
  const reducedRef = useRef(false)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const apply = () => {
      reducedRef.current = mq.matches
    }
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])
  const goRef = useRef(go)
  useEffect(() => {
    goRef.current = go
  }, [go])

  // Glide to a specific room (keys, dots): the snap loop does the easing.
  const stepTo = useCallback(
    (target: number) => {
      snapRef.current = Math.max(0, Math.min(count - 1, Math.round(target)))
      lastInputRef.current = performance.now()
      velRef.current = 0
    },
    [count]
  )

  // ── The camera loop ────────────────────────────────────────────────────────
  // One rAF positions every room in depth from pos; React state only tracks
  // the rounded room for the HUD, dots and announcements.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let mx = 0
    let my = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (document.hidden) return

      if (snapRef.current !== null) {
        const target = snapRef.current
        posRef.current += (target - posRef.current) * (1 - Math.exp(-dt * SNAP_S))
        if (Math.abs(target - posRef.current) < 0.002) {
          posRef.current = target
          snapRef.current = null
        }
      } else if (now - lastInputRef.current > IDLE_MS) {
        // input went quiet: magnetic snap to the nearest room
        snapRef.current = Math.round(posRef.current)
      } else {
        posRef.current = Math.max(
          0,
          Math.min(count - 1, posRef.current + velRef.current * dt)
        )
        velRef.current *= Math.exp(-dt * VEL_DAMP)
      }

      mx += (mxTRef.current - mx) * (1 - Math.exp(-dt * 6))
      my += (myTRef.current - my) * (1 - Math.exp(-dt * 6))

      pageRefs.current.forEach((el, i) => {
        if (!el) return
        const d = i - posRef.current
        const ad = Math.abs(d)
        if (ad > 1.6) {
          if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden'
          return
        }
        if (el.style.visibility !== 'visible') el.style.visibility = 'visible'
        const reduced = reducedRef.current
        const z = reduced ? 0 : -d * DEPTH
        const scale = reduced ? 1 : 1 - Math.min(ad * 0.09, 0.2)
        const blur = reduced ? 0 : Math.min(ad * 6, 9)
        el.style.transform = `translateZ(${z.toFixed(1)}px) scale(${scale.toFixed(4)})`
        el.style.opacity = String(Math.max(0, 1 - ad * 1.15))
        el.style.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : 'none'
        el.style.setProperty('--p', String(Math.max(0, 1 - ad)))
      })

      if (stageRef.current) {
        stageRef.current.style.setProperty('--mx', mx.toFixed(3))
        stageRef.current.style.setProperty('--my', my.toFixed(3))
      }

      const rounded = Math.round(posRef.current)
      if (rounded !== roomRef.current) {
        roomRef.current = rounded
        setRoom(rounded)
        setAnnounce(`Sala ${rounded + 1} di ${count}: ${topics[rounded]?.label ?? ''}`)
      }
    }
    raf = requestAnimationFrame((n) => {
      last = n
      tick(n)
    })
    return () => cancelAnimationFrame(raf)
  }, [count, topics])

  // ── Input: one continuous gesture surface ─────────────────────────────────
  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)').matches ?? false
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      snapRef.current = null
      lastInputRef.current = performance.now()
      posRef.current = Math.max(
        0,
        Math.min(count - 1, posRef.current + e.deltaY * WHEEL_POS)
      )
      velRef.current += e.deltaY * WHEEL_VEL
    }
    let touchY: number | null = null
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) touchY = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      if (touchY === null || e.touches.length !== 1) return
      e.preventDefault()
      const y = e.touches[0].clientY
      posRef.current = Math.max(0, Math.min(count - 1, posRef.current - (y - touchY) * TOUCH_POS))
      touchY = y
      snapRef.current = null
      lastInputRef.current = performance.now()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        goRef.current('gallery')
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        stepTo(Math.round(posRef.current) + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        stepTo(Math.round(posRef.current) - 1)
      } else if (e.key === 'Home') {
        stepTo(0)
      } else if (e.key === 'End') {
        stepTo(count - 1)
      }
    }
    const onPointer = (e: PointerEvent) => {
      mxTRef.current = (e.clientX / window.innerWidth) * 2 - 1
      myTRef.current = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKey)
    if (fine) window.addEventListener('pointermove', onPointer)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKey)
      if (fine) window.removeEventListener('pointermove', onPointer)
    }
  }, [count, stepTo])

  // Immersive mode hides the site footer (the page owns wheel/touch).
  useEffect(() => {
    document.body.dataset.immersive = '1'
    return () => {
      delete document.body.dataset.immersive
    }
  }, [])

  return (
    <main className="exp">
      <div ref={stageRef} className="exp-stage" style={{ perspective: '1100px' }}>
        {topics.map((t, i) => {
          const featured = t.events[0]
          return (
            <section
              key={t.key}
              ref={(el) => {
                pageRefs.current[i] = el
              }}
              className={`exp-page${i === room ? ' is-near' : ''}`}
              // inert removes far rooms from the tab order and makes the
              // aria-hidden honest (no focus stranded in a hidden subtree)
              inert={i !== room || undefined}
              aria-hidden={i !== room || undefined}
              style={{ ['--room-accent' as string]: t.accent }}
            >
              <span className="exp-ghost" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
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
                <div
                  className={`exp-shots${t.events.length === 2 ? ' is-two' : ''}`}
                >
                  {t.events.slice(0, 3).map((e, k) => (
                    <Clickable
                      key={e.id}
                      className={`exp-shot exp-shot-${k}`}
                      onClick={() => goRef.current('story', e.id)}
                    >
                      <span className="exp-shot-frame">
                        {/* mounted only when the camera is near: lazy never
                            fires on absolutely-positioned rooms */}
                        {Math.abs(i - room) <= 1 && (
                          <img src={shotUrl(e)} alt={e.title} decoding="async" />
                        )}
                      </span>
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

      <div className="exp-hud">
        <div className="exp-hud-dots" aria-label="Sale">
          {topics.map((t, i) => (
            <button
              key={t.key}
              type="button"
              aria-current={i === room ? 'true' : undefined}
              aria-label={`Vai alla sala ${i + 1}: ${t.label}`}
              className={`exp-dot${i === room ? ' is-on' : ''}`}
              style={i === room ? { ['--dot-accent' as string]: t.accent } : undefined}
              onClick={() => stepTo(i)}
            />
          ))}
        </div>
        <div className="exp-hud-room" aria-hidden="true">
          {topics[room]?.label}
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
