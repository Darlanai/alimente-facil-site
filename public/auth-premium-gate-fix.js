(function (global, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory;
  } else {
    global.installAlimentePremiumGateFix = factory;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function installAlimentePremiumGateFix(app, env) {
  env = env || {};
  const windowRef = env.window || (typeof window !== 'undefined' ? window : null);
  const documentRef = env.document || (typeof document !== 'undefined' ? document : null);
  const storage = env.storage || (windowRef ? windowRef.localStorage : null);
  const fetchImpl = env.fetch || (windowRef ? windowRef.fetch.bind(windowRef) : null);

  if (!app) throw new Error('window.app não encontrado.');
  if (!documentRef) throw new Error('document não encontrado.');
  if (!storage) throw new Error('localStorage não encontrado.');
  if (!fetchImpl) throw new Error('fetch não encontrado.');
  if (app.__premiumGateFixInstalled) return app;

  const AUTH_TOKEN_KEY = 'alimenteFacilAuthToken';
  const AUTH_USER_KEY = 'alimenteFacilAuthUser';
  const PREMIUM_PLAN = 'premium';
  const BASIC_PLAN = 'basic';
  const PANEL_ROOT_SELECTOR = '.app-panel-container-standalone';
  const ALLOWED_PANEL_SELECTOR = '#logout-btn, #payment-gate-modal, #payment-gate-modal *, [data-action="close-payment-gate"], [data-action="go-checkout"], .nav-item[data-module="configuracoes"], .nav-item[data-module="configuracoes"] *, [data-module-target="configuracoes"], [data-module-target="configuracoes"] *, #module-configuracoes, #module-configuracoes *, #config-detail-desktop, #config-detail-desktop *, #config-save-profile-btn, #config-save-profile-btn *, #config-open-forgot-password-btn, #config-open-forgot-password-btn *, #config-open-forgot-password-btn-modal, #config-open-forgot-password-btn-modal *, #config-delete-account-btn, #config-delete-account-btn *, #config-delete-account-btn-modal, #config-delete-account-btn-modal *, #detail-modal-body #config-name-modal, #detail-modal-body #config-email-modal, #detail-modal-body #config-password-modal, #detail-modal-body #config-name-modal *, #detail-modal-body #config-email-modal *, #detail-modal-body #config-password-modal *';

  const originalShowNotification = typeof app.showNotification === 'function' ? app.showNotification.bind(app) : function () {};
  const originalCloseAllModals = typeof app.closeAllModals === 'function' ? app.closeAllModals.bind(app) : function () {};
  const originalSaveState = typeof app.saveState === 'function' ? app.saveState.bind(app) : function () {};

  const state = {
    refreshing: false,
    lastRefreshAt: 0,
    sessionPayload: null,
    trialWatchTimer: null,
    appStateReadyUserId: '',
    appStateLoadingUserId: '',
    appStateLoadPromise: null,
    appStateSaveTimer: null,
    appStateSavePromise: null,
    pendingAppStateSnapshot: null
  };

  function getToken() {
    return String(storage.getItem(AUTH_TOKEN_KEY) || '').trim();
  }

  function setSession(token, user) {
    if (token) storage.setItem(AUTH_TOKEN_KEY, token);
    if (user) storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    storage.removeItem(AUTH_TOKEN_KEY);
    storage.removeItem(AUTH_USER_KEY);
  }

  function fullUrl(url) {
    if (/^https?:/i.test(url)) return url;
    const origin = env.origin || (windowRef && windowRef.location ? windowRef.location.origin : 'http://localhost:3000');
    return `${origin}${url}`;
  }

  async function apiFetchJson(url, options) {
    const response = await fetchImpl(fullUrl(url), Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, options || {}));
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      const error = new Error(data && data.message ? data.message : 'Erro na comunicação com o servidor.');
      error.status = response.status;
      error.payload = data;
      throw error;
    }
    return data;
  }

  function cloneJson(value, fallback) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_error) { return fallback; }
  }

  function currentUserId() {
    return String(app.state?.user?.id || state.sessionPayload?.user?.id || '').trim();
  }

  function normalizePanelData(data, user) {
    const base = cloneJson(app.defaultState || {}, {});
    const incoming = data && typeof data === 'object' && !Array.isArray(data) ? cloneJson(data, {}) : {};
    const merged = Object.assign(base, incoming);

    merged.listas = incoming.listas && typeof incoming.listas === 'object' ? incoming.listas : (base.listas || {});
    merged.despensa = Array.isArray(incoming.despensa) ? incoming.despensa : (base.despensa || []);
    merged.essenciais = Array.isArray(incoming.essenciais) ? incoming.essenciais : (base.essenciais || []);
    merged.orcamento = incoming.orcamento && typeof incoming.orcamento === 'object' ? incoming.orcamento : (base.orcamento || { total: 500 });
    merged.receitas = incoming.receitas && typeof incoming.receitas === 'object' ? incoming.receitas : (base.receitas || {});
    merged.planejador = incoming.planejador && typeof incoming.planejador === 'object' ? incoming.planejador : (base.planejador || {});
    merged.aiUsage = incoming.aiUsage && typeof incoming.aiUsage === 'object' ? incoming.aiUsage : (base.aiUsage || {});

    if (!merged.listas.listaDaSemana && app.defaultState?.listas?.listaDaSemana) {
      merged.listas.listaDaSemana = cloneJson(app.defaultState.listas.listaDaSemana, {});
    }

    const authUser = user || state.sessionPayload?.user || {};
    merged.user = {
      nome: authUser.name || authUser.nome || incoming.user?.nome || 'Usuário',
      email: authUser.email || incoming.user?.email || '',
      id: authUser.id || incoming.user?.id || ''
    };
    return merged;
  }

  function buildPortableAppState() {
    const data = cloneJson(app.state || {}, {});
    if (data && typeof data === 'object') delete data.user;
    return {
      schemaVersion: 1,
      activeModule: app.activeModule || 'inicio',
      activeListId: app.activeListId || 'listaDaSemana',
      listSortMode: app.listSortMode || 'date_desc',
      data
    };
  }

  function saveLocalStateOnly() {
    try { originalSaveState(); } catch (error) { console.error('Erro ao salvar estado local:', error); }
  }

  function canSaveRemoteAppState() {
    const userId = currentUserId();
    return Boolean(
      userId &&
      getToken() &&
      app.isLoggedIn &&
      state.appStateReadyUserId === userId &&
      state.appStateLoadingUserId !== userId
    );
  }

  async function startRemoteAppStateSave(snapshot, keepalive) {
    const token = getToken();
    if (!token || !snapshot || !canSaveRemoteAppState()) return null;
    return apiFetchJson('/api/app-state', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ state: snapshot }),
      keepalive: Boolean(keepalive)
    });
  }

  async function drainRemoteAppStateSaves(keepalive) {
    if (state.appStateSavePromise) {
      try { await state.appStateSavePromise; } catch (_error) {}
    }

    while (state.pendingAppStateSnapshot && canSaveRemoteAppState()) {
      const snapshot = state.pendingAppStateSnapshot;
      state.pendingAppStateSnapshot = null;
      state.appStateSavePromise = startRemoteAppStateSave(snapshot, keepalive);
      try {
        await state.appStateSavePromise;
      } catch (error) {
        state.pendingAppStateSnapshot = snapshot;
        console.error('Erro ao sincronizar dados do painel:', error);
        throw error;
      } finally {
        state.appStateSavePromise = null;
      }
    }
    return true;
  }

  function scheduleRemoteAppStateSave() {
    if (!canSaveRemoteAppState()) return;
    state.pendingAppStateSnapshot = buildPortableAppState();
    if (state.appStateSaveTimer && windowRef?.clearTimeout) windowRef.clearTimeout(state.appStateSaveTimer);
    if (!windowRef?.setTimeout) return;
    state.appStateSaveTimer = windowRef.setTimeout(function () {
      state.appStateSaveTimer = null;
      drainRemoteAppStateSaves(false).catch(function () { return null; });
    }, 350);
  }

  async function flushRemoteAppState(keepalive) {
    if (!canSaveRemoteAppState()) return true;
    if (state.appStateSaveTimer && windowRef?.clearTimeout) {
      windowRef.clearTimeout(state.appStateSaveTimer);
      state.appStateSaveTimer = null;
    }
    state.pendingAppStateSnapshot = buildPortableAppState();
    try {
      await drainRemoteAppStateSaves(keepalive);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function renderRestoredPanelState() {
    if (!app.isAppMode) return;
    try {
      if (typeof app.activateModuleUI === 'function') app.activateModuleUI(app.activeModule || 'inicio');
      if (typeof app.renderAllPanelContent === 'function') app.renderAllPanelContent();
    } catch (error) {
      console.error('Erro ao renderizar estado restaurado:', error);
    }
  }

  async function syncAppStateFromServer(user) {
    const authUser = user || state.sessionPayload?.user || {};
    const userId = String(authUser.id || '').trim();
    const token = getToken();
    if (!userId || !token) return null;
    if (state.appStateReadyUserId === userId) return app.state;
    if (state.appStateLoadingUserId === userId && state.appStateLoadPromise) return state.appStateLoadPromise;

    state.appStateLoadingUserId = userId;
    state.appStateLoadPromise = (async function () {
      try {
        const response = await apiFetchJson('/api/app-state', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response?.state?.data && typeof response.state.data === 'object') {
          app.state = normalizePanelData(response.state.data, authUser);
          app.activeModule = response.state.activeModule || 'inicio';
          app.activeListId = response.state.activeListId || 'listaDaSemana';
          app.listSortMode = response.state.listSortMode || app.listSortMode || 'date_desc';
          if (!app.state.listas?.[app.activeListId]) app.activeListId = 'listaDaSemana';
        } else {
          // Primeira sincronização desta conta: migra o estado local atual para o perfil.
          app.state = normalizePanelData(app.state, authUser);
        }

        state.appStateReadyUserId = userId;
        saveLocalStateOnly();
        saveLegacyVisualState();

        if (!response?.state) {
          // Libera o primeiro PUT da migração sem esperar o finally do carregamento.
          state.appStateLoadingUserId = '';
          await flushRemoteAppState(false);
        }

        renderRestoredPanelState();
        return app.state;
      } catch (error) {
        console.error('Erro ao carregar dados persistentes do painel:', error);
        // Mantém a experiência local em caso de indisponibilidade temporária do banco,
        // mas não marca a conta como pronta para evitar sobrescrever dados remotos às cegas.
        app.state = normalizePanelData(app.state, authUser);
        saveLocalStateOnly();
        return app.state;
      } finally {
        state.appStateLoadingUserId = '';
        state.appStateLoadPromise = null;
      }
    })();

    return state.appStateLoadPromise;
  }

  app.saveState = function saveStateWithAccountSync() {
    saveLocalStateOnly();
    scheduleRemoteAppStateSave();
  };

  app.syncAppStateFromServer = syncAppStateFromServer;
  app.flushRemoteAppState = flushRemoteAppState;

  function getCheckoutUrl(payload) {
    return payload?.subscription?.checkoutUrl || payload?.checkoutUrl || app.checkoutLinks?.premium || '';
  }

  function isTrialActivePayload(payload) {
    const plan = String(payload?.subscription?.plan || '').toLowerCase();
    const status = String(payload?.subscription?.status || '').toLowerCase();
    if (plan !== PREMIUM_PLAN || status !== 'trialing') return false;
    const rawEnd = payload?.subscription?.trialEnd;
    if (!rawEnd) return payload?.access?.canPerformActions === true;
    const trialEnd = new Date(rawEnd).getTime();
    return Number.isFinite(trialEnd) && Date.now() < trialEnd;
  }
  function isPremiumPayload(payload) {
    const plan = String(payload?.subscription?.plan || '').toLowerCase();
    const status = String(payload?.subscription?.status || '').toLowerCase();
    if (plan === PREMIUM_PLAN && status === 'active') return true;
    if (isTrialActivePayload(payload)) return true;
    return payload?.access?.canPerformActions === true && status !== 'trial_expired';
  }
  function trialStatusMessage(payload) {
    const remaining = Number(payload?.subscription?.trialDaysRemaining || 0);
    const dayText = remaining === 1 ? '1 dia completo' : `${Math.max(remaining, 1)} dias completos`;
    return `Seu teste grátis está ativo por mais ${dayText}. O pagamento só será solicitado a partir do 8º dia.`;
  }

  function clearInlineErrors() {
    documentRef.querySelectorAll('.auth-feedback-message').forEach(function (node) { node.remove(); });
  }

  function showInlineError(formId, message, kind) {
    const form = documentRef.getElementById(formId);
    if (!form) return;
    form.querySelectorAll('.auth-feedback-message').forEach(function (node) { node.remove(); });
    const box = documentRef.createElement('div');
    box.className = 'auth-feedback-message';
    box.style.marginTop = '12px';
    box.style.padding = '10px 12px';
    box.style.borderRadius = '12px';
    if (kind === 'success') {
      box.style.border = '1px solid rgba(52,199,89,.35)';
      box.style.background = 'rgba(52,199,89,.12)';
    } else {
      box.style.border = '1px solid rgba(255,59,48,.35)';
      box.style.background = 'rgba(255,59,48,.12)';
    }
    box.style.color = '#fff';
    box.textContent = message;
    form.appendChild(box);
  }

  function closePaymentGateModal() {
    const existing = documentRef.getElementById('payment-gate-modal');
    if (existing && typeof existing.remove === 'function') existing.remove();
  }

  function isTrialExpiredPayload(payload) {
    const status = String(payload?.subscription?.status || '').toLowerCase();
    const reason = String(payload?.access?.reason || '').toLowerCase();
    const rawEnd = payload?.subscription?.trialEnd;
    const endReached = status === 'trialing' && rawEnd && Date.now() >= new Date(rawEnd).getTime();
    return Boolean(payload?.subscription?.trialExpired || status === 'trial_expired' || reason === 'trial_expired' || endReached);
  }

  function showPaymentGateModal(payload) {
    closePaymentGateModal();
    const source = payload && Object.keys(payload).length ? payload : (state.sessionPayload || payload || {});
    if (isTrialActivePayload(source)) return false;
    const expired = isTrialExpiredPayload(source);
    const checkoutUrl = getCheckoutUrl(source);
    const title = source?.title || (expired ? 'Seus 7 dias grátis terminaram' : 'Ative seu Premium');
    const message = source?.message || (expired
      ? 'Seu teste sem cartão chegou ao fim. Seus dados continuam salvos: assine por R$ 9,90 por mês para voltar ao painel completo.'
      : 'Assine o Premium por R$ 9,90 por mês para liberar o painel completo. Cancele quando quiser.');
    const primaryLabel = expired ? 'ASSINAR POR R$ 9,90/MÊS' : 'ASSINAR PREMIUM';

    const overlay = documentRef.createElement('div');
    overlay.id = 'payment-gate-modal';
    overlay.className = 'modal-overlay is-visible';
    overlay.style.zIndex = '30000';
    overlay.innerHTML = [
      '<div class="modal-box af-payment-gate-box" style="max-width:560px; width:min(92vw,560px);">',
      '  <button type="button" class="close-modal-btn" data-action="close-payment-gate" aria-label="Fechar">×</button>',
      '  <div class="modal-header"><h3 style="margin:0;">' + title + '</h3></div>',
      '  <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">',
      '    <p style="margin:0; color:var(--glass-text-primary); line-height:1.55;">' + message + '</p>',
      '    <div class="af-payment-gate-points" style="display:grid; gap:8px; padding:12px; border:1px solid rgba(255,255,255,.12); border-radius:16px; background:rgba(255,255,255,.04);">',
      '      <div style="font-weight:700; color:#fff;">' + (expired ? 'Seus dados permanecem salvos' : 'Painel completo') + '</div>',
      '      <div style="color:#fff; opacity:.92;">R$ 9,90 por mês</div>',
      '      <div style="color:#fff; opacity:.92;">Cancele quando quiser</div>',
      '    </div>',
      '    <div style="display:flex; gap:10px; flex-wrap:wrap;">',
      '      <button type="button" class="btn btn-primary" data-action="go-checkout" style="flex:1; min-width:190px;">' + primaryLabel + '</button>',
      '      <button type="button" class="btn btn-secondary" data-action="close-payment-gate" style="flex:1; min-width:140px;">Agora não</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    overlay.addEventListener('click', function (event) {
      const target = event.target;
      if (target === overlay || (target && target.closest && target.closest('[data-action="close-payment-gate"]'))) {
        closePaymentGateModal();
        return;
      }
      if (target && target.closest && target.closest('[data-action="go-checkout"]')) {
        if (!checkoutUrl) {
          originalShowNotification('Link do Mercado Pago não encontrado.', 'error');
          return;
        }
        windowRef.location.href = checkoutUrl;
      }
    });

    documentRef.body.appendChild(overlay);
  }

  function saveLegacyVisualState() {
    try {
      const raw = storage.getItem('alimenteFacilState_vFinal');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      parsed.isLoggedIn = Boolean(app.isLoggedIn);
      parsed.userPlan = app.userPlan || 'free';
      parsed.isAppMode = Boolean(app.isAppMode);
      parsed.activeModule = app.activeModule || 'inicio';
      parsed.data = parsed.data || {};
      parsed.data.user = Object.assign({}, parsed.data.user || {}, app.state?.user || {});
      storage.setItem('alimenteFacilState_vFinal', JSON.stringify(parsed));
    } catch (_error) {}
  }

  function rawEnterPanelHome() {
    app.activeModule = 'inicio';
    app.isAppMode = true;
    if (typeof app.clearIntervals === 'function') app.clearIntervals();
    if (typeof app.setVideoPlayback === 'function') {
      app.setVideoPlayback('landing-video-container', false);
      app.setVideoPlayback('panel-video-container', true);
    }
    if (typeof app.updateBodyClasses === 'function') app.updateBodyClasses();
    if (typeof app.activateModuleUI === 'function') app.activateModuleUI('inicio');
    if (typeof app.renderAllPanelContent === 'function') app.renderAllPanelContent();
    if (typeof app.saveState === 'function') app.saveState();
    saveLegacyVisualState();
    if (windowRef && typeof windowRef.scrollTo === 'function') windowRef.scrollTo(0, 0);
  }

  function rawExitToLanding() {
    if (typeof app.clearIntervals === 'function') app.clearIntervals();
    app.isAppMode = false;
    if (typeof app.updateBodyClasses === 'function') app.updateBodyClasses();
    if (typeof app.closeSidebar === 'function') app.closeSidebar();
    if (typeof app.setVideoPlayback === 'function') {
      app.setVideoPlayback('panel-video-container', false);
      app.setVideoPlayback('landing-video-container', true);
    }
    if (typeof app.saveState === 'function') app.saveState();
    saveLegacyVisualState();
    if (windowRef && typeof windowRef.scrollTo === 'function') windowRef.scrollTo(0, 0);
    if (typeof app.initLandingPage === 'function') app.initLandingPage();
  }

  function applySessionPayload(payload) {
    const previousUserId = String(app.state?.user?.id || '').trim();
    const nextUserId = String(payload?.user?.id || '').trim();

    if (previousUserId && nextUserId && previousUserId !== nextUserId) {
      app.state = cloneJson(app.defaultState || {}, {});
      state.appStateReadyUserId = '';
      state.pendingAppStateSnapshot = null;
    }

    state.sessionPayload = payload || null;
    app.backendSessionPayload = payload || null;
    const user = payload?.user || {};
    app.state = app.state || cloneJson(app.defaultState || {}, {});
    app.state.user = app.state.user || {};
    app.state.user.nome = user.name || user.nome || app.state.user.nome || 'Usuário';
    app.state.user.email = user.email || app.state.user.email || '';
    app.state.user.id = user.id || app.state.user.id || '';
    app.isLoggedIn = true;
    app.userPlan = isPremiumPayload(payload) ? PREMIUM_PLAN : BASIC_PLAN;
    if (typeof app.updateStartButton === 'function') app.updateStartButton();
    if (typeof app.saveState === 'function') app.saveState();
    saveLegacyVisualState();
    return app.userPlan;
  }

  function forceLogoutToLanding() {
    clearSession();
    if (state.appStateSaveTimer && windowRef?.clearTimeout) windowRef.clearTimeout(state.appStateSaveTimer);
    state.appStateSaveTimer = null;
    state.pendingAppStateSnapshot = null;
    state.appStateReadyUserId = '';
    state.appStateLoadingUserId = '';
    app.isLoggedIn = false;
    app.userPlan = 'free';
    app.isAppMode = false;
    app.activeModule = 'inicio';
    if (app.defaultState) {
      app.state = JSON.parse(JSON.stringify(app.defaultState));
      app.state.user = { nome: null, email: '', id: '' };
    }
    if (typeof app.updateStartButton === 'function') app.updateStartButton();
    if (typeof app.saveState === 'function') app.saveState();
    saveLegacyVisualState();
    rawExitToLanding();
  }

  function isAllowedPanelInteraction(target) {
    if (!target || !target.closest) return false;
    return Boolean(target.closest(ALLOWED_PANEL_SELECTOR));
  }

  function isInsidePanel(target) {
    return Boolean(target && target.closest && target.closest(PANEL_ROOT_SELECTOR));
  }

  function isBasicLoggedIn() {
    return Boolean(app.isLoggedIn && app.userPlan !== PREMIUM_PLAN);
  }

  async function refreshAccessFromServer(force) {
    const token = getToken();
    if (!token) return null;
    const now = Date.now();
    if (!force && state.refreshing) return null;
    if (!force && now - state.lastRefreshAt < 1200) return null;
    state.refreshing = true;
    state.lastRefreshAt = now;
    try {
      const payload = await apiFetchJson('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const plan = applySessionPayload(payload);
      await syncAppStateFromServer(payload?.user);
      if (plan === PREMIUM_PLAN) {
        closePaymentGateModal();
      } else if (isTrialExpiredPayload(payload)) {
        if (app.isAppMode) rawExitToLanding();
        windowRef.setTimeout(function () { showPaymentGateModal(payload); }, 40);
      }
      return payload;
    } catch (error) {
      forceLogoutToLanding();
      throw error;
    } finally {
      state.refreshing = false;
    }
  }

  async function handleMercadoPagoReturn() {
    if (!windowRef || !windowRef.location || !windowRef.history) return;
    const url = new URL(windowRef.location.href);
    const preapprovalId = url.searchParams.get('preapproval_id') || url.searchParams.get('preapprovalId') || url.searchParams.get('subscription_id') || url.searchParams.get('id') || '';
    const hasToken = Boolean(getToken());
    if (!hasToken) return;

    try {
      if (preapprovalId) {
        const payload = await apiFetchJson('/api/billing/confirm-premium', {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ preapprovalId })
        });
        setSession(payload.token || getToken(), payload.user);
        const plan = applySessionPayload(payload);
        await syncAppStateFromServer(payload?.user);
        if (plan === PREMIUM_PLAN) {
          closePaymentGateModal();
          rawEnterPanelHome();
          originalShowNotification('Premium ativado com sucesso! ✨', 'success');
        } else {
          rawEnterPanelHome();
          windowRef.setTimeout(function () { showPaymentGateModal(payload); }, 30);
        }
      } else {
        await refreshAccessFromServer(true).catch(function () { return null; });
      }
    } finally {
      ['preapproval_id', 'preapprovalId', 'subscription_id', 'id', 'status', 'collection_id', 'collection_status', 'payment_id', 'external_reference', 'merchant_order_id', 'preference_id'].forEach(function (key) {
        url.searchParams.delete(key);
      });
      windowRef.history.replaceState({}, documentRef.title, url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '') + url.hash);
    }
  }

  async function handleForgotPasswordRequest() {
    clearInlineErrors();
    const email = String(documentRef.getElementById('forgot-email')?.value || '').trim();
    if (!email) {
      showInlineError('forgot-password-form', 'Informe seu e-mail.', 'error');
      return;
    }
    try {
      const payload = await apiFetchJson('/api/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      showInlineError('forgot-password-form', payload?.message || 'Se o e-mail existir, você receberá um link para redefinir sua senha.', 'success');
      originalShowNotification(payload?.message || 'Verifique seu e-mail para redefinir sua senha.', 'success');
    } catch (error) {
      showInlineError('forgot-password-form', error?.payload?.message || error.message || 'Não foi possível iniciar a redefinição da senha.', 'error');
    }
  }

  function switchAuthView(viewId) {
    documentRef.querySelectorAll('#auth-modal .auth-form-container').forEach(function (node) {
      node.classList.remove('active');
    });
    const target = documentRef.getElementById(viewId);
    if (target) target.classList.add('active');
  }

  app.apiFetchJson = apiFetchJson;
  app.getStoredAuthToken = getToken;
  app.setStoredAuthSession = setSession;
  app.clearStoredAuthSession = clearSession;
  app.showPaymentGateModal = showPaymentGateModal;
  app.closePaymentGateModal = closePaymentGateModal;
  app.refreshAccessFromServer = refreshAccessFromServer;
  app.handleMercadoPagoReturn = handleMercadoPagoReturn;
  app.forceLoggedOutLanding = forceLogoutToLanding;
  app.isTrialActiveSession = function () { return isTrialActivePayload(state.sessionPayload); };
  app.getBackendSessionPayload = function () { return state.sessionPayload; };
  const originalShowPlansModal = typeof app.showPlansModal === 'function' ? app.showPlansModal.bind(app) : null;
  app.showPlansModal = function showPlansModalDuringTrial(customMessage) {
    if (isTrialActivePayload(state.sessionPayload)) { originalShowNotification(trialStatusMessage(state.sessionPayload), 'success'); return; }
    if (originalShowPlansModal) return originalShowPlansModal(customMessage);
    if (typeof app.openModal === 'function') return app.openModal('plans-modal');
  };
  app.handleRealSubscription = function handleRealSubscriptionAfterTrial(planId) {
    if (planId !== PREMIUM_PLAN) return;
    if (!getToken()) { if (typeof app.showAuthModal === 'function') app.showAuthModal(); return; }
    if (isTrialActivePayload(state.sessionPayload)) {
      closePaymentGateModal(); if (typeof app.closeModal === 'function') app.closeModal('plans-modal');
      originalShowNotification(trialStatusMessage(state.sessionPayload), 'success'); return;
    }
    showPaymentGateModal(state.sessionPayload || {});
  };

  app.handleLogin = async function handleLogin() {
    clearInlineErrors();
    const email = String(documentRef.getElementById('login-email')?.value || '').trim();
    const password = String(documentRef.getElementById('login-password')?.value || '');
    if (!email || !password) {
      showInlineError('login-form', 'Informe e-mail e senha.', 'error');
      return;
    }
    try {
      const payload = await apiFetchJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setSession(payload.token, payload.user);
      const plan = applySessionPayload(payload);
      await syncAppStateFromServer(payload?.user);
      originalCloseAllModals();
      if (plan === PREMIUM_PLAN) {
        rawEnterPanelHome();
        originalShowNotification('Login premium realizado com sucesso.', 'success');
      } else {
        rawExitToLanding();
        windowRef.setTimeout(function () { showPaymentGateModal(payload); }, 60);
        originalShowNotification(isTrialExpiredPayload(payload) ? 'Seu teste grátis terminou.' : 'O acesso completo exige Premium.', 'info');
      }
    } catch (error) {
      showInlineError('login-form', error?.payload?.message || error.message || 'Não foi possível fazer login.', 'error');
    }
  };

  app.handleSignup = async function handleSignup() {
    clearInlineErrors();
    const name = String(documentRef.getElementById('signup-name')?.value || '').trim();
    const email = String(documentRef.getElementById('signup-email')?.value || '').trim();
    const password = String(documentRef.getElementById('signup-password')?.value || '');
    const acceptedTerms = Boolean(documentRef.getElementById('signup-terms')?.checked);
    if (!name || !email || !password) {
      showInlineError('signup-form', 'Preencha nome, e-mail e senha.', 'error');
      return;
    }
    if (!acceptedTerms) {
      showInlineError('signup-form', 'Você precisa aceitar os Termos de Uso e a Política de Privacidade.', 'error');
      return;
    }
    try {
      const payload = await apiFetchJson('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, acceptedTerms })
      });
      setSession(payload.token, payload.user);
      const plan = applySessionPayload(payload);
      await syncAppStateFromServer(payload?.user);
      originalCloseAllModals();
      if (plan === PREMIUM_PLAN) {
        rawEnterPanelHome();
        originalShowNotification('Cadastro concluído: painel completo liberado por 7 dias sem cartão. O pagamento só aparece no 8º dia. ✨', 'success');
      } else {
        rawExitToLanding();
        windowRef.setTimeout(function () { showPaymentGateModal(payload); }, 60);
      }
    } catch (error) {
      showInlineError('signup-form', error?.payload?.message || error.message || 'Não foi possível concluir o cadastro.', 'error');
    }
  };

  app.handleLogout = async function handleLogout() {
    await flushRemoteAppState(false);
    forceLogoutToLanding();
    originalShowNotification('Você saiu da sua conta.', 'info');
  };

  app.enterAppMode = function enterAppMode() {
    if (app.userPlan === PREMIUM_PLAN) {
      return rawEnterPanelHome();
    }
    rawEnterPanelHome();
    windowRef.setTimeout(function () { showPaymentGateModal({}); }, 40);
  };

  app.activateModuleAndRender = function activateModuleAndRender(moduleKey) {
    if (app.userPlan === PREMIUM_PLAN || moduleKey === 'configuracoes') {
      app.activeModule = moduleKey || 'inicio';

      if (typeof app.activateModuleUI === 'function') {
        app.activateModuleUI(app.activeModule);
      }

      if (typeof app.renderModuleContent === 'function') {
        app.renderModuleContent(app.activeModule);
      } else if (typeof app.renderAllPanelContent === 'function') {
        app.renderAllPanelContent();
      }

      if (typeof app.closeSidebar === 'function') {
        app.closeSidebar();
      }

      if (typeof app.saveState === 'function') {
        app.saveState();
      }

      saveLegacyVisualState();
      return;
    }

    app.activeModule = 'inicio';
    rawEnterPanelHome();

    if (moduleKey && moduleKey !== 'inicio' && moduleKey !== 'configuracoes') {
      windowRef.setTimeout(function () { showPaymentGateModal({}); }, 20);
    }
  };

  app.handleStartButtonClick = async function handleStartButtonClick() {
    const token = getToken();
    if (!token) {
      if (typeof app.showAuthModal === 'function') app.showAuthModal();
      return;
    }
    try {
      const payload = await refreshAccessFromServer(true);
      if (!payload) {
        if (typeof app.showAuthModal === 'function') app.showAuthModal();
        return;
      }
      if (isPremiumPayload(payload)) {
        rawEnterPanelHome();
      } else if (isTrialExpiredPayload(payload) || payload?.subscription?.paymentRequired) {
        rawEnterPanelHome(); windowRef.setTimeout(function () { showPaymentGateModal(payload); }, 40);
      } else { rawEnterPanelHome(); }
    } catch (_error) {
      if (typeof app.showAuthModal === 'function') app.showAuthModal();
    }
  };

  app.restoreBackendSession = async function restoreBackendSession() {
    const token = getToken();
    if (!token) {
      forceLogoutToLanding();
      return;
    }
    try {
      const payload = await refreshAccessFromServer(true);
      if (!payload) return;
      if (isPremiumPayload(payload)) {
        if (app.isAppMode) rawEnterPanelHome();
      } else if (app.isAppMode) {
        rawEnterPanelHome();
      }
    } catch (_error) {
      forceLogoutToLanding();
    }
  };

  function bindAuthForms() {
    const loginForm = documentRef.getElementById('login-form');
    const signupForm = documentRef.getElementById('signup-form');
    const forgotForm = documentRef.getElementById('forgot-password-form');
    if (loginForm && loginForm.dataset.premiumGateBind !== '1') {
      loginForm.dataset.premiumGateBind = '1';
      loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        app.handleLogin();
      }, true);
    }
    if (signupForm && signupForm.dataset.premiumGateBind !== '1') {
      signupForm.dataset.premiumGateBind = '1';
      signupForm.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        app.handleSignup();
      }, true);
    }
    if (forgotForm && forgotForm.dataset.premiumGateBind !== '1') {
      forgotForm.dataset.premiumGateBind = '1';
      forgotForm.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        handleForgotPasswordRequest();
      }, true);
    }
    documentRef.querySelectorAll('[data-view="forgot-view"]').forEach(function (node) {
      if (node.dataset.afForgotBind === '1') return;
      node.dataset.afForgotBind = '1';
      node.addEventListener('click', function (event) {
        event.preventDefault();
        switchAuthView('forgot-view');
      });
    });
  }

  function gatePanelClick(event) {
    if (!isBasicLoggedIn()) return;
    const target = event.target;
    if (!isInsidePanel(target)) return;
    if (isAllowedPanelInteraction(target)) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    showPaymentGateModal({});
  }

  function gatePanelSubmit(event) {
    if (!isBasicLoggedIn()) return;
    const target = event.target;
    if (!isInsidePanel(target)) return;
    if (target && target.closest && target.closest('#module-configuracoes, #config-detail-desktop, #detail-modal, #config-save-profile-btn, #config-open-forgot-password-btn, #config-open-forgot-password-btn-modal, #config-delete-account-btn, #config-delete-account-btn-modal')) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    showPaymentGateModal({});
  }

  function bootWatchers() {
    documentRef.addEventListener('click', gatePanelClick, true);
    documentRef.addEventListener('submit', gatePanelSubmit, true);
    if (windowRef) {
      windowRef.addEventListener('focus', function () {
        if (app.isLoggedIn) refreshAccessFromServer(false).catch(function () { return null; });
      });
    }
    if (documentRef && typeof documentRef.addEventListener === 'function') {
      documentRef.addEventListener('visibilitychange', function () {
        if (documentRef.visibilityState === 'visible' && app.isLoggedIn) {
          refreshAccessFromServer(false).catch(function () { return null; });
        }
      });
    }
    if (windowRef && typeof windowRef.setInterval === 'function' && !state.trialWatchTimer) {
      state.trialWatchTimer = windowRef.setInterval(function () {
        if (app.isLoggedIn) refreshAccessFromServer(true).catch(function () { return null; });
      }, 10 * 60 * 1000);
    }
    if (windowRef && typeof windowRef.addEventListener === 'function') {
      windowRef.addEventListener('pagehide', function () {
        if (app.isLoggedIn) flushRemoteAppState(true).catch(function () { return null; });
      });
    }
  }

  bindAuthForms();
  bootWatchers();
  app.__premiumGateFixInstalled = true;

  const token = getToken();
  if (!token) {
    forceLogoutToLanding();
  } else {
    refreshAccessFromServer(true).catch(function () { return null; });
  }

  handleMercadoPagoReturn().catch(function () { return null; });

  return app;
});

(function autoBoot() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  function start() {
    const installer = window.installAlimentePremiumGateFix;
    if (typeof installer !== 'function') return;
    let attempts = 0;
    const timer = setInterval(function () {
      attempts += 1;
      if (window.app) {
        clearInterval(timer);
        try {
          installer(window.app);
          window.__alimentePremiumGateFixInstalled = true;
        } catch (error) {
          console.error('Falha ao instalar premium gate fix:', error);
        }
        return;
      }
      if (attempts >= 200) clearInterval(timer);
    }, 25);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
