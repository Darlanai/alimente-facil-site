(function(){
  'use strict';
  const configs={
    lista:[['fa-rotate','Espelhar última nota','repeat-note'],['fa-receipt','Buscar nota','open-notes'],['fa-plus','Inserir manualmente','manual-list']],
    receitas:[['fa-wand-magic-sparkles','Sugerir da despensa','pantry-recipe'],['fa-comment-dots','Criar com a CozIA','prompt-recipe'],['fa-plus','Criar manualmente','manual-recipe']],
    planejador:[['fa-wand-magic-sparkles','Organizar com a CozIA','ai-planner'],['fa-microphone','Planejar por voz','voice-planner'],['fa-calendar-plus','Organizar manualmente','manual-planner']]
  };
  function openAssistant(prompt,voice=false){
    document.getElementById('af-chatbot-toggle')?.click();
    setTimeout(()=>{const input=document.getElementById('af-ai-input');if(input){input.value=prompt;input.focus();}if(voice)document.getElementById('af-ai-voice')?.click();},180);
  }
  function act(action){
    const app=window.app;if(!app)return;
    if(action==='repeat-note')return app.repeatLastReceipt?.();
    if(action==='open-notes')return window.AF_NFCE?.openNotes?.();
    if(action==='manual-list')return document.getElementById('lista-form-name-full')?.focus();
    if(action==='manual-recipe')return app.handleOpenRecipeEditModal?.(null);
    if(action==='pantry-recipe'){const names=(app.state.despensa||[]).slice(0,12).map(item=>item.analysisName||item.name).join(', ');return openAssistant(`Crie uma receita prática usando prioritariamente estes itens da minha despensa: ${names||'minha despensa atual'}. Quero conferir e salvar a receita.`);}
    if(action==='prompt-recipe')return openAssistant('Quero criar uma receita nova e deixá-la salva. Pergunte o prato, ingredientes, restrições e modo de preparo.');
    if(action==='ai-planner')return openAssistant('Organize meu planejador usando minha despensa, minhas receitas e minhas últimas compras. Mostre antes de salvar.');
    if(action==='voice-planner')return openAssistant('',true);
    if(action==='manual-planner')return document.querySelector('#module-planejador button,[data-planner-day]')?.focus();
  }
  function ensure(){
    Object.entries(configs).forEach(([module,buttons])=>{
      const root=document.getElementById(`module-${module}`);if(!root||!root.children.length||root.querySelector(':scope > .system-sync-bar'))return;
      const bar=document.createElement('div');bar.className='system-sync-bar';bar.setAttribute('aria-label','Ações rápidas');
      bar.innerHTML=buttons.map(([icon,label,action])=>`<button type="button" data-sync-action="${action}" title="${label}"><i class="fa-solid ${icon}"></i><span>${label}</span></button>`).join('');
      root.prepend(bar);
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.addEventListener('click',event=>{const button=event.target.closest('[data-sync-action]');if(button){event.preventDefault();act(button.dataset.syncAction);}});
    let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensure();});}).observe(document.body,{childList:true,subtree:true});
    ensure();
  });
})();
