import { useState, useEffect } from 'react'
import { Menu, X, Download } from 'lucide-react'

const navLinks = [
  { label: 'PROFILO', href: '#profilo' },
  { label: 'COMPETENZE', href: '#competenze' },
  { label: 'PROGETTI', href: '#progetti' },
  { label: 'FORMAZIONE', href: '#formazione' },
  { label: 'CERTIFICAZIONI', href: '#certificazioni' },
  { label: 'CONTATTI', href: '#contatti' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleNavClick = (href: string) => {
    setMenuOpen(false)
    const el = document.querySelector(href)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-void/90 backdrop-blur-xl border-b border-dark-gray/30'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 lg:px-16 flex items-center justify-between h-16">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="font-mono text-lg font-bold text-mint"
          >
            MR
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick(link.href)
                }}
                className="font-mono text-xs tracking-[0.08em] text-silver hover:text-pure-white relative group transition-colors duration-250"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-mint group-hover:w-full transition-all duration-250" />
              </a>
            ))}
          </div>

          {/* Desktop Download Button */}
          <a
            href="/CV_Marcello_Ronchetti.pdf"
            download="CV_Marcello_Ronchetti.pdf"
            className="hidden md:inline-flex items-center gap-2 border border-mint text-pure-white px-5 py-2.5 text-xs font-mono tracking-[0.08em] hover:bg-mint/10 rounded transition-all duration-250"
          >
            <Download className="w-4 h-4" />
            Scarica CV
          </a>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-pure-white p-2"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-void flex flex-col items-center justify-center gap-8 md:hidden">
          {navLinks.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                e.preventDefault()
                handleNavClick(link.href)
              }}
              className="text-2xl font-semibold text-pure-white hover:text-mint transition-colors"
              style={{
                animation: `fadeInUp 0.4s ease forwards`,
                animationDelay: `${i * 0.1}s`,
                opacity: 0,
              }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/CV_Marcello_Ronchetti.pdf"
            download="CV_Marcello_Ronchetti.pdf"
            className="inline-flex items-center gap-2 border border-mint text-pure-white px-6 py-3 text-sm font-mono tracking-[0.08em] hover:bg-mint/10 rounded transition-all mt-4"
            style={{
              animation: `fadeInUp 0.4s ease forwards`,
              animationDelay: `${navLinks.length * 0.1}s`,
              opacity: 0,
            }}
          >
            <Download className="w-4 h-4" />
            Scarica CV
          </a>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
