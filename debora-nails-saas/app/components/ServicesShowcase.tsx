'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Clock3, ImageOff, MessageCircle, Sparkles } from 'lucide-react';
import { servicesStorageBucket, supabase, supabaseUrl } from '../lib/supabase';

type Service = {
  id: string | number;
  nome: string;
  descricao?: string | null;
  duracao?: string | null;
  preco?: number | string | null;
  is_pacote?: boolean | null;
  [key: string]: unknown;
};

type ImageReference = { bucket?: string; path: string };

const imageFields = ['imagem_url', 'foto_url', 'imagem', 'image_url', 'image', 'imagem_path', 'foto_path', 'image_path'];
const bucketFields = ['imagem_bucket', 'foto_bucket', 'image_bucket', 'bucket'];

const whatsappUrl = (message: string) =>
  `https://wa.me/5547996987519?text=${encodeURIComponent(message)}`;

const readText = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;

const formatPrice = (price: Service['preco']) => {
  const value = typeof price === 'string' ? Number(price.replace(',', '.')) : price;
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;
};

const displayDescription = (description: Service['descricao'], price: string | null) => {
  if (!description || !price) return description;
  const cleanDescription = description.replaceAll(price, '').replace(/\s{2,}/g, ' ').replace(/\s+([,.!])/g, '$1').trim();
  return cleanDescription || undefined;
};

const absoluteUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

const storageReference = (value: string): ImageReference | undefined => {
  if (!value.startsWith('storage://')) return undefined;
  const [bucket, ...path] = value.slice('storage://'.length).split('/');
  return bucket && path.length ? { bucket, path: path.join('/') } : undefined;
};

const getServiceImage = (service: Service) => {
  const value = imageFields.map((field) => readText(service[field])).find(Boolean);
  if (!value) return undefined;

  const url = absoluteUrl(value);
  if (url) return url;

  if (/^\/?storage\/v1\/object\/(?:public|sign)\//.test(value) && supabaseUrl) {
    return new URL(value.startsWith('/') ? value : `/${value}`, supabaseUrl).toString();
  }

  const reference = storageReference(value);
  const bucket = reference?.bucket ?? bucketFields.map((field) => readText(service[field])).find(Boolean) ?? servicesStorageBucket;
  if (!bucket || !supabase) return undefined;

  let path = reference?.path ?? value.replace(/^\/+/, '');
  if (path.startsWith(`${bucket}/`)) path = path.slice(bucket.length + 1);
  if (!path) return undefined;

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

export default function ServicesShowcase() {
  const [services, setServices] = useState<Service[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!supabase) {
      setStatus('error');
      return;
    }
    const client = supabase;
    let isMounted = true;

    const loadServices = async () => {
      const { data, error } = await client
        .from('servicos')
        .select('*')
        .eq('ativo', true)
        .order('preco', { ascending: true });

      if (!isMounted) return;
      if (error) {
        setStatus('error');
        return;
      }

      setServices((data ?? []) as Service[]);
      setStatus('ready');
    };

    void loadServices();
    return () => { isMounted = false; };
  }, []);

  const individualServices = services.filter((service) => !service.is_pacote);
  const packages = services.filter((service) => service.is_pacote);

  return (
    <section id="servicos" className="services-section">
      <div className="services-container">
        <div className="services-heading">
          <span className="services-eyebrow"><Sparkles size={14} /> Especialidades</span>
          <h2>Seu ritual de beleza,<br /><em>do seu jeito.</em></h2>
          <p>Escolha o cuidado que combina com você e fale diretamente com a Débora para encontrar seu horário.</p>
        </div>

        {status === 'loading' && <LoadingCards />}
        {status === 'error' && <ServicesMessage title="Não foi possível carregar os serviços agora." description="Fale diretamente com a Débora pelo WhatsApp para conhecer as opções disponíveis." />}
        {status === 'ready' && individualServices.length === 0 && <ServicesMessage title="Novos cuidados estão sendo preparados." description="Fale com a Débora para conhecer os serviços disponíveis." />}
        {status === 'ready' && individualServices.length > 0 && (
          <div className="services-grid">
            {individualServices.map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        )}

        {status === 'ready' && packages.length > 0 && (
          <div className="packages-showcase">
            <div className="packages-heading">
              <span>Planos de cuidado</span>
              <h3>Constância para suas unhas estarem sempre impecáveis.</h3>
            </div>
            <div className="packages-grid">
              {packages.map((service) => <ServiceCard key={service.id} service={service} isPackage />)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ServiceCard({ service, isPackage = false }: { service: Service; isPackage?: boolean }) {
  const price = formatPrice(service.preco);
  const description = displayDescription(service.descricao, price);
  const image = getServiceImage(service);
  const [imageFailed, setImageFailed] = useState(false);
  const action = isPackage
    ? `Olá, Débora! Tenho interesse no pacote: ${service.nome}`
    : `Olá, Débora! Gostaria de agendar um horário para o serviço: ${service.nome}`;

  return (
    <article className={`premium-service-card${isPackage ? ' premium-service-card-package' : ''}`}>
      <div className="service-media">
        {image && !imageFailed ? (
          <img src={image} alt={service.nome} className="service-image" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <div className="service-image-fallback" role="img" aria-label={`Imagem indisponível para ${service.nome}`}>
            <ImageOff size={25} strokeWidth={1.4} />
            <span>Debora Nails</span>
          </div>
        )}
        {price && <span className="service-price">{price}</span>}
        {isPackage && <span className="service-package-label">Pacote</span>}
      </div>
      <div className="service-content">
        <div className="service-title-row">
          <h3>{service.nome}</h3>
          {service.duracao && <span className="service-time"><Clock3 size={15} /> {service.duracao}</span>}
        </div>
        {description && <p>{description}</p>}
        <a className="service-whatsapp-button" href={whatsappUrl(action)} target="_blank" rel="noreferrer">
          <MessageCircle size={18} /> {isPackage ? 'Tenho interesse' : 'Agendar pelo WhatsApp'} <ArrowRight size={17} />
        </a>
      </div>
    </article>
  );
}

function LoadingCards() {
  return <div className="services-grid" aria-label="Carregando serviços">{[1, 2, 3].map((item) => <div className="service-loading-card" key={item} />)}</div>;
}

function ServicesMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="services-message">
      <Sparkles size={22} />
      <h3>{title}</h3>
      <p>{description}</p>
      <a href={whatsappUrl('Olá, Débora! Gostaria de conhecer os serviços disponíveis.')} target="_blank" rel="noreferrer">Falar no WhatsApp <ArrowRight size={16} /></a>
    </div>
  );
}
