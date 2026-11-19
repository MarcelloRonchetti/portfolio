import { useEffect } from 'react'

// Parallasse del puntatore a livello di shell: scrive --px/--py (−1…1) su
// <body> e i layer fissi li consumano via calc() (pozze .ambient in
// index.css, hero di Cover in Cover.css, bagliore delle storie in Story.css).
// È il pattern di Experience.tsx: loop rAF con easing esponenziale che si
// auto-ferma quando ha raggiunto il target — una pagina ferma non costa
// frame. Solo puntatori fini e senza prefers-reduced-motion; entrambe le
// media query sono seguite LIVE: il toggle OS a sessione aperta monta e
// smonta la parallasse nel verso giusto, entrambi i versi.
export function usePointerParallax() {
  useEffect(() => {
    const fineMq = window.matchMedia('(pointer: fine)')
    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const style = document.body.style
    let raf = 0
    let running = false
    let last = 0
    let x = 0
    let y = 0
    let tx = 0
    let ty = 0
    let attached = false

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      x += (tx - x) * (1 - Math.exp(-dt * 6))
      y += (ty - y) * (1 - Math.exp(-dt * 6))
      style.setProperty('--px', x.toFixed(4))
      style.setProperty('--py', y.toFixed(4))
      if (Math.abs(tx - x) < 0.002 && Math.abs(ty - y) < 0.002) {
        x = tx
        y = ty
        style.setProperty('--px', x.toFixed(4))
        style.setProperty('--py', y.toFixed(4))
        running = false
        return
      }
      raf = requestAnimationFrame(tick)
    }
    const wake = () => {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1
      ty = (e.clientY / window.innerHeight) * 2 - 1
      wake()
    }
    // Il puntatore esce dalla finestra: la luce torna al centro.
    const onLeave = () => {
      tx = 0
      ty = 0
      wake()
    }

    const attach = () => {
      if (attached) return
      attached = true
      window.addEventListener('pointermove', onMove, { passive: true })
      document.documentElement.addEventListener('mouseleave', onLeave)
    }
    const detach = () => {
      if (!attached) return
      attached = false
      cancelAnimationFrame(raf)
      running = false
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      style.removeProperty('--px')
      style.removeProperty('--py')
    }
    const sync = () => {
      if (fineMq.matches && !reducedMq.matches) attach()
      else detach()
    }

    const onFineChange = () => sync()
    const onReducedChange = () => sync()
    fineMq.addEventListener?.('change', onFineChange)
    reducedMq.addEventListener?.('change', onReducedChange)
    sync()

    return () => {
      detach()
      fineMq.removeEventListener?.('change', onFineChange)
      reducedMq.removeEventListener?.('change', onReducedChange)
    }
  }, [])
}
