(function () {
  'use strict';

  const PENDING_KEY = 'afNfcePendingReceipt_v1';
  const state = { receipt: null, stream: null, scanTimer: 0, busy: false, keyMetadata:null, pendingPantryAfterAuth:false };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
  const normalize = (value) => String(value || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const number = (value) => Number.parseFloat(String(value || '').replace(/\//g, '7').replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')) || 0;
  const CUF_STATES = {12:'AC',27:'AL',16:'AP',13:'AM',29:'BA',23:'CE',53:'DF',32:'ES',52:'GO',21:'MA',51:'MT',50:'MS',31:'MG',15:'PA',25:'PB',41:'PR',26:'PE',22:'PI',33:'RJ',24:'RN',43:'RS',11:'RO',14:'RR',42:'SC',35:'SP',28:'SE',17:'TO'};

  function categoryFor(name) {
    const text = normalize(name);
    const groups = [
      ['Hortifruti', /banana|maca|laranja|limao|manga|tomate|cebola|alho|batata|cenoura|alface|couve|fruta|verdura|legume/],
      ['Carnes e ovos', /carne|frango|peixe|bacon|linguica|ovo/], ['Laticínios', /leite|queijo|iogurte|manteiga|requeijao/],
      ['Bebidas', /agua|suco|refrigerante|cerveja|vinho|cafe|cha/], ['Padaria', /pao|bolo|biscoito|torrada/],
      ['Grãos e massas', /arroz|feijao|macarrao|farinha|aveia|lentilha|grao/], ['Limpeza', /detergente|sabao|amaciante|desinfetante|limpeza/],
      ['Higiene', /papelhigienico|shampoo|sabonete|cremedental|desodorante/]
    ];
    return groups.find(([, pattern]) => pattern.test(text))?.[0] || 'Mercearia';
  }

  function cleanProductName(value) {
    const ignored = new Set(['de','da','do','das','dos','com','sem','e']);
    return String(value || '').replace(/^\s*(?:[%#]\s*)?(?=[0-9A-Z]*\d)[0-9A-Z]{4,18}\s+/i, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR').split(' ').filter(Boolean)
      .map((word, index) => index && ignored.has(word) ? word : word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1)).join(' ');
  }

  function receiptProductName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function smartProductName(value) {
    const cleaned = cleanProductName(value);
    const text = normalize(cleaned);
    const aliases = [
      [/couve|vfernandes/, 'Couve'], [/alf?ace.*crespa|crespa.*(?:uv|v)?$/, 'Alface crespa'],
      [/banan.*ma(?:ca|ca)|bananama/, 'Banana maçã'], [/lar.*pera|laranj.*pera/, 'Laranja pera'],
      [/tomate.*andr|tomat.*andr/, 'Tomate'], [/coco.*seco|^seco(?:k3|kg)?$/, 'Coco seco'],
      [/sem.*chia|chia.*(?:vbe)?/, 'Semente de chia'], [/abob.*ital/, 'Abóbora italiana'],
      [/sal.*mor|sal.*jas/, 'Sal'], [/feij.*car|feijao.*carioc/, 'Feijão carioca'],
      [/ovos?.*(?:bcos|branc)|bcos.*20un/, 'Ovos brancos (20 unidades)']
    ];
    const direct = aliases.find(([pattern]) => pattern.test(text));
    if (direct) return direct[1];
    const catalog = window.AF_AI_DATABASE?.catalog;
    if (!Array.isArray(catalog)) return cleaned;
    const rawTokens = String(cleaned).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((token) => token.length > 2);
    let best = null; let bestScore = 0;
    catalog.forEach((entry) => {
      const candidate = String(entry?.name || entry?.nome || '');
      const tokens = candidate.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
      const score = tokens.reduce((sum, token) => sum + (rawTokens.some((raw) => raw.startsWith(token.slice(0, 4)) || token.startsWith(raw.slice(0, 4))) ? 1 : 0), 0);
      if (score > bestScore) { bestScore = score; best = candidate; }
    });
    return bestScore >= 1 ? cleanProductName(best) : cleaned;
  }

  async function prepareReceiptImage(file) {
    const bitmap = await createImageBitmap(file);
    const sideways = bitmap.width > bitmap.height;
    const sourceWidth = sideways ? bitmap.height : bitmap.width;
    const sourceHeight = sideways ? bitmap.width : bitmap.height;
    const scale = Math.min(1, 1800 / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d', { willReadFrequently:true });
    context.save();
    if (sideways) {
      // Fotos de recibos compridos normalmente chegam deitadas; gira para texto em pé.
      context.translate(0, canvas.height);
      context.rotate(-Math.PI / 2);
      context.drawImage(bitmap, 0, 0, canvas.height, canvas.width);
    } else {
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    }
    context.restore();
    bitmap.close?.();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const gray = pixels.data[index] * .299 + pixels.data[index + 1] * .587 + pixels.data[index + 2] * .114;
      const enhanced = Math.max(0, Math.min(255, (gray - 128) * 1.22 + 128));
      pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = enhanced;
    }
    context.putImageData(pixels, 0, 0);
    return canvas;
  }

  function app() { return window.app || null; }
  function modal() { return $('#nfce-modal'); }

  function setStatus(message, error = false) {
    const node = $('#nfce-status');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('is-error', error);
    if (!error) { const fallback=$('#nfce-captcha-fallback'); if(fallback) fallback.hidden=true; }
  }

  function showOfficialValidation(_url) { const fallback=$('#nfce-captcha-fallback'); if(fallback) fallback.hidden=false; }

  function setStage(name) {
    $$('[data-nfce-stage]').forEach((node) => node.classList.toggle('is-active', node.dataset.nfceStage === name));
    const order = ['scan','review','done'];
    const activeIndex = order.indexOf(name);
    $$('[data-nfce-step-dot]').forEach((node) => node.classList.toggle('is-active', order.indexOf(node.dataset.nfceStepDot) <= activeIndex));
  }

  function openScanner() {
    modal()?.classList.add('is-open');
    modal()?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nfce-lock');
    const pending = loadPending();
    if (pending?.products?.length) { state.receipt = pending; renderReceipt(); }
    else setStage('scan');
    setTimeout(() => $('#nfce-start-camera')?.focus(), 30);
  }

  function closeScanner() {
    stopCamera();
    modal()?.classList.remove('is-open');
    modal()?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nfce-lock');
  }

  function stopCamera() {
    clearTimeout(state.scanTimer);
    state.scanTimer = 0;
    state.stream?.getTracks?.().forEach((track) => track.stop());
    state.stream = null;
    const video = $('#nfce-video');
    if (video) video.srcObject = null;
    $('.nfce-camera-wrap')?.classList.remove('is-live');
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) { setStatus('Este navegador não oferece acesso à câmera. Use uma foto ou cole o link da nota.', true); return; }
    stopCamera();
    setStatus('Abrindo a câmera…');
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 }, advanced:[{ focusMode:'continuous' }] }, audio: false });
      const video = $('#nfce-video');
      video.srcObject = state.stream;
      await video.play();
      $('.nfce-camera-wrap')?.classList.add('is-live');
      setStatus('Centralize o QR Code dentro da moldura.');
      scanVideoFrame();
    } catch (_error) { setStatus('Não foi possível usar a câmera. Autorize o acesso ou escolha uma foto da nota.', true); }
  }

  async function decodeCanvas(canvas) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if ('BarcodeDetector' in window) {
      try {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const result = await detector.detect(canvas);
        if (result[0]?.rawValue) return result[0].rawValue;
      } catch (_error) {}
    }
    if (window.jsQR) {
      const regions = [
        [0,0,canvas.width,canvas.height],
        [canvas.width*.12,canvas.height*.06,canvas.width*.76,canvas.height*.88],
        [canvas.width*.22,canvas.height*.16,canvas.width*.56,canvas.height*.68]
      ];
      for (const [x,y,w,h] of regions) {
        const image = context.getImageData(Math.max(0,Math.round(x)),Math.max(0,Math.round(y)),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));
        const direct = window.jsQR(image.data, image.width, image.height, { inversionAttempts:'attemptBoth' })?.data;
        if (direct) return direct;
        const contrasted = new Uint8ClampedArray(image.data);
        for (let i=0;i<contrasted.length;i+=4) {
          const gray=contrasted[i]*.299+contrasted[i+1]*.587+contrasted[i+2]*.114;
          const value=gray>145?255:0; contrasted[i]=contrasted[i+1]=contrasted[i+2]=value;
        }
        const enhanced = window.jsQR(contrasted, image.width, image.height, { inversionAttempts:'attemptBoth' })?.data;
        if (enhanced) return enhanced;
      }
    }
    return '';
  }

  async function scanVideoFrame() {
    const video = $('#nfce-video');
    const canvas = $('#nfce-canvas');
    if (!state.stream || !video || !canvas) return;
    if (video.readyState >= 2) {
      const max = 1280;
      const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0, canvas.width, canvas.height);
      const value = await decodeCanvas(canvas);
      if (value) { stopCamera(); await readReceipt(value); return; }
    }
    state.scanTimer = window.setTimeout(scanVideoFrame, 260);
  }

  async function readImage(file) {
    if (!file) return;
    setStatus('Procurando o QR Code na imagem…');
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = $('#nfce-canvas');
      const max = 1600;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d', { willReadFrequently: true }).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();
      const value = await decodeCanvas(canvas);
      if (value) await readReceipt(value, file);
      else await readProductsFromPhoto(file);
    } catch (error) { setStatus(error.message || 'Não foi possível ler a imagem.', true); }
    finally { $('#nfce-image-input').value = ''; }
  }

  async function readProductsFromPhoto(file) {
    if (!file) return;
    if (!window.Tesseract?.recognize) throw new Error('O leitor de texto ainda está carregando. Aguarde alguns segundos e fotografe novamente.');
    setStatus('Preparando a leitura privada da nota…');
    const preparedImage = await prepareReceiptImage(file);
    const result = await window.Tesseract.recognize(preparedImage, 'por', {
      logger: ({ status, progress }) => {
        const messages = { 'loading tesseract core':'Preparando o leitor…', 'loading language traineddata':'Carregando o português…', 'initializing api':'Iniciando a CozIA…', 'recognizing text':`Lendo os produtos… ${Math.round((progress || 0) * 100)}%` };
        if (messages[status]) setStatus(messages[status]);
      }
    });
    let text = String(result?.data?.text || '');
    let products = parseOcrProducts(text);
    const expectedItems = estimateReceiptItemCount(text);
    if (products.length < Math.max(7, expectedItems)) {
      setStatus(`Encontrei ${products.length} itens. Fazendo uma segunda conferência…`);
      const second = await window.Tesseract.recognize(preparedImage, 'por', { tessedit_pageseg_mode:'6', preserve_interword_spaces:'1' });
      text += `\n${String(second?.data?.text || '')}`;
      products = parseOcrProducts(text);
    }
    if (!products.length) throw new Error('Não consegui separar os produtos. Fotografe de frente, com boa luz, incluindo do primeiro item até o valor total.');
    const totalMatch = text.match(/VALOR\s+TOTAL(?:\s+R\$)?\s*[:]?\s*([\d.,]+)/i);
    const accessKey = (text.replace(/\s/g,'').match(/\d{44}/) || [])[0] || '';
    const issueDate = text.match(/(?:DATA\s+DE\s+AUTORIZA[CÇ][AÃ]O|EMISS[AÃ]O)\s*[:]?\s*(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/i)?.[1] || text.match(/\b(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(?::\d{2})?)\b/)?.[1] || '';
    const merchantDocument = text.match(/CNPJ\s*[:]?\s*([\d.\/\- ]{14,22})/i)?.[1]?.trim() || '';
    const lines = text.split(/\r?\n/).map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean);
    const merchant = lines.find(line=>/[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]{3}/.test(line) && !/(DOCUMENTO|CODIGO|DESCRI|CONSUMIDOR|CNPJ|VALOR|TOTAL|NFC-E|PROTOCOLO)/i.test(line) && line.length>5 && line.length<100) || 'Estabelecimento lido pela CozIA';
    state.receipt = { state:CUF_STATES[Number(accessKey.slice(0,2))] || state.keyMetadata?.state || '', merchant, merchantDocument:merchantDocument || state.keyMetadata?.merchantDocument || '', issueDate, documentNumber:state.keyMetadata?.documentNumber || '', series:state.keyMetadata?.series || '', accessKey:accessKey || state.keyMetadata?.accessKey || '', total:number(totalMatch?.[1]) || products.reduce((sum, item) => sum + item.total, 0), products, source:'photo-ocr' };
    savePending(state.receipt);
    renderReceipt();
  }

  function estimateReceiptItemCount(text) {
    const lines=String(text||'').split(/\r?\n/);
    const numbered=lines.map(line=>line.match(/^\s*(\d{1,3})\s+/)?.[1]).filter(Boolean).map(Number).filter(value=>value>0&&value<150);
    const unique=[...new Set(numbered)];
    return unique.length ? Math.max(unique.length,Math.min(Math.max(...unique),60)) : 0;
  }

  function parseOcrProducts(text) {
    const units='UN|UM|UND|UNID|KG|KA|G|L|LT|ML|PT|PR|PCT|CX|NX';
    const rawLines=String(text||'').split(/\r?\n/).map(line=>line.replace(/[|¦]/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean);
    const candidates=[];
    rawLines.forEach((line,index)=>{ candidates.push(line); if(index&&line.length<120)candidates.push(`${rawLines[index-1]} ${line}`); });
    const products=[];
    candidates.forEach(line=>{
      if(/(?:DOCUMENTO|DESCRI[CÇ][AÃ]O|VALOR\s+TOTAL|FORMA\s+DE\s+PAGAMENTO|CHAVE\s+DE\s+ACESSO|PROTOCOLO)/i.test(line))return;
      const quantityMatches=[...line.matchAll(new RegExp(`([0-9OIl/,.-]+)\\s*(${units})\\b\\s*(?:[Xx×ÀÁ4]|V[LI]|VL)?`, 'ig'))];
      const quantityUnit=quantityMatches.at(-1);
      if(!quantityUnit)return;
      const after=line.slice((quantityUnit.index||0)+quantityUnit[0].length);
      const prices=[...after.matchAll(/(?:R\$\s*)?(\d{1,5}[.,]\d{2})(?!\d)/g)].map(match=>match[1]);
      if(!prices.length)return;
      const ocrItemNo=line.match(/^\s*(\d{1,3})\s+/)?.[1] || '';
      let prefix=line.slice(0,quantityUnit.index).replace(/^\s*\d{1,3}\s+/, '').replace(/^\s*(?:[%#]\s*)?(?=[0-9A-Z]*\d)[0-9A-Z]{3,18}\s+/i,'').trim();
      prefix=prefix.replace(/^[-:.;]+|[-:.;]+$/g,'').trim();
      if(!/[A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇ]{2}/.test(prefix))return;
      const originalName=receiptProductName(prefix);
      if(originalName.length<2)return;
      const parsedQuantity=number(quantityUnit[1].replace(/[Oo]/g,'0').replace(/[Il]/g,'1'));
      const quantity=parsedQuantity>100?1:Math.max(.001,parsedQuantity||1);
      const unit=String(quantityUnit[2]).toLowerCase().replace(/und|unid|um|nx/,'un').replace(/^ka$/,'kg').replace(/^p[rt]$/,'pct').replace(/^lt$/,'L');
      const total=number(prices.at(-1));
      let unitPrice=number(prices[0]);
      if(prices.length===1&&quantity)unitPrice=total/quantity;
      const analysisName=smartProductName(originalName);
      const name=analysisName&&normalize(analysisName)!==normalize(originalName)?analysisName:originalName;
      const duplicate=products.find(item=>(ocrItemNo&&item.ocrItemNo===ocrItemNo)||(normalize(item.originalName)===normalize(originalName)&&Math.abs(item.total-total)<.011));
      const product={name,originalName,analysisName,quantity,unit,unitPrice,total:total||quantity*unitPrice,category:categoryFor(analysisName||originalName),ocrItemNo};
      if(!duplicate)products.push(product);
      else if(originalName.length<duplicate.originalName.length)Object.assign(duplicate,product);
    });
    return products;
  }

  async function readReceipt(url, fallbackPhoto = null) {
    if (state.busy) return;
    state.busy = true;
    const button = $('#nfce-read-url');
    if (button) button.disabled = true;
    setStatus('A CozIA está conferindo os produtos da nota…');
    try {
      const response = await fetch('/api/nfce/preview', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ url }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.receipt) {
        if (data.code === 'NFCE_HUMAN_VERIFICATION_REQUIRED') {
          showOfficialValidation(data.officialUrl || url);
          if (fallbackPhoto) { await readProductsFromPhoto(fallbackPhoto); return; }
          throw new Error('A consulta por QR foi protegida pela Fazenda. Fotografe os itens para continuar sem sair do Alimente Fácil.');
        }
        throw new Error(data.message || 'Não foi possível consultar a nota.');
      }
      state.receipt = data.receipt;
      state.receipt.products = state.receipt.products.map((item) => { const originalName=receiptProductName(item.originalName || item.name); const analysisName=smartProductName(originalName); return {...item,originalName,analysisName,name:analysisName&&normalize(analysisName)!==normalize(originalName)?analysisName:originalName,category:item.category||categoryFor(analysisName||originalName)}; });
      savePending(state.receipt);
      renderReceipt();
    } catch (error) { setStatus(error.message || 'Não foi possível consultar a nota.', true); }
    finally { state.busy = false; if (button) button.disabled = false; }
  }

  async function readAccessKey() {
    const input = $('#nfce-key-input');
    const key = String(input?.value || '').replace(/\D/g, '');
    if (key.length !== 44) { setStatus('A chave de acesso precisa ter exatamente 44 números.', true); input?.focus(); return; }
    if (state.busy) return;
    state.busy = true; const button = $('#nfce-read-key'); if (button) button.disabled = true;
    setStatus('Consultando a chave no portal oficial…');
    try {
      const response = await fetch('/api/nfce/preview', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ key }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.receipt) { if (data.keyMetadata) state.keyMetadata=data.keyMetadata; if(data.officialUrl)showOfficialValidation(data.officialUrl); throw new Error(data.code==='NFCE_KEY_PORTAL_VERIFICATION'||data.code==='NFCE_HUMAN_VERIFICATION_REQUIRED'?'A Fazenda protegeu esta consulta. Fotografe os itens para continuar no Alimente Fácil.':(data.message||'Não foi possível consultar esta chave.')); }
      state.receipt = data.receipt;
      state.receipt.products = state.receipt.products.map((item) => { const originalName=receiptProductName(item.originalName || item.name); const analysisName=smartProductName(originalName); return {...item,originalName,analysisName,name:analysisName&&normalize(analysisName)!==normalize(originalName)?analysisName:originalName,category:item.category||categoryFor(analysisName||originalName)}; });
      savePending(state.receipt); renderReceipt();
    } catch (error) { setStatus(error.message || 'Não foi possível consultar esta chave.', true); }
    finally { state.busy = false; if (button) button.disabled = false; }
  }

  function savePending(receipt) { try { localStorage.setItem(PENDING_KEY, JSON.stringify(receipt)); } catch (_error) {} }
  function loadPending() { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); } catch (_error) { return null; } }
  function clearPending() { try { localStorage.removeItem(PENDING_KEY); } catch (_error) {} }

  function renderReceipt() {
    const receipt = state.receipt;
    if (!receipt?.products?.length) return;
    stopCamera(); setStage('review');
    $('#nfce-merchant').textContent = receipt.merchant || 'Compra identificada';
    $('#nfce-meta').textContent = [receipt.state || 'NFC-e', receipt.issueDate, receipt.documentNumber ? `Nota ${receipt.documentNumber}` : '', receipt.series ? `Série ${receipt.series}` : '', receipt.accessKey ? `chave final ${receipt.accessKey.slice(-6)}` : ''].filter(Boolean).join(' · ');
    $('#nfce-total').textContent = money(receipt.total);
    $('#nfce-products').innerHTML = receipt.products.map((item, index) => `
      <label class="nfce-product">
        <input class="nfce-product-check" type="checkbox" data-index="${index}" checked aria-label="Selecionar ${escapeHtml(item.name)}">
        <span class="nfce-product-main"><strong>${escapeHtml(item.name)}</strong><small>${Number(item.quantity || 1).toLocaleString('pt-BR')} ${escapeHtml(item.unit || 'un')} · ${money(item.unitPrice)} por unidade</small><small class="nfce-category">${escapeHtml(item.category || 'Mercearia')}</small></span>
        <span class="nfce-product-price"><strong>${money(item.total)}</strong><small>total</small></span>
      </label>`).join('');
    $('#nfce-select-all').checked = true;
    updateSelectedCount();
    $('#nfce-auth-gate').hidden = Boolean(app()?.isLoggedIn);
  }

  function selectedProducts() {
    return $$('.nfce-product-check:checked').map((input) => state.receipt?.products?.[Number(input.dataset.index)]).filter(Boolean);
  }

  function updateSelectedCount() {
    const count = selectedProducts().length;
    $('#nfce-selected-count').textContent = count ? `(${count})` : '';
    $('#nfce-import').disabled = !count;
    const all = $$('.nfce-product-check');
    $('#nfce-select-all').checked = Boolean(all.length && all.every((input) => input.checked));
  }

  async function importToPantry() {
    const currentApp = app();
    if (!currentApp?.isLoggedIn) { state.pendingPantryAfterAuth = true; $('#nfce-auth-gate').hidden = false; return false; }
    const products = selectedProducts();
    if (!products.length) return;
    currentApp.state = currentApp.state || {};
    currentApp.state.despensa = Array.isArray(currentApp.state.despensa) ? currentApp.state.despensa : [];
    currentApp.state.notasFiscais = Array.isArray(currentApp.state.notasFiscais) ? currentApp.state.notasFiscais : [];
    const noteId = currentApp.generateId?.() || `nota-${Date.now()}`;
    const noteProducts = [];
    let added = 0; let merged = 0;
    products.forEach((product) => {
      const key = normalize(product.name);
      const existing = currentApp.state.despensa.find((item) => normalize(item.name) === key && String(item.unid || 'un').toLowerCase() === String(product.unit || 'un').toLowerCase());
      if (existing) {
        existing.qtd = Number(existing.qtd || 0) + Number(product.quantity || 1);
        existing.valor = Number(product.unitPrice || existing.valor || 0);
        existing.stock = 100;
        existing.categoria = existing.categoria || product.category;
        existing.analysisName = product.analysisName || smartProductName(product.name);
        existing.notaIds = Array.isArray(existing.notaIds) ? existing.notaIds : [];
        if (!existing.notaIds.includes(noteId)) existing.notaIds.push(noteId);
        noteProducts.push({ name:product.name, originalName:product.originalName || product.name, quantity:Number(product.quantity || 1), unit:product.unit || 'un', unitPrice:Number(product.unitPrice || 0), total:Number(product.total || 0), category:product.category || 'Mercearia', pantryItemId:existing.id, quantityImported:Number(product.quantity || 1) });
        merged += 1;
      } else {
        const item = { id: currentApp.generateId?.() || `${Date.now()}-${added}`, name: product.name, analysisName:product.analysisName || smartProductName(product.name), qtd:Number(product.quantity || 1), unid:product.unit || 'un', valor:Number(product.unitPrice || 0), stock:100, validade:'', categoria:product.category || 'Mercearia', origem:'NFC-e', ufNota:state.receipt.state || '', notaIds:[noteId] };
        currentApp.state.despensa.push(item);
        noteProducts.push({ name:product.name, originalName:product.originalName || product.name, quantity:Number(product.quantity || 1), unit:product.unit || 'un', unitPrice:Number(product.unitPrice || 0), total:Number(product.total || 0), category:product.category || 'Mercearia', pantryItemId:item.id, quantityImported:Number(product.quantity || 1) });
        added += 1;
      }
    });
    currentApp.state.notasFiscais.unshift({ id:noteId, merchant:state.receipt.merchant || 'Compra identificada', merchantDocument:state.receipt.merchantDocument || '', state:state.receipt.state || '', total:Number(state.receipt.total || 0), issueDate:state.receipt.issueDate || '', documentNumber:state.receipt.documentNumber || '', series:state.receipt.series || '', accessKey:state.receipt.accessKey || '', importedAt:new Date().toISOString(), source:state.receipt.source || 'nfce', products:noteProducts, itemsRemovedAt:null });
    currentApp.state.despensa.sort((a,b) => String(a.categoria || '').localeCompare(String(b.categoria || ''), 'pt-BR') || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
    currentApp.pantrySortMode = 'name_asc';
    currentApp.saveState?.();
    if (currentApp.flushRemoteStateSync) await currentApp.flushRemoteStateSync().catch(() => false);
    clearPending();
    $('#nfce-done-title').textContent = `${products.length} ${products.length === 1 ? 'produto guardado' : 'produtos guardados'}.`;
    $('#nfce-done-copy').textContent = merged ? `A CozIA adicionou ${added} e atualizou ${merged} ${merged === 1 ? 'item repetido' : 'itens repetidos'} na sua despensa.` : 'A CozIA separou sua compra por categoria e deixou a despensa pronta para usar.';
    setStage('done');
    currentApp.showNotification?.('Compra organizada na despensa! ✨', 'success');
    state.pendingPantryAfterAuth = false;
    return true;
  }

  function openAuth(view) {
    const currentApp = app();
    state.pendingPantryAfterAuth = Boolean(state.receipt?.products?.length);
    currentApp?.showAuthModal?.();
    const auth = $('#auth-modal');
    auth?.querySelectorAll('.auth-form-container').forEach((node) => node.classList.remove('active'));
    $(`#${view}`)?.classList.add('active');
    auth?.classList.add('active');
    auth?.style.setProperty('z-index', '42050');
  }

  function resetScanner() {
    stopCamera(); state.receipt = null; state.keyMetadata=null; clearPending(); setStage('scan'); setStatus('Pronto para abrir a câmera.');
  }

  function openPantry() {
    const currentApp = app();
    closeScanner();
    currentApp?.enterAppMode?.();
    currentApp?.activateModuleAndRender?.('despensa');
  }

  function addPantryEntry() {
    const header = $('#module-despensa .card-header .card-actions, #module-despensa .module-actions, #module-despensa .card-header');
    if (!header) return;
    if (!$('.pantry-nfce-btn', header)) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'btn btn-secondary pantry-nfce-btn';
      button.innerHTML = '<i class="fa-solid fa-qrcode"></i><span>Escanear nota</span>';
      button.addEventListener('click', openScanner);
      header.prepend(button);
    }
    if (!$('.pantry-notes-btn', header)) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'btn btn-secondary pantry-notes-btn';
      button.innerHTML = '<i class="fa-solid fa-receipt"></i><span>Minhas notas</span>';
      button.addEventListener('click', openNotes);
      header.prepend(button);
    }
  }

  function persistPantry() {
    const currentApp = app();
    currentApp?.saveState?.();
    currentApp?.flushRemoteStateSync?.().catch(() => false);
    currentApp?.renderDespensa?.();
    setTimeout(addPantryEntry, 0);
  }

  function repairImportedNames() {
    const currentApp = app();
    const pantry = currentApp?.state?.despensa;
    if (!Array.isArray(pantry)) return;
    let changed = false;
    pantry.forEach((item) => {
      if (item?.origem !== 'NFC-e') return;
      const noteProduct = (currentApp.state.notasFiscais || []).flatMap((note) => note.products || []).find((product) => String(product.pantryItemId) === String(item.id));
      const exact = receiptProductName(noteProduct?.originalName || item.name);
      const analysisName = smartProductName(exact);
      const displayName = analysisName && normalize(analysisName) !== normalize(exact) ? analysisName : exact;
      if (displayName && displayName !== item.name) { item.name = displayName; changed = true; }
      if (item.analysisName !== analysisName) { item.analysisName = analysisName; changed = true; }
      item.categoria = item.categoria || categoryFor(analysisName);
    });
    if (!Array.isArray(currentApp.state.notasFiscais)) currentApp.state.notasFiscais = [];
    if (!currentApp.state.notasFiscais.length) {
      const imported = pantry.filter((item) => item?.origem === 'NFC-e');
      if (imported.length) {
        const noteId = `nota-legada-${Date.now()}`;
        imported.forEach((item) => { item.notaIds = [noteId]; });
        currentApp.state.notasFiscais.push({ id:noteId, merchant:'Importacao anterior', state:imported[0]?.ufNota || '', total:imported.reduce((sum,item) => sum + Number(item.qtd || 0) * Number(item.valor || 0), 0), importedAt:new Date().toISOString(), source:'legacy', itemsRemovedAt:null, products:imported.map((item) => ({ name:item.name, originalName:item.name, quantity:Number(item.qtd || 1), quantityImported:Number(item.qtd || 1), unit:item.unid || 'un', unitPrice:Number(item.valor || 0), total:Number(item.qtd || 1) * Number(item.valor || 0), category:item.categoria, pantryItemId:item.id })) });
        changed = true;
      }
    }
    if (changed) persistPantry();
  }

  function closeNotes() { $('#pantry-notes-modal')?.classList.remove('is-open'); $('#pantry-notes-modal')?.setAttribute('aria-hidden','true'); document.body.classList.remove('nfce-lock'); }
  function openNotes() { repairImportedNames(); renderNotes(); $('#pantry-notes-modal')?.classList.add('is-open'); $('#pantry-notes-modal')?.setAttribute('aria-hidden','false'); document.body.classList.add('nfce-lock'); }
  function noteDate(value) { const raw=String(value||''); if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) return raw.slice(0,10); try { const date=new Date(raw); return Number.isNaN(date.getTime())?'':date.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' }); } catch (_error) { return ''; } }

  function renderNotes() {
    const currentApp = app();
    const notes = Array.isArray(currentApp?.state?.notasFiscais) ? currentApp.state.notasFiscais : [];
    const pantry = Array.isArray(currentApp?.state?.despensa) ? currentApp.state.despensa : [];
    const list = $('#pantry-notes-list');
    if (!list) return;
    if (!notes.length) { list.innerHTML = '<div class="pantry-notes-empty"><i class="fa-solid fa-receipt"></i><h3>Nenhuma nota salva ainda</h3><p>As proximas compras importadas aparecerao aqui.</p></div>'; return; }
    list.innerHTML = notes.map((note) => `<article class="pantry-note-card" data-note-id="${escapeHtml(note.id)}"><details><summary><span><small>${escapeHtml(note.state || 'NFC-e')} · ${noteDate(note.issueDate || note.importedAt)}${note.documentNumber ? ` · Nº ${escapeHtml(note.documentNumber)}` : ''}</small><strong>${escapeHtml(note.merchant || 'Compra identificada')}</strong><em>${(note.products || []).length} itens${note.itemsRemovedAt ? ' · itens removidos' : ''}${note.merchantDocument ? ` · ${escapeHtml(note.merchantDocument)}` : ''}</em></span><b>${money(note.total)}</b></summary><div class="pantry-note-products">${(note.products || []).map((product) => { const live = pantry.find((item) => String(item.id) === String(product.pantryItemId)); return `<div class="pantry-note-product"><span><strong>${escapeHtml(live?.name || product.name)}</strong><small>${Number(product.quantity || 1).toLocaleString('pt-BR')} ${escapeHtml(product.unit || 'un')} · ${money(product.total)}</small></span>${live ? `<button type="button" data-note-edit="${escapeHtml(live.id)}" aria-label="Editar ${escapeHtml(live.name)}"><i class="fa-solid fa-pen"></i></button>` : '<small class="pantry-removed-label">Removido</small>'}</div>`; }).join('')}</div><div class="pantry-note-actions"><button type="button" class="pantry-note-generate" data-note-generate-list="${escapeHtml(note.id)}"><i class="fa-solid fa-list-check"></i> Gerar lista com esta nota</button><button type="button" data-note-remove-items="${escapeHtml(note.id)}" ${note.itemsRemovedAt ? 'disabled' : ''}><i class="fa-solid fa-box-open"></i> Excluir itens</button><button type="button" data-note-delete="${escapeHtml(note.id)}"><i class="fa-regular fa-trash-can"></i> Excluir nota</button></div></details></article>`).join('');
  }

  async function generateListFromNote(noteId) {
    const currentApp = app();
    const note = currentApp?.state?.notasFiscais?.find((entry) => String(entry.id) === String(noteId));
    if (!note?.products?.length) { currentApp?.showNotification?.('Esta nota não possui itens disponíveis.', 'info'); return; }
    currentApp.state.listas = currentApp.state.listas || {};
    const listId = currentApp.generateId?.() || `lista-nota-${Date.now()}`;
    currentApp.state.listas[listId] = {
      nome: `Lista · ${String(note.merchant || 'Nota fiscal').trim()}`,
      sourceNoteId: note.id,
      createdAt: new Date().toISOString(),
      items: note.products.map((product, index) => ({
        id: currentApp.generateId?.() || `${Date.now()}-${index}`,
        name: receiptProductName(product.originalName || product.name),
        qtd: Number(product.quantity || 1),
        unid: product.unit || 'un',
        valor: Number(product.unitPrice || 0).toFixed(2),
        checked: false,
        categoria: product.category || categoryFor(product.name)
      }))
    };
    currentApp.activeListId = listId;
    currentApp.saveState?.();
    await currentApp.flushRemoteStateSync?.().catch(() => false);
    closeNotes();
    currentApp.enterAppMode?.();
    currentApp.activateModuleAndRender?.('lista');
    currentApp.renderListas?.();
    currentApp.showNotification?.(`Lista criada com os ${note.products.length} itens da nota.`, 'success');
  }

  function deleteNoteRecord(noteId) {
    const currentApp = app();
    if (!confirm('Excluir apenas este registro de nota? Os produtos continuarao na despensa.')) return;
    currentApp.state.notasFiscais = currentApp.state.notasFiscais.filter((note) => String(note.id) !== String(noteId));
    (currentApp.state.despensa || []).forEach((item) => { item.notaIds = (item.notaIds || []).filter((id) => String(id) !== String(noteId)); });
    persistPantry(); renderNotes(); currentApp.showNotification?.('Nota excluida. Os itens foram mantidos.', 'success');
  }

  function deleteNoteItems(noteId) {
    const currentApp = app();
    const note = currentApp.state.notasFiscais.find((entry) => String(entry.id) === String(noteId));
    if (!note || note.itemsRemovedAt || !confirm('Excluir da despensa os itens importados por esta nota?')) return;
    (note.products || []).forEach((product) => {
      const item = currentApp.state.despensa.find((entry) => String(entry.id) === String(product.pantryItemId));
      if (!item) return;
      item.qtd = Number(item.qtd || 0) - Number(product.quantityImported || product.quantity || 1);
      item.notaIds = (item.notaIds || []).filter((id) => String(id) !== String(noteId));
    });
    currentApp.state.despensa = currentApp.state.despensa.filter((item) => Number(item.qtd || 0) > 0);
    note.itemsRemovedAt = new Date().toISOString();
    persistPantry(); renderNotes(); currentApp.showNotification?.('Itens desta nota removidos da despensa.', 'success');
  }

  function editNoteItem(itemId) {
    const currentApp = app();
    closeNotes();
    const proxy = document.createElement('div'); proxy.dataset.id = itemId;
    currentApp?.handleOpenDespensaEditModal?.(proxy);
  }

  function openPasswordConfirmation() { $('#pantry-password-modal')?.classList.add('is-open'); $('#pantry-password-modal')?.setAttribute('aria-hidden','false'); $('#pantry-password-error').textContent = ''; $('#pantry-confirm-password').value = ''; setTimeout(() => $('#pantry-confirm-password')?.focus(), 30); }
  function closePasswordConfirmation() { $('#pantry-password-modal')?.classList.remove('is-open'); $('#pantry-password-modal')?.setAttribute('aria-hidden','true'); }
  async function emptyPantry(event) {
    event.preventDefault();
    const currentApp = app(); const password = $('#pantry-confirm-password')?.value || ''; const button = $('#pantry-empty-confirm');
    const token = currentApp?.getStoredAuthToken?.();
    if (!token) { $('#pantry-password-error').textContent = 'Sua sessao expirou. Entre novamente.'; return; }
    button.disabled = true; $('#pantry-password-error').textContent = 'Confirmando sua senha...';
    try {
      const response = await fetch('/api/auth/verify-password', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body:JSON.stringify({ password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.verified) throw new Error(result.message || 'Senha incorreta.');
      currentApp.state.despensa = [];
      (currentApp.state.notasFiscais || []).forEach((note) => { note.itemsRemovedAt = note.itemsRemovedAt || new Date().toISOString(); });
      currentApp.saveState?.(); if (currentApp.flushRemoteStateSync) await currentApp.flushRemoteStateSync().catch(() => false);
      currentApp.renderDespensa?.(); closePasswordConfirmation(); closeNotes(); currentApp.showNotification?.('Despensa esvaziada com seguranca.', 'success');
    } catch (error) { $('#pantry-password-error').textContent = error.message || 'Nao foi possivel confirmar sua senha.'; }
    finally { button.disabled = false; }
  }

  window.AF_NFCE_TESTS = { parseOcrProducts, estimateReceiptItemCount, smartProductName };

  document.addEventListener('DOMContentLoaded', () => {
    $$('[data-nfce-open]').forEach((button) => button.addEventListener('click', openScanner));
    $$('[data-nfce-close]').forEach((button) => button.addEventListener('click', closeScanner));
    $$('[data-nfce-rescan]').forEach((button) => button.addEventListener('click', resetScanner));
    $('#nfce-start-camera')?.addEventListener('click', startCamera);
    $('#nfce-image-input')?.addEventListener('change', (event) => readImage(event.target.files?.[0]));
    $('#nfce-read-url')?.addEventListener('click', () => readReceipt($('#nfce-url-input').value));
    $('#nfce-read-key')?.addEventListener('click', readAccessKey);
    $('#nfce-captcha-photo')?.addEventListener('click',()=>$('#nfce-image-input')?.click());
    $('#nfce-key-input')?.addEventListener('input', (event) => { const digits=event.target.value.replace(/\D/g,'').slice(0,44); event.target.value=digits.replace(/(\d{4})(?=\d)/g,'$1 '); });
    $('#nfce-key-input')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); readAccessKey(); } });
    $('#nfce-url-input')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); readReceipt(event.target.value); } });
    $('#nfce-select-all')?.addEventListener('change', (event) => { $$('.nfce-product-check').forEach((input) => { input.checked = event.target.checked; }); updateSelectedCount(); });
    $('#nfce-products')?.addEventListener('change', updateSelectedCount);
    $('#nfce-import')?.addEventListener('click', importToPantry);
    $('#nfce-create-account')?.addEventListener('click', () => openAuth('signup-view'));
    $('#nfce-login')?.addEventListener('click', () => openAuth('login-view'));
    $('#nfce-open-pantry')?.addEventListener('click', openPantry);
    $$('[data-notes-close]').forEach((button) => button.addEventListener('click', closeNotes));
    $$('[data-password-close]').forEach((button) => button.addEventListener('click', closePasswordConfirmation));
    $('#pantry-empty-open')?.addEventListener('click', openPasswordConfirmation);
    $('#pantry-password-form')?.addEventListener('submit', emptyPantry);
    $('#pantry-notes-list')?.addEventListener('click', (event) => {
      const generate = event.target.closest('[data-note-generate-list]'); const edit = event.target.closest('[data-note-edit]'); const remove = event.target.closest('[data-note-remove-items]'); const del = event.target.closest('[data-note-delete]');
      if (generate) generateListFromNote(generate.dataset.noteGenerateList); else if (edit) editNoteItem(edit.dataset.noteEdit); else if (remove) deleteNoteItems(remove.dataset.noteRemoveItems); else if (del) deleteNoteRecord(del.dataset.noteDelete);
    });
    document.addEventListener('af:auth-success', async () => {
      if (!state.pendingPantryAfterAuth || !state.receipt?.products?.length) return;
      const auth = $('#auth-modal');
      auth?.classList.remove('active', 'is-visible', 'is-open');
      auth?.setAttribute('aria-hidden', 'true');
      auth?.style.removeProperty('z-index');
      $('#nfce-auth-gate').hidden = true;
      modal()?.classList.add('is-open');
      modal()?.setAttribute('aria-hidden', 'false');
      document.body.classList.add('nfce-lock');
      await new Promise((resolve) => setTimeout(resolve, 60));
      if (await importToPantry()) openPantry();
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal()?.classList.contains('is-open')) closeScanner(); });
    new MutationObserver(addPantryEntry).observe(document.body, { childList:true, subtree:true });
    addPantryEntry();
    setTimeout(repairImportedNames, 900);
    window.AF_NFCE = { openScanner, openNotes, repairImportedNames };
  });
})();
