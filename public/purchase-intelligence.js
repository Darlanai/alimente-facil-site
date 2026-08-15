(function(){
  'use strict';
  const money = value => Number(value || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const normalized = value => String(value || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const escape = value => String(value || '').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  document.addEventListener('DOMContentLoaded',()=>{
    const app=window.app;
    if(!app) return;
    app.purchaseAnalysisMode=app.purchaseAnalysisMode||'spend';

    app.getPurchaseIntelligence=function(){
      const notes=(this.state.notasFiscais||[]).filter(note=>Array.isArray(note.products)&&note.products.length);
      const products=new Map(); const stores=new Map(); let totalSpend=0; let itemCount=0; let plannedSpend=0; let pantryValue=0;
      const addProduct=(item,source='manual')=>{const exact=item.name||item.originalName||'Produto';const analysis=item.analysisName||exact;const key=normalized(analysis);const row=products.get(key)||{name:analysis,example:exact,purchases:0,quantity:0,spend:0,sources:new Set()};row.purchases+=1;row.quantity+=Number(item.quantity??item.qtd??1);row.spend+=Number(item.total??(Number(item.qtd||1)*Number(item.valor||item.unitPrice||0)));row.sources.add(source);products.set(key,row);itemCount+=1;};
      notes.forEach(note=>{
        totalSpend+=Number(note.total||0);
        const store=note.merchant||'Estabelecimento não identificado';
        const storeRow=stores.get(store)||{name:store,visits:0,spend:0}; storeRow.visits+=1; storeRow.spend+=Number(note.total||0); stores.set(store,storeRow);
        note.products.forEach(item=>addProduct(item,'nota'));
      });
      Object.values(this.state.listas||{}).forEach(list=>{if(list.sourceNoteId)return;(list.items||[]).forEach(item=>{plannedSpend+=Number(item.qtd||1)*Number(item.valor||0);addProduct(item,'lista');});});
      (this.state.despensa||[]).forEach(item=>{pantryValue+=Number(item.qtd||1)*Number(item.valor||0);if(item.origem!=='NFC-e')addProduct(item,'despensa');});
      const cleanRows=[...products.values()].map(row=>({...row,sources:[...row.sources]}));
      return {notes,products:cleanRows.sort((a,b)=>b.spend-a.spend),frequent:[...cleanRows].sort((a,b)=>b.purchases-a.purchases||b.quantity-a.quantity),stores:[...stores.values()].sort((a,b)=>b.spend-a.spend),totalSpend,plannedSpend,pantryValue,itemCount,average:notes.length?totalSpend/notes.length:0};
    };

    app.repeatLastReceipt=function(){
      const note=(this.state.notasFiscais||[]).find(entry=>Array.isArray(entry.products)&&entry.products.length&&!entry.itemsRemovedAt) || (this.state.notasFiscais||[]).find(entry=>entry.products?.length);
      if(!note){this.showNotification?.('Importe uma nota para repetir a compra.','info');return;}
      const id=`nota-${Date.now()}`;
      this.state.listas=this.state.listas||{};
      this.state.listas[id]={nome:`Repetir · ${note.merchant||'última compra'}`,sourceNoteId:note.id,items:note.products.map((product,index)=>({id:`${Date.now()}-${index}`,name:product.name||product.originalName,qtd:Number(product.quantity||1),unid:product.unit||'un',valor:Number(product.unitPrice||0).toFixed(2),categoria:product.category||'Mercearia',checked:false}))};
      this.activeListId=id; this.saveState?.(); this.flushRemoteStateSync?.().catch(()=>false); this.showNotification?.('Lista criada com os itens da última nota.','success'); this.activateModuleAndRender?.('lista');
    };

    app.renderPurchaseBars=function(rows,valueKey,formatter){
      const max=Math.max(...rows.map(row=>Number(row[valueKey]||0)),1);
      if(!rows.length)return '<div class="pi-empty"><i class="fa-solid fa-receipt"></i><strong>Importe sua primeira nota</strong><span>As análises aparecem automaticamente.</span></div>';
      return rows.slice(0,8).map((row,index)=>`<div class="pi-row"><span class="pi-rank">${String(index+1).padStart(2,'0')}</span><div><strong>${escape(row.name)}</strong><small>${escape(row.example&&row.example!==row.name?`Na nota: ${row.example}`:'')}</small><i><b style="width:${Math.max(4,Number(row[valueKey]||0)/max*100)}%"></b></i></div><em>${escape(formatter(row[valueKey],row))}</em></div>`).join('');
    };

    app.renderAnalises=function(container){
      if(!container)container=document.getElementById('module-analises'); if(!container)return;
      const data=this.getPurchaseIntelligence(); const mode=this.purchaseAnalysisMode||'spend';
      const modes={spend:['Gastos','Onde seu dinheiro está indo'],frequency:['Frequência','O que volta para o carrinho'],stores:['Lojas','Onde você compra'],overview:['360°','Resumo inteligente da rotina']};
      const active=modes[mode]||modes.spend;
      let detail='';
      if(mode==='spend')detail=this.renderPurchaseBars(data.products,'spend',value=>money(value));
      else if(mode==='frequency')detail=this.renderPurchaseBars(data.frequent,'purchases',(value,row)=>`${value} compra${value===1?'':'s'} · ${Number(row.quantity).toLocaleString('pt-BR')} un.`);
      else if(mode==='stores')detail=this.renderPurchaseBars(data.stores,'spend',(value,row)=>`${money(value)} · ${row.visits} visita${row.visits===1?'':'s'}`);
      else {
        const top=data.frequent[0]; const category=new Map(); data.notes.flatMap(note=>note.products||[]).forEach(item=>category.set(item.category||'Mercearia',(category.get(item.category||'Mercearia')||0)+Number(item.total||0)));
        const topCategory=[...category.entries()].sort((a,b)=>b[1]-a[1])[0];
        detail=`<div class="pi-360"><article><small>Compra mais recorrente</small><strong>${escape(top?.name||'Sem dados')}</strong><span>${top?`${top.purchases} aparições nas notas`:'Importe notas para descobrir'}</span></article><article><small>Maior peso no orçamento</small><strong>${escape(topCategory?.[0]||'Sem dados')}</strong><span>${topCategory?money(topCategory[1]):'Ainda sem histórico'}</span></article><article><small>Estabelecimento principal</small><strong>${escape(data.stores[0]?.name||'Sem dados')}</strong><span>${data.stores[0]?money(data.stores[0].spend):'Ainda sem histórico'}</span></article><article><small>Próxima ação</small><strong>${data.notes.length?'Repetir ou ajustar':'Escanear uma nota'}</strong><span>${data.notes.length?'Use a última compra como ponto de partida.':'A CozIA organiza o restante.'}</span></article></div>`;
      }
      container.innerHTML=`<section class="pi-shell"><header class="pi-header"><div><small>INTELIGÊNCIA DO SISTEMA</small><h2>${active[0]}</h2><p>${active[1]}</p></div><div class="pi-head-actions"><button class="pi-icon" type="button" data-pi-export title="Exportar CSV"><i class="fa-solid fa-download"></i></button><button class="pi-icon" type="button" data-pi-share title="Compartilhar"><i class="fa-solid fa-share-nodes"></i></button><button class="pi-repeat" type="button" data-repeat-last ${data.notes.length?'':'disabled'}><i class="fa-solid fa-rotate"></i><span>Repetir última nota</span></button></div></header><div class="pi-kpis"><article><small>Compras realizadas</small><strong>${money(data.totalSpend)}</strong></article><article><small>Listas planejadas</small><strong>${money(data.plannedSpend)}</strong></article><article><small>Valor na despensa</small><strong>${money(data.pantryValue)}</strong></article></div><nav class="pi-tabs">${Object.entries(modes).map(([key,label])=>`<button type="button" data-pi-mode="${key}" class="${key===mode?'active':''}">${label[0]}</button>`).join('')}</nav>${mode!=='overview'?'<div class="pi-chart"><canvas id="pi-system-chart"></canvas></div>':''}<div class="pi-detail">${detail}</div></section>`;
      container.querySelectorAll('[data-pi-mode]').forEach(button=>button.addEventListener('click',()=>{this.purchaseAnalysisMode=button.dataset.piMode;this.renderAnalises(container);}));
      container.querySelector('[data-repeat-last]')?.addEventListener('click',()=>this.repeatLastReceipt());
      container.querySelector('[data-pi-export]')?.addEventListener('click',()=>this.exportSystemAnalysis());
      container.querySelector('[data-pi-share]')?.addEventListener('click',()=>this.shareSystemAnalysis());
      this.drawSystemAnalysisChart(mode,data);
    };

    app.drawSystemAnalysisChart=function(mode,data){
      const canvas=document.getElementById('pi-system-chart');if(!canvas||!window.Chart)return;
      try{this.charts?.purchaseIntelligence?.destroy();}catch(_error){}
      const rows=mode==='stores'?data.stores:mode==='frequency'?data.frequent:data.products;const key=mode==='frequency'?'purchases':'spend';
      this.charts=this.charts||{};this.charts.purchaseIntelligence=new Chart(canvas,{type:'bar',data:{labels:rows.slice(0,7).map(row=>row.name),datasets:[{data:rows.slice(0,7).map(row=>Number(row[key]||0)),backgroundColor:'rgba(74,190,129,.72)',borderRadius:7,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,grid:{color:'rgba(150,170,160,.09)'},ticks:{color:'#9baba2'}},y:{grid:{display:false},ticks:{color:'#dce6e0',font:{size:10}}}}}});
    };
    app.exportSystemAnalysis=function(){const data=this.getPurchaseIntelligence();const lines=['Produto;Compras;Quantidade;Gasto;Fontes',...data.frequent.map(row=>[row.name,row.purchases,row.quantity,Number(row.spend||0).toFixed(2),row.sources.join(',')].map(value=>`"${String(value).replace(/"/g,'""')}"`).join(';'))];const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`analise-alimente-facil-${new Date().toISOString().slice(0,10)}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),500);};
    app.shareSystemAnalysis=async function(){const data=this.getPurchaseIntelligence();const text=`Alimente Fácil: ${money(data.totalSpend)} em compras, ${money(data.plannedSpend)} em listas e ${data.frequent[0]?.name||'nenhum item'} como item mais recorrente.`;if(navigator.share){try{await navigator.share({title:'Minha análise Alimente Fácil',text});return;}catch(_error){}}try{await navigator.clipboard.writeText(text);this.showNotification?.('Resumo copiado para compartilhar.','success');}catch(_error){this.showNotification?.('Não foi possível compartilhar agora.','error');}};

    document.addEventListener('click',event=>{
      const target=event.target.closest('[data-repeat-last-note]'); if(target){event.preventDefault();app.repeatLastReceipt();}
    });
  });
})();
