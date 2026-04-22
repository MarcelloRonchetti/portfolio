interface SkillTagProps {
  name: string
}

export default function SkillTag({ name }: SkillTagProps) {
  return (
    <span className="inline-block px-3 py-1 text-sm text-mint bg-mint/[0.08] border border-mint/20 rounded hover:bg-mint/[0.15] hover:border-mint/40 transition-all duration-200">
      {name}
    </span>
  )
}
