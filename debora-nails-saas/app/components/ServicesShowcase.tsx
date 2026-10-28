'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, Clock3, Crown, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Service = {
  id: string | number;
  nome: string;
  descricao?: string | null;
  duracao?: string | null;
  preco?: number | string | null;
  imagem_url?: string | null;
  foto_url?: string | null;
  imagem?: string | null;
  is_pacote?: boolean | null;
};

const whatsappUrl = (message: string) =>
  `https://wa.me/5547996987519?text=${encodeURIComponent(message)}`;

const formatPrice = (price: Service['preco']) => {
  const value = typeof price === 'string' ? Number(price.replace(',', '.')) : price;
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;
};

const serviceImage = (service: Service) => service.imagem_url || service.foto_url || service.imagem;

export default function ServicesShowcase() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const loadServices = async () => {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('ativo', true)
        .order('preco', { ascending: true });

      if (!error) setServices((data ?? []) as Service[]);
      setIsLoading(false);
    };

    void loadServices();
  }, []);

  const individualServices = services.filter((service) => !service.is_pacote);
  const packages = services.filter((service) => service.is_pacote);

  return (
    <>
      <section id="servicos" className="content-section">
        <div className="section-heading">
          <span className="section-subtitle glow-text">Especialidades</span>
          <h2>Seu ritual de beleza começa aqui.</h2>
        </div>
        {isLoading ? (
          <div className="service-skeletons" aria-label="Carregando serviços">
            {[1, 2, 3].map((item) => <div className="service-skeleton" key={item} />)}
          </div>
        ) : individualServices.length > 0 ? (
          <div className="service-showcase-grid">
            {individualServices.map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        ) : (
          <p className="service-empty">Em breve, novos serviços estarão disponíveis.</p>
        )}
      </section>

      {packages.length > 0 && (
        <section className="package-section muted-section">
          <div className="content-section">
            <div className="section-heading">
              <span className="section-subtitle glow-text">Cuidado contínuo</span>
              <h2>Pacotes criados para a sua rotina.</h2>
            </div>
            <div className="package-grid">
              {packages.map((service) => <PackageCard key={service.id} service={service} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const price = formatPrice(service.preco);
  const image = serviceImage(service);

  return (
    <article className="service-showcase-card glass-card neon-hover">
      {image && <img src={image} alt={service.nome} className="service-showcase-image" loading="lazy" />}
      <div className="service-showcase-body">
        <div className="service-showcase-meta">
          <span><Sparkles size={14} /> Atendimento exclusivo</span>
          {price && <strong>{price}</strong>}
        </div>
        <h3>{service.nome}</h3>
        {service.descricao && <p>{service.descricao}</p>}
        {service.duracao && <span className="service-duration"><Clock3 size={15} /> {service.duracao}</span>}
        <a className="service-book-button" href={whatsappUrl(`Olá, Débora! Gostaria de agendar um horário para o serviço: ${service.nome}`)} target="_blank" rel="noreferrer">
          Agendar pelo WhatsApp <ArrowRight size={17} />
        </a>
      </div>
    </article>
  );
}

function PackageCard({ service }: { service: Service }) {
  const price = formatPrice(service.preco);
  const image = serviceImage(service);

  return (
    <article className="package-card glass-card">
      {image && <img src={image} alt={service.nome} className="package-image" loading="lazy" />}
      <div className="package-card-body">
        <Crown size={20} className="text-[#DCAE96]" />
        {price && <strong className="package-price">{price}</strong>}
        <h3>{service.nome}</h3>
        {service.descricao && <p>{service.descricao}</p>}
        {service.duracao && <span><Clock3 size={15} /> {service.duracao}</span>}
        <span><Check size={15} /> Atendimento personalizado</span>
        <a className="package-link" href={whatsappUrl(`Olá, Débora! Tenho interesse em assinar o pacote: ${service.nome}`)} target="_blank" rel="noreferrer">Tenho interesse <ArrowRight size={16} /></a>
      </div>
    </article>
  );
}
