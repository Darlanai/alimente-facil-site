/* Alimente Fácil — Kitchen Cinema / shared lighting control. */
(() => {
  'use strict';
  const landingButton = document.getElementById('afSceneLight');
  const panelButton = document.getElementById('theme-toggle-btn-panel');
  const video = document.getElementById('afLandingVideo');
  const storageKey = 'themePreference';
  const isNight = () => document.body.classList.contains('lua-mode');
  function syncButtons() {
    const night = isNight();
    if (landingButton) {
      landingButton.setAttribute('aria-pressed', String(night));
      landingButton.setAttribute('aria-label', night ? 'Acender a iluminação da cozinha' : 'Apagar a iluminação da cozinha');
      landingButton.title = night ? 'Acender as luzes' : 'Apagar as luzes';
      landingButton.classList.toggle('power-on', !night);
      const icon = landingButton.querySelector('i');
      if (icon) icon.className = night ? 'fa-regular fa-moon' : 'fa-regular fa-lightbulb';
    }
    if (panelButton) {
      panelButton.setAttribute('aria-pressed', String(night));
      panelButton.title = night ? 'Acender iluminação' : 'Apagar iluminação';
      const icon = panelButton.querySelector('i');
      if (icon) icon.className = night ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
  }
  function applyTheme(night) {
    document.body.classList.toggle('lua-mode', night);
    document.body.classList.toggle('landing-lua-mode', night);
    try { localStorage.setItem(storageKey, night ? 'lua' : 'sol'); } catch (_) {}
    syncButtons();
  }
  function toggleLanding(event) {
    event.preventDefault();
    event.stopPropagation();
    if (window.app && typeof window.app.toggleTheme === 'function') {
      window.app.toggleTheme();
      document.body.classList.toggle('landing-lua-mode', isNight());
      syncButtons();
    } else applyTheme(!isNight());
  }
  landingButton?.addEventListener('click', toggleLanding);
  panelButton?.addEventListener('click', () => {
    window.requestAnimationFrame(() => {
      document.body.classList.toggle('landing-lua-mode', isNight());
      syncButtons();
    });
  });
  if (video) {
    video.muted = true; video.playsInline = true; video.loop = true; video.autoplay = true;
    const play = () => { if (!document.hidden && video.paused) video.play().catch(() => {}); };
    play(); video.addEventListener('canplay', play);
    document.addEventListener('visibilitychange', play);
  }
  syncButtons();
  document.addEventListener('DOMContentLoaded', syncButtons, { once: true });
  window.addEventListener('pageshow', syncButtons);
})();
