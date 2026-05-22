import { useCallback, useState } from 'react'

type CurtainState = 'idle' | 'in' | 'out'

export function Curtain({ state, seal }: { state: CurtainState; seal: string }) {
  return (
    <div className={`curtain ${state === 'idle' ? '' : state}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="panel" />
      ))}
      <div className="seal">{seal || 'MR'}</div>
    </div>
  )
}

export function useCurtain() {
  const [state, setState] = useState<CurtainState>('idle')
  const [seal, setSeal] = useState('MR')

  const transition = useCallback(async (label: string, swap?: () => void) => {
    setSeal(label || 'MR')
    setState('in')
    await new Promise((r) => setTimeout(r, 720))
    if (swap) swap()
    await new Promise((r) => setTimeout(r, 220))
    setState('out')
    await new Promise((r) => setTimeout(r, 720))
    setState('idle')
  }, [])

  return { state, seal, transition }
}
