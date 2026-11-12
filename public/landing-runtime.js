/* Shared kitchen illumination control. The 3D scene listens to af:kitchen-light. */
(()=>{'use strict';
 const button=document.getElementById('afSceneLight');
 const key='af-kitchen-lights';
 const stage=document.getElementById('landing-video-container');
 const cinema=document.getElementById('afKitchenCinema');
 let on=true;try{on=localStorage.getItem(key)!=='off'}catch(_){}
 const apply=(value)=>{
   on=Boolean(value);document.body.classList.toggle('af-kitchen-night',!on);stage?.classList.toggle('af-kitchen-night',!on);
   button?.setAttribute('aria-pressed',String(on));
   button?.setAttribute('aria-label',on?'Apagar as luzes da cozinha':'Acender as luzes da cozinha');
   button?.setAttribute('title',on?'Apagar iluminação':'Acender iluminação');
   const icon=button?.querySelector('i');if(icon)icon.className=on?'fa-regular fa-lightbulb':'fa-regular fa-moon';
   try{localStorage.setItem(key,on?'on':'off')}catch(_){}
   window.dispatchEvent(new CustomEvent('af:kitchen-light',{detail:{on}}));
 };
 button?.addEventListener('click',()=>apply(!on));
 cinema?.addEventListener('canplay',()=>cinema.play().catch(()=>{}),{once:true});window.addEventListener('pageshow',()=>cinema?.play().catch(()=>{}));
 apply(on);cinema?.play().catch(()=>{});
})();
