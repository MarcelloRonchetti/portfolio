import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SectionLabel from '../components/SectionLabel'
import SkillTag from '../components/SkillTag'

gsap.registerPlugin(ScrollTrigger)

const skillCategories = [
  {
    title: 'Embedded & IoT',
    skills: ['PlatformIO', 'C/C++', 'ESP32', 'STM32', 'Arduino', 'FreeRTOS', 'OTA Updates', 'Servo Motors', 'Sensor Integration'],
  },
  {
    title: 'Protocolli & Networking',
    skills: ['MQTT', 'Mosquitto Broker', 'Modbus', 'TLS/SSL', 'QoS Management', 'Network Architecture'],
  },
  {
    title: 'Database & Storage',
    skills: ['MongoDB', 'InfluxDB', 'PostgreSQL', 'Time-Series Data', 'Data Aggregation'],
  },
  {
    title: 'DevOps & Containerizzazione',
    skills: ['Docker', 'Docker Compose', 'Container Orchestration', 'Network Isolation', 'CI/CD Pipelines'],
  },
  {
    title: 'Sviluppo Software',
    skills: ['Python (Tornado, AsyncIO, PyMongo)', 'JavaScript/Node.js', 'Git', 'Virtual Environments', 'API RESTful'],
  },
  {
    title: 'AI & Machine Learning',
    skills: ['Deep Learning', 'Neural Networks', 'ComfyUI', 'FramePack (Image-to-Video AI)', 'Model Optimization (--lowvram, --fp16)'],
  },
  {
    title: 'Sistemi Operativi',
    skills: ['Linux (Pop!_OS, Ubuntu)', 'System Administration', 'Shell Scripting', 'Package Management'],
  },
  {
    title: 'Cybersecurity',
    skills: ['Ethical Hacking', 'Penetration Testing', 'HackTheBox Platform', 'Network Security', 'Vulnerability Assessment'],
  },
]

export default function CompetenzeSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const section = sectionRef.current
    if (!section) return

    const cards = section.querySelectorAll('.skill-card')
    gsap.fromTo(
      cards,
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

    // Animate tags inside each card
    cards.forEach((card) => {
      const tags = card.querySelectorAll('.skill-tag')
      gsap.fromTo(
        tags,
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.3,
          stagger: 0.05,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
          },
        }
      )
    })

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <section
      id="competenze"
      ref={sectionRef}
      className="relative z-10 bg-surface py-[60px] md:py-[80px] lg:py-[120px] px-6 md:px-12 lg:px-16"
    >
      <div className="max-w-[1200px] mx-auto">
        <SectionLabel text="COMPETENZE TECNICHE" />
        <h2 className="text-2xl md:text-4xl font-semibold text-pure-white tracking-[-0.02em] leading-[1.2] mt-2 mb-10 md:mb-12">
          Stack Tecnologico
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {skillCategories.map((category) => (
            <div
              key={category.title}
              className="skill-card bg-void border border-dark-gray/30 rounded-lg p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-mint rounded-full" />
                <h3 className="text-lg md:text-xl font-medium text-pure-white">{category.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill) => (
                  <div key={skill} className="skill-tag">
                    <SkillTag name={skill} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
