import type { CSSProperties, ReactNode } from 'react'

export default function FramePhoto({
  tag,
  label,
  code,
  dark = false,
  style,
  children,
  onClick,
}: {
  tag?: string
  label?: string
  code?: string
  dark?: boolean
  style?: CSSProperties
  children?: ReactNode
  onClick?: () => void
}) {
  return (
    <div
      className={`frame ${dark ? 'dark' : ''}`}
      style={style}
      onClick={onClick}
      data-cursor={onClick ? 'xl' : undefined}
      data-cursor-label={onClick ? 'APRI' : undefined}
    >
      {tag && <div className="frame-tag">{tag}</div>}
      {children}
      <div className="frame-caption">
        <span>{label}</span>
        <span>{code}</span>
      </div>
    </div>
  )
}
