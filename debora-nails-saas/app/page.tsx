import Image from 'next/image';
import { ArrowRight, MapPin, MessageCircle } from 'lucide-react';
import Espaco from './components/Espaco';
import FAQ from './components/FAQ';
import Portfolio from './components/Portfolio';
import Sobre from './components/Sobre';
import ServicesShowcase from './components/ServicesShowcase';

const whatsappUrl = (message: string) =>
  `https://wa.me/5547996987519?text=${encodeURIComponent(message)}`;

export default function Home() {
  return (
    <main className="site-shell">
      <div className="ambient-grid" aria-hidden="true" />

      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#inicio" aria-label="Debora Nails, início">
            <Image src="/logo.PNG" alt="Debora Nails" width={46} height={46} priority />
            <span><strong>Debora Nails</strong><small>Beauty Studio</small></span>
          </a>
          <nav className="nav-links" aria-label="Navegação principal">
            <a href="#servicos">Serviços</a>
            <a href="#portfolio">Portfólio</a>
            <a href="#espaco">O espaço</a>
            <a href="#sobre">Sobre</a>
          </nav>
        </div>
      </header>

      <section id="inicio" className="hero-section">
        <div className="hero-content">
          <span className="hero-tag glow-text">Jaraguá do Sul, SC</span>
          <h1>Beleza refinada,<br /><em>detalhes inesquecíveis.</em></h1>
          <p className="hero-description">Unhas e maquiagem para mulheres que enxergam o autocuidado como uma experiência de luxo, leveza e autenticidade.</p>
          <div className="hero-actions">
            <a className="social-button main-action-button" href={whatsappUrl('Olá, Débora! Gostaria de agendar um horário.')} target="_blank" rel="noreferrer">
              Agendar pelo WhatsApp <ArrowRight size={18} />
            </a>
            <a className="social-button secondary-action-button" href="#servicos">Conhecer serviços</a>
          </div>
          <div className="hero-stats" aria-label="Diferenciais do studio">
            <span><strong>6+ anos</strong>de experiência</span>
            <span><strong>Atendimento</strong>individualizado</span>
            <span><strong>Premium</strong>em cada detalhe</span>
          </div>
        </div>

        <div className="hero-media">
          <div className="hero-float-wrapper">
            <div className="glass-card profile-card">
              <div className="profile-photo-wrap"><Image src="/fotonova.jpeg" alt="Débora Silva" width={64} height={64} /></div>
              <div className="profile-details"><strong>Débora Silva</strong><span>Nail designer & maquiadora</span></div>
              <span className="status-tag"><i className="dot" /> Agenda aberta</span>
            </div>
            <div className="glass-card concept-window">
              <div className="concept-topbar"><span /><span /><span /><strong>DEBORA NAILS</strong></div>
              <div className="concept-body">
                <p className="concept-badge">Sua pausa de beleza</p>
                <h3>Um atendimento pensado para você.</h3>
                <p>Escolha seu serviço e converse diretamente comigo para encontrar o melhor horário.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ServicesShowcase />

      <Portfolio />
      <Espaco />
      <Sobre />
      <FAQ />

      <section className="content-section pt-0">
        <div className="glass-card contact-section">
          <MapPin className="mx-auto mb-4 text-[#DCAE96]" size={24} />
          <h2>Pronta para o seu momento?</h2>
          <p>Fale diretamente com a Débora e encontre o melhor horário para você.</p>
          <a className="social-button main-action-button" href={whatsappUrl('Olá, Débora! Gostaria de agendar um horário.')} target="_blank" rel="noreferrer"><MessageCircle size={19} /> Garantir meu horário</a>
        </div>
      </section>

      <a className="floating-whatsapp" href={whatsappUrl('Olá, Débora! Gostaria de agendar um horário.')} target="_blank" rel="noreferrer" aria-label="Conversar no WhatsApp"><MessageCircle size={26} /></a>
      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Debora Nails. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
