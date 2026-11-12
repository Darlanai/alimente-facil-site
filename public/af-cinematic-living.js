/* Cinematic Living — lightweight sequential background video scenes. */
(() => {
  'use strict';
  const video = document.getElementById('afLandingVideo');
  if (!video || window.__afCinematicLivingInstalled) return;
  window.__afCinematicLivingInstalled = true;

  const scenes = [
    { src: 'fundo.mp4', label: 'Cozinha principal' },
    { src: 'armario.mp4', label: 'Despensa organizada' },
    { src: 'geladeira.mp4', label: 'Geladeira' },
    { src: 'pessoa.mp4', label: 'Rotina na cozinha' },
    { src: 'torneira.mp4', label: 'Detalhes da cozinha' }
  ];
  let index = 0;
  let switching = false;
  const nextButton = document.getElementById('afSceneNext');
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  function playCurrent() {
    const result = video.play();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  }
  function switchTo(nextIndex) {
    if (switching) return;
    switching = true;
    index = (nextIndex + scenes.length) % scenes.length;
    video.classList.add('af-scene-switching');
    window.setTimeout(() => {
      video.src = scenes[index].src;
      video.load();
      playCurrent();
    }, 220);
  }
  video.addEventListener('playing', () => {
    video.classList.remove('af-scene-switching');
    switching = false;
  });
  video.addEventListener('ended', () => {
    if (!reduced && !saveData) switchTo(index + 1);
    else { video.currentTime = 0; playCurrent(); }
  });
  video.addEventListener('error', () => {
    switching = false;
    if (index !== 0) switchTo(0);
  });
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      if (reduced || saveData) {
        nextButton.setAttribute('aria-label', 'Vídeo automático pausado pela preferência de economia ou movimento reduzido');
        return;
      }
      switchTo(index + 1);
      nextButton.setAttribute('title', 'Próximo ambiente: ' + scenes[(index + 1) % scenes.length].label);
    });
  }
  video.removeAttribute('loop');
  video.addEventListener('loadedmetadata', () => {
    if (video.paused) playCurrent();
  });
  if (reduced || saveData) {
    video.loop = true;
    if (nextButton) nextButton.hidden = true;
  } else {
    video.loop = false;
    playCurrent();
  }
})();
