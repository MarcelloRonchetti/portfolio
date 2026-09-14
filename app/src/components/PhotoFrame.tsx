import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Event } from '../lib/events'
import { photoUrl } from '../lib/events'
import Clickable from './Clickable'

// The one photo-frame component: cinematic gradient placeholder that swaps in the
// real photo when `event` + `file` are given (falls back to the gradient on error).
export default function PhotoFrame({
  event,
  file,
  ratio,
  tag,
  caption,
  dark = false,
  style,
  onClick,
  cursor = 'xl',
  cursorLabel = 'APRI',
  children,
}: {
  event?: Event
  file?: string
  ratio?: string
  tag?: string
  caption?: { left: string; right: string }
  dark?: boolean
  style?: CSSProperties
  onClick?: () => void
  cursor?: string
  cursorLabel?: string
  children?: ReactNode
}) {
  const [failed, setFailed] = useState(false)
  const src = event && file ? photoUrl(event, file) : undefined

  return (
    <Clickable
      onClick={onClick}
      cursor={onClick ? cursor : undefined}
      cursorLabel={onClick ? cursorLabel : undefined}
      className={`frame ${dark ? 'dark' : ''}`}
      style={{ aspectRatio: ratio, ...style }}
    >
      {src && !failed && (
        <img
          src={src}
          alt={caption?.left ?? event?.title ?? ''}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
      {tag && <div className="frame-tag">{tag}</div>}
      {children}
      {caption && (
        <div className="frame-caption">
          <span>{caption.left}</span>
          <span>{caption.right}</span>
        </div>
      )}
    </Clickable>
  )
}
