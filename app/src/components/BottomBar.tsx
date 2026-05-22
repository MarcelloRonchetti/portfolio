import type { ReactNode } from 'react'

export default function BottomBar({
  page,
  hint,
  pager,
}: {
  page: string
  hint: string
  pager?: ReactNode
}) {
  return (
    <div className="chrome-bottom">
      <div className="page-num">
        <span>—</span>
        <span style={{ fontFamily: 'Italiana, serif', fontSize: 14, letterSpacing: '.5em' }}>
          PAG.&nbsp;{page}
        </span>
        <span>—</span>
      </div>
      <div className="scroll-hint">
        <span className="line" /> {hint} <span className="line" />
      </div>
      <div className="page-num" style={{ justifyContent: 'flex-end' }}>
        {pager}
      </div>
    </div>
  )
}
