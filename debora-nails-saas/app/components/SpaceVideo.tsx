'use client';

import { useEffect, useRef } from 'react';

export default function SpaceVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncPlayback = (isVisible: boolean) => {
      if (reducedMotion.matches || !isVisible) {
        video.pause();
      } else {
        void video.play().catch(() => {
          // Browsers that block autoplay keep the first frame visible.
        });
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
    <video ref={videoRef} loop muted playsInline preload="none" poster="/capa.PNG" aria-label="Vídeo do ambiente do ateliê" className="w-full h-full object-cover">
      <source src="/espaco.mp4" type="video/mp4" />
    </video>
  );
}
