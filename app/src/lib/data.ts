// Portfolio data — Italian primary, English alternatives where useful.
// Placeholder text — real content fills in over time.

export type Route =
  | 'cover'
  | 'tech'
  | 'project'
  | 'foto'
  | 'story'
  | 'about'
  | 'contact'

export type Project = {
  id: string
  year: string
  title: string
  kind: string
  tagline: string
  summary: string
  stack: string[]
  status?: 'live' | 'beta' | 'archived'
  featured?: boolean
  problem?: string
  approach?: string
  outcome?: string
  stats?: [string, string][]
}

export const DATA = {
  identity: {
    name: 'Marcello Ronchetti',
    initials: 'MR',
    location: 'Padova, IT',
    year: '2026',
    volume: 'VOLUME II',
    tagline_it: 'Una mano scrive codice.\nL\'altra alza la macchina.',
    tagline_en: 'One hand writes code.\nThe other lifts the camera.',
  },

  tech: {
    title_it: 'L\'ingegnere',
    title_en: 'The engineer',
    subtitle_it: 'Embedded systems · IoT · Intelligenza artificiale · Cybersecurity',
    intro_it:
      'Costruisco cose che ascoltano, decidono e parlano. Quando la realtà non basta, la riscrivo in firmware.',

    skills: {
      languages: ['C / C++', 'Rust', 'Python', 'TypeScript', 'Bash'],
      embedded: ['ESP-IDF', 'FreeRTOS', 'STM32', 'Zephyr', 'PlatformIO'],
      iot: ['MQTT', 'LoRaWAN', 'BLE', 'Modbus', 'CAN'],
      ai: ['PyTorch', 'OpenCV', 'MediaPipe', 'ONNX Runtime'],
      sec: ['nmap', 'Wireshark', 'Burp', 'Metasploit', 'Ghidra'],
      ops: ['Docker', 'Linux', 'Git', 'CI/CD', 'InfluxDB'],
    },

    certifications: [
      { y: '2025', n: 'CCNA — Cisco Certified Network Associate', org: 'Cisco' },
      { y: '2024', n: 'eJPT — Junior Penetration Tester', org: 'INE Security' },
      { y: '2024', n: 'ITS Embedded Systems — Diploma', org: 'ITS Academy' },
      { y: '2023', n: 'Networking Essentials', org: 'Cisco' },
    ],

    projects: [
      {
        id: 'greenhouse-controller',
        year: '2026',
        title: 'greenhouse-controller',
        kind: 'IoT · Embedded',
        tagline: 'Una serra che si ascolta.',
        summary:
          'Sistema embedded autonomo per la gestione climatica di una serra didattica — sensori, attuatori, dashboard real-time e OTA.',
        stack: ['ESP32', 'C/C++', 'MQTT', 'React', 'InfluxDB', 'Telegraf'],
        status: 'live',
        featured: true,
        problem:
          'La serra dell\'orto didattico richiedeva supervisione costante: temperatura, umidità di suolo e aria, ventilazione. Un esperimento di automazione completa, gestibile da remoto.',
        approach:
          'Modulo ESP32 master + 4 nodi satellite via LoRa. Sensori SHT41, capacitivi di suolo, anemometro. Broker MQTT su Raspberry Pi, persistenza InfluxDB, frontend React con grafici live e regole IFTTT-like.',
        outcome:
          'Riduzione del 40% degli interventi manuali nella prima stagione. Aggiornamenti OTA testati in produzione. PCB alla terza revisione, codice open-source.',
        stats: [
          ['6 mesi', 'iterazione'],
          ['3 rev.', 'PCB'],
          ['~4.2 kB', 'firmware'],
          ['MIT', 'licenza'],
        ],
      },
      {
        id: 'pose-bike-fitter', year: '2025', title: 'pose-bike-fitter', kind: 'AI · Computer vision',
        tagline: 'Il bike-fit, riletto dal pixel.',
        summary: 'Analisi della postura su bici da corsa via video singolo, con suggerimenti di regolazione automatici.',
        stack: ['PyTorch', 'MediaPipe', 'OpenCV', 'FastAPI', 'Next.js'],
        status: 'beta',
      },
      {
        id: 'lan-vuln-scan', year: '2025', title: 'lan-vuln-scan', kind: 'Cybersecurity · CLI',
        tagline: 'Audit di rete, dal terminale.',
        summary: 'Scanner TUI in Rust per audit di LAN domestiche — discovery, fingerprint OS/servizio, report markdown.',
        stack: ['Rust', 'tokio', 'ratatui', 'nmap', 'OUI db'],
        status: 'live',
      },
      {
        id: 'rtos-audio-synth', year: '2024', title: 'rtos-audio-synth', kind: 'Embedded · DSP',
        tagline: 'Sintetizzatore a chip singolo.',
        summary: 'Mini-synth FM su STM32 con FreeRTOS, controllo MIDI, output stereo I²S a 48 kHz.',
        stack: ['STM32F4', 'FreeRTOS', 'C', 'I²S', 'MIDI'],
        status: 'archived',
      },
      {
        id: 'lora-mesh-sensors', year: '2024', title: 'lora-mesh-sensors', kind: 'IoT · Wireless',
        tagline: 'Una rete che cresce in giardino.',
        summary: 'Rete mesh LoRa di sensori ambientali a basso consumo per monitoraggio orto-giardino.',
        stack: ['LoRa', 'ESP32', 'InfluxDB', 'Grafana'],
        status: 'live',
      },
      {
        id: 'esp32-can-bridge', year: '2024', title: 'esp32-can-bridge', kind: 'Automotive · Firmware',
        tagline: 'Il bus che parla via Wi-Fi.',
        summary: 'Bridge bidirezionale ESP32 ↔ CAN ↔ WebSocket per diagnosi automotive in tempo reale.',
        stack: ['ESP32', 'CAN', 'WebSocket', 'C++'],
        status: 'live',
      },
    ] as Project[],
  },

  foto_chapter: {
    title_it: 'Il fotografo',
    title_en: 'The photographer',
    subtitle_it: 'Sport · Motorsport · Reportage',
    intro_it:
      'Sport e motorsport in pista e fuori — un decimo di secondo alla volta. Pista, fango, asfalto, neve, podio.',
    pull_quote_it: 'L\'unica differenza tra una fotografia e un ricordo è chi la sta guardando.',
    since: '2019',
  },
}
