import { MapPin, MessageCircle } from 'lucide-react';
import CinematicHero from './components/CinematicHero';
import Espaco from './components/Espaco';
import ExperienceTimeline from './components/ExperienceTimeline';
import FAQ from './components/FAQ';
import Portfolio from './components/Portfolio';
import SiteHeader from './components/SiteHeader';
import Sobre from './components/Sobre';
import ServicesShowcase from './components/ServicesShowcase';
import WhatsAppWidget from './components/WhatsAppWidget';
import { Marquee } from '@/components/marquee';

const whatsappUrl = (message: string) =>
  `https://wa.me/5547996987519?text=${encodeURIComponent(message)}`;

export default function Home() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <CinematicHero />
      <Marquee className="statement-marquee spell-marquee" duration={32} pauseOnHover fade={false} aria-label="Feito para você. Cuidado nos detalhes.">
        <span>feito para você <i>cuidado nos detalhes</i></span>
        <span>feito para você <i>cuidado nos detalhes</i></span>
        <span>feito para você <i>cuidado nos detalhes</i></span>
      </Marquee>
      <Sobre />
      <ServicesShowcase />
      <ExperienceTimeline />
      <Portfolio />
      <Espaco />
      <FAQ />
      <section className="final-cta" aria-labelledby="cta-title">
        <div className="final-location"><MapPin size={22} aria-hidden="true" /><p>Rua Fritz Hasse, 38 · Jaraguá do Sul</p></div>
        <div className="final-cta-copy">
          <p className="section-label">Seu próximo cuidado começa aqui</p>
          <h2 id="cta-title">Vamos criar<br /><em>seu momento?</em></h2>
          <a className="final-action" href={whatsappUrl('Olá, Débora! Gostaria de agendar um horário.')} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Falar com a Débora</a>
        </div>
      </section>
      <WhatsAppWidget />
      <footer className="site-footer"><p>© {new Date().getFullYear()} Debora Nails. Todos os direitos reservados.</p></footer>
    </main>
  );
}
