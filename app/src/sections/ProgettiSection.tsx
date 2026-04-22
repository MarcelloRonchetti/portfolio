import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SectionLabel from '../components/SectionLabel'
import ProjectCard from '../components/ProjectCard'

gsap.registerPlugin(ScrollTrigger)

const projects = [
  {
    title: 'Sistema IoT di Acquisizione, Trasmissione e Archiviazione Dati',
    role: 'Sviluppatore Embedded / IoT Engineer',
    stack: ['PlatformIO', 'C/C++', 'MQTT', 'Mosquitto', 'MongoDB', 'ESP32/STM32'],
    description:
      'Progettazione e sviluppo di un sistema IoT completo per il monitoraggio e controllo in tempo reale di dispositivi e sensori. Il firmware embedded acquisisce dati da periferiche multiple, li elabora localmente e li trasmette tramite protocollo MQTT a un broker Mosquitto, garantendo persistenza su database MongoDB.',
    responsibilities: [
      'Sviluppo e ottimizzazione firmware embedded con gestione connettività, reconnect automatico, buffer offline e strategie di risparmio energetico',
      'Configurazione e hardening broker Mosquitto con TLS, ACL, QoS, retention policy',
      'Integrazione completa con MongoDB per storage strutturato e aggregazione dati',
      'Testing end-to-end con strumenti embedded e pipeline di build automatizzate',
    ],
    results: [
      'Riduzione latenza end-to-end ottimizzando payload MQTT e gestione asincrona',
      'Uptime sistema superiore al 99% con recupero automatico',
      'Scalabilità testata con nodi multipli concorrenti',
    ],
  },
  {
    title: 'Sistema Radar con Array di Sensori e Controllo Servo',
    role: 'Embedded Developer',
    stack: ['PlatformIO', 'C/C++', 'Servo Motors', 'Ultrasonic/IR Sensors', 'Real-time Visualization'],
    description:
      'Sviluppo di un sistema radar completo con controllo servo motorizzato per scanning ambientale a 360°. Integrazione di array di sensori (ultrasuoni/infrarossi) con acquisizione dati in tempo reale e visualizzazione grafica interattiva.',
    responsibilities: [
      'Design hardware con integrazione sensori multipli e controllo precisione servo',
      'Sviluppo firmware per acquisizione dati sincronizzata e comunicazione real-time',
      'Implementazione interfaccia web HTML5/Canvas per visualizzazione radar',
    ],
  },
  {
    title: 'Jarvis Assistant — Python',
    role: 'Python Developer',
    stack: ['Python', 'Speech Recognition', 'NLP'],
    description:
      'Assistente vocale con pipeline completa speech-to-text → parsing → execution. Implementato riconoscimento comandi, gestione input audio e automazione task locali. Struttura modulare per estensione funzionalità.',
  },
  {
    title: 'Containerizzazione Applicazione Web Tornado con Stack MongoDB',
    role: 'Backend Developer / DevOps',
    stack: ['Python', 'Tornado Framework', 'Docker', 'Docker Networks', 'MongoDB', 'AsyncIO'],
    description:
      'Progettazione e implementazione di architettura containerizzata multi-tier per applicazione web Python Tornado con database MongoDB. Creazione di ambienti isolati mediante Docker con gestione avanzata di reti interne e network segregation.',
    responsibilities: [
      'Sviluppo API RESTful async/await con gestione CRUD operations su MongoDB',
      'Implementazione Docker multi-container con network isolation',
      'Configurazione Dockerfile ottimizzato con Python slim base image',
      'Setup reti Docker personalizzate per segregazione traffico',
    ],
  },
  {
    title: 'Integrazione AI (Image-to-Video e Text-to-Video) con ComfyUI',
    role: 'AI Engineer',
    stack: ['Python', 'ComfyUI', 'FramePack', 'Neural Networks', 'GPU Optimization'],
    description:
      'Configurazione e ottimizzazione di workflow AI per generazione video da immagini statiche utilizzando FramePack integrato con ComfyUI. Ottimizzazione memoria per hardware con VRAM limitata.',
    responsibilities: [
      'Setup completo pipeline AI con gestione dipendenze',
      'Ottimizzazione runtime con --lowvram e --fp16 per sistemi con risorse limitate',
      'Integrazione workflow ComfyUI per processing batch e automazione',
    ],
  },
]

export default function ProgettiSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const section = sectionRef.current
    if (!section) return

    const cards = section.querySelectorAll('.project-card')
    gsap.fromTo(
      cards,
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
      id="progetti"
      ref={sectionRef}
      className="relative z-10 bg-void py-[60px] md:py-[80px] lg:py-[120px] px-6 md:px-12 lg:px-16"
    >
      <div className="max-w-[1200px] mx-auto">
        <SectionLabel text="PROGETTI ED ESPERIENZE" />
        <h2 className="text-2xl md:text-4xl font-semibold text-pure-white tracking-[-0.02em] leading-[1.2] mt-2 mb-10 md:mb-12">
          Progetti Concreti
        </h2>

        <div className="flex flex-col gap-6 md:gap-8">
          {projects.map((project) => (
            <div key={project.title} className="project-card">
              <ProjectCard
                title={project.title}
                role={project.role}
                stack={project.stack}
                description={project.description}
                responsibilities={project.responsibilities}
                results={project.results}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
