/* Alimente Fácil · Central fiscal integrada
 * Consulta protegida no servidor, histórico oficial imutável e ações idempotentes.
 */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const runtime = { stream:null, detector:null, raf:0, receipt:null, busy:false, nameMode:'original', lastScan:0, scanCount:0 };

  function app() { return window.app; }
  function notes() {
    const current = app();
    current.state.notasFiscais = Array.isArray(current.state.notasFiscais) ? current.state.notasFiscais : [];
    return current.state.notasFiscais;
  }
  function notify(message, type='info') { app()?.showNotification?.(message, type); }
  function token() { return app()?.getStoredAuthToken?.() || localStorage.getItem('alimenteFacilAuthToken') || ''; }
  function noteId(receipt) { return `nfce-${receipt.accessKey || Date.now()}`; }
  function printedName(product) { return String(product.originalName || product.name || '').replace(/\s+/g,' ').trim(); }
  function correctedName(product) {
    const raw = printedName(product);
    const analysis = String(product.analysisName || '').trim();
    if (analysis && normalize(analysis) !== normalize(raw) && analysis.length > 2) return analysis;
    const catalog = Array.isArray(window.ALL_ITEMS_DATA) ? window.ALL_ITEMS_DATA : [];
    const rawWords = normalize(raw).split(' ').filter((word) => word.length > 2);
    const match = catalog.find((item) => {
      const key = normalize(item?.name);
      return key && (rawWords.includes(key) || rawWords.some((word) => key.includes(word) || word.includes(key)));
    });
    return match?.name || raw.toLocaleLowerCase('pt-BR').replace(/(^|\s)\S/g, (letter) => letter.toLocaleUpperCase('pt-BR'));
  }
  function displayName(product) { return runtime.nameMode === 'corrected' ? correctedName(product) : printedName(product); }

  function setStage(stage) {
    $$('[data-nfce-stage]').forEach((node) => node.classList.toggle('is-active', node.dataset.nfceStage === stage));
    $$('[data-nfce-step-dot]').forEach((node) => node.classList.toggle('is-active', node.dataset.nfceStepDot === stage));
  }
  function status(message, error=false) {
    const node = $('#nfce-status'); if (!node) return;
    node.textContent = message; node.classList.toggle('is-error', error);
  }
  function open() {
    if (!app()?.isLoggedIn) { app()?.showAuthModal?.(); notify('Entre ou crie sua conta para importar sua nota.', 'info'); return; }
    const modal = $('#nfce-modal');
    modal?.classList.add('is-open'); modal?.setAttribute('aria-hidden','false'); document.body.classList.add('nfce-lock');
    installScannerSurface(); setStage('scan'); status('Aponte para o QR Code ou digite a chave de 44 números.');
  }
  function close() { stopCamera(); $('#nfce-modal')?.classList.remove('is-open'); $('#nfce-modal')?.setAttribute('aria-hidden','true'); document.body.classList.remove('nfce-lock'); }

  function installScannerSurface() {
    const stage = $('[data-nfce-stage="scan"]');
    if (!stage || stage.dataset.fiscalReady) return;
    stage.dataset.fiscalReady = 'true';
    stage.innerHTML = `
      <div class="af-fiscal-camera">
        <video id="af-fiscal-video" playsinline muted></video>
        <div class="af-scan-frame"><i></i><i></i><i></i><i></i></div>
        <div class="af-camera-placeholder"><span><i class="fa-solid fa-qrcode"></i></span><strong>Leia o QR Code da NFC-e</strong><small>Nenhuma imagem é armazenada.</small></div>
      </div>
      <p class="nfce-status" id="nfce-status" aria-live="polite"></p>
      <div class="af-fiscal-actions"><button class="nfce-primary" id="af-start-camera" type="button"><i class="fa-solid fa-camera"></i> Abrir câmera</button></div>
      <div class="af-key-divider"><span>ou digite a chave</span></div>
      <form class="af-key-form" id="af-key-form"><label for="af-access-key">Chave de acesso da NFC-e</label><div><input id="af-access-key" inputmode="numeric" autocomplete="off" maxlength="54" placeholder="44 números" required><button type="submit" aria-label="Consultar nota"><i class="fa-solid fa-arrow-right"></i></button></div><small id="af-key-counter">0 de 44 números</small></form>
      <p class="nfce-coverage"><i class="fa-solid fa-shield-halved"></i> Consulta fiscal protegida · 1 nota no teste · 10 a cada 30 dias no Premium.</p>`;
    $('#af-start-camera')?.addEventListener('click', startCamera);
    $('#af-key-form')?.addEventListener('submit', (event) => { event.preventDefault(); queryReceipt($('#af-access-key').value); });
    $('#af-access-key')?.addEventListener('input', (event) => {
      const digits = event.target.value.replace(/\D/g,'').slice(0,44); event.target.value = digits.replace(/(.{4})/g,'$1 ').trim();
      $('#af-key-counter').textContent = `${digits.length} de 44 números`;
    });
  }

  async function startCamera() {
    stopCamera(); status('Abrindo a câmera…');
    try {
      runtime.stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal:'environment' }, width:{ ideal:1920 }, height:{ ideal:1080 }, advanced:[{ focusMode:'continuous' }] }, audio:false });
      const track=runtime.stream.getVideoTracks()[0];const capabilities=track?.getCapabilities?.()||{};const advanced={};
      if(Array.isArray(capabilities.focusMode)&&capabilities.focusMode.includes('continuous'))advanced.focusMode='continuous';
      if(capabilities.zoom){advanced.zoom=Math.min(Math.max(1.25,capabilities.zoom.min||1),capabilities.zoom.max||1.25);}
      if(Object.keys(advanced).length)track.applyConstraints({advanced:[advanced]}).catch(()=>false);
      const video = $('#af-fiscal-video'); video.srcObject = runtime.stream; await video.play();
      runtime.lastScan=0;runtime.scanCount=0;
      $('.af-fiscal-camera')?.classList.add('is-live');
      if ('BarcodeDetector' in window) runtime.detector = new BarcodeDetector({ formats:['qr_code'] });
      scanFrame(); status('Câmera ativa. Mantenha o QR dentro da moldura.');
    } catch (_error) { status('Não foi possível abrir a câmera. Autorize a permissão ou digite a chave.', true); }
  }
  function stopCamera() {
    cancelAnimationFrame(runtime.raf); runtime.raf = 0; runtime.stream?.getTracks().forEach((track) => track.stop()); runtime.stream = null;
    const video = $('#af-fiscal-video'); if (video) video.srcObject = null; $('.af-fiscal-camera')?.classList.remove('is-live');
  }
  async function scanFrame(timestamp=0) {
    const video = $('#af-fiscal-video'); if (!runtime.stream || !video) return;
    if(timestamp-runtime.lastScan<110){runtime.raf=requestAnimationFrame(scanFrame);return;}runtime.lastScan=timestamp;runtime.scanCount+=1;
    try {
      let value = '';
      if (runtime.detector) value = (await runtime.detector.detect(video))[0]?.rawValue || '';
      if (!value && window.jsQR && video.readyState >= 2) {
        const sourceWidth=video.videoWidth||1280,sourceHeight=video.videoHeight||720;const width=Math.min(1120,sourceWidth);const height=Math.round(width*sourceHeight/sourceWidth);
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true});context.imageSmoothingEnabled=true;context.drawImage(video,0,0,width,height);
        let image=context.getImageData(0,0,width,height);value=window.jsQR(image.data,width,height,{inversionAttempts:'attemptBoth'})?.data||'';
        if(!value){const cropSize=Math.round(Math.min(width,height)*.76),cropX=Math.round((width-cropSize)/2),cropY=Math.round((height-cropSize)/2);const crop=context.getImageData(cropX,cropY,cropSize,cropSize);value=window.jsQR(crop.data,cropSize,cropSize,{inversionAttempts:'attemptBoth'})?.data||'';}
        if(!value&&runtime.scanCount%4===0){const pixels=image.data;for(let index=0;index<pixels.length;index+=4){const gray=.299*pixels[index]+.587*pixels[index+1]+.114*pixels[index+2];const contrasted=Math.max(0,Math.min(255,(gray-128)*1.55+128));pixels[index]=pixels[index+1]=pixels[index+2]=contrasted;}value=window.jsQR(pixels,width,height,{inversionAttempts:'attemptBoth'})?.data||'';}
      }
      let readableValue=String(value||'');try{readableValue=decodeURIComponent(readableValue);}catch(_error){}
      const key = readableValue.match(/\d{44}/)?.[0];
      if (key) { stopCamera(); queryReceipt(key); return; }
    } catch (_error) {}
    runtime.raf = requestAnimationFrame(scanFrame);
  }

  async function queryReceipt(raw) {
    const key = String(raw || '').replace(/\D/g,'');
    if (key.length !== 44) { status('A chave precisa ter exatamente 44 números.', true); return; }
    if (runtime.busy) return; runtime.busy = true; stopCamera(); status('Consultando a nota fiscal…');
    try {
      const response = await fetch('/api/nfce/preview', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token()}` }, body:JSON.stringify({ key }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw Object.assign(new Error(result.message || 'Não foi possível consultar esta nota.'), { code:result.code });
      runtime.receipt = result.receipt; saveOfficialNote(result.receipt); renderReview(result.receipt, result.quota, result.alreadyImported); setStage('review');
    } catch (error) { status(error.message, true); if (error.code === 'PLAN_REQUIRED' || error.code === 'RECEIPT_QUOTA_REACHED') app()?.showPlansModal?.(error.message); }
    finally { runtime.busy = false; }
  }

  function saveOfficialNote(receipt) {
    const current = app(); const id = noteId(receipt); const existing = notes().find((note) => note.id === id || note.accessKey === receipt.accessKey);
    if (existing) return existing;
    const originalProducts = (receipt.products || []).map((product, index) => ({ ...product, lineId:String(product.id || index + 1), originalName:printedName(product), pantryItemId:null, sentToPantry:false }));
    const note = { id, title:`Nota ${receipt.documentNumber || receipt.accessKey?.slice(-8) || ''}`.trim(), merchant:receipt.merchant, merchantDocument:receipt.merchantDocument, state:receipt.state, total:Number(receipt.total || 0), issueDate:receipt.issueDate, documentNumber:receipt.documentNumber, series:receipt.series, accessKey:receipt.accessKey, importedAt:new Date().toISOString(), source:'infosimples', products:originalProducts, official:true };
    notes().unshift(note); current.saveState?.(); current.flushRemoteStateSync?.().catch(() => false); return note;
  }

  function renderReview(receipt, quota={}, reused=false) {
    $('#nfce-merchant').textContent = receipt.merchant || 'Estabelecimento identificado';
    $('#nfce-meta').textContent = `${receipt.issueDate || ''}${receipt.documentNumber ? ` · Nota ${receipt.documentNumber}` : ''}`;
    $('#nfce-total').textContent = money(receipt.total);
    const heading = $('.nfce-review-heading');
    if (heading) heading.innerHTML = `<div><h3>Itens oficiais da nota</h3><p>${reused ? 'Nota já consultada — sem nova cobrança.' : `${quota.used || 0} de ${quota.limit || 0} consultas usadas neste ciclo.`}</p></div><div class="af-name-mode" role="group" aria-label="Nomes dos produtos"><button data-name-mode="original" class="is-active">Nome da nota</button><button data-name-mode="corrected">Corrigir nomes</button></div>`;
    runtime.nameMode = 'original'; renderReviewProducts(receipt.products || []);
    $$('[data-name-mode]', heading).forEach((button) => button.addEventListener('click', () => { runtime.nameMode = button.dataset.nameMode; $$('[data-name-mode]', heading).forEach((item) => item.classList.toggle('is-active', item === button)); renderReviewProducts(receipt.products || []); }));
    const importButton = $('#nfce-import'); if (importButton) importButton.innerHTML = '<i class="fa-solid fa-box-open"></i> Enviar à despensa <span id="nfce-selected-count"></span>';
  }
  function renderReviewProducts(products) {
    const node = $('#nfce-products'); if (!node) return;
    node.innerHTML = products.map((product,index) => `<label class="nfce-product"><input class="nfce-product-check" type="checkbox" data-index="${index}" checked><span><strong>${esc(displayName(product))}</strong><small>${Number(product.quantity || 1).toLocaleString('pt-BR')} ${esc(product.unit || 'un')} · ${money(product.unitPrice)}</small></span><b>${money(product.total)}</b></label>`).join('');
    updateCount(); $$('.nfce-product-check',node).forEach((input) => input.addEventListener('change', updateCount));
  }
  function updateCount() { const count = $$('.nfce-product-check:checked').length; const node = $('#nfce-selected-count'); if (node) node.textContent = `(${count})`; }

  async function importToPantry() {
    const current = app(); const receipt = runtime.receipt; if (!current || !receipt) return;
    const note = notes().find((entry) => entry.accessKey === receipt.accessKey); const selected = new Set($$('.nfce-product-check:checked').map((input) => Number(input.dataset.index)));
    current.state.despensa = Array.isArray(current.state.despensa) ? current.state.despensa : [];
    let added = 0; let skipped = 0;
    note.products.forEach((product,index) => {
      if (!selected.has(index)) return;
      const sourceLineId = `${note.id}:${product.lineId || index + 1}`;
      const existing = current.state.despensa.find((item) => item.sourceLineId === sourceLineId);
      if (existing || product.sentToPantry) { skipped += 1; return; }
      const id = current.generateId?.() || `${Date.now()}-${index}`;
      current.state.despensa.push({ id, name:runtime.nameMode === 'corrected' ? correctedName(product) : printedName(product), originalName:printedName(product), qtd:Number(product.quantity || 1), unid:product.unit || 'un', valor:Number(product.unitPrice || 0), stock:100, validade:'', categoria:product.category || 'Mercearia', origem:'NFC-e', sourceNoteId:note.id, sourceLineId, notaNumero:note.documentNumber || note.accessKey?.slice(-8), notaIds:[note.id] });
      product.pantryItemId = id; product.sentToPantry = true; product.displayNameMode = runtime.nameMode; added += 1;
    });
    current.saveState?.(); await current.flushRemoteStateSync?.().catch(() => false); current.renderDespensa?.();
    if (!added && skipped) { notify('Esses itens já foram adicionados à despensa.', 'info'); return; }
    notify(`${added} ${added === 1 ? 'item enviado' : 'itens enviados'} à despensa.${skipped ? ` ${skipped} já existiam.` : ''}`, 'success');
    $('#nfce-done-title').textContent = `${added} ${added === 1 ? 'item organizado' : 'itens organizados'}.`; $('#nfce-done-copy').textContent = skipped ? 'Os itens repetidos foram preservados sem duplicação.' : 'A nota ficou salva em Minhas Notas e a despensa foi atualizada.'; setStage('done');
  }

  function renderNotesModule() {
    const container = $('#module-notas'); if (!container) return;
    const data = notes();
    container.innerHTML = `<section class="af-notes-page"><header class="af-page-head"><div><small>CENTRAL FISCAL</small><h2>Minhas Notas</h2><p>Documentos oficiais preservados. Você pode organizar os itens sem alterar a nota original.</p></div><div class="af-page-head-actions"><button class="af-action-secondary" data-af-share="notas" title="Compartilhar" aria-label="Compartilhar notas"><i class="fa-brands fa-whatsapp"></i></button><button class="af-action-secondary is-danger" data-sync-action="delete-all-notes" title="Excluir todas" aria-label="Excluir todas as notas"><i class="fa-solid fa-trash-can"></i></button><button class="af-action-primary" data-nfce-open><i class="fa-solid fa-qrcode"></i> Ler nova nota</button></div></header><div class="af-quota-card"><span><i class="fa-solid fa-shield-halved"></i></span><div><strong>${data.length} ${data.length === 1 ? 'nota salva' : 'notas salvas'}</strong><small>1 consulta no teste · 10 a cada 30 dias no Premium</small></div></div><div class="af-notes-grid">${data.length ? data.map(noteCard).join('') : '<div class="af-empty-note"><i class="fa-solid fa-receipt"></i><h3>Sua primeira nota começa aqui</h3><p>Leia o QR Code ou digite a chave de acesso.</p><button data-nfce-open>Ler nota fiscal</button></div>'}</div></section>`;
  }
  function noteCard(note) {
    const sent = (note.products || []).filter((product) => product.sentToPantry).length;
    return `<article class="af-note-card" data-note-id="${esc(note.id)}"><header><div><small>${esc(note.state || 'NFC-e')} · ${esc(note.issueDate || '')}</small><h3>${esc(note.title || `Nota ${note.documentNumber || ''}`)}</h3><p>${esc(note.merchant || 'Estabelecimento identificado')}</p></div><strong>${money(note.total)}</strong></header><div class="af-note-metrics"><span><b>${note.products?.length || 0}</b> itens</span><span><b>${sent}</b> na despensa</span><span><b>${esc(note.documentNumber || '—')}</b> número</span></div><details><summary>Ver itens e informações <i class="fa-solid fa-chevron-down"></i></summary><div class="af-official-seal"><i class="fa-solid fa-lock"></i> Conteúdo oficial — somente leitura</div><div class="af-note-products">${(note.products || []).map((product) => `<div><span><strong>${esc(printedName(product))}</strong><small>${Number(product.quantity || 1).toLocaleString('pt-BR')} ${esc(product.unit || 'un')} · ${money(product.unitPrice)}</small></span><b>${money(product.total)}</b></div>`).join('')}</div><dl><div><dt>Chave</dt><dd>${esc(note.accessKey || '—')}</dd></div><div><dt>CNPJ</dt><dd>${esc(note.merchantDocument || '—')}</dd></div><div><dt>Série</dt><dd>${esc(note.series || '—')}</dd></div></dl></details><footer><button data-note-pantry="${esc(note.id)}"><i class="fa-solid fa-box-open"></i> Enviar à despensa</button><button data-note-list="${esc(note.id)}"><i class="fa-solid fa-list-check"></i> Gerar lista</button><button data-note-rename="${esc(note.id)}" aria-label="Renomear nota"><i class="fa-solid fa-pen"></i></button><button class="is-danger" data-note-delete="${esc(note.id)}" aria-label="Excluir nota"><i class="fa-regular fa-trash-can"></i></button></footer></article>`;
  }

  function sendWholeNote(noteIdValue) {
    const note = notes().find((entry) => entry.id === noteIdValue); if (!note) return;
    const current = app();
    current.state.despensa = Array.isArray(current.state.despensa) ? current.state.despensa : [];
    const items = (note.products || []).map((product,index) => {
      const sourceLineId = `${note.id}:${product.lineId || index + 1}`;
      return { product,index,present:Boolean(product.sentToPantry || current.state.despensa.some((item) => item.sourceLineId === sourceLineId)) };
    });
    let modal = $('#af-note-import-modal');
    if (!modal) { modal=document.createElement('div'); modal.id='af-note-import-modal'; modal.className='af26-modal'; document.body.appendChild(modal); }
    modal.innerHTML=`<section class="af26-dialog" role="dialog" aria-modal="true" aria-labelledby="af-note-import-title"><header><div><h3 id="af-note-import-title">Enviar itens à despensa</h3><p>${esc(note.title || note.merchant || 'Nota fiscal')} · selecione o que deseja organizar.</p></div><button class="af26-dialog-close" type="button" data-note-import-close aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button></header><div class="af26-select-list">${items.map(({product,index,present})=>`<label class="af26-select-item${present?' is-present':''}"><input type="checkbox" data-note-import-index="${index}" ${present?'':'checked'}><span><strong>${esc(printedName(product))}</strong><small>${Number(product.quantity||1).toLocaleString('pt-BR')} ${esc(product.unit||'un')} · ${money(product.total)}</small></span>${present?'<em>JÁ NA DESPENSA</em>':''}</label>`).join('')}</div><footer><button class="af26-btn" type="button" data-note-import-close>Cancelar</button><button class="af26-btn is-primary" type="button" data-note-import-confirm>Confirmar envio</button></footer></section>`;
    modal.classList.add('is-open');
    modal.querySelectorAll('[data-note-import-close]').forEach((button)=>button.addEventListener('click',()=>modal.classList.remove('is-open')));
    modal.querySelector('[data-note-import-confirm]')?.addEventListener('click',async()=>{
      const selected=$$('[data-note-import-index]:checked',modal).map((input)=>Number(input.dataset.noteImportIndex));
      if(!selected.length){notify('Selecione pelo menos um item.','info');return;}
      const repeats=selected.filter((index)=>items[index]?.present);
      let allowDuplicates=false;
      if(repeats.length){allowDuplicates=confirm(`${repeats.length} ${repeats.length===1?'item já está':'itens já estão'} na despensa. Deseja adicionar novamente?`);}
      await importFromSavedNote(note,selected,allowDuplicates);
      modal.classList.remove('is-open');
    });
  }
  async function importFromSavedNote(note,selectedIndexes,allowDuplicates=false) {
    const current = app(); current.state.despensa = Array.isArray(current.state.despensa) ? current.state.despensa : []; let added=0;let skipped=0;
    const selected=new Set(selectedIndexes);
    note.products.forEach((product,index) => { if(!selected.has(index))return;const baseSourceLineId=`${note.id}:${product.lineId || index+1}`;const present=Boolean(product.sentToPantry||current.state.despensa.some((item)=>item.sourceLineId===baseSourceLineId));if(present&&!allowDuplicates){skipped+=1;return;}const id=current.generateId?.()||`${Date.now()}-${index}`;const sourceLineId=present?`${baseSourceLineId}:repeat-${Date.now()}-${index}`:baseSourceLineId;current.state.despensa.push({ id,name:printedName(product),originalName:printedName(product),qtd:Number(product.quantity||1),unid:product.unit||'un',valor:Number(product.unitPrice||0),stock:100,validade:'',categoria:product.category||'Mercearia',origem:'NFC-e',sourceNoteId:note.id,sourceLineId,notaNumero:note.documentNumber||note.accessKey?.slice(-8),notaIds:[note.id],reimportedFromNote:present });if(!present){product.pantryItemId=id;product.sentToPantry=true;}added+=1; });
    current.saveState?.(); await current.flushRemoteStateSync?.().catch(()=>false); renderNotesModule(); current.renderDespensa?.();
    if(!added){notify('Nenhum item novo foi enviado.','info');return;}
    notify(`${added} ${added===1?'item enviado':'itens enviados'} à despensa.${skipped?` ${skipped} repetidos foram ignorados.`:''}`, 'success');
  }
  function createList(noteIdValue) {
    const current=app(); const note=notes().find((entry)=>entry.id===noteIdValue); if(!note)return; current.state.listas=current.state.listas||{}; const id=current.generateId?.()||`lista-${Date.now()}`; current.state.listas[id]={ nome:`Reposição · ${note.title || note.merchant}`, sourceNoteId:note.id, createdAt:new Date().toISOString(), items:note.products.map((product,index)=>({ id:current.generateId?.()||`${Date.now()}-${index}`,name:printedName(product),qtd:Number(product.quantity||1),unid:product.unit||'un',valor:Number(product.unitPrice||0),checked:false,categoria:product.category||'Mercearia' })) }; current.activeListId=id; current.saveState?.(); current.activateModuleAndRender?.('lista'); notify('Lista criada como espelho da nota.', 'success');
  }
  function renameNote(id) { const note=notes().find((entry)=>entry.id===id); if(!note)return; const value=prompt('Nome de exibição da nota:',note.title||''); if(value===null)return; note.title=String(value).trim()||note.title; app().saveState?.(); renderNotesModule(); }
  function deleteNote(id) { if(!confirm('Excluir esta nota do seu histórico? Os itens já enviados à despensa serão mantidos.'))return; app().state.notasFiscais=notes().filter((entry)=>entry.id!==id); app().saveState?.(); renderNotesModule(); notify('Nota excluída do histórico.', 'success'); }

  function augmentAnalytics() {
    const container=$('#module-analises'); if(!container || $('.af-fiscal-insights',container))return;
    const all=notes(); const total=all.reduce((sum,note)=>sum+Number(note.total||0),0); const items=all.flatMap((note)=>note.products||[]); const frequency=new Map(); items.forEach((item)=>{const key=correctedName(item);frequency.set(key,(frequency.get(key)||0)+1);}); const top=[...frequency.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
    const section=document.createElement('section');section.className='af-fiscal-insights dashboard-card';section.innerHTML=`<div class="card-header"><h3><i class="fa-solid fa-chart-pie"></i> Visão 360° das compras</h3></div><div class="af-insight-kpis"><div><small>GASTO EM NOTAS</small><strong>${money(total)}</strong></div><div><small>TÍQUETE MÉDIO</small><strong>${money(all.length?total/all.length:0)}</strong></div><div><small>ITENS LIDOS</small><strong>${items.length}</strong></div></div><div class="af-frequency"><h4>Produtos mais frequentes</h4>${top.length?top.map(([name,count])=>`<div><span>${esc(name)}</span><b>${count}×</b><i style="--size:${Math.max(8,count/Math.max(...top.map((row)=>row[1]))*100)}%"></i></div>`).join(''):'<p>Importe notas para liberar esta análise.</p>'}</div><footer><button type="button" data-export-notes><i class="fa-solid fa-download"></i> Exportar CSV</button><button type="button" data-share-notes><i class="fa-solid fa-share-nodes"></i> Compartilhar resumo</button></footer>`;container.prepend(section);
  }
  function exportCsv(){const rows=[['Nota','Data','Estabelecimento','Produto','Quantidade','Unidade','Valor unitário','Total']];notes().forEach((note)=>(note.products||[]).forEach((product)=>rows.push([note.documentNumber,note.issueDate,note.merchant,printedName(product),product.quantity,product.unit,product.unitPrice,product.total])));const csv=rows.map((row)=>row.map((cell)=>`"${String(cell??'').replace(/"/g,'""')}"`).join(';')).join('\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));link.download='alimente-facil-notas.csv';link.click();URL.revokeObjectURL(link.href);}
  async function shareSummary(){const total=notes().reduce((sum,note)=>sum+Number(note.total||0),0);const text=`Alimente Fácil: ${notes().length} notas, total de ${money(total)}.`;if(navigator.share)await navigator.share({title:'Resumo Alimente Fácil',text});else{await navigator.clipboard.writeText(text);notify('Resumo copiado.','success');}}

  function patchApp() {
    const current=app(); if(!current || current.__fiscalNotesPatched)return false; current.__fiscalNotesPatched=true; current.state.notasFiscais=Array.isArray(current.state.notasFiscais)?current.state.notasFiscais:[];
    const originalRender=current.renderModuleContent.bind(current); current.renderModuleContent=function(key){if(key==='notas'){Object.values(this.charts||{}).forEach((chart)=>chart?.destroy?.());this.charts={};renderNotesModule();return;} originalRender(key);if(key==='analises')setTimeout(augmentAnalytics,0);};
    const originalApply=current.applyPanelStatePayload?.bind(current);if(originalApply)current.applyPanelStatePayload=function(payload){const result=originalApply(payload);this.state.notasFiscais=Array.isArray(this.state.notasFiscais)?this.state.notasFiscais:[];return result;};
    return true;
  }

  document.addEventListener('click',(event)=>{
    const opener=event.target.closest('[data-nfce-open]');if(opener){event.preventDefault();event.stopImmediatePropagation();open();return;}
    if(event.target.closest('[data-nfce-close]')){event.preventDefault();event.stopImmediatePropagation();close();return;}
    const pantry=event.target.closest('[data-note-pantry]');const list=event.target.closest('[data-note-list]');const rename=event.target.closest('[data-note-rename]');const del=event.target.closest('[data-note-delete]');
    if(pantry)sendWholeNote(pantry.dataset.notePantry);else if(list)createList(list.dataset.noteList);else if(rename)renameNote(rename.dataset.noteRename);else if(del)deleteNote(del.dataset.noteDelete);else if(event.target.closest('[data-export-notes]'))exportCsv();else if(event.target.closest('[data-share-notes]'))shareSummary();
  },true);
  document.addEventListener('DOMContentLoaded',()=>{installScannerSurface();const timer=setInterval(()=>{if(patchApp()){clearInterval(timer);const importButton=$('#nfce-import');if(importButton){const clone=importButton.cloneNode(true);importButton.replaceWith(clone);clone.addEventListener('click',importToPantry);}$('#nfce-open-pantry')?.addEventListener('click',()=>{close();app()?.activateModuleAndRender?.('despensa');});}},40);});
  window.AF_FISCAL_NOTES={open,render:renderNotesModule};
})();
