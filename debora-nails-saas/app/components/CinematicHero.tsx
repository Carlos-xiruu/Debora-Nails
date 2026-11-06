'use client';

import Image from 'next/image';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

const whatsappUrl = 'https://wa.me/5547996987519?text=Ol%C3%A1%2C%20D%C3%A9bora!%20Gostaria%20de%20agendar%20um%20hor%C3%A1rio.';

function TopCoatBrush() {
  return (
    <svg viewBox="0 0 180 500" role="presentation" aria-hidden="true">
      <defs>
        <linearGradient id="brush-handle" x1="0" x2="1">
          <stop stopColor="#2d101b" />
          <stop offset=".46" stopColor="#8c5365" />
          <stop offset=".64" stopColor="#f3c9bd" />
          <stop offset="1" stopColor="#3c1624" />
        </linearGradient>
        <linearGradient id="brush-metal" x1="0" x2="1">
          <stop stopColor="#936c57" />
          <stop offset=".5" stopColor="#f7dfbe" />
          <stop offset="1" stopColor="#765044" />
        </linearGradient>
        <linearGradient id="brush-bristles" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#f9eee6" />
          <stop offset="1" stopColor="#cc9d91" />
        </linearGradient>
      </defs>
      <path d="M36 8C36-4 144-4 144 8l-11 222H47L36 8Z" fill="url(#brush-handle)" />
      <path d="M47 226h86l-8 76H55l-8-76Z" fill="url(#brush-metal)" />
      <path d="M55 294h70l16 126c3 23-15 70-51 72-36-2-54-49-51-72l16-126Z" fill="url(#brush-bristles)" />
      <path d="M62 308h56l8 113c1 13-8 39-36 46-28-7-37-33-36-46l8-113Z" fill="rgba(255,255,255,.38)" />
      <path d="M66 21h48" stroke="rgba(255,255,255,.6)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function CinematicHero() {
  const reducedMotion = useReducedMotion();
  const [imageReady, setImageReady] = useState(false);
  const scene = !reducedMotion && imageReady;

  return (
    <section id="inicio" className={`cinematic-hero${scene ? ' cinematic-hero--animated' : ''}`} aria-labelledby="hero-title">
      <div className="cinematic-image">
        <Image
          src="/nude-branca.jpeg"
          alt="Unhas rosé com pontas brancas e detalhes dourados realizadas pela Débora Nails"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          onLoad={() => setImageReady(true)}
        />
      </div>
      <div className="cinematic-wash" aria-hidden="true" />
      <div className="cinematic-content">
        <p className="cinematic-kicker">Débora Nails · Jaraguá do Sul</p>
        <h1 id="hero-title"><span>O detalhe</span> <em>muda tudo.</em></h1>
        <p className="cinematic-description">Um toque de brilho, técnica e cuidado para revelar a sua melhor versão.</p>
        <a className="cinematic-action" href={whatsappUrl} target="_blank" rel="noreferrer">Agendar meu momento <ArrowUpRight size={18} aria-hidden="true" /></a>
      </div>
      {scene && (
        <>
          <motion.div
            className="top-coat-gloss"
            initial={{ opacity: 0, scaleX: 0, x: '-28vw', y: '-15vh' }}
            animate={{ opacity: [0, 0, .82, .35, 0], scaleX: [0, .2, 1, 1.15, 1.2], x: ['-28vw', '-5vw', '20vw', '54vw', '80vw'], y: ['-15vh', '-4vh', '7vh', '17vh', '25vh'] }}
            transition={{ duration: 2.35, delay: .55, ease: 'easeInOut', times: [0, .18, .46, .75, 1] }}
          />
          <motion.div
            className="top-coat-brush"
            initial={{ opacity: 0, x: '-20vw', y: '-58vh', rotate: 28 }}
            animate={{ opacity: [0, 1, 1, 0], x: ['-20vw', '5vw', '42vw', '72vw'], y: ['-58vh', '-24vh', '9vh', '34vh'], rotate: [28, 26, 22, 18] }}
            transition={{ duration: 2.25, delay: .35, ease: [0.22, 0.72, 0.22, 1], times: [0, .15, .74, 1] }}
          >
            <TopCoatBrush />
          </motion.div>
        </>
      )}
      <a className="cinematic-scroll" href="#sobre"><span>Conheça o estúdio</span><ArrowDown size={17} aria-hidden="true" /></a>
    </section>
  );
}
