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
    let interacted=false,idleTimer,dragging=false,activePointer=null;
    const edgePercent=()=>Math.max(4,Math.min(8,window.innerWidth*.008))/window.innerWidth*100;
    const homeEdge=()=>100-edgePercent();
    const panelEdge=()=>edgePercent();
    setReveal(range?.value||homeEdge());
    const clearIdle=()=>{clearTimeout(idleTimer);divider?.classList.remove('is-peeking','is-tucked')};
    const stopHint=()=>{interacted=true;hint?.classList.add('hidden');clearIdle()};
    const schedulePeek=(delay=3800)=>{
      clearTimeout(idleTimer);
      if(interacted||!range)return;
      idleTimer=setTimeout(()=>{
        if(interacted||dragging)return;
        const current=Number(range.value||homeEdge());
        const onPanel=current<50;
        const edge=onPanel?panelEdge():homeEdge();
        const inwardPx=window.innerWidth<=760?34:46;
        const inward=edge+(onPanel?1:-1)*(inwardPx/window.innerWidth*100);
        divider?.classList.remove('is-tucked');
        divider?.classList.add('is-peeking');
        setReveal(inward);
        setTimeout(()=>{
          if(interacted||dragging)return;
          setReveal(edge);
          divider?.classList.remove('is-peeking');
          setTimeout(()=>{if(!interacted&&!dragging)divider?.classList.add('is-tucked')},360);
        },720);
        schedulePeek(7200);
      },delay);
    };
    const moveTo=x=>setReveal((x/window.innerWidth)*100);
    const finishDrag=e=>{
      if(!dragging)return;
      dragging=false;activePointer=null;
      document.body.classList.remove('af-reveal-dragging');
      try{handle?.releasePointerCapture?.(e?.pointerId)}catch{}
      const current=Number(range?.value||homeEdge());
      if(current<8)setReveal(panelEdge());
      else if(current>92)setReveal(homeEdge());
    };
    handle?.addEventListener('pointerdown',e=>{
      dragging=true;activePointer=e.pointerId;
      document.body.classList.add('af-reveal-dragging');
      stopHint();
      handle.setPointerCapture?.(e.pointerId);
      e.preventDefault();e.stopPropagation();
    });
    document.addEventListener('pointermove',e=>{if(dragging&&e.pointerId===activePointer){moveTo(e.clientX);e.preventDefault()}},{passive:false});
    document.addEventListener('pointerup',finishDrag);
    document.addEventListener('pointercancel',finishDrag);
    window.addEventListener('blur',()=>finishDrag());
    handle?.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
        stopHint();
        const current=Number(range?.value||homeEdge());
        if(e.key==='Home')setReveal(panelEdge());
        else if(e.key==='End')setReveal(homeEdge());
        else setReveal(current+(e.key==='ArrowRight'?5:-5));
        e.preventDefault();
      }
    });
    if(handle){
      handle.tabIndex=0;handle.setAttribute('role','slider');
      handle.setAttribute('aria-label','Arraste para alternar entre a apresentação e o painel');
      handle.setAttribute('aria-valuemin','0');handle.setAttribute('aria-valuemax','100');
    }
    window.addEventListener('resize',()=>setReveal(Number(range?.value||homeEdge())));
    schedulePeek();
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