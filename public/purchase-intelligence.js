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
      const products=new Map(); const stores=new Map(); let totalSpend=0; let itemCount=0;
      notes.forEach(note=>{
        totalSpend+=Number(note.total||0);
        const store=note.merchant||'Estabelecimento não identificado';
        const storeRow=stores.get(store)||{name:store,visits:0,spend:0}; storeRow.visits+=1; storeRow.spend+=Number(note.total||0); stores.set(store,storeRow);
        note.products.forEach(item=>{
          const exact=item.name||item.originalName||'Produto'; const analysis=item.analysisName||exact; const key=normalized(analysis);
          const row=products.get(key)||{name:analysis,example:exact,purchases:0,quantity:0,spend:0};
          row.purchases+=1; row.quantity+=Number(item.quantity||1); row.spend+=Number(item.total||0); products.set(key,row); itemCount+=1;
        });
      });
      return {notes,products:[...products.values()].sort((a,b)=>b.spend-a.spend),frequent:[...products.values()].sort((a,b)=>b.purchases-a.purchases||b.quantity-a.quantity),stores:[...stores.values()].sort((a,b)=>b.spend-a.spend),totalSpend,itemCount,average:notes.length?totalSpend/notes.length:0};
    };

    app.repeatLastReceipt=function(){
      const note=(this.state.notasFiscais||[]).find(entry=>Array.isArray(entry.products)&&entry.products.length&&!entry.itemsRemovedAt) || (this.state.notasFiscais||[]).find(entry=>entry.products?.length);
      if(!note){this.showNotification?.('Importe uma nota para repetir a compra.','info');return;}
      const id=`nota-${Date.now()}`;
      this.state.listas=this.state.listas||{};
      this.state.listas[id]={nome:`Repetir · ${note.merchant||'última compra'}`,items:note.products.map((product,index)=>({id:`${Date.now()}-${index}`,name:product.name||product.originalName,qtd:Number(product.quantity||1),unid:product.unit||'un',valor:Number(product.unitPrice||0).toFixed(2),categoria:product.category||'Mercearia',checked:false}))};
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
      container.innerHTML=`<section class="pi-shell"><header class="pi-header"><div><small>INTELIGÊNCIA DE COMPRAS</small><h2>${active[0]}</h2><p>${active[1]}</p></div><button class="pi-repeat" type="button" data-repeat-last ${data.notes.length?'':'disabled'}><i class="fa-solid fa-rotate"></i><span>Repetir última nota</span></button></header><div class="pi-kpis"><article><small>Gasto nas notas</small><strong>${money(data.totalSpend)}</strong></article><article><small>Notas lidas</small><strong>${data.notes.length}</strong></article><article><small>Média por compra</small><strong>${money(data.average)}</strong></article></div><nav class="pi-tabs">${Object.entries(modes).map(([key,label])=>`<button type="button" data-pi-mode="${key}" class="${key===mode?'active':''}">${label[0]}</button>`).join('')}</nav><div class="pi-detail">${detail}</div></section>`;
      container.querySelectorAll('[data-pi-mode]').forEach(button=>button.addEventListener('click',()=>{this.purchaseAnalysisMode=button.dataset.piMode;this.renderAnalises(container);}));
      container.querySelector('[data-repeat-last]')?.addEventListener('click',()=>this.repeatLastReceipt());
    };

    document.addEventListener('click',event=>{
      const target=event.target.closest('[data-repeat-last-note]'); if(target){event.preventDefault();app.repeatLastReceipt();}
    });
  });
})();
