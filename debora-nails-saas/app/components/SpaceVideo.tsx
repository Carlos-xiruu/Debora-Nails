'use client';

import { useEffect, useRef, useState } from 'react';

export default function SpaceVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncPlayback = (isVisible: boolean) => {
      if (reducedMotion.matches || !isVisible) {
        video.pause();
        if (reducedMotion.matches) setShowControls(true);
      } else {
        void video.play().then(() => setShowControls(false)).catch(() => setShowControls(true));
      }
    };

    let isVisible = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        syncPlayback(isVisible);
      },
      { rootMargin: '160px 0px' },
    );
    observer.observe(video);
    const onReducedMotionChange = () => syncPlayback(isVisible);
    reducedMotion.addEventListener('change', onReducedMotionChange);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener('change', onReducedMotionChange);
    };
  }, []);

  return (
    <video ref={videoRef} autoPlay loop muted playsInline preload="metadata" poster="/capa.PNG" controls={showControls} onError={() => setShowControls(true)} aria-label="Vídeo do ambiente do ateliê" className="w-full h-full object-cover">
      <source src="/espaco.mp4" type="video/mp4" />
      Seu navegador não suporta a reprodução deste vídeo.
    </video>
  );
}
