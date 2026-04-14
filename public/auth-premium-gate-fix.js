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
  const ALLOWED_PANEL_SELECTOR = '#logout-btn, #payment-gate-modal, #payment-gate-modal *, [data-action="close-payment-gate"], [data-action="go-checkout"]';
  const originalEnterAppMode = typeof app.enterAppMode === 'function' ? app.enterAppMode.bind(app) : null;
  const originalActivateModuleAndRender = typeof app.activateModuleAndRender === 'function' ? app.activateModuleAndRender.bind(app) : null;
  const originalHandleLogout = typeof app.handleLogout === 'function' ? app.handleLogout.bind(app) : null;
  const originalCloseAllModals = typeof app.closeAllModals === 'function' ? app.closeAllModals.bind(app) : null;
  const originalShowNotification = typeof app.showNotification === 'function' ? app.showNotification.bind(app) : function () {};

  const state = {
    refreshing: false,
    lastRefreshAt: 0,
    paymentModalOpenCount: 0
  };

  function safeParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

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

  function getCheckoutUrl(payload) {
    return payload?.subscription?.checkoutUrl || payload?.checkoutUrl || app.checkoutLinks?.premium || '';
  }

  function isPremiumPayload(payload) {
    if (payload?.access?.canPerformActions === true) return true;
    const plan = String(payload?.subscription?.plan || '').toLowerCase();
    const status = String(payload?.subscription?.status || '').toLowerCase();
    return plan === PREMIUM_PLAN && (status === 'active' || status === 'trialing');
  }

  function syncUserInState(payload) {
    const user = payload?.user || {};
    app.state = app.state || JSON.parse(JSON.stringify(app.defaultState || {}));
    app.state.user = app.state.user || {};
    app.state.user.nome = user.name || user.nome || app.state.user.nome || 'Usuário';
    app.state.user.email = user.email || app.state.user.email || '';
    app.state.user.id = user.id || app.state.user.id || '';
  }

  function clearLegacyVisualAppState() {
    try {
      const raw = storage.getItem('alimenteFacilState_vFinal');
      if (!raw) return;
      const parsed = safeParse(raw, null);
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

  function applySessionPayload(payload) {
    syncUserInState(payload);
    app.isLoggedIn = true;
    app.userPlan = isPremiumPayload(payload) ? PREMIUM_PLAN : BASIC_PLAN;
    if (app.userPlan !== PREMIUM_PLAN) {
      app.activeModule = 'inicio';
    }
    if (typeof app.updateStartButton === 'function') app.updateStartButton();
    if (typeof app.saveState === 'function') app.saveState();
    clearLegacyVisualAppState();
    return app.userPlan;
  }

  function forceLogoutToLanding() {
    clearSession();
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
    clearLegacyVisualAppState();
    if (typeof app.exitAppMode === 'function') {
      try { app.exitAppMode(); } catch (_error) {}
    }
  }

  function closePaymentGateModal() {
    const existing = documentRef.getElementById('payment-gate-modal');
    if (existing && typeof existing.remove === 'function') existing.remove();
  }

  function showPaymentGateModal(payload) {
    state.paymentModalOpenCount += 1;
    closePaymentGateModal();
    const checkoutUrl = getCheckoutUrl(payload || {});
    const overlay = documentRef.createElement('div');
    overlay.id = 'payment-gate-modal';
    overlay.className = 'modal-overlay is-visible';
    overlay.style.zIndex = '30000';
    overlay.innerHTML = [
      '<div class="modal-box" style="max-width:560px; width:min(92vw,560px);">',
      '  <button type="button" class="close-modal-btn" data-action="close-payment-gate" aria-label="Fechar">×</button>',
      '  <div class="modal-header"><h3 style="margin:0;">Ative seu Premium</h3></div>',
      '  <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">',
      '    <p style="margin:0; color:var(--glass-text-primary); line-height:1.55;">',
      (payload && payload.message) || 'Seu cadastro básico pode visualizar apenas a tela inicial do painel. Para liberar listas, despensa, receitas, planejador, análises e configurações, ative agora 7 dias grátis e depois pague R$ 9,90 por mês. Cancele quando quiser.',
      '    </p>',
      '    <div style="display:grid; gap:8px; padding:12px; border:1px solid rgba(255,255,255,.12); border-radius:16px; background:rgba(255,255,255,.04);">',
      '      <div style="font-weight:700; color:#fff;">7 dias grátis</div>',
      '      <div style="color:#fff; opacity:.92;">Depois, R$ 9,90/mês</div>',
      '      <div style="color:#fff; opacity:.92;">Cancele quando quiser</div>',
      '    </div>',
      '    <div style="display:flex; gap:10px; flex-wrap:wrap;">',
      '      <button type="button" class="btn btn-primary" data-action="go-checkout" style="flex:1; min-width:180px;">Começar teste grátis</button>',
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
        if (windowRef && windowRef.location) {
          windowRef.location.href = checkoutUrl;
        }
      }
    });

    documentRef.body.appendChild(overlay);
  }

  function openLockedHomePanel() {
    app.activeModule = 'inicio';
    app.isAppMode = true;
    if (originalEnterAppMode) {
      originalEnterAppMode();
    }
    if (originalActivateModuleAndRender) {
      originalActivateModuleAndRender('inicio');
    }
    clearLegacyVisualAppState();
  }

  function showInlineError(formId, message) {
    const form = documentRef.getElementById(formId);
    if (!form) return;
    form.querySelectorAll('.auth-feedback-message').forEach(function (node) { node.remove(); });
    const box = documentRef.createElement('div');
    box.className = 'auth-feedback-message';
    box.style.marginTop = '12px';
    box.style.padding = '10px 12px';
    box.style.borderRadius = '12px';
    box.style.border = '1px solid rgba(255,59,48,.35)';
    box.style.background = 'rgba(255,59,48,.12)';
    box.style.color = '#fff';
    box.textContent = message;
    form.appendChild(box);
  }

  function clearInlineErrors() {
    documentRef.querySelectorAll('.auth-feedback-message').forEach(function (node) { node.remove(); });
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
      if (plan === PREMIUM_PLAN) {
        closePaymentGateModal();
      } else if (app.isAppMode) {
        openLockedHomePanel();
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
        if (plan === PREMIUM_PLAN) {
          closePaymentGateModal();
          originalShowNotification('Premium ativado com sucesso! ✨', 'success');
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

  app.apiFetchJson = apiFetchJson;
  app.getStoredAuthToken = getToken;
  app.setStoredAuthSession = setSession;
  app.clearStoredAuthSession = clearSession;
  app.showPaymentGateModal = showPaymentGateModal;
  app.closePaymentGateModal = closePaymentGateModal;
  app.refreshAccessFromServer = refreshAccessFromServer;
  app.handleMercadoPagoReturn = handleMercadoPagoReturn;

  app.handleLogin = async function handleLogin() {
    clearInlineErrors();
    const email = String(documentRef.getElementById('login-email')?.value || '').trim();
    const password = String(documentRef.getElementById('login-password')?.value || '');
    if (!email || !password) {
      showInlineError('login-form', 'Informe e-mail e senha.');
      return;
    }
    try {
      const payload = await apiFetchJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setSession(payload.token, payload.user);
      const plan = applySessionPayload(payload);
      if (originalCloseAllModals) originalCloseAllModals();
      if (plan === PREMIUM_PLAN) {
        if (originalEnterAppMode) originalEnterAppMode();
        originalShowNotification('Login premium realizado com sucesso.', 'success');
      } else {
        openLockedHomePanel();
        originalShowNotification('Conta básica conectada. O painel completo é liberado no Premium.', 'info');
      }
    } catch (error) {
      showInlineError('login-form', error?.payload?.message || error.message || 'Não foi possível fazer login.');
    }
  };

  app.handleSignup = async function handleSignup() {
    clearInlineErrors();
    const name = String(documentRef.getElementById('signup-name')?.value || '').trim();
    const email = String(documentRef.getElementById('signup-email')?.value || '').trim();
    const password = String(documentRef.getElementById('signup-password')?.value || '');
    const acceptedTerms = Boolean(documentRef.getElementById('signup-terms')?.checked);
    if (!name || !email || !password) {
      showInlineError('signup-form', 'Preencha nome, e-mail e senha.');
      return;
    }
    if (!acceptedTerms) {
      showInlineError('signup-form', 'Você precisa aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }
    try {
      const payload = await apiFetchJson('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, acceptedTerms })
      });
      setSession(payload.token, payload.user);
      applySessionPayload(payload);
      if (originalCloseAllModals) originalCloseAllModals();
      openLockedHomePanel();
      originalShowNotification('Cadastro concluído. Conta básica criada com sucesso.', 'success');
    } catch (error) {
      showInlineError('signup-form', error?.payload?.message || error.message || 'Não foi possível concluir o cadastro.');
    }
  };

  app.handleLogout = function handleLogout() {
    forceLogoutToLanding();
    if (originalHandleLogout) {
      try { originalHandleLogout(); } catch (_error) {}
    }
  };

  app.enterAppMode = function enterAppMode() {
    if (app.userPlan === PREMIUM_PLAN) {
      return originalEnterAppMode ? originalEnterAppMode() : undefined;
    }
    return openLockedHomePanel();
  };

  app.activateModuleAndRender = function activateModuleAndRender(moduleKey) {
    if (app.userPlan === PREMIUM_PLAN) {
      return originalActivateModuleAndRender ? originalActivateModuleAndRender(moduleKey) : undefined;
    }
    if (moduleKey && moduleKey !== 'inicio') {
      showPaymentGateModal({});
      return;
    }
    return originalActivateModuleAndRender ? originalActivateModuleAndRender('inicio') : undefined;
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
        if (originalEnterAppMode) originalEnterAppMode();
      } else {
        openLockedHomePanel();
      }
    } catch (_error) {
      if (typeof app.showAuthModal === 'function') app.showAuthModal();
    }
  };

  function bindAuthForms() {
    const loginForm = documentRef.getElementById('login-form');
    const signupForm = documentRef.getElementById('signup-form');
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
  }

  bindAuthForms();
  bootWatchers();
  app.__premiumGateFixInstalled = true;

  const token = getToken();
  if (!token) {
    forceLogoutToLanding();
  } else {
    refreshAccessFromServer(true)
      .then(function (payload) {
        if (!payload) return;
        if (isPremiumPayload(payload)) {
          if (app.isAppMode && originalEnterAppMode) originalEnterAppMode();
        } else if (app.isLoggedIn) {
          openLockedHomePanel();
        }
      })
      .catch(function () { return null; });
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


(function bootstrapAlimentePremiumGateFix() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__alimentePremiumGateFixBootstrapBound) return;
  window.__alimentePremiumGateFixBootstrapBound = true;

  const tryInstall = () => {
    if (window.__alimentePremiumGateFixInstalled) return true;
    if (typeof window.installAlimentePremiumGateFix !== 'function' || !window.app) return false;

    try {
      window.installAlimentePremiumGateFix(window.app);
      window.__alimentePremiumGateFixInstalled = true;
      return true;
    } catch (error) {
      console.error('Falha ao instalar auth-premium-gate-fix:', error);
      return false;
    }
  };

  const startPolling = () => {
    if (tryInstall()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (tryInstall() || attempts >= 200) {
        window.clearInterval(timer);
      }
    }, 50);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPolling, { once: true });
  } else {
    startPolling();
  }
})();
