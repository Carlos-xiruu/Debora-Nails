import Image from 'next/image';
import { ArrowDown, ArrowUpRight, MapPin, MessageCircle } from 'lucide-react';
import Espaco from './components/Espaco';
import ExperienceTimeline from './components/ExperienceTimeline';
import FAQ from './components/FAQ';
import Portfolio from './components/Portfolio';
import SiteHeader from './components/SiteHeader';
import Sobre from './components/Sobre';
import ServicesShowcase from './components/ServicesShowcase';
import WhatsAppWidget from './components/WhatsAppWidget';

const whatsappUrl = (message: string) =>
  `https://wa.me/5547996987519?text=${encodeURIComponent(message)}`;

export default function Home() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <section id="inicio" className="hero-section" aria-labelledby="hero-title">
        <div className="hero-image">
          <Image src="/nude-dourada.jpeg" alt="Unhas nude com detalhes dourados realizadas pela Débora Nails" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="hero-shade" aria-hidden="true" />
        <p className="hero-index">01 / 04 <span>Jaraguá do Sul, SC</span></p>
        <div className="hero-copy">
          <p className="hero-kicker">Unhas e maquiagem com escuta, técnica e intenção</p>
          <h1 id="hero-title"><span>o detalhe</span><em>muda tudo.</em></h1>
          <p className="hero-description">Um intervalo na rotina para se sentir você, só que ainda mais confiante.</p>
          <a className="hero-action" href={whatsappUrl('Olá, Débora! Gostaria de agendar um horário.')} target="_blank" rel="noreferrer">Agendar meu momento <ArrowUpRight size={18} /></a>
        </div>
        <a className="hero-scroll" href="#sobre"><span>deslize para descobrir</span><ArrowDown size={18} /></a>
      </section>
      <div className="statement-marquee" aria-hidden="true"><div>feito para você &nbsp; cuidado nos detalhes &nbsp; feito para você &nbsp; cuidado nos detalhes &nbsp;</div></div>
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
