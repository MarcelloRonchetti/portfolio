import { useEffect, useState } from 'react'

// Viewport in px, aggiornato al resize: le storie lo usano per derivare i
// limiti della cornice del carosello (scena 78vh, lightbox 95vw/95vh).
export default function useViewportSize() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return vp
}
