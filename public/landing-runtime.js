/* Shared kitchen illumination control. The 3D scene listens to af:kitchen-light. */
(()=>{'use strict';
 const button=document.getElementById('afSceneLight');
 const key='af-kitchen-lights';
 let on=true;try{on=localStorage.getItem(key)!=='off'}catch(_){}
 const apply=(value)=>{
   on=Boolean(value);document.body.classList.toggle('af-kitchen-night',!on);
   button?.setAttribute('aria-pressed',String(on));
   button?.setAttribute('aria-label',on?'Apagar as luzes da cozinha':'Acender as luzes da cozinha');
   button?.setAttribute('title',on?'Apagar iluminação':'Acender iluminação');
   const icon=button?.querySelector('i');if(icon)icon.className=on?'fa-regular fa-lightbulb':'fa-regular fa-moon';
   try{localStorage.setItem(key,on?'on':'off')}catch(_){}
   window.dispatchEvent(new CustomEvent('af:kitchen-light',{detail:{on}}));
 };
 button?.addEventListener('click',()=>apply(!on));
 window.addEventListener('af:kitchen-ready',()=>apply(on),{once:true});
 apply(on);
})();
