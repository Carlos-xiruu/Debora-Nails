import Image from 'next/image';
import { ArrowRight, MapPin, MessageCircle } from 'lucide-react';
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
      <div className="ambient-grid" aria-hidden="true" />

      <SiteHeader />

      <section id="inicio" className="hero-section">
        <div className="hero-content">
          <span className="hero-tag glow-text">Beauty studio · Jaraguá do Sul</span>
          <h1>Seu momento de<br /><em>se sentir bem.</em></h1>
          <p className="hero-description">Unhas, maquiagem e aquele cuidado especial que faz toda a diferença no seu dia.</p>
          <div className="hero-actions">
            <a className="social-button main-action-button" href={whatsappUrl('Olá, Débora! Gostaria de agendar um horário.')} target="_blank" rel="noreferrer">
              Agendar meu horário <ArrowRight size={18} />
            </a>
            <a className="social-button secondary-action-button" href="#servicos">Conhecer serviços</a>
          </div>
          <a className="hero-scroll-cue" href="#sobre"><span aria-hidden="true" />Conheça a experiência</a>
        </div>

        <div className="hero-media has-glow">
          <div className="hero-float-wrapper">
            <div className="hero-portrait hero-portrait-frame">
              <Image src="/debora.jpg" alt="Débora Silva, nail designer" fill priority sizes="(max-width: 1023px) 100vw, 42vw" className="object-cover object-[50%_25%]" />
              <div className="hero-portrait-caption"><span>Debora Nails</span><strong>Beauty Studio</strong></div>
            </div>
            <div className="hero-note"><span>Atendimento</span><strong>com cuidado em cada detalhe</strong></div>
          </div>
        </div>
      </section>

      <Sobre />
      <ServicesShowcase />
      <ExperienceTimeline />
      <Portfolio />
      <Espaco />
      <FAQ />

      <section className="content-section pt-0">
        <div className="glass-card contact-section">
          <MapPin className="mx-auto mb-4 text-[#DCAE96]" size={24} />
          <h2>Pronta para o seu momento?</h2>
          <p>Fale diretamente com a Débora e encontre o melhor horário para você.</p>
          <a className="social-button main-action-button" href={whatsappUrl('Olá, Débora! Gostaria de agendar um horário.')} target="_blank" rel="noreferrer"><MessageCircle size={19} /> Garantir meu horário</a>
        </div>
      </section>

      <WhatsAppWidget />
      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Debora Nails. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
