'use client';

import { useEffect, useRef } from 'react';

export default function SpaceVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncPlayback = () => {
      if (!video) return;
      if (reducedMotion.matches) {
        video.pause();
      } else {
        void video.play().catch(() => {
          // Browsers that block autoplay keep the first frame visible.
        });
      }
    };

    syncPlayback();
    reducedMotion.addEventListener('change', syncPlayback);
    return () => reducedMotion.removeEventListener('change', syncPlayback);
  }, []);

  return (
    <video ref={videoRef} autoPlay loop muted playsInline preload="metadata" aria-label="Vídeo do ambiente do ateliê" className="w-full h-full object-cover">
      <source src="/espaco.mp4" type="video/mp4" />
    </video>
  );
}
