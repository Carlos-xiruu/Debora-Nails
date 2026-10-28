'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const nailImages = ['/01.jpg', '/vermelha.jpeg', '/02.jpg', '/nude-branca.jpeg', '/delicada.jpeg', '/branca-nude.jpeg', '/roxa.jpeg', '/nude-dourada.jpeg'];
const makeupImages = ['/make01.jpeg', '/make-loira.jpeg', '/make-rabico.jpeg', '/make02.jpeg', '/make-batomv.jpeg', '/make03.jpeg', '/make-menina.jpg', '/make04.jpeg'];

function BeforeAfterSlider({ beforeSrc, afterSrc, label }: { beforeSrc: string; afterSrc: string; label: string }) {
  const [position, setPosition] = useState(50);

  return (
    <div className="before-after-slider">
      <Image src={beforeSrc} alt={`Antes: ${label}`} fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover pointer-events-none" />
      <div className="before-after-after" style={{ clipPath: `polygon(0 0, ${position}% 0, ${position}% 100%, 0 100%)` }}>
        <Image src={afterSrc} alt={`Depois: ${label}`} fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover pointer-events-none" />
      </div>
      <div className="before-after-handle" style={{ left: `calc(${position}% - 1px)` }} aria-hidden="true"><span><ChevronLeft size={13} /><ChevronRight size={13} /></span></div>
      <input aria-label={`Comparar antes e depois: ${label}`} type="range" min="0" max="100" value={position} onChange={(event) => setPosition(Number(event.target.value))} className="before-after-input" />
      <span className="before-after-label before-after-label-left" style={{ opacity: position > 20 ? 1 : 0 }}>Depois</span>
      <span className="before-after-label before-after-label-right" style={{ opacity: position < 80 ? 1 : 0 }}>Antes</span>
    </div>
  );
}

function PortfolioRail({ title, images, aspect, onSelect }: { title: string; images: string[]; aspect: 'portrait' | 'square'; onSelect: (image: string, alt: string) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => railRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' });

  return (
    <section className="portfolio-group" aria-labelledby={`${title}-title`}>
      <div className="portfolio-group-header">
        <h3 id={`${title}-title`}>{title}</h3>
        <div className="portfolio-controls">
          <button type="button" onClick={() => scroll(-1)} aria-label={`Ver trabalhos anteriores de ${title}`}><ChevronLeft size={19} /></button>
          <button type="button" onClick={() => scroll(1)} aria-label={`Ver próximos trabalhos de ${title}`}><ChevronRight size={19} /></button>
        </div>
      </div>
      <div className="portfolio-rail" ref={railRef} tabIndex={0} onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') scroll(-1);
        if (event.key === 'ArrowRight') scroll(1);
      }}>
        {images.map((image, index) => {
          const alt = `${title}, trabalho ${index + 1}`;
          return (
            <button className={`portfolio-card portfolio-card-${aspect}`} type="button" key={image} onClick={() => onSelect(image, alt)} aria-label={`Ampliar ${alt}`}>
              <Image src={image} alt={alt} fill sizes="(max-width: 639px) 82vw, (max-width: 1023px) 42vw, 300px" className="object-cover" />
              <span><Expand size={17} /></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Portfolio() {
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selectedImage) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const manageDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedImage(null);
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', manageDialogKeys);
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', manageDialogKeys);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [selectedImage]);

  return (
    <section id="portfolio" className="portfolio-section">
      <div className="portfolio-container">
        <div className="portfolio-heading">
          <span>Galeria de arte</span>
          <h2>Transformações reais,<br /><em>beleza que acompanha você.</em></h2>
          <p>Deslize para conhecer alguns dos trabalhos realizados no estúdio.</p>
        </div>

        <PortfolioRail title="Nail design" images={nailImages} aspect="portrait" onSelect={(src, alt) => setSelectedImage({ src, alt })} />
        <PortfolioRail title="Maquiagem profissional" images={makeupImages} aspect="square" onSelect={(src, alt) => setSelectedImage({ src, alt })} />

        <div className="before-after-section">
          <div className="portfolio-heading portfolio-heading-compact">
            <span>O poder da maquiagem</span>
            <h3>Antes & depois</h3>
            <p>Arraste a linha para revelar cada transformação.</p>
          </div>
          <div className="before-after-grid">
            <BeforeAfterSlider beforeSrc="/make-antes1.jpeg" afterSrc="/make-depois1.jpeg" label="maquiagem profissional 1" />
            <BeforeAfterSlider beforeSrc="/make-antes2.jpeg" afterSrc="/make-depois2.jpeg" label="maquiagem profissional 2" />
          </div>
        </div>
      </div>

      {selectedImage && (
        <div className="portfolio-lightbox" role="dialog" aria-modal="true" aria-label={selectedImage.alt} onClick={() => setSelectedImage(null)}>
          <button ref={closeButtonRef} className="portfolio-lightbox-close" type="button" aria-label="Fechar imagem ampliada" onClick={() => setSelectedImage(null)}><X size={22} /></button>
          <div className="portfolio-lightbox-image" onClick={(event) => event.stopPropagation()}>
            <Image src={selectedImage.src} alt={selectedImage.alt} fill sizes="100vw" className="object-contain" priority />
          </div>
        </div>
      )}
    </section>
  );
}
