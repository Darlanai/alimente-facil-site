(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const afterApp=(fn)=>{let n=0,t=setInterval(()=>{if(window.app){clearInterval(t);fn(window.app)}else if(++n>300)clearInterval(t)},50)};
  const setReveal=(value)=>{
    const edge=Math.max(4,Math.min(8,window.innerWidth*.008));
    const min=edge/window.innerWidth*100,max=100-min;
    const v=Math.max(min,Math.min(max,Number(value)));
    document.documentElement.style.setProperty('--af-reveal',`${v}%`);
    const r=$('#afRevealRange'),d=$('#afRevealDivider');
    if(r&&Math.abs(Number(r.value)-v)>.01)r.value=String(v);
    d?.classList.toggle('at-left',v<12);
    d?.classList.toggle('at-right',v>88);
    d?.classList.toggle('at-middle',v>=12&&v<=88);
    d?.setAttribute('aria-valuenow',String(Math.round(v)));
    return v;
  };
  const hideInfo=()=>$$('.af-info-modal.open').forEach(m=>{m.classList.remove('open');m.setAttribute('aria-hidden','true')});
  const closeBlockingOverlays=()=>{$$('.modal-overlay.active,.modal-overlay.is-visible').forEach(m=>{if(m.id!=='auth-modal'){m.classList.remove('active','is-visible');m.setAttribute('aria-hidden','true')}});hideInfo()};
  const setAuthView=(view)=>{const auth=$('#auth-modal');if(!auth)return;$$('#auth-modal .auth-form-container').forEach(x=>x.classList.remove('active'));$(`#${view}-view`)?.classList.add('active');auth.classList.add('af-auth-force-front');auth.style.zIndex='999999'};
  const openSignup=(app,view='signup')=>{closeBlockingOverlays();try{app.showAuthModal()}catch(e){app.openModal?.('auth-modal')}setTimeout(()=>setAuthView(view),40);setTimeout(()=>setAuthView(view),160)};
  const startNow=(app)=>{hideInfo();if(app?.isLoggedIn){const panelEdge=Math.max(4,Math.min(8,window.innerWidth*.008))/window.innerWidth*100;setReveal(panelEdge);requestAnimationFrame(()=>{app.enterAppMode?.();requestAnimationFrame(()=>{document.querySelector('#afGlobalReveal')?.removeAttribute('aria-hidden');setReveal(panelEdge)})})}else openSignup(app,'signup')};
  const calc=()=>{const spend=Number($('#afSpendRange')?.value||1200),waste=Number($('#afWasteRange')?.value||12),monthly=spend*waste/100,annual=monthly*12;const brl=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});$('#afSpendValue')&&($('#afSpendValue').textContent=brl(spend));$('#afWasteValue')&&($('#afWasteValue').textContent=`${waste}%`);$('#afAnnualSaving')&&($('#afAnnualSaving').textContent=brl(annual));$('#afMonthlySaving')&&($('#afMonthlySaving').textContent=`aproximadamente ${brl(monthly)} por mês`)};
  document.addEventListener('DOMContentLoaded',()=>{
    const range=$('#afRevealRange'),hint=$('#afRevealHint'),divider=$('#afRevealDivider'),handle=$('#afRevealDivider span');

    // A aba precisa ficar fora do contêiner animado. Caso contrário, até position:fixed
    // pode usar o contêiner transformado como referência e aparecer para dentro da tela.
    if(divider && divider.parentElement !== document.body){
      document.body.appendChild(divider);
    }

    let dragging=false,activePointer=null,startX=0,startY=0,startValue=0,lastX=0,gestureAxis=null;
    const edgePercent=()=>Math.max(3,Math.min(6,window.innerWidth*.006))/window.innerWidth*100;
    const homeEdge=()=>100-edgePercent();
    const panelEdge=()=>edgePercent();
    const currentValue=()=>Number(range?.value||homeEdge());
    const isPanelOpen=()=>currentValue()<50;
    const showPanel=()=>{document.body.classList.add('af-snap-moving');setReveal(panelEdge());setTimeout(()=>document.body.classList.remove('af-snap-moving'),620)};
    const showHome=()=>{document.body.classList.add('af-snap-moving');setReveal(homeEdge());setTimeout(()=>document.body.classList.remove('af-snap-moving'),620)};
    const toggleSide=()=>isPanelOpen()?showHome():showPanel();
    setReveal(range?.value||homeEdge());

    // A alça é somente uma indicação discreta; clicar nela também alterna as telas.
    hint?.classList.remove('hidden');
    divider?.addEventListener('click',e=>{if(dragging)return;e.preventDefault();e.stopPropagation();toggleSide()});
    divider?.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){toggleSide();e.preventDefault()}
      if(e.key==='ArrowLeft'){showPanel();e.preventDefault()}
      if(e.key==='ArrowRight'){showHome();e.preventDefault()}
    });
    if(divider){
      divider.removeAttribute('aria-hidden');
      divider.tabIndex=0;divider.setAttribute('role','button');
      divider.setAttribute('aria-label','Deslize a tela ou toque na aba lateral para alternar entre a apresentação e o painel');
      divider.classList.add('show-guide');
      const hideGuide=()=>divider.classList.remove('show-guide');
      setTimeout(hideGuide,4100);
      divider.addEventListener('pointerdown',hideGuide,{once:true});
      document.addEventListener('touchstart',hideGuide,{once:true,passive:true});
    }

    const beginGesture=(x,y,pointerId=null)=>{
      dragging=true;activePointer=pointerId;startX=lastX=x;startY=y;startValue=currentValue();gestureAxis=null;
    };
    const updateGesture=(x,y,event)=>{
      if(!dragging)return;
      const dx=x-startX,dy=y-startY;
      if(!gestureAxis){
        if(Math.abs(dx)<10&&Math.abs(dy)<10)return;
        gestureAxis=Math.abs(dx)>Math.abs(dy)*1.15?'x':'y';
      }
      if(gestureAxis!=='x')return;
      document.body.classList.add('af-reveal-dragging');
      lastX=x;
      const next=startValue+(dx/window.innerWidth*100);
      setReveal(next);
      event?.preventDefault?.();
    };
    const endGesture=()=>{
      if(!dragging)return;
      const dx=lastX-startX,wasHorizontal=gestureAxis==='x';
      dragging=false;activePointer=null;gestureAxis=null;
      document.body.classList.remove('af-reveal-dragging');
      if(!wasHorizontal){setReveal(startValue);return}
      const threshold=Math.min(72,window.innerWidth*.16);
      if(dx<=-threshold)showPanel();
      else if(dx>=threshold)showHome();
      else currentValue()<50?showPanel():showHome();
    };

    // Mouse/caneta: arraste pela alça.
    divider?.addEventListener('pointerdown',e=>{
      beginGesture(e.clientX,e.clientY,e.pointerId);
      divider.classList.add('is-active');
      divider.setPointerCapture?.(e.pointerId);
      e.preventDefault();e.stopPropagation();
    });
    document.addEventListener('pointermove',e=>{if(dragging&&activePointer===e.pointerId)updateGesture(e.clientX,e.clientY,e)},{passive:false});
    document.addEventListener('pointerup',e=>{if(activePointer===e.pointerId){divider?.classList.remove('is-active');endGesture()}});
    document.addEventListener('pointercancel',e=>{if(activePointer===e.pointerId){divider?.classList.remove('is-active');endGesture()}});

    // Celular: gesto em qualquer ponto da landing ou do painel.
    document.addEventListener('touchstart',e=>{
      if(e.touches.length!==1||document.querySelector('.modal-overlay.active,.af-info-modal.open'))return;
      const t=e.touches[0];beginGesture(t.clientX,t.clientY,'touch');
    },{passive:true});
    document.addEventListener('touchmove',e=>{
      if(!dragging||activePointer!=='touch'||e.touches.length!==1)return;
      const t=e.touches[0];updateGesture(t.clientX,t.clientY,e);
    },{passive:false});
    document.addEventListener('touchend',()=>{if(activePointer==='touch')endGesture()},{passive:true});
    document.addEventListener('touchcancel',()=>{if(activePointer==='touch')endGesture()},{passive:true});
    window.addEventListener('blur',endGesture);
    window.addEventListener('resize',()=>isPanelOpen()?setReveal(panelEdge()):setReveal(homeEdge()));
    const how=$('#afHowModal'),contact=$('#afContactModal');$('#afHowWorks')?.addEventListener('click',()=>{how?.classList.add('open');how?.setAttribute('aria-hidden','false');calc()});
    const openContact=()=>{contact?.classList.add('open');contact?.setAttribute('aria-hidden','false')};$('#afContactOpen')?.addEventListener('click',openContact);$('#afFooterContact')?.addEventListener('click',openContact);
    $$('[data-af-close-info]').forEach(b=>b.addEventListener('click',()=>{const m=b.closest('.af-info-modal');m?.classList.remove('open');m?.setAttribute('aria-hidden','true')}));$$('.af-info-modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}}));
    $('#afContactForm')?.addEventListener('submit',async e=>{
      e.preventDefault();
      const form=e.currentTarget,status=$('#afContactStatus'),button=form.querySelector('.af-contact-submit');
      const d=new FormData(form);
      const payload={name:String(d.get('name')||'').trim(),email:String(d.get('email')||'').trim(),message:String(d.get('message')||'').trim()};
      const show=(text,type='')=>{if(!status)return;status.textContent=text;status.className=`af-contact-status ${type}`.trim()};
      if(!payload.name||!payload.email||!payload.message){show('Preencha todos os campos.','error');return}
      button?.setAttribute('disabled','disabled');
      button?.classList.add('is-loading');
      show('Enviando sua mensagem…');
      try{
        const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        let data={};try{data=await response.json()}catch{}
        if(!response.ok)throw new Error(data?.message||'Não foi possível enviar a mensagem.');
        form.reset();
        show(data?.message||'Mensagem enviada com sucesso.','success');
      }catch(error){
        show(error?.message||'Não foi possível enviar. Tente novamente.','error');
      }finally{
        button?.removeAttribute('disabled');
        button?.classList.remove('is-loading');
      }
    });
    $('#afSpendRange')?.addEventListener('input',calc);$('#afWasteRange')?.addEventListener('input',calc);calc();
    afterApp(app=>{
      const keepRevealAlive=()=>{const reveal=document.querySelector('#afGlobalReveal');if(reveal){reveal.style.removeProperty('display');reveal.style.removeProperty('visibility');reveal.removeAttribute('aria-hidden')}};
      new MutationObserver(keepRevealAlive).observe(document.body,{attributes:true,attributeFilter:['class']});
      keepRevealAlive();
      try{app.renderAllPanelContent();app.activateModuleUI('inicio');app.updateThemeIcons?.()}catch(e){console.warn('Prévia do painel:',e)}
      $('#landing-theme-toggle')?.addEventListener('click',e=>{app.toggleTheme?.();setTimeout(()=>e.currentTarget?.setAttribute('aria-pressed',String(document.body.classList.contains('lua-mode'))),20)});
      const sync=()=>{const name=app.state?.user?.nome?.trim(),g=$('#afLandingGreeting');if(g)g.textContent=app.isLoggedIn&&name?`Olá, ${name}.`:'Olá, vamos começar?'};sync();
      const original=app.updateStartButton?.bind(app);if(original)app.updateStartButton=function(){const out=original();sync();return out};
      document.addEventListener('click',e=>{const start=e.target.closest('[data-af-start-trial]');if(!start)return;e.preventDefault();e.stopPropagation();startNow(app)},true);
      $('#landing-auth-btn')?.addEventListener('click',e=>{e.preventDefault();app.isLoggedIn?app.enterAppMode?.():openSignup(app,'login')});
      document.addEventListener('click',e=>{if(app.isLoggedIn||document.body.classList.contains('app-mode'))return;const insidePanel=e.target.closest('.app-panel-container-standalone');if(!insidePanel)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openSignup(app,'signup')},true);
      document.addEventListener('click',e=>{const signup=e.target.closest('#plans-modal [data-action="signup"],#plans-modal .signup-btn,#plans-modal button');if(signup&&!app.isLoggedIn){e.preventDefault();e.stopPropagation();setTimeout(()=>openSignup(app,'signup'),20)}},true);
    });
  });
})();