'use client';

import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const links = [
  { href: '#sobre', label: 'Sobre' },
  { href: '#servicos', label: 'Serviços' },
  { href: '#portfolio', label: 'Portfólio' },
  { href: '#espaco', label: 'O espaço' },
];

const whatsappUrl = 'https://wa.me/5547996987519?text=Ol%C3%A1%2C%20D%C3%A9bora!%20Gostaria%20de%20agendar%20um%20hor%C3%A1rio.';

export default function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#inicio" aria-label="Debora Nails, início" onClick={closeMenu}>
          <span><strong>Débora</strong><small>Nails & beauty</small></span>
        </a>

        <div className="header-controls">
          {isOpen && <button className="nav-scrim" type="button" onClick={closeMenu} aria-label="Fechar menu" />}
          <nav id="primary-navigation" className={`nav-links${isOpen ? ' is-open' : ''}`} aria-label="Navegação principal">
            {links.map((link) => <a href={link.href} key={link.href} onClick={closeMenu}>{link.label}</a>)}
          </nav>
          <a className="header-booking" href={whatsappUrl} target="_blank" rel="noreferrer">
            <span>Agendar</span><ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <button className="menu-toggle" type="button" aria-expanded={isOpen} aria-controls="primary-navigation" onClick={() => setIsOpen((open) => !open)}>
            {isOpen ? <X size={21} /> : <Menu size={21} />}
            <span className="sr-only">{isOpen ? 'Fechar menu' : 'Abrir menu'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
