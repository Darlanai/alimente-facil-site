/* Alimente Fácil — landing runtime, sem cena 3D simulada. */
(()=>{
 const root=document.getElementById('landing-video-container');
 const video=document.getElementById('afLandingVideo');
 const lightBtn=document.getElementById('afSceneLight');
 if(!root||!video||!lightBtn)return;
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
 const keepPlaying=()=>{if(video.paused)video.play().catch(()=>{});};
 keepPlaying();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)keepPlaying()});
 lightBtn.addEventListener('click',()=>{
  const dimmed=root.classList.toggle('af-scene-dimmed');
  lightBtn.setAttribute('aria-pressed',String(dimmed));
  lightBtn.setAttribute('aria-label',dimmed?'Acender a iluminação da cozinha':'Apagar a iluminação da cozinha');
  const label=lightBtn.querySelector('small');if(label)label.textContent=dimmed?'Luz apagada':'Luz acesa';
  const symbol=lightBtn.querySelector('span');if(symbol)symbol.textContent=dimmed?'☾':'☼';
 });
})();