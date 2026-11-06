import Image from 'next/image';
import { ArrowRight, MapPin, MessageCircle } from 'lucide-react';
import { FlowButton } from '@/components/flow-button';
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
        <div className="hero-orb hero-orb-left" aria-hidden="true" />
        <div className="hero-orb hero-orb-right" aria-hidden="true" />
        <div className="hero-content">
          <span className="hero-tag">Seu momento de cuidado</span>
          <h1 aria-label="Beleza que acompanha o seu ritmo.">
            <span className="hero-title-word">Beleza</span>{" "}
            <span className="hero-title-word">que</span>{" "}
            <span className="hero-title-word">acompanha</span>
            <em><span className="hero-title-word">o</span>{" "}<span className="hero-title-word">seu</span>{" "}<span className="hero-title-word">ritmo.</span></em>
          </h1>
          <p className="hero-description">Unhas e maquiagem em um atendimento leve, atencioso e feito para você se sentir bem de verdade.</p>
          <div className="hero-actions">
            <FlowButton asChild size="lg" borderColor="rgba(255, 244, 238, 0.75)" className="hero-booking-button">
              <a href={whatsappUrl('Olá, Débora! Gostaria de agendar um horário.')} target="_blank" rel="noreferrer">
                Agendar meu horário <ArrowRight size={18} />
              </a>
            </FlowButton>
            <a className="hero-services-link" href="#servicos">Ver serviços <ArrowRight size={16} aria-hidden="true" /></a>
          </div>
          <ul className="hero-reassurance" aria-label="Informações de atendimento">
            <li><span aria-hidden="true" />Jaraguá do Sul</li>
            <li><span aria-hidden="true" />Horário marcado</li>
            <li><span aria-hidden="true" />Unhas e maquiagem</li>
          </ul>
        </div>

        <div className="hero-media hero-gallery">
          <figure className="hero-portrait hero-portrait-frame hero-photo-main">
            <Image src="/nude-dourada.jpeg" alt="Unhas em tom nude com detalhes dourados realizadas pela Débora Nails" fill preload sizes="(max-width: 767px) 100vw, (max-width: 1023px) 78vw, 37vw" className="object-cover object-[center_62%]" />
            <div className="hero-photo-wash" aria-hidden="true" />
            <figcaption className="hero-portrait-caption"><span>Trabalho autoral</span><strong>Detalhes que acompanham você.</strong></figcaption>
            <div className="hero-availability"><span aria-hidden="true" />Atendimento com horário marcado</div>
          </figure>
          <figure className="hero-photo-secondary">
            <Image src="/delicada.jpeg" alt="Unhas delicadas em tom rosado realizadas pela Débora Nails" fill sizes="(max-width: 767px) 42vw, 18vw" className="object-cover" />
          </figure>
          <figure className="hero-photo-tertiary">
            <Image src="/make01.jpeg" alt="Maquiagem realizada pela Débora Nails" fill sizes="18vw" className="object-cover object-[center_35%]" />
          </figure>
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
