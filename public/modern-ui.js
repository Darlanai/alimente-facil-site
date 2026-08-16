/* Alimente Fácil 2026 · comportamento visual, compartilhamento e análises */
(() => {
  'use strict';
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const money=(value)=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const esc=(value)=>String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const charts={};
  const app=()=>window.app;
  const notify=(message,type='info')=>app()?.showNotification?.(message,type);
  const token=()=>app()?.getStoredAuthToken?.()||localStorage.getItem('alimenteFacilAuthToken')||'';

  function moduleNode(key){return $(`#module-${key}`)||$('.module-section.active')||$('.app-main-content');}
  function fileName(key){return `alimente-facil-${key}-${new Date().toISOString().slice(0,10)}.png`;}
  async function capture(key){
    const target=moduleNode(key);if(!target)throw new Error('Conteúdo não encontrado.');
    if(!window.html2canvas)throw new Error('O gerador de imagem ainda está carregando. Tente novamente.');
    const canvas=await window.html2canvas(target,{backgroundColor:'#070b09',scale:Math.min(2,window.devicePixelRatio||1.5),useCORS:true,logging:false});
    return await new Promise((resolve,reject)=>canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error('Não foi possível gerar a imagem.')),'image/png',.94));
  }
  async function shareCurrent(key='painel'){
    try{
      notify('Preparando uma imagem para compartilhar…','info');
      const blob=await capture(key);const file=new File([blob],fileName(key),{type:'image/png'});const data={title:'Alimente Fácil',text:`Meu resumo de ${key} no Alimente Fácil.`,files:[file]};
      if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share(data);return;}
      const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
      window.open(`https://wa.me/?text=${encodeURIComponent('Imagem gerada pelo Alimente Fácil. Anexe o arquivo que acabou de ser baixado.')}`,'_blank','noopener');
      notify('Imagem baixada. Selecione-a na conversa do WhatsApp.','success');
    }catch(error){if(error?.name!=='AbortError')notify(error.message||'Não foi possível compartilhar.','error');}
  }
  function quickSummary(key){
    const state=app()?.state||{};let title='Meu Alimente Fácil';let rows=[];
    if(key==='pantry'||key==='despensa'){title='Minha despensa';rows=(state.despensa||[]).slice(0,18).map((item)=>`${item.name} · ${Number(item.qtd||1).toLocaleString('pt-BR')} ${item.unid||'un'}`);}
    else if(key==='notes'||key==='notas'){title='Minhas notas fiscais';rows=(state.notasFiscais||[]).slice(0,14).map((note)=>`${note.title||note.merchant||'Nota'} · ${money(note.total)}`);}
    else if(key==='list'||key==='lista'){title='Minha lista de compras';const lists=state.listas||{};const current=Array.isArray(lists)?lists[0]:Object.values(lists)[0];rows=(current?.items||[]).slice(0,18).map((item)=>`${item.checked?'✓':'○'} ${item.name} · ${item.qtd||1} ${item.unid||'un'}`);}
    else if(key==='recipe'||key==='receitas'){title='Minhas receitas';const recipes=Array.isArray(state.receitas)?state.receitas:Object.values(state.receitas||{});rows=recipes.slice(0,16).map((recipe)=>recipe.nome||recipe.name||recipe.title||'Receita');}
    else if(key==='planner'||key==='planejador'){title='Meu planejador';const planner=state.planejador||{};rows=Object.entries(planner).slice(0,18).map(([day,value])=>`${day}: ${typeof value==='string'?value:(value?.nome||value?.name||'Planejado')}`);}
    else{title='Resumo do Alimente Fácil';rows=[`${(state.despensa||[]).length} itens na despensa`,`${(state.notasFiscais||[]).length} notas fiscais salvas`];}
    if(!rows.length)rows=['Nenhum item registrado ainda.'];return {title,rows};
  }
  async function quickPng(key){
    const {title,rows}=quickSummary(key);const width=1080;const height=Math.max(520,250+rows.length*54);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');
    context.fillStyle='#111513';context.fillRect(0,0,width,height);context.fillStyle='#e8eeea';context.font='700 52px Arial';context.fillText(title,72,104);context.fillStyle='#8d9992';context.font='26px Arial';context.fillText('Alimente Fácil · organização que acompanha você',72,150);context.strokeStyle='#303833';context.beginPath();context.moveTo(72,184);context.lineTo(width-72,184);context.stroke();
    context.font='31px Arial';rows.forEach((row,index)=>{const y=242+index*54;context.fillStyle=index%2?'#cbd3ce':'#f1f5f2';context.fillText(String(row).slice(0,54),82,y);});context.fillStyle='#758079';context.font='22px Arial';context.fillText(new Date().toLocaleString('pt-BR'),72,height-48);
    return await new Promise((resolve,reject)=>canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error('Não foi possível criar o PNG.')),'image/png'));
  }
  async function whatsappCurrent(key='painel'){
    try{const blob=await quickPng(key);const file=new File([blob],fileName(key),{type:'image/png'});if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:'Alimente Fácil',text:'Compartilhado pelo Alimente Fácil',files:[file]});return;}
      const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),2500);window.open(`https://wa.me/?text=${encodeURIComponent('Meu resumo do Alimente Fácil está salvo em PNG. Anexe a imagem baixada nesta conversa.')}`,'_blank','noopener');notify('PNG criado. Selecione-o no WhatsApp.','success');
    }catch(error){if(error?.name!=='AbortError')notify(error.message||'Não foi possível abrir o WhatsApp.','error');}
  }
  function exportCurrent(key='painel'){
    const target=moduleNode(key);if(!target)return;
    const popup=window.open('','_blank','width=980,height=760');if(!popup){notify('Autorize pop-ups para gerar o PDF.','error');return;}
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Alimente Fácil · ${esc(key)}</title><style>body{font-family:Arial,sans-serif;color:#142219;padding:24px}button,.system-sync-bar,.af26-analysis-actions{display:none!important}article,section,.dashboard-card{break-inside:avoid}img{max-width:100%}</style></head><body><h1>Alimente Fácil</h1>${target.innerHTML}<script>onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`);popup.document.close();
  }

  function stats(){
    const state=app()?.state||{};const notes=Array.isArray(state.notasFiscais)?state.notasFiscais:[];const pantry=Array.isArray(state.despensa)?state.despensa:[];
    const products=notes.flatMap((note)=>note.products||[]);const spend=notes.reduce((sum,note)=>sum+Number(note.total||0),0);const dates=notes.map((note)=>note.issueDate||note.importedAt||'Sem data');
    const byDate={};notes.forEach((note)=>{const label=String(note.issueDate||note.importedAt||'Sem data').slice(0,10);byDate[label]=(byDate[label]||0)+Number(note.total||0);});
    const byCategory={};products.forEach((item)=>{const category=item.category||'Outros';byCategory[category]=(byCategory[category]||0)+Number(item.total||item.unitPrice||0)*Number(item.quantity||1);});
    const frequency={};products.forEach((item)=>{const name=String(item.analysisName||item.originalName||item.name||'Item').trim();frequency[name]=(frequency[name]||0)+Number(item.quantity||1);});
    const pantryCategories={};pantry.forEach((item)=>{const category=item.categoria||'Outros';pantryCategories[category]=(pantryCategories[category]||0)+Number(item.qtd||1);});
    return {notes,pantry,products,spend,dates,byDate,byCategory,frequency,pantryCategories,state};
  }
  function listCount(state){const lists=state.listas||{};return Array.isArray(lists)?lists.length:Object.keys(lists).length;}
  function destroyCharts(){Object.keys(charts).forEach((key)=>{charts[key]?.destroy?.();delete charts[key];});}
  function chartPalette(count){const colors=['#69d99d','#4aa878','#b6f3cf','#2f7653','#8bbfa2','#d8b86a','#5d8bfa','#e47777'];return Array.from({length:count},(_,index)=>colors[index%colors.length]);}
  function entries(object,limit=10){return Object.entries(object).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,limit);}
  function createChart(id,type,labels,data,label){
    const canvas=$(`#${id}`);if(!canvas||!window.Chart)return;
    charts[id]?.destroy?.();charts[id]=new Chart(canvas,{type,data:{labels,datasets:[{label,data,backgroundColor:type==='line'?'rgba(96,165,250,.15)':chartPalette(data.length),borderColor:type==='line'?'#60a5fa':chartPalette(data.length),borderWidth:2,fill:type==='line',tension:.35,borderRadius:8}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'bottom',labels:{color:'#a9b0ac',boxWidth:9,boxHeight:9,usePointStyle:true,padding:16,font:{size:10}}},tooltip:{backgroundColor:'#1d211f',titleColor:'#fff',bodyColor:'#d7ddda',padding:11}},scales:type==='doughnut'?{}:{x:{ticks:{color:'#8d9691'},grid:{display:false}},y:{beginAtZero:true,ticks:{color:'#8d9691'},grid:{color:'rgba(255,255,255,.055)'}}}}});
  }
  function updateMainChart(view){
    const data=stats();let source,type='bar',label,title;
    if(view==='gastos'){source=Object.entries(data.byDate);type='line';label='Valor gasto';title='Gastos ao longo do tempo';}
    else if(view==='categorias'){source=entries(data.byCategory);label='Valor';title='Gastos por categoria';}
    else if(view==='frequencia'){source=entries(data.frequency);label='Compras';title='Produtos mais frequentes';}
    else if(view==='despensa'){source=entries(data.pantryCategories);type='doughnut';label='Itens';title='Composição da despensa';}
    else{const planned=Array.isArray(data.state.planejador)?data.state.planejador.length:Object.keys(data.state.planejador||{}).length;source=[['Itens na despensa',data.pantry.length],['Listas',listCount(data.state)],['Planejados',planned]];label='Quantidade';title='Visão integrada';}
    $('#af26-main-title').textContent=title;createChart('af26-main-chart',type,source.map(([key])=>key),source.map(([,value])=>Number(value||0)),label);
  }
  function renderAnalytics(container){
    container=container||$('#module-analises');if(!container)return;destroyCharts();
    container.innerHTML=`<section class="af26-analysis af26-analysis-minimal"><header class="af26-analysis-head"><h2>Análises</h2><div class="af26-analysis-actions"><button class="af26-icon-action" data-af-share="analises" title="WhatsApp" aria-label="Compartilhar no WhatsApp"><i class="fa-brands fa-whatsapp"></i></button><button class="af26-icon-action" data-af-pdf="analises" title="PDF" aria-label="Exportar PDF"><i class="fa-regular fa-file-pdf"></i></button></div></header><nav class="af26-chart-tabs" aria-label="Escolha o gráfico"><button class="is-active" data-analysis-view="gastos" title="Gastos" aria-label="Gastos"><i class="fa-solid fa-chart-line"></i></button><button data-analysis-view="categorias" title="Categorias" aria-label="Categorias"><i class="fa-solid fa-chart-pie"></i></button><button data-analysis-view="frequencia" title="Frequência" aria-label="Frequência"><i class="fa-solid fa-arrow-trend-up"></i></button><button data-analysis-view="despensa" title="Despensa" aria-label="Despensa"><i class="fa-solid fa-box-archive"></i></button><button data-analysis-view="integracao" title="Visão integrada" aria-label="Visão integrada"><i class="fa-solid fa-chart-simple"></i></button></nav><article class="af26-chart-main"><header><h3 id="af26-main-title">Gastos ao longo do tempo</h3></header><div class="af26-chart-wrap"><canvas id="af26-main-chart"></canvas></div></article></section>`;
    updateMainChart('gastos');
  }

  async function cancelSubscription(){
    if(!confirm('Cancelar sua assinatura? O acesso Premium será encerrado conforme as regras do seu plano. Suas notas e dados continuarão salvos.'))return;
    try{const response=await fetch('/api/billing/cancel-subscription',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},body:'{}'});const result=await response.json().catch(()=>({}));if(!response.ok||!result.ok)throw new Error(result.message||'Não foi possível cancelar a assinatura.');notify('Assinatura cancelada com sucesso.','success');app()?.refreshAuthenticatedSession?.().catch?.(()=>false);}
    catch(error){notify(error.message,'error');}
  }
  function injectAccountActions(){
    if(!app()?.isLoggedIn)return;
    const targets=$$('.plan-card, #module-configuracoes .dashboard-card, .config-profile-card, #plans-modal .modal-content');
    targets.forEach((target,index)=>{if(target.querySelector('.af26-account-strip'))return;const strip=document.createElement('div');strip.className='af26-account-strip';strip.innerHTML=`<span><strong>Assinatura</strong><small>Gerencie seu plano com segurança.</small></span><button class="af26-cancel-subscription" type="button">Cancelar assinatura</button>`;if(index>0&&target.closest('#plans-modal'))return;target.appendChild(strip);});
    const config=$('#module-configuracoes');if(config?.children.length&&!config.querySelector('[data-af-share="configuracoes"]')){const button=document.createElement('button');button.className='af26-config-share';button.type='button';button.dataset.afShare='configuracoes';button.title='Compartilhar configurações';button.innerHTML='<i class="fa-brands fa-whatsapp"></i><span>Compartilhar</span>';config.prepend(button);}
  }
  function annotatePantry(){
    const pantry=app()?.state?.despensa||[];pantry.filter((item)=>item.notaNumero).forEach((item)=>{const card=$(`[data-id="${CSS.escape(String(item.id))}"]`);if(!card||card.querySelector('.pantry-note-badge'))return;const title=card.querySelector('h3,h4,.item-name,strong');if(title){const badge=document.createElement('small');badge.className='pantry-note-badge';badge.textContent=`Nota ${item.notaNumero}`;title.insertAdjacentElement('afterend',badge);}});
  }
  function tidyPlanner(){
    const button=$('.clear-plan-btn');
    if(!button||button.dataset.afModernized==='1')return;
    button.dataset.afModernized='1';
    button.title='Limpar planejador';
    button.setAttribute('aria-label','Limpar planejador');
    const icon=document.createElement('i');icon.className='fa-regular fa-trash-can';
    button.replaceChildren(icon);
  }
  function patch(){
    const current=app();if(!current||current.__modernUiPatched)return false;current.__modernUiPatched=true;
    current.renderAnalises=function(container){renderAnalytics(container||$('#module-analises'));};
    const originalRender=current.renderModuleContent?.bind(current);if(originalRender)current.renderModuleContent=function(key){const result=originalRender(key);setTimeout(()=>{if(key==='analises')renderAnalytics($('#module-analises'));injectAccountActions();annotatePantry();tidyPlanner();},0);return result;};
    return true;
  }
  document.addEventListener('click',(event)=>{
    const share=event.target.closest('[data-af-share]');const pdf=event.target.closest('[data-af-pdf]');const tab=event.target.closest('[data-analysis-view]');
    if(share){event.preventDefault();shareCurrent(share.dataset.afShare);return;}if(pdf){event.preventDefault();exportCurrent(pdf.dataset.afPdf);return;}if(tab){$$('[data-analysis-view]').forEach((button)=>button.classList.toggle('is-active',button===tab));updateMainChart(tab.dataset.analysisView);return;}if(event.target.closest('.af26-cancel-subscription')){event.preventDefault();cancelSubscription();}
  });
  document.addEventListener('DOMContentLoaded',()=>{
    const timer=setInterval(()=>{if(patch()){clearInterval(timer);injectAccountActions();tidyPlanner();}},40);
    let observerFrame=0;
    new MutationObserver(()=>{
      if(observerFrame)return;
      observerFrame=requestAnimationFrame(()=>{observerFrame=0;injectAccountActions();annotatePantry();tidyPlanner();});
    }).observe(document.body,{childList:true,subtree:true});
  });
  window.AF_MODERN_UI={shareCurrent,whatsappCurrent,exportCurrent,renderAnalytics};
})();
