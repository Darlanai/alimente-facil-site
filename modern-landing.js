(() => {
  const stage=document.getElementById('landing-video-container');
  const light=document.getElementById('landing-light-toggle');
  const login=document.getElementById('af-login-modern');
  const signup=document.getElementById('af-signup-modern');
  const auth=document.getElementById('landing-auth-btn');

  const setLights=(off)=>{
    if(!stage||!light)return;
    stage.classList.toggle('af-lights-off',off);
    light.classList.toggle('is-off',off);
    light.setAttribute('aria-pressed',String(off));
    light.setAttribute('title',off?'Ligar a luz da cozinha':'Apagar a luz da cozinha');
    light.innerHTML=off
      ? '<i class="fa-solid fa-lightbulb" aria-hidden="true"></i>'
      : '<i class="fa-regular fa-lightbulb" aria-hidden="true"></i>';
    try{localStorage.setItem('af-kitchen-lights-off',off?'1':'0')}catch(_){}
  };

  try{setLights(localStorage.getItem('af-kitchen-lights-off')==='1')}catch(_){setLights(false)}
  light?.addEventListener('click',()=>setLights(!stage.classList.contains('af-lights-off')));

  login?.addEventListener('click',()=>{
    auth?.click();
  });

  signup?.addEventListener('click',()=>{
    auth?.click();
    setTimeout(()=>{
      document.querySelectorAll('#auth-modal .auth-form-container').forEach(el=>el.classList.remove('active'));
      document.getElementById('signup-view')?.classList.add('active');
      document.getElementById('auth-modal-title').textContent='Criar sua conta';
      document.getElementById('signup-name')?.focus();
    },0);
  });
})();