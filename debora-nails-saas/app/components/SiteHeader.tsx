'use client';

import Image from 'next/image';
import { Menu, MessageCircle, X } from 'lucide-react';
import { useState } from 'react';

const links = [
  { href: '#servicos', label: 'Serviços' },
  { href: '#portfolio', label: 'Portfólio' },
  { href: '#espaco', label: 'O espaço' },
  { href: '#sobre', label: 'Sobre' },
];

const whatsappUrl = 'https://wa.me/5547996987519?text=Ol%C3%A1%2C%20D%C3%A9bora!%20Gostaria%20de%20agendar%20um%20hor%C3%A1rio.';

export default function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#inicio" aria-label="Debora Nails, início" onClick={closeMenu}>
          <Image src="/logo.PNG" alt="" width={46} height={46} priority />
          <span><strong>Debora Nails</strong><small>Beauty Studio</small></span>
        </a>

        <button className="menu-toggle" type="button" aria-expanded={isOpen} aria-controls="primary-navigation" onClick={() => setIsOpen((open) => !open)}>
          {isOpen ? <X size={21} /> : <Menu size={21} />}
          <span className="sr-only">{isOpen ? 'Fechar menu' : 'Abrir menu'}</span>
        </button>

        <nav id="primary-navigation" className={`nav-links${isOpen ? ' is-open' : ''}`} aria-label="Navegação principal">
          {links.map((link) => <a href={link.href} key={link.href} onClick={closeMenu}>{link.label}</a>)}
          <a className="nav-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" onClick={closeMenu}><MessageCircle size={16} /> WhatsApp</a>
        </nav>
      </div>
    </header>
  );
}
