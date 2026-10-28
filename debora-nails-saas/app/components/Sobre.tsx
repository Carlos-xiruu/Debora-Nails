import Image from 'next/image';
import { Heart } from 'lucide-react';

export default function Sobre() {
  return (
    <section id="sobre" className="about-section relative z-10">
      <div className="about-container">
        <div className="about-photo-wrap">
          <div className="about-photo">
             <Image src="/fotonova.jpeg" alt="Débora Silva, nail designer e maquiadora" fill sizes="(max-width: 767px) 100vw, 33vw" className="object-cover object-[50%_20%]" />
          </div>
          <div className="about-experience">
            <span className="text-3xl font-serif font-bold text-[#DCAE96]">6+</span>
            <span className="text-[9px] uppercase tracking-widest text-center font-bold mt-1">Anos de<br/>Experiência</span>
          </div>
        </div>
        <div className="about-copy">
          <span className="text-[#C7977D] text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><Heart size={14}/> A Especialista</span>
          <h2 className="font-serif text-4xl text-white mb-5">Muito prazer, sou a <span className="italic text-[#DCAE96]">Debora.</span></h2>
          <div className="space-y-4 text-[#dec2b8] text-base leading-relaxed font-light">
            <p>Por trás de cada detalhe, existe uma mulher que ama transformar beleza em autoestima.</p>
            <p>Há mais de 6 anos venho aperfeiçoando minhas técnicas, aprendendo, evoluindo e construindo um trabalho que carrega muito de quem eu sou: <strong>dedicação, delicadeza, perfeccionismo e amor pelo que faço.</strong></p>
            <p>Para mim, cada cliente é única, e cada atendimento é uma oportunidade de fazer você se olhar no espelho e pensar: “uau, era exatamente isso que eu queria.” Mais do que unhas, eu entrego cuidado, confiança e uma experiência feita para você.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
