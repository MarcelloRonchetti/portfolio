import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MapPin, Mail, Github } from 'lucide-react'
import SectionLabel from '../components/SectionLabel'

gsap.registerPlugin(ScrollTrigger)

export default function ProfiloSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const section = sectionRef.current
    if (!section) return

    const elements = section.querySelectorAll('.animate-in')
    gsap.fromTo(
      elements,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
        },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <section
      id="profilo"
      ref={sectionRef}
      className="relative z-10 bg-void py-[60px] md:py-[80px] lg:py-[120px] px-6 md:px-12 lg:px-16"
    >
      <div className="max-w-[800px] mx-auto">
        <div className="animate-in">
          <SectionLabel text="PROFILO PROFESSIONALE" />
        </div>
        <h2 className="animate-in text-2xl md:text-4xl font-semibold text-pure-white tracking-[-0.02em] leading-[1.2] mt-2">
          Dal Firmware al Cloud
        </h2>
        <p className="animate-in text-base text-muted-white leading-[1.7] mt-6">
          Specializzato in sistemi embedded, IoT e intelligenza artificiale con competenze in
          sviluppo firmware, architetture distribuite, containerizzazione e fotografia. Esperienza
          comprovata nella progettazione end-to-end di soluzioni IoT, dall&apos;acquisizione dati su
          microcontrollori alla persistenza cloud, con particolare focus su ottimizzazione delle
          risorse, sicurezza e scalabilità. Passione per la cybersecurity attraverso piattaforme di
          ethical hacking e continuo approfondimento di tecnologie AI/ML.
        </p>

        <div className="animate-in flex flex-wrap gap-6 mt-10">
          <div className="flex items-center gap-2 text-sm text-silver">
            <MapPin className="w-4 h-4 text-mint" />
            Modena, Italia
          </div>
          <a
            href="mailto:marcy.ronco@gmail.com"
            className="flex items-center gap-2 text-sm text-silver hover:text-mint transition-colors"
          >
            <Mail className="w-4 h-4 text-mint" />
            marcy.ronco@gmail.com
          </a>
          <a
            href="https://github.com/MarcelloRonchetti"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-silver hover:text-mint transition-colors"
          >
            <Github className="w-4 h-4 text-mint" />
            MarcelloRonchetti
          </a>
        </div>
      </div>
    </section>
  )
}
