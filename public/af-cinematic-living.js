/* Cinematic Living — one original background video, continuous loop. */
(() => {
  'use strict';
  const video = document.getElementById('afLandingVideo');
  if (!video) return;
  video.pause();
  video.removeAttribute('src');
  video.src = 'fundo.mp4';
  video.loop = true;
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = 'metadata';
  const start = () => {
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
  };
  video.addEventListener('loadeddata', start, { once: true });
  video.addEventListener('canplay', start);
  if (video.readyState >= 2) start();
})();
