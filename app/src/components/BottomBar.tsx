export default function BottomBar({
  page,
  hint,
}: {
  page: string
  hint: string
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
    </div>
  )
}
