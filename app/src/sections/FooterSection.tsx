import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Mail, Github, Download } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

export default function FooterSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const section = sectionRef.current
    if (!section) return

    const elements = section.querySelectorAll('.animate-in')
    gsap.fromTo(
      elements,
      { opacity: 0, y: 30 },
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
      id="contatti"
      ref={sectionRef}
      className="relative z-10 bg-surface py-16 md:py-20 px-6 md:px-12 lg:px-16"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col items-center">
        <h2 className="animate-in text-2xl md:text-4xl font-semibold text-pure-white tracking-[-0.02em] leading-[1.2] text-center">
          Restiamo in contatto
        </h2>
        <p className="animate-in text-base text-muted-white text-center mt-4">
          Hai un progetto interessante o vuoi collaborare? Scrivimi.
        </p>

        <div className="animate-in flex flex-wrap justify-center gap-6 md:gap-8 mt-10">
          <a
            href="mailto:marcy.ronco@gmail.com"
            className="flex items-center gap-2 text-base text-pure-white hover:text-mint transition-colors"
          >
            <Mail className="w-5 h-5 text-mint" />
            marcy.ronco@gmail.com
          </a>
          <a
            href="https://github.com/MarcelloRonchetti"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-base text-pure-white hover:text-mint transition-colors"
          >
            <Github className="w-5 h-5 text-mint" />
            MarcelloRonchetti
          </a>
        </div>

        <div className="animate-in mt-8">
          <a
            href="/CV_Marcello_Ronchetti.pdf"
            download="CV_Marcello_Ronchetti.pdf"
            className="inline-flex items-center gap-2 border border-mint text-pure-white px-8 py-4 text-base hover:bg-mint/10 rounded transition-all duration-250"
          >
            <Download className="w-5 h-5" />
            Scarica il mio CV completo
          </a>
        </div>

        <div className="animate-in w-full mt-16 pt-8 border-t border-dark-gray/30 text-center">
          <p className="text-sm text-silver">© 2025 Marcello Ronchetti.</p>
          <p className="text-sm text-dark-gray mt-2">Hosted on GitHub Pages</p>
        </div>
      </div>
    </section>
  )
}
