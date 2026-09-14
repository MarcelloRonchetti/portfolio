import type { HTMLAttributes, ReactNode } from 'react'

type ClickableProps = {
  onClick?: () => void
  cursor?: string
  cursorLabel?: string
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'onClick'>

// Div that behaves like a button when clickable: keyboard activation + cursor hints.
export default function Clickable({
  onClick,
  cursor,
  cursorLabel,
  className,
  style,
  children,
  ...rest
}: ClickableProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      data-cursor={cursor}
      data-cursor-label={cursorLabel}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </div>
  )
}
