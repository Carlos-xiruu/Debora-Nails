import Image from 'next/image';
import { MapPin } from 'lucide-react';
import SpaceMap from './SpaceMap';
import SpaceVideo from './SpaceVideo';

const directionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=Rua+Fritz+Hasse,+38,+Jaragu%C3%A1+do+Sul,+SC,+89251-180';

export default function Espaco() {
  return (
    <section id="espaco" className="space-section" aria-labelledby="space-title">
      <div className="space-container">
        <header className="space-intro">
          <span>Conheça nosso espaço</span>
          <h2 id="space-title">Um cantinho preparado<br /><em>para você.</em></h2>
          <p>Um ambiente tranquilo para cuidar de si, conversar e aproveitar uma pausa gostosa na rotina.</p>
        </header>

        <div className="space-video-stage">
          <SpaceVideo />
        </div>

        <div className="space-gallery" aria-label="Fotos do estúdio">
          <figure className="space-gallery-chair">
            <Image src="/cadeiras.png" alt="Poltronas do interior do ateliê" fill sizes="(max-width: 519px) 100vw, (max-width: 1023px) 50vw, 460px" className="object-cover" />
          </figure>
          <figure className="space-gallery-table">
            <Image src="/mesa.png" alt="Mesa de atendimento do ateliê" fill sizes="(max-width: 519px) 100vw, (max-width: 1023px) 50vw, 460px" className="object-cover" />
          </figure>
        </div>

        <section className="space-location" aria-labelledby="location-title">
          <div className="space-location-copy">
            <span>Localização</span>
            <h3 id="location-title"><MapPin size={19} /> Onde estamos</h3>
            <p>Madalena Ateliê de Beleza<br />Rua Fritz Hasse, 38 - Centro<br />Jaraguá do Sul - SC, 89251-180</p>
            <a className="space-directions" href={directionsUrl} target="_blank" rel="noreferrer">Como chegar</a>
          </div>
          <SpaceMap />
        </section>
      </div>
    </section>
  );
}
