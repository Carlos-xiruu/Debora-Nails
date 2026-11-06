'use client'

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FAQ() {
  const [faqAberto, setFaqAberto] = useState<number | null>(null);

  const faqs = [
    { q: "Quanto tempo demora a aplicação da fibra?", a: "O procedimento leva em média de 2h a 2h30. Esse tempo é necessário para a preparação minuciosa e o acabamento impecável." },
    { q: "Quanto tempo demora o Banho de gel e Esmaltação?", a: "A esmaltação leva de 1h a 1h30. O banho de gel em média de 1h30 a 2h15, dependendo da necessidade da unha natural." },
    { q: "Quais os tipos de alongamento?", a: "Trabalhamos com técnica em molde F1 e Fibra de Vidro." },
    { q: "Quanto tempo dura a esmaltação em gel?", a: "De 15 a 20 dias, dependendo do cuidado prestado. Para o Banho de gel, de 21 a 25 dias." },
    { q: "Quais as formas de pagamento aceitas?", a: "Aceitamos pagamentos via PIX, cartão de crédito, débito e dinheiro." }
  ];

  return (
    <section className="faq-section" aria-labelledby="faq-title">
      <div className="faq-heading">
        <span className="section-label">Para você se planejar</span>
        <h2 id="faq-title">Dúvidas frequentes</h2>
      </div>
      <div className="faq-list">
        {faqs.map((faq, index) => (
          <article key={index} className={`faq-item${faqAberto === index ? ' is-open' : ''}`}>
            <button
              type="button"
              id={`faq-question-${index}`}
              aria-expanded={faqAberto === index}
              aria-controls={`faq-answer-${index}`}
              onClick={() => setFaqAberto(faqAberto === index ? null : index)}
              className="faq-question"
            >
              {faq.q}
              <ChevronDown className="faq-arrow" />
            </button>
            <div id={`faq-answer-${index}`} role="region" aria-labelledby={`faq-question-${index}`} hidden={faqAberto !== index} className="faq-answer">
              <p>{faq.a}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
