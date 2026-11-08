/* Alimente Fácil — cinematic live-action kitchen background.
   One discreet switch controls the scene lighting treatment. */
(()=>{
 const root=document.getElementById('landing-video-container');
 const video=document.getElementById('afLandingVideo');
 const btn=document.getElementById('afSceneLight');
 if(!root||!video||!btn)return;
 video.style.display='block';
 video.play().catch(()=>{});
 root.classList.add('af-scene-lit');
 btn.addEventListener('click',()=>{
  const off=root.classList.toggle('af-scene-dimmed');
  root.classList.toggle('af-scene-lit',!off);
  btn.setAttribute('aria-pressed',String(off));
  btn.setAttribute('aria-label',off?'Acender a iluminação da cozinha':'Apagar a iluminação da cozinha');
  btn.querySelector('small').textContent=off?'Luz apagada':'Luz acesa';
  btn.querySelector('span').textContent=off?'☾':'☼';
 });
 // Keep the live greeting clock and verse visible, while avoiding duplicated theme controls.
 const clock=document.getElementById('afMomentClock');
 if(clock){
  const update=()=>{const d=new Date();clock.textContent=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});};
  update();setInterval(update,30000);
 }
})();