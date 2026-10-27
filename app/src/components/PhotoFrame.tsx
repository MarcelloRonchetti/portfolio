import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Event } from '../lib/events'
import { photoUrl } from '../lib/events'
import Clickable from './Clickable'

// Photo with graceful fallback: shows a neutral placeholder when there is no
// image or it fails to load.
export default function PhotoFrame({
  event,
  file,
  src: srcOverride,
  ratio,
  caption,
  style,
  onClick,
  children,
  alt,
}: {
  event?: Event
  file?: string
  /** Absolute URL override (Drive-backed images); ignores event/file. */
  src?: string
  ratio?: string
  caption?: { left?: string; right?: string }
  style?: CSSProperties
  onClick?: () => void
  children?: ReactNode
  alt?: string
}) {
  // Tracks WHICH src failed, so a new src implicitly gets a fresh chance: a
  // transient CDN hiccup must not pin the placeholder for the next photo.
  const [failedSrc, setFailedSrc] = useState<string | undefined>()
  const src = srcOverride ?? (event && file ? photoUrl(event, file) : undefined)
  const failed = failedSrc !== undefined && failedSrc === src

  return (
    <Clickable
      onClick={onClick}
      className={ratio ? 'frame' : 'frame frame-natural'}
      style={ratio ? { aspectRatio: ratio, ...style } : style}
    >
      {src && !failed && (
        <img
          src={src}
          alt={alt ?? caption?.left ?? event?.title ?? ''}
          loading="lazy"
          onError={() => setFailedSrc(src)}
        />
      )}
      {children}
      {caption && (caption.left || caption.right) && (
        <div className="frame-caption">
          <span>{caption.left}</span>
          <span>{caption.right}</span>
        </div>
      )}
    </Clickable>
  )
}
