import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SectionLabel from '../components/SectionLabel'

gsap.registerPlugin(ScrollTrigger)

export default function CertificazioniSection() {
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
        stagger: 0.2,
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
      id="certificazioni"
      ref={sectionRef}
      className="relative z-10 bg-void py-[60px] md:py-[80px] lg:py-[120px] px-6 md:px-12 lg:px-16"
    >
      <div className="max-w-[800px] mx-auto">
        <div className="animate-in">
          <SectionLabel text="CERTIFICAZIONI E ATTIVITÀ COMPLEMENTARI" />
        </div>
        <h2 className="animate-in text-2xl md:text-4xl font-semibold text-pure-white tracking-[-0.02em] leading-[1.2] mt-2 mb-10 md:mb-12">
          Sicurezza Offensiva
        </h2>

        <div className="animate-in bg-surface border border-dark-gray/30 rounded-lg p-6 md:p-8 hover:shadow-[0_0_40px_rgba(45,212,168,0.08)] hover:border-mint/30 transition-all duration-300">
          <h3 className="text-lg md:text-xl font-medium text-pure-white mb-2">
            HackTheBox — Ethical Hacking & Penetration Testing
          </h3>
          <p className="text-sm text-muted-white leading-relaxed mb-4">
            Partecipazione attiva alla piattaforma HackTheBox per sviluppo competenze di ethical hacking 
            e penetration testing. Pratica continua su macchine virtuali e scenari CTF (Capture The Flag) 
            per affinamento di tecniche di vulnerability assessment, exploitation, privilege escalation e 
            post-exploitation.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-muted-white flex gap-2">
              <span className="text-mint flex-shrink-0 mt-0.5">•</span>
              <span>Risoluzione challenges su categorie: Web, Crypto, Reversing, Pwn, Forensics</span>
            </p>
            <p className="text-sm text-muted-white flex gap-2">
              <span className="text-mint flex-shrink-0 mt-0.5">•</span>
              <span>Approfondimento tecniche OWASP Top 10, SQL Injection, XSS, CSRF, Command Injection</span>
            </p>
            <p className="text-sm text-muted-white flex gap-2">
              <span className="text-mint flex-shrink-0 mt-0.5">•</span>
              <span>Utilizzo tool professionali: Burp Suite, Metasploit, Nmap, Wireshark, John the Ripper</span>
            </p>
          </div>
        </div>

        <div className="animate-in mt-12">
          <h3 className="text-lg md:text-xl font-medium text-pure-white mb-4">
            Competenze Linguistiche
          </h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-white flex gap-2">
              <span className="text-mint flex-shrink-0 mt-0.5">•</span>
              <span>Italiano: Madrelingua</span>
            </p>
            <p className="text-sm text-muted-white flex gap-2">
              <span className="text-mint flex-shrink-0 mt-0.5">•</span>
              <span>Inglese: Professionale (Technical English — Documentazione, API, Framework)</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
