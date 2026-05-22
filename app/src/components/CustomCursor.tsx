import { useEffect, useRef, useState } from 'react'

type Variant = 'default' | 'lg' | 'xl' | 'text'

export default function CustomCursor() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [variant, setVariant] = useState<Variant>('default')
  const [label, setLabel] = useState('')
  const [visible, setVisible] = useState(false)
  const pos = useRef({ x: -100, y: -100 })
  const target = useRef({ x: -100, y: -100 })

  useEffect(() => {
    document.body.classList.add('has-custom-cursor')

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX
      target.current.y = e.clientY
      setVisible(true)
    }
    const onLeave = () => setVisible(false)
    const onEnter = () => setVisible(true)

    const onOver = (e: Event) => {
      const t = e.target as Element | null
      const el = t?.closest?.('[data-cursor]') as HTMLElement | null
      if (el) {
        const v = (el.getAttribute('data-cursor') || 'default') as Variant
        setVariant(v)
        setLabel(el.getAttribute('data-cursor-label') || '')
      } else {
        setVariant('default')
        setLabel('')
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('mouseenter', onEnter)
    document.addEventListener('mouseover', onOver)

    let raf = 0
    const loop = () => {
      const k = 0.22
      pos.current.x += (target.current.x - pos.current.x) * k
      pos.current.y += (target.current.y - pos.current.y) * k
      if (ref.current) {
        ref.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('mouseenter', onEnter)
      document.removeEventListener('mouseover', onOver)
      document.body.classList.remove('has-custom-cursor')
    }
  }, [])

  const cls = ['cursor', variant !== 'default' ? variant : ''].filter(Boolean).join(' ')
  return (
    <div ref={ref} className={cls} style={{ opacity: visible ? 1 : 0 }}>
      {variant === 'xl' && label}
    </div>
  )
}
