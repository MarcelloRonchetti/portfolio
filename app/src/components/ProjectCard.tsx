import SkillTag from './SkillTag'

interface ProjectCardProps {
  title: string
  role: string
  stack: string[]
  description: string
  responsibilities?: string[]
  results?: string[]
}

export default function ProjectCard({ title, role, stack, description, responsibilities, results }: ProjectCardProps) {
  return (
    <div className="bg-surface border border-dark-gray/30 rounded-lg p-6 md:p-8 hover:shadow-[0_0_40px_rgba(45,212,168,0.08)] hover:border-mint/30 transition-all duration-300">
      <p className="font-mono text-xs tracking-[0.08em] text-silver mb-2">{role}</p>
      <h3 className="text-xl md:text-2xl font-semibold text-pure-white mb-4">{title}</h3>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {stack.map((tech) => (
          <SkillTag key={tech} name={tech} />
        ))}
      </div>
      
      <p className="text-sm text-muted-white leading-relaxed mb-4">{description}</p>
      
      {responsibilities && responsibilities.length > 0 && (
        <div className="mb-4">
          {responsibilities.map((resp, i) => (
            <p key={i} className="text-sm text-muted-white leading-relaxed mb-1 flex gap-2">
              <span className="text-mint flex-shrink-0 mt-0.5">•</span>
              <span>{resp}</span>
            </p>
          ))}
        </div>
      )}
      
      {results && results.length > 0 && (
        <div>
          <p className="font-mono text-xs tracking-[0.08em] text-mint mb-2">{'// Risultati'}</p>
          {results.map((result, i) => (
            <p key={i} className="text-sm text-muted-white leading-relaxed mb-1 flex gap-2">
              <span className="text-mint flex-shrink-0 mt-0.5">•</span>
              <span>{result}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
