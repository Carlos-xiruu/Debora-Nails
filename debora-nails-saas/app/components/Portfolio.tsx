'use client'

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AntesEDepoisSlider = ({ antesSrc, depoisSrc }: { antesSrc: string, depoisSrc: string }) => {
  const [posicao, setPosicao] = useState(50);

  return (
    <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden group border border-[#DCAE96]/20 select-none shadow-xl">
      <Image src={antesSrc} alt="Antes" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover pointer-events-none" />
      <div className="absolute inset-0 z-10 pointer-events-none" style={{ clipPath: `polygon(0 0, ${posicao}% 0, ${posicao}% 100%, 0 100%)` }}>
        <Image src={depoisSrc} alt="Depois" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover pointer-events-none" />
      </div>
      <div className="absolute top-0 bottom-0 z-20 w-[2px] bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.8)] pointer-events-none" style={{ left: `calc(${posicao}% - 1px)` }}>
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-200">
          <div className="flex gap-0.5">
            <ChevronLeft size={14} className="text-[#C7977D]" />
            <ChevronRight size={14} className="text-[#C7977D]" />
          </div>
        </div>
      </div>
      <input type="range" min="0" max="100" value={posicao} onChange={(e) => setPosicao(Number(e.target.value))} className="absolute inset-0 z-30 w-full h-full opacity-0 cursor-ew-resize" />
      <div className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur-md px-2 py-1 rounded text-[9px] uppercase font-bold tracking-widest border border-white/10 text-white pointer-events-none transition-opacity duration-300" style={{ opacity: posicao > 20 ? 1 : 0 }}>Depois</div>
      <div className="absolute top-4 right-4 z-20 bg-[#DCAE96]/80 backdrop-blur-md px-2 py-1 rounded text-[9px] uppercase font-bold tracking-widest border border-white/20 text-[#120308] pointer-events-none transition-opacity duration-300" style={{ opacity: posicao < 80 ? 1 : 0 }}>Antes</div>
    </div>
  );
};

export default function Portfolio() {
  return (
    <section id="portfolio" className="py-20 px-6 bg-[#050102] border-y border-[#3a2522] relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="glow-text text-sm font-bold uppercase tracking-widest">Galeria de Arte</span>
          <h2 className="font-serif text-4xl md:text-5xl text-white mt-2 mb-4">Transformações Reais</h2>
        </div>

        <h3 className="text-2xl font-serif text-[#F8D1BE] mb-6 border-l-4 border-[#C7977D] pl-4">Nails Design</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-16">
          {['/01.jpg', '/vermelha.jpeg', '/02.jpg','/nude-branca.jpeg','/delicada.jpeg','/branca-nude.jpeg','/roxa.jpeg','/nude-dourada.jpeg'].map((img, i) => (
            <article key={i} className="glass-card neon-hover rounded-2xl overflow-hidden aspect-[4/5] border border-[#DCAE96]/20 group cursor-pointer relative">
              <Image src={img} alt="Trabalho Debora Nails" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
            </article>
          ))}
        </div>

        <h3 className="text-2xl font-serif text-[#F8D1BE] mb-6 border-l-4 border-[#C7977D] pl-4 mt-20">Maquiagem Profissional</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {['/make01.jpeg','/make-loira.jpeg','/make-rabico.jpeg', '/make02.jpeg', '/make-batomv.jpeg' , '/make03.jpeg','/make-menina.jpg' , '/make04.jpeg'].map((img, i) => (
            <article key={i} className="glass-card neon-hover rounded-2xl overflow-hidden aspect-square border border-[#DCAE96]/20 group cursor-pointer relative">
              <Image src={img} alt="Maquiagem Profissional" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
            </article>
          ))}
        </div>

        <div className="pt-16 border-t border-[#3a2522]">
          <div className="text-center mb-10">
            <span className="glow-text text-sm font-bold uppercase tracking-widest">O Poder da Maquiagem</span>
            <h3 className="font-serif text-3xl md:text-4xl text-white mt-2">Antes & Depois</h3>
            <p className="text-gray-400 text-sm mt-3 font-light">Arraste a linha para ver a transformação completa.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AntesEDepoisSlider antesSrc="/make-antes1.jpeg" depoisSrc="/make-depois1.jpeg" />
            <AntesEDepoisSlider antesSrc="/make-antes2.jpeg" depoisSrc="/make-depois2.jpeg" />
          </div>
        </div>
      </div>
    </section>
  );
}