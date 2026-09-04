'use client'

import Image from 'next/image';
import { Coffee, Wifi, Wind, CarFront, MapPin } from 'lucide-react';

export default function Espaco() {
  return (
    <section id="espaco" className="py-24 px-6 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="order-2 lg:order-1 grid grid-cols-2 gap-4 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#120308] to-transparent z-10 pointer-events-none rounded-3xl"></div>
          <div className="rounded-3xl w-full h-[300px] md:h-64 overflow-hidden border border-[#DCAE96]/20 mt-8 shadow-xl group relative">
             <Image src="/cadeiras.png" alt="Interior do Ateliê" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
          </div>
          <div className="rounded-3xl w-full h-[300px] md:h-64 overflow-hidden border-2 border-[#C7977D] shadow-[0_0_30px_rgba(199,151,125,0.3)]">
             <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                <source src="/espaco.mp4" type="video/mp4" />
             </video>
          </div>
          <div className="col-span-2 rounded-3xl w-full h-[200px] md:h-48 overflow-hidden border border-[#DCAE96]/20 shadow-xl group relative">
             <Image src="/mesa.png" alt="Detalhe do Ateliê" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
          </div>
        </div>

        <div className="order-1 lg:order-2 text-center lg:text-left">
          <span className="glow-text text-xs md:text-sm font-bold uppercase tracking-widest mb-2 block">Onde a Mágica Acontece</span>
          <h2 className="font-serif text-4xl md:text-5xl text-white mb-6">Seu momento de <span className="text-[#F8D1BE] italic">paz e luxo.</span></h2>
          <p className="text-gray-400 text-sm md:text-lg mb-10 leading-relaxed font-light px-4 lg:px-0">
            Muito mais do que fazer as unhas, oferecemos uma experiência de relaxamento completa. 
            Nosso ateliê foi projetado para ser o seu refúgio da rotina corrida, com atendimento pontual e exclusivo.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 px-4 lg:px-0 text-left">
            <div className="flex items-center gap-3 bg-[#120308] p-3 rounded-xl border border-[#3a2522]">
              <div className="w-10 h-10 rounded-full bg-[#0a0204] flex items-center justify-center shrink-0"><Coffee className="text-[#C7977D]" size={18}/></div>
              <span className="text-[#E8D3C8] font-medium text-xs md:text-sm">Menu de Bebidas</span>
            </div>
            <div className="flex items-center gap-3 bg-[#120308] p-3 rounded-xl border border-[#3a2522]">
              <div className="w-10 h-10 rounded-full bg-[#0a0204] flex items-center justify-center shrink-0"><Wifi className="text-[#C7977D]" size={18}/></div>
              <span className="text-[#E8D3C8] font-medium text-xs md:text-sm">Wi-Fi Exclusivo</span>
            </div>
            <div className="flex items-center gap-3 bg-[#120308] p-3 rounded-xl border border-[#3a2522]">
              <div className="w-10 h-10 rounded-full bg-[#0a0204] flex items-center justify-center shrink-0"><CarFront className="text-[#C7977D]" size={18}/></div>
              <span className="text-[#E8D3C8] font-medium text-xs md:text-sm">Estacionamento</span>
            </div>
            <div className="flex items-center gap-3 bg-[#120308] p-3 rounded-xl border border-[#3a2522]">
              <div className="w-10 h-10 rounded-full bg-[#0a0204] flex items-center justify-center shrink-0"><Wind className="text-[#C7977D]" size={18}/></div>
              <span className="text-[#E8D3C8] font-medium text-xs md:text-sm">Climatização</span>
            </div>
          </div>

          <div className="glass-card p-5 md:p-6 rounded-[24px] border border-[#DCAE96]/20 shadow-xl mx-4 lg:mx-0 text-left">
            <h3 className="text-white font-bold mb-2 flex items-center gap-2 text-sm md:text-base"><MapPin className="text-[#C7977D]" size={18}/> Madalena Ateliê de Beleza</h3>
            <p className="text-gray-400 text-xs md:text-sm mb-4">Rua Fritz Hasse, 38 - Centro<br/>Jaraguá do Sul - SC, 89251-180</p>
            <div className="h-40 md:h-48 rounded-xl overflow-hidden border border-[#DCAE96]/10">
               <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3570.9757661162407!2d-49.07930872662806!3d-26.4887251245534!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94de953cae7f01db%3A0x3b361fd6e7bd4a66!2sMadalena%20Ateli%C3%AA%20de%20Beleza!5e0!3m2!1spt-BR!2sbr!4v1785889183146!5m2!1spt-BR!2sbr" 
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                className="filter invert-[.9] hue-rotate-180 opacity-80"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}