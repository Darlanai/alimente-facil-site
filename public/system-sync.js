(function(){
  'use strict';
  const configs={
    lista:[['fa-wand-magic-sparkles','Automática','automatic-list'],['fa-receipt','Espelhar nota','open-notes'],['fa-plus','Manual','manual-list'],['fa-whatsapp','WhatsApp','list-whatsapp']],
    despensa:[['fa-receipt','Buscar na nota','open-notes'],['fa-file-pdf','PDF','pantry-pdf'],['fa-share-nodes','Compartilhar','pantry-share'],['fa-whatsapp','WhatsApp','pantry-whatsapp'],['fa-trash-can','Esvaziar','empty-pantry']],
    receitas:[['fa-wand-magic-sparkles','Sugerir','pantry-recipe'],['fa-comment-dots','CozIA','chat-cozia'],['fa-plus','Manual','manual-recipe'],['fa-share-nodes','Compartilhar','recipe-share'],['fa-whatsapp','WhatsApp','recipe-whatsapp']],
    planejador:[['fa-wand-magic-sparkles','Com a CozIA','ai-planner'],['fa-microphone','Por voz','voice-planner'],['fa-calendar-plus','Manual','manual-planner'],['fa-share-nodes','Compartilhar','planner-share'],['fa-whatsapp','WhatsApp','planner-whatsapp']]
  };
  function openAssistant(prompt,voice=false,submit=false){
    if(!document.body.classList.contains('af-assistant-open'))document.getElementById('af-chatbot-toggle')?.click();
    setTimeout(()=>{const input=document.getElementById('af-ai-input');if(input){input.value=prompt;input.focus();}if(voice)document.getElementById('af-ai-voice')?.click();else if(submit&&prompt)document.getElementById('af-ai-send')?.click();},180);
  }
  function act(action){
    const app=window.app;if(!app)return;
    if(action==='automatic-list')return openAssistant('Crie uma lista automática inteligente considerando minha despensa, minhas compras mais frequentes e meu orçamento. Mostre antes de salvar.',false,true);
    if(action==='open-notes')return app.activateModuleAndRender?.('notas');
    if(action==='manual-list'){const create=document.querySelector('#module-lista .btn-create-list');if(create)return create.click();return document.getElementById('lista-form-nome-full')?.focus();}
    if(action==='manual-recipe')return app.handleOpenRecipeEditModal?.(null);
    if(action==='pantry-recipe'){const names=(app.state.despensa||[]).slice(0,12).map(item=>item.analysisName||item.name).join(', ');return openAssistant(`Crie uma receita prática usando prioritariamente estes itens da minha despensa: ${names||'minha despensa atual'}. Quero conferir e salvar a receita.`,false,true);}
    if(action==='chat-cozia')return openAssistant('');
    if(action==='ai-planner')return openAssistant('Organize meu planejador usando minha despensa, minhas receitas e minhas últimas compras. Mostre antes de salvar.',false,true);
    if(action==='voice-planner')return openAssistant('',true);
    if(action==='manual-planner')return document.querySelector('#module-planejador .add-meal-btn,#module-planejador .planner-custom-meal-launch')?.click();
    if(action==='pantry-pdf')return window.AF_MODERN_UI?.exportCurrent?.('despensa','pdf');
    if(action==='pantry-share')return window.AF_MODERN_UI?.shareCurrent?.('despensa');
    if(action==='recipe-share')return window.AF_MODERN_UI?.shareCurrent?.('receitas');
    if(action==='planner-share')return window.AF_MODERN_UI?.shareCurrent?.('planejador');
    if(action.endsWith('-whatsapp'))return window.AF_MODERN_UI?.whatsappCurrent?.(action.replace('-whatsapp',''));
    if(action==='empty-pantry')return document.getElementById('pantry-empty-open')?.click();
  }
  function ensure(){
    Object.entries(configs).forEach(([module,buttons])=>{
      const root=document.getElementById(`module-${module}`);if(!root||!root.children.length)return;
      const host=root.querySelector('.dashboard-card > .card-header,.card-header,.md-module-header,.module-header');
      if(!host)return;
      host.classList.add('has-system-tools');
      const existing=root.querySelector('.system-sync-bar');
      if(existing){if(existing.parentElement!==host)host.appendChild(existing);organizeNativeTools(module,root,existing);return;}
      const bar=document.createElement('div');bar.className='system-sync-bar';bar.setAttribute('aria-label','Ações rápidas');
      bar.innerHTML=buttons.map(([icon,label,action])=>`<button type="button" data-sync-action="${action}" title="${label}" aria-label="${label}" data-label="${label}"><i aria-hidden="true" class="${icon==='fa-whatsapp'?'fa-brands':'fa-solid'} ${icon}"></i></button>`).join('');
      host.appendChild(bar);
      organizeNativeTools(module,root,bar);
    });
  }
  function organizeNativeTools(module,root,bar){
    if(module!=='planejador')return;
    const clear=root.querySelector('.clear-plan-btn');
    if(clear&&clear.parentElement!==bar){clear.classList.add('system-tool-native');bar.appendChild(clear);}
    root.querySelectorAll('.card-actions').forEach((wrapper)=>{if(!wrapper.children.length)wrapper.hidden=true;});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.addEventListener('click',event=>{const button=event.target.closest('[data-sync-action]');if(button){event.preventDefault();act(button.dataset.syncAction);}});
    let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensure();});}).observe(document.body,{childList:true,subtree:true});
    ensure();
  });
})();
