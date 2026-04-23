import { useEffect, useRef, useState } from 'react'
import { Download, Github } from 'lucide-react'
import gsap from 'gsap'

export default function HeroSection() {
  const nameRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLParagraphElement>(null)
  const [nameAnimated, setNameAnimated] = useState(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setNameAnimated(true)
      return
    }

    const name = nameRef.current
    if (!name) return

    // Split name into individual letters
    const text = name.textContent || ''
    name.innerHTML = ''
    const letters: HTMLSpanElement[] = []
    
    text.split('').forEach((char) => {
      const span = document.createElement('span')
      span.textContent = char
      span.style.display = 'inline-block'
      span.style.opacity = '0'
      span.style.transform = 'translateY(20px)'
      if (char === ' ') span.style.width = '0.3em'
      name.appendChild(span)
      letters.push(span)
    })

    // Animate label first
    gsap.to(labelRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power2.out',
      delay: 0.2,
    })

    // Typewriter animation for name
    gsap.to(letters, {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.03,
      ease: 'power2.out',
      delay: 0.5,
      onComplete: () => setNameAnimated(true),
    })

    return () => {
      letters.forEach((l) => l.remove())
    }
  }, [])

  useEffect(() => {
    if (!nameAnimated) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    // Animate subtitle and CTA after name completes
    gsap.to(subtitleRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power2.out',
      delay: 0.2,
    })

    gsap.to(ctaRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power2.out',
      delay: 0.5,
    })
  }, [nameAnimated])

  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 md:px-12">
      <div className="max-w-[800px] text-center z-10">
        <p
          ref={labelRef}
          className="font-mono text-xs tracking-[0.08em] text-mint mb-6 opacity-0 translate-y-4"
        >
          {'// Cybersecurity, Artificial Intelligence & developer'}
        </p>

        <h1
          ref={nameRef}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-bold text-pure-white tracking-[-0.03em] leading-[1.0]"
          style={{ textShadow: '0 0 30px rgba(5,5,5,0.8)' }}
        >
          MARCELLO RONCHETTI
        </h1>

        <p
          ref={subtitleRef}
          className="text-lg md:text-2xl font-normal text-muted-white mt-4 opacity-0 translate-y-2"
        >
          Embedded Systems | IoT | AI Engineer
        </p>

        <div
          ref={ctaRef}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 opacity-0 translate-y-4"
        >
          <a
            href="/CV_Marcello_Ronchetti.pdf"
            download="CV_Marcello_Ronchetti.pdf"
            className="inline-flex items-center gap-2 border border-mint text-pure-white px-7 py-3.5 text-sm font-mono tracking-[0.08em] hover:bg-mint/10 rounded transition-all duration-250"
          >
            <Download className="w-4 h-4" />
            Scarica CV
          </a>
          <a
            href="https://github.com/MarcelloRonchetti"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-dark-gray text-pure-white px-7 py-3.5 text-sm hover:border-mint hover:text-mint rounded transition-all duration-250"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
        <div className="w-px h-12 bg-gradient-to-b from-transparent via-silver/50 to-mint/50 animate-pulse" />
      </div>
    </section>
  )
}
