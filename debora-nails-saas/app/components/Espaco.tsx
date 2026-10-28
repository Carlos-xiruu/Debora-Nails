import Image from 'next/image';
import { Coffee, Wifi, Wind, CarFront, MapPin } from 'lucide-react';
import SpaceVideo from './SpaceVideo';

export default function Espaco() {
  return (
    <section id="espaco" className="space-section">
      <div className="space-container">
        <div className="space-gallery">
          <div className="space-gallery-chair">
             <Image src="/cadeiras.png" alt="Poltronas do interior do ateliê" fill sizes="(max-width: 1023px) 50vw, 360px" className="object-cover" />
          </div>
          <div className="space-gallery-video">
              <SpaceVideo />
          </div>
          <div className="space-gallery-table">
             <Image src="/mesa.png" alt="Mesa de atendimento do ateliê" fill sizes="(max-width: 1023px) 100vw, 640px" className="object-cover" />
          </div>
        </div>

        <div className="space-copy">
          <span>Onde a magia acontece</span>
          <h2>Seu momento de<br /><em>paz e beleza.</em></h2>
          <p>
            Muito mais do que fazer as unhas, oferecemos uma experiência de relaxamento completa. 
            Nosso ateliê foi projetado para ser o seu refúgio da rotina corrida, com atendimento pontual e exclusivo.
          </p>
          
          <div className="space-amenities">
            <div><i><Coffee size={18}/></i><span>Menu de bebidas</span></div>
            <div><i><Wifi size={18}/></i><span>Wi-Fi exclusivo</span></div>
            <div><i><CarFront size={18}/></i><span>Estacionamento</span></div>
            <div><i><Wind size={18}/></i><span>Climatização</span></div>
          </div>
          <div className="space-location">
             <h3><MapPin size={18}/> Madalena Ateliê de Beleza</h3>
             <p>Rua Fritz Hasse, 38 - Centro<br/>Jaraguá do Sul - SC, 89251-180</p>
             <div className="space-map">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3570.9757661162407!2d-49.07930872662806!3d-26.4887251245534!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94de953cae7f01db%3A0x3b361fd6e7bd4a66!2sMadalena%20Ateli%C3%AA%20de%20Beleza!5e0!3m2!1spt-BR!2sbr!4v1785889183146!5m2!1spt-BR!2sbr"
                  title="Localização do Madalena Ateliê de Beleza"
                  width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
             </div>
            </div>
        </div>
      </div>
    </section>
  );
}
