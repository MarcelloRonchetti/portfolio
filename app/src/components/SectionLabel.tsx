interface SectionLabelProps {
  text: string
}

export default function SectionLabel({ text }: SectionLabelProps) {
  return (
    <p className="font-mono text-xs tracking-[0.08em] text-mint mb-4">
      {'// '}{text}
    </p>
  )
}
