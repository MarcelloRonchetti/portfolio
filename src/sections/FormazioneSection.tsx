import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SectionLabel from '../components/SectionLabel'

gsap.registerPlugin(ScrollTrigger)

export default function FormazioneSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const section = sectionRef.current
    if (!section) return

    const blocks = section.querySelectorAll('.animate-in')
    gsap.fromTo(
      blocks,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.15,
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
      id="formazione"
      ref={sectionRef}
      className="relative z-10 bg-surface py-[60px] md:py-[80px] lg:py-[120px] px-6 md:px-12 lg:px-16"
    >
      <div className="max-w-[800px] mx-auto">
        <div className="animate-in">
          <SectionLabel text="FORMAZIONE E COMPETENZE IN SVILUPPO" />
        </div>
        <h2 className="animate-in text-2xl md:text-4xl font-semibold text-pure-white tracking-[-0.02em] leading-[1.2] mt-2 mb-10 md:mb-12">
          Apprendimento Continuo
        </h2>

        <div className="animate-in mb-10">
          <h3 className="text-lg md:text-xl font-medium text-pure-white mb-4">
            Machine Learning e Intelligenza Artificiale
          </h3>
          <p className="text-base text-muted-white leading-[1.7]">
            Studio approfondito di concetti fondamentali di ML/DL/AI: gerarchie concettuali (AI → ML → DL), 
            paradigmi di apprendimento (supervised/unsupervised learning), algoritmi di regressione, 
            gradient descent, bias-variance tradeoff. Approccio di studio visuale con creazione di materiali 
            didattici personalizzati (visualizzazioni SVG, cheat sheet con terminologia matematica completa in italiano).
          </p>
        </div>

        <div className="animate-in">
          <h3 className="text-lg md:text-xl font-medium text-pure-white mb-4">
            Telecomunicazioni e Cybersecurity
          </h3>
          <p className="text-base text-muted-white leading-[1.7]">
            Studio scolastico nell&apos;ambito delle telecomunicazioni con annesse attività come corsi di cybersecurity.
          </p>
        </div>
      </div>
    </section>
  )
}
