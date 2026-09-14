import type { HTMLAttributes, ReactNode } from 'react'

type ClickableProps = {
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'onClick'>

// Div that behaves like a button when clickable: role, tabIndex, keyboard activation.
export default function Clickable({
  onClick,
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
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </div>
  )
}
