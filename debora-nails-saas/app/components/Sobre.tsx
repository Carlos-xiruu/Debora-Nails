'use client'

import Image from 'next/image';
import { Heart } from 'lucide-react';

export default function Sobre() {
  return (
    <section id="sobre" className="py-20 px-6 relative z-10">
      <div className="max-w-5xl mx-auto glass-card rounded-3xl p-6 md:p-12 border border-[#3a2522] flex flex-col md:flex-row items-center gap-10 shadow-2xl">
        <div className="w-full md:w-1/3 relative group">
          <div className="w-full aspect-square md:aspect-[4/5] relative rounded-2xl overflow-hidden border border-[#DCAE96]/20 z-10">
             <Image src="/fotonova.jpeg" alt="Debora Silva" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
          </div>
          <div className="absolute -bottom-5 -right-5 bg-[#0a0204] border border-[#C7977D]/40 text-[#F8D1BE] p-4 rounded-xl shadow-2xl z-20 flex flex-col items-center">
            <span className="text-3xl font-serif font-bold text-[#DCAE96]">6+</span>
            <span className="text-[9px] uppercase tracking-widest text-center font-bold mt-1">Anos de<br/>Experiência</span>
          </div>
        </div>
        <div className="w-full md:w-2/3">
          <span className="text-[#C7977D] text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><Heart size={14}/> A Especialista</span>
          <h2 className="font-serif text-4xl text-white mb-5">Muito prazer, sou a <span className="italic text-[#DCAE96]">Debora.</span></h2>
          <div className="space-y-4 text-gray-300 text-base leading-relaxed font-light">
            <p>Por trás de cada detalhe, existe uma mulher que ama transformar beleza em autoestima.</p>
            <p>Há mais de 6 anos venho aperfeiçoando minhas técnicas, aprendendo, evoluindo e construindo um trabalho que carrega muito de quem eu sou: <strong>dedicação, delicadeza, perfeccionismo e amor pelo que faço</strong>.<br/>Para mim, cada cliente é única, e cada atendimento é uma oportunidade de fazer você se olhar no espelho e pensar: “uau, era exatamente isso que eu queria.” Mais do que unhas, eu entrego cuidado, confiança e uma experiência feita para você. </p>
          </div>
        </div>
      </div>
    </section>
  );
}