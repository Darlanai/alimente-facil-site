(function () {
  'use strict';

  const PENDING_KEY = 'afNfcePendingReceipt_v1';
  const state = { receipt: null, stream: null, scanTimer: 0, busy: false };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
  const normalize = (value) => String(value || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

  function app() { return window.app || null; }
  function modal() { return $('#nfce-modal'); }

  function setStatus(message, error = false) {
    const node = $('#nfce-status');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('is-error', error);
  }

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
      state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
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
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      return window.jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' })?.data || '';
    }
    return '';
  }

  async function scanVideoFrame() {
    const video = $('#nfce-video');
    const canvas = $('#nfce-canvas');
    if (!state.stream || !video || !canvas) return;
    if (video.readyState >= 2) {
      const max = 900;
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
      if (!value) throw new Error('Não encontrei um QR Code legível nessa foto.');
      await readReceipt(value);
    } catch (error) { setStatus(error.message || 'Não foi possível ler a imagem.', true); }
    finally { $('#nfce-image-input').value = ''; }
  }

  async function readReceipt(url) {
    if (state.busy) return;
    state.busy = true;
    const button = $('#nfce-read-url');
    if (button) button.disabled = true;
    setStatus('A CozIA está conferindo os produtos da nota…');
    try {
      const response = await fetch('/api/nfce/preview', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ url }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.receipt) throw new Error(data.message || 'Não foi possível consultar a nota.');
      state.receipt = data.receipt;
      savePending(state.receipt);
      renderReceipt();
    } catch (error) { setStatus(error.message || 'Não foi possível consultar a nota.', true); }
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
    $('#nfce-meta').textContent = `${receipt.state || 'NFC-e'}${receipt.accessKey ? ` · chave final ${receipt.accessKey.slice(-6)}` : ''}`;
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
    if (!currentApp?.isLoggedIn) { $('#nfce-auth-gate').hidden = false; return; }
    const products = selectedProducts();
    if (!products.length) return;
    currentApp.state = currentApp.state || {};
    currentApp.state.despensa = Array.isArray(currentApp.state.despensa) ? currentApp.state.despensa : [];
    let added = 0; let merged = 0;
    products.forEach((product) => {
      const key = normalize(product.name);
      const existing = currentApp.state.despensa.find((item) => normalize(item.name) === key && String(item.unid || 'un').toLowerCase() === String(product.unit || 'un').toLowerCase());
      if (existing) {
        existing.qtd = Number(existing.qtd || 0) + Number(product.quantity || 1);
        existing.valor = Number(product.unitPrice || existing.valor || 0);
        existing.stock = 100;
        existing.categoria = existing.categoria || product.category;
        merged += 1;
      } else {
        currentApp.state.despensa.push({ id: currentApp.generateId?.() || `${Date.now()}-${added}`, name: product.name, qtd:Number(product.quantity || 1), unid:product.unit || 'un', valor:Number(product.unitPrice || 0), stock:100, validade:'', categoria:product.category || 'Mercearia', origem:'NFC-e', ufNota:state.receipt.state || '' });
        added += 1;
      }
    });
    currentApp.state.despensa.sort((a,b) => String(a.categoria || '').localeCompare(String(b.categoria || ''), 'pt-BR') || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
    currentApp.pantrySortMode = 'name_asc';
    currentApp.saveState?.();
    if (currentApp.flushRemoteStateSync) await currentApp.flushRemoteStateSync().catch(() => false);
    clearPending();
    $('#nfce-done-title').textContent = `${products.length} ${products.length === 1 ? 'produto guardado' : 'produtos guardados'}.`;
    $('#nfce-done-copy').textContent = merged ? `A CozIA adicionou ${added} e atualizou ${merged} ${merged === 1 ? 'item repetido' : 'itens repetidos'} na sua despensa.` : 'A CozIA separou sua compra por categoria e deixou a despensa pronta para usar.';
    setStage('done');
    currentApp.showNotification?.('Compra organizada na despensa! ✨', 'success');
  }

  function openAuth(view) {
    const currentApp = app();
    currentApp?.showAuthModal?.();
    const auth = $('#auth-modal');
    auth?.querySelectorAll('.auth-form-container').forEach((node) => node.classList.remove('active'));
    $(`#${view}`)?.classList.add('active');
    auth?.classList.add('active');
    auth?.style.setProperty('z-index', '42050');
  }

  function resetScanner() {
    stopCamera(); state.receipt = null; clearPending(); setStage('scan'); setStatus('Pronto para abrir a câmera.');
  }

  function openPantry() {
    const currentApp = app();
    closeScanner();
    currentApp?.enterAppMode?.();
    currentApp?.activateModuleAndRender?.('despensa');
  }

  function addPantryEntry() {
    const header = $('#module-despensa .card-header .card-actions, #module-despensa .module-actions');
    if (!header || $('.pantry-nfce-btn', header)) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-secondary pantry-nfce-btn';
    button.innerHTML = '<i class="fa-solid fa-qrcode"></i><span>Escanear nota</span>';
    button.addEventListener('click', openScanner);
    header.prepend(button);
  }

  document.addEventListener('DOMContentLoaded', () => {
    $$('[data-nfce-open]').forEach((button) => button.addEventListener('click', openScanner));
    $$('[data-nfce-close]').forEach((button) => button.addEventListener('click', closeScanner));
    $$('[data-nfce-rescan]').forEach((button) => button.addEventListener('click', resetScanner));
    $('#nfce-start-camera')?.addEventListener('click', startCamera);
    $('#nfce-image-input')?.addEventListener('change', (event) => readImage(event.target.files?.[0]));
    $('#nfce-read-url')?.addEventListener('click', () => readReceipt($('#nfce-url-input').value));
    $('#nfce-url-input')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); readReceipt(event.target.value); } });
    $('#nfce-select-all')?.addEventListener('change', (event) => { $$('.nfce-product-check').forEach((input) => { input.checked = event.target.checked; }); updateSelectedCount(); });
    $('#nfce-products')?.addEventListener('change', updateSelectedCount);
    $('#nfce-import')?.addEventListener('click', importToPantry);
    $('#nfce-create-account')?.addEventListener('click', () => openAuth('signup-view'));
    $('#nfce-login')?.addEventListener('click', () => openAuth('login-view'));
    $('#nfce-open-pantry')?.addEventListener('click', openPantry);
    document.addEventListener('af:auth-success', () => { if (state.receipt?.products?.length) { $('#nfce-auth-gate').hidden = true; modal()?.classList.add('is-open'); document.body.classList.add('nfce-lock'); } });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal()?.classList.contains('is-open')) closeScanner(); });
    new MutationObserver(addPantryEntry).observe(document.body, { childList:true, subtree:true });
    addPantryEntry();
  });
})();
