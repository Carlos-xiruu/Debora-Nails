'use client';

import { Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function SpaceVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsPlayButton, setNeedsPlayButton] = useState(false);
  const [hasError, setHasError] = useState(false);

  const playVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().then(() => setNeedsPlayButton(false)).catch(() => setNeedsPlayButton(true));
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPlayback = (isVisible: boolean) => {
      if (reducedMotion.matches || !isVisible) {
        video.pause();
        if (reducedMotion.matches) setNeedsPlayButton(true);
        return;
      }
      void video.play().then(() => setNeedsPlayButton(false)).catch(() => setNeedsPlayButton(true));
    };

    let isVisible = false;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      syncPlayback(isVisible);
    }, { rootMargin: '180px 0px' });
    observer.observe(video);
    const onReducedMotionChange = () => syncPlayback(isVisible);
    reducedMotion.addEventListener('change', onReducedMotionChange);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener('change', onReducedMotionChange);
    };
  }, []);

  return (
    <div className="space-video-player">
      <video ref={videoRef} autoPlay loop muted playsInline preload="metadata" poster="/capa.PNG" onError={() => setHasError(true)} aria-label="Vídeo do ambiente do ateliê">
        <source src="/espaco.mp4" type="video/mp4" />
        Seu navegador não suporta a reprodução deste vídeo.
      </video>
      {needsPlayButton && !hasError && <button type="button" className="space-video-play" onClick={playVideo}><Play size={18} fill="currentColor" /> Reproduzir vídeo</button>}
      {hasError && <p className="space-video-error">Não foi possível reproduzir o vídeo agora.</p>}
    </div>
  );
}
