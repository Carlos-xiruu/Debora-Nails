import Image from 'next/image';
import { Heart, Sparkles } from 'lucide-react';

export default function Sobre() {
  return (
    <section id="sobre" className="about-section relative z-10">
      <div className="about-container">
        <div className="about-photo-wrap">
          <div className="about-photo about-photo-editorial">
             <Image src="/fotonova.jpeg" alt="Débora Silva, nail designer e maquiadora" fill sizes="(max-width: 767px) 100vw, 33vw" className="object-cover object-[50%_20%]" />
          </div>
          <div className="about-experience">
            <span className="text-3xl font-serif font-bold text-[#DCAE96]">6+</span>
            <span className="text-[9px] uppercase tracking-widest text-center font-bold mt-1">Anos de<br/>Experiência</span>
          </div>
        </div>
        <div className="about-copy">
          <span><Heart size={14}/> A especialista</span>
          <h2>Muito prazer,<br />sou a <em>Débora.</em></h2>
          <div className="about-copy-body">
            <p>Por trás de cada detalhe, existe uma mulher que ama transformar beleza em autoestima.</p>
            <p>Há mais de 6 anos venho aperfeiçoando minhas técnicas, aprendendo, evoluindo e construindo um trabalho que carrega muito de quem eu sou: <strong>dedicação, delicadeza, perfeccionismo e amor pelo que faço.</strong></p>
            <p>Para mim, cada cliente é única, e cada atendimento é uma oportunidade de fazer você se olhar no espelho e pensar: “uau, era exatamente isso que eu queria.” Mais do que unhas, eu entrego cuidado, confiança e uma experiência feita para você.</p>
          </div>
          <p className="about-signature"><Sparkles size={15} /> Técnica que valoriza a sua beleza.</p>
        </div>
      </div>
    </section>
  );
}
