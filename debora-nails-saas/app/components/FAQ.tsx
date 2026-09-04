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
    <section className="py-20 px-6 max-w-3xl mx-auto relative z-10 border-t border-[#3a2522]">
      <div className="text-center mb-10">
        <span className="glow-text text-sm font-bold uppercase tracking-widest">FAQ</span>
        <h2 className="font-serif text-3xl md:text-4xl text-white mt-2">Dúvidas Frequentes</h2>
      </div>
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <article key={index} className="glass-card border border-[#3a2522] rounded-xl md:rounded-2xl overflow-hidden transition-all">
            <button onClick={() => setFaqAberto(faqAberto === index ? null : index)} className="w-full text-left p-4 md:p-6 flex justify-between items-center text-white font-serif text-base md:text-lg hover:text-[#F8D1BE] transition-colors">
              {faq.q}
              <ChevronDown className={`transition-transform duration-300 shrink-0 ml-4 ${faqAberto === index ? 'rotate-180 text-[#C7977D]' : 'text-gray-500'}`} />
            </button>
            <div className={`px-4 md:px-6 overflow-hidden transition-all duration-300 ${faqAberto === index ? 'max-h-40 pb-4 md:pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed font-light">{faq.a}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}