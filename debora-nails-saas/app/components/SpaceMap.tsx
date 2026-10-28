'use client';

import { useEffect, useRef, useState } from 'react';

const mapUrl = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3570.9757661162407!2d-49.07930872662806!3d-26.4887251245534!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94de953cae7f01db%3A0x3b361fd6e7bd4a66!2sMadalena%20Ateli%C3%AA%20de%20Beleza!5e0!3m2!1spt-BR!2sbr!4v1785889183146!5m2!1spt-BR!2sbr';

export default function SpaceMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: '240px 0px' });
    observer.observe(map);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-map" ref={mapRef}>
      {shouldLoad ? <iframe src={mapUrl} title="Localização do Madalena Ateliê de Beleza" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="space-map-loading">Carregando mapa...</div>}
    </div>
  );
}
