/* Alimente Fácil — tema visual simples e responsivo. */
(()=>{
 const root=document.getElementById('landing-video-container');
 const video=document.getElementById('afLandingVideo');
 const btn=document.getElementById('afSceneLight');
 if(!root||!video||!btn||btn.dataset.themeBound)return;
 btn.dataset.themeBound='1';
 const syncAssistant=()=>{
  const active=document.body.classList.contains('app-mode');
  ['af-chatbot','af-chatbot-toggle'].forEach(id=>{
   const el=document.getElementById(id);if(!el)return;
   if(active){el.style.removeProperty('display');el.style.removeProperty('visibility')}
   else{el.style.setProperty('display','none','important');el.style.setProperty('visibility','hidden','important')}
  });
 };
 syncAssistant();
 new MutationObserver(syncAssistant).observe(document.body,{attributes:true,attributeFilter:['class']});
 video.muted=true;video.playsInline=true;video.loop=true;video.autoplay=true;
 const play=()=>{if(video.paused)video.play().catch(()=>{})};
 play();document.addEventListener('visibilitychange',()=>{if(!document.hidden)play()});
 const applyTheme=dark=>{
  root.classList.toggle('af-scene-dimmed',dark);
  document.body.classList.toggle('af-ambient-dark',dark);
  btn.setAttribute('aria-pressed',String(dark));
  btn.setAttribute('aria-label',dark?'Ativar tema claro':'Ativar tema escuro');
  const icon=btn.querySelector('span');if(icon)icon.textContent=dark?'☾':'☼';
 };
 btn.addEventListener('click',()=>applyTheme(btn.getAttribute('aria-pressed')!=='true'));
 applyTheme(btn.getAttribute('aria-pressed')==='true');
})();