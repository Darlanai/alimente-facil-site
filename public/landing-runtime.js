/* Alimente Fácil — tema acessível, persistente e compartilhado entre landing e painel. */
(()=>{
 const btn=document.getElementById('afSceneLight');if(!btn)return;
 const key='af-theme-mode';
 const apply=(mode)=>{
  const dark=mode==='dark';
  document.body.classList.toggle('af-night-mode',dark);
  btn.setAttribute('aria-pressed',String(dark));
  btn.setAttribute('aria-label',dark?'Ativar tema claro':'Ativar modo noturno');
  btn.title=dark?'Ativar tema claro':'Ativar modo noturno';
 };
 let initial='light';try{initial=localStorage.getItem(key)==='dark'?'dark':'light'}catch(_){}
 apply(initial);
 btn.addEventListener('click',()=>{
  const next=document.body.classList.contains('af-night-mode')?'light':'dark';
  apply(next);try{localStorage.setItem(key,next)}catch(_){}
 });
 const video=document.getElementById('afLandingVideo');
 if(video){video.muted=true;video.playsInline=true;video.loop=true;video.autoplay=true;
  const play=()=>{if(!document.hidden&&video.paused)video.play().catch(()=>{})};
  play();document.addEventListener('visibilitychange',play);
 }
})();
