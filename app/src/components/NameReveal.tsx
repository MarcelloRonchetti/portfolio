import type { CSSProperties } from 'react'

export default function NameReveal({
  text,
  className = '',
  style,
  delay = 0,
}: {
  text: string
  className?: string
  style?: CSSProperties
  delay?: number
}) {
  const letters = Array.from(text)
  return (
    <span className={className} style={{ display: 'inline-block', ...style }}>
      {letters.map((ch, i) => (
        <span
          key={i}
          className="anim-rise"
          style={{ animationDelay: `${delay + i * 0.035}s` }}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  )
}
