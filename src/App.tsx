import ThreeBackground from './components/ThreeBackground'
import Navbar from './sections/Navbar'
import HeroSection from './sections/HeroSection'
import ProfiloSection from './sections/ProfiloSection'
import CompetenzeSection from './sections/CompetenzeSection'
import ProgettiSection from './sections/ProgettiSection'
import FormazioneSection from './sections/FormazioneSection'
import CertificazioniSection from './sections/CertificazioniSection'
import FooterSection from './sections/FooterSection'

export default function App() {
  return (
    <div className="relative min-h-[100dvh]">
      <ThreeBackground />
      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <ProfiloSection />
        <CompetenzeSection />
        <ProgettiSection />
        <FormazioneSection />
        <CertificazioniSection />
        <FooterSection />
      </div>
    </div>
  )
}
