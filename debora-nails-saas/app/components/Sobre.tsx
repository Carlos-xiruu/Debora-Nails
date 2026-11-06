import Image from 'next/image';
import { ArrowDownRight } from 'lucide-react';
import Reveal from './Reveal';

export default function Sobre() {
  return (
    <section id="sobre" className="about-section">
      <div className="about-container">
        <Reveal className="about-photo-wrap" delay={40}>
          <p className="about-number">02</p>
          <div className="about-photo"><Image src="/debora.jpg" alt="Débora Silva, nail designer e maquiadora" fill sizes="(max-width: 767px) 100vw, 40vw" className="object-cover object-[50%_25%]" /></div>
          <p className="about-caption">Débora Silva<br />Nail designer & maquiadora</p>
        </Reveal>
        <Reveal className="about-copy" delay={120}>
          <span className="section-label">Por trás do atendimento</span>
          <h2>Prazer, eu sou<br /><em>a Débora.</em></h2>
          <div className="about-copy-body">
            <p>Por trás de cada detalhe, existe uma mulher que ama transformar beleza em autoestima.</p>
            <p>Há mais de 6 anos venho aperfeiçoando minhas técnicas, aprendendo, evoluindo e construindo um trabalho que carrega muito de quem eu sou: <strong>dedicação, delicadeza, perfeccionismo e amor pelo que faço.</strong></p>
            <p>Para mim, cada cliente é única, e cada atendimento é uma oportunidade de fazer você se olhar no espelho e pensar: “uau, era exatamente isso que eu queria.” Mais do que unhas, eu entrego cuidado, confiança e uma experiência feita para você.</p>
          </div>
          <p className="about-signature"><ArrowDownRight size={17} /> Técnica que valoriza a sua beleza.</p>
        </Reveal>
      </div>
    </section>
  );
}
