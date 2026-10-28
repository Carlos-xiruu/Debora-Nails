import { CalendarCheck, MessageCircle, Sparkles } from 'lucide-react';

const steps = [
  {
    icon: Sparkles,
    title: 'Escolha seu cuidado',
    description: 'Explore as especialidades e encontre a técnica que combina com o seu momento.',
  },
  {
    icon: MessageCircle,
    title: 'Converse comigo',
    description: 'No WhatsApp, alinhamos o serviço e o melhor horário para você.',
  },
  {
    icon: CalendarCheck,
    title: 'Viva sua experiência',
    description: 'Um atendimento individualizado, pensado nos detalhes que fazem você se sentir bem.',
  },
];

export default function ExperienceTimeline() {
  return (
    <section className="experience-section" aria-labelledby="experience-title">
      <div className="experience-container">
        <div className="experience-heading">
          <span>Seu momento, com leveza</span>
          <h2 id="experience-title">Um cuidado que começa antes do atendimento.</h2>
        </div>
        <ol className="experience-timeline">
          {steps.map((step, index) => (
            <li className="experience-step" key={step.title}>
              <span className="experience-index">0{index + 1}</span>
              <div className="experience-icon"><step.icon size={20} /></div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
