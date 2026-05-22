import { useEffect, useState, type CSSProperties } from 'react'

export default function Typewriter({
  text,
  speed = 30,
  delay = 0,
  className = '',
  style,
}: {
  text: string
  speed?: number
  delay?: number
  className?: string
  style?: CSSProperties
}) {
  const [shown, setShown] = useState('')

  useEffect(() => {
    let i = 0
    let to: number | undefined
    const start = window.setTimeout(() => {
      const step = () => {
        i++
        setShown(text.slice(0, i))
        if (i < text.length) to = window.setTimeout(step, speed)
      }
      step()
    }, delay)
    return () => {
      window.clearTimeout(start)
      if (to) window.clearTimeout(to)
    }
  }, [text, speed, delay])

  return (
    <span className={className} style={style}>
      {shown.split('\n').map((line, i) => (
        <span key={i} style={{ display: 'block' }}>
          {line}
        </span>
      ))}
      <span
        style={{
          display: 'inline-block',
          width: 2,
          height: '0.9em',
          background: 'var(--brass)',
          marginLeft: 4,
          verticalAlign: '-0.1em',
          animation: 'fadeIn 1s steps(2) infinite alternate',
        }}
      />
    </span>
  )
}
