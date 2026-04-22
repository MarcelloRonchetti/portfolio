import { Download } from 'lucide-react'

interface DownloadCVButtonProps {
  large?: boolean
  text?: string
}

export default function DownloadCVButton({ large = false, text = 'Scarica CV' }: DownloadCVButtonProps) {
  return (
    <a
      href="/CV_Marcello_Ronchetti.pdf"
      download="CV_Marcello_Ronchetti.pdf"
      className={`
        inline-flex items-center gap-2 border border-mint text-pure-white
        hover:bg-mint/10 hover:border-mint transition-all duration-250 rounded
        ${large ? 'px-8 py-4 text-base' : 'px-5 py-2.5 text-xs font-mono tracking-[0.08em]'}
      `}
    >
      <Download className={`${large ? 'w-5 h-5' : 'w-4 h-4'} group-hover:rotate-[15deg] transition-transform duration-250`} />
      {text}
    </a>
  )
}
