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
