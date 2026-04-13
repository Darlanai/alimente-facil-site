(() => {
  const AUTH_TOKEN_KEY = 'alimente_facil_auth_token';
  const THEME_KEY = 'alimente_facil_theme';
  const state = {
    token: localStorage.getItem(AUTH_TOKEN_KEY) || '',
    session: null,
    appData: { listas: [], despensa: [], receitas: [], planejador: { notes: '' } },
    currentTab: 'inicio'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const els = {
    year: $('#year'),
    themeToggle: $('#themeToggle'),
    headerAuthBtn: $('#headerAuthBtn'),
    mobileMenuBtn: $('#mobileMenuBtn'),
    mobileMenu: $('#mobileMenu'),
    mobileMenuAuthBtn: $('#mobileMenuAuthBtn'),
    heroStartBtn: $('#heroStartBtn'),
    heroPanelBtn: $('#heroPanelBtn'),
    pricingPremiumBtn: $('#pricingPremiumBtn'),
    authModal: $('#authModal'),
    premiumModal: $('#premiumModal'),
    loginForm: $('#loginForm'),
    signupForm: $('#signupForm'),
    authTabs: $$('.auth-tab'),
    authForms: $$('.auth-form'),
    panelShell: $('#panelShell'),
    readonlyBanner: $('#readonlyBanner'),
    panelTitle: $('#panelTitle'),
    panelUserName: $('#panelUserName'),
    panelPlanLabel: $('#panelPlanLabel'),
    accountSummary: $('#accountSummary'),
    subscriptionStatusText: $('#subscriptionStatusText'),
    profileName: $('#profileName'),
    profileEmail: $('#profileEmail'),
    logoutBtn: $('#logoutBtn'),
    premiumCheckoutBtn: $('#premiumCheckoutBtn'),
    settingsUpgradeBtn: $('#settingsUpgradeBtn'),
    confirmPremiumBtn: $('#confirmPremiumBtn'),
    preapprovalIdInput: $('#preapprovalIdInput'),
    contactForm: $('#contactForm'),
    toastStack: $('#toastStack'),
    tabButtons: $$('.tab-btn'),
    tabPanels: $$('.tab-panel'),
    listForm: $('#listForm'),
    pantryForm: $('#pantryForm'),
    recipeForm: $('#recipeForm'),
    plannerForm: $('#plannerForm'),
    listasList: $('#listasList'),
    despensaList: $('#despensaList'),
    receitasList: $('#receitasList'),
    listasEmpty: $('#listasEmpty'),
    despensaEmpty: $('#despensaEmpty'),
    receitasEmpty: $('#receitasEmpty'),
    analyticsLists: $('#analyticsLists'),
    analyticsPantry: $('#analyticsPantry'),
    analyticsRecipes: $('#analyticsRecipes')
  };

  const tabTitles = {
    inicio: 'Visão geral',
    listas: 'Listas',
    despensa: 'Despensa',
    receitas: 'Receitas',
    planejador: 'Planejador',
    analises: 'Análises',
    configuracoes: 'Configurações'
  };

  function toast(message, type = 'info') {
    const item = document.createElement('div');
    item.className = `toast ${type}`;
    item.textContent = message;
    els.toastStack.appendChild(item);
    setTimeout(() => item.remove(), 3800);
  }

  async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.message || 'Erro na requisição.');
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function saveToken(token) {
    state.token = token || '';
    if (state.token) localStorage.setItem(AUTH_TOKEN_KEY, state.token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  function isPremium() {
    return state.session?.subscription?.plan === 'premium' && ['active', 'trialing'].includes(state.session?.subscription?.status);
  }

  function isBasic() {
    return Boolean(state.session?.user) && !isPremium();
  }

  function closeMenu() {
    els.mobileMenu.classList.remove('open');
  }

  function openModal(id) {
    document.getElementById(id)?.classList.remove('hidden');
  }

  function closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
  }

  function updateAuthButtons() {
    const loggedIn = Boolean(state.session?.user);
    const label = loggedIn ? 'Minha conta' : 'Entrar';
    els.headerAuthBtn.textContent = label;
    els.mobileMenuAuthBtn.textContent = label;
  }

  function updatePanelHeader() {
    const user = state.session?.user;
    if (!user) return;
    els.panelUserName.textContent = user.name || 'Usuário';
    els.panelPlanLabel.textContent = isPremium() ? 'Premium ativo' : 'Plano básico';
    els.accountSummary.textContent = isPremium()
      ? 'Premium ativo. Todas as ações do painel estão liberadas.'
      : 'Plano básico visual. Para criar, editar e salvar, ative o Premium.';
    els.subscriptionStatusText.textContent = isPremium()
      ? 'Sua assinatura Premium está ativa.'
      : 'Plano básico visual ativo. Assine o Premium para liberar o uso completo.';
    els.profileName.value = user.name || '';
    els.profileEmail.value = user.email || '';
    els.readonlyBanner.classList.toggle('hidden', !isBasic());
  }

  function setTab(tabName) {
    state.currentTab = tabName;
    els.panelTitle.textContent = tabTitles[tabName] || 'Painel';
    els.tabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabName));
    els.tabPanels.forEach((panel) => panel.classList.toggle('active', panel.dataset.tabPanel === tabName));
  }

  function renderList(container, emptyEl, items, template) {
    container.innerHTML = '';
    emptyEl.classList.toggle('hidden', items.length > 0);
    items.forEach((item) => {
      const el = document.createElement('article');
      el.className = 'saved-item';
      el.innerHTML = template(item);
      if (isPremium()) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'secondary-btn small';
        removeButton.textContent = 'Excluir';
        removeButton.addEventListener('click', () => removeItem(container.id, item.id));
        el.appendChild(document.createElement('div')).appendChild(removeButton);
      }
      container.appendChild(el);
    });
  }

  function renderAppData() {
    const data = state.appData;
    renderList(els.listasList, els.listasEmpty, data.listas, (item) => `
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.notes || 'Sem observações.')}</p>
    `);
    renderList(els.despensaList, els.despensaEmpty, data.despensa, (item) => `
      <h4>${escapeHtml(item.name)}</h4>
      <p>${escapeHtml(item.quantity || 'Quantidade não informada')}</p>
      <small>${item.expiry ? `Validade: ${escapeHtml(item.expiry)}` : 'Sem validade cadastrada.'}</small>
    `);
    renderList(els.receitasList, els.receitasEmpty, data.receitas, (item) => `
      <h4>${escapeHtml(item.title)}</h4>
      <p><strong>Ingredientes:</strong> ${escapeHtml(item.ingredients || '-')}</p>
      <p><strong>Preparo:</strong> ${escapeHtml(item.method || '-')}</p>
    `);
    $('#plannerNotes').value = data.planejador?.notes || '';
    els.analyticsLists.textContent = String(data.listas.length);
    els.analyticsPantry.textContent = String(data.despensa.length);
    els.analyticsRecipes.textContent = String(data.receitas.length);
    const disabled = isBasic();
    ['#listForm input', '#listForm textarea', '#listForm button', '#pantryForm input', '#pantryForm button', '#recipeForm input', '#recipeForm textarea', '#recipeForm button', '#plannerForm textarea', '#plannerForm button'].forEach((selector) => {
      $$(selector).forEach((el) => { el.disabled = disabled; });
    });
  }

  function removeItem(sourceId, itemId) {
    if (!isPremium()) return showPremiumGate();
    if (sourceId === 'listasList') state.appData.listas = state.appData.listas.filter((item) => item.id !== itemId);
    if (sourceId === 'despensaList') state.appData.despensa = state.appData.despensa.filter((item) => item.id !== itemId);
    if (sourceId === 'receitasList') state.appData.receitas = state.appData.receitas.filter((item) => item.id !== itemId);
    persistAppData();
  }

  function showPremiumGate() {
    openModal('premiumModal');
  }

  async function persistAppData() {
    if (!isPremium()) {
      showPremiumGate();
      return;
    }
    try {
      await apiFetch('/api/app-state', { method: 'PUT', body: JSON.stringify({ data: state.appData }) });
      renderAppData();
      toast('Dados salvos com sucesso.', 'success');
    } catch (error) {
      if (error?.payload?.requiresPayment) {
        showPremiumGate();
        return;
      }
      toast(error?.payload?.message || error.message || 'Não foi possível salvar.', 'error');
    }
  }

  async function loadPanelData() {
    if (!state.token) return;
    try {
      const payload = await apiFetch('/api/app-state');
      state.appData = payload.data || state.appData;
      renderAppData();
    } catch (error) {
      toast(error?.payload?.message || error.message || 'Não foi possível carregar os dados do painel.', 'error');
    }
  }

  function enterPanel() {
    if (!state.session?.user) {
      openModal('authModal');
      return;
    }
    els.panelShell.classList.remove('hidden');
    updatePanelHeader();
    renderAppData();
    setTab(state.currentTab || 'inicio');
    els.panelShell.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function restoreSession() {
    if (!state.token) {
      state.session = null;
      updateAuthButtons();
      return;
    }
    try {
      const session = await apiFetch('/api/auth/me');
      state.session = session;
      updateAuthButtons();
      updatePanelHeader();
      await loadPanelData();
    } catch (_error) {
      saveToken('');
      state.session = null;
      updateAuthButtons();
    }
  }

  async function onLoginSubmit(event) {
    event.preventDefault();
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    try {
      const payload = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      saveToken(payload.token);
      state.session = payload;
      closeModal('authModal');
      updateAuthButtons();
      updatePanelHeader();
      await loadPanelData();
      enterPanel();
      toast('Login realizado com sucesso.', 'success');
    } catch (error) {
      toast(error?.payload?.message || error.message || 'Não foi possível entrar.', 'error');
    }
  }

  async function onSignupSubmit(event) {
    event.preventDefault();
    const name = $('#signupName').value.trim();
    const email = $('#signupEmail').value.trim();
    const password = $('#signupPassword').value;
    try {
      const payload = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
      saveToken(payload.token);
      state.session = payload;
      closeModal('authModal');
      updateAuthButtons();
      updatePanelHeader();
      await loadPanelData();
      enterPanel();
      toast('Conta criada. Seu acesso começou no plano básico visual.', 'success');
    } catch (error) {
      toast(error?.payload?.message || error.message || 'Não foi possível criar a conta.', 'error');
    }
  }

  async function onContactSubmit(event) {
    event.preventDefault();
    const name = $('#contactName').value.trim();
    const email = $('#contactEmail').value.trim();
    const message = $('#contactMessage').value.trim();
    try {
      await apiFetch('/api/contact', { method: 'POST', body: JSON.stringify({ name, email, message }) });
      els.contactForm.reset();
      toast('Mensagem enviada com sucesso.', 'success');
    } catch (error) {
      toast(error?.payload?.message || error.message || 'Não foi possível enviar a mensagem.', 'error');
    }
  }

  async function confirmPremium() {
    if (!state.session?.user) {
      openModal('authModal');
      return;
    }
    const preapprovalId = els.preapprovalIdInput.value.trim() || new URLSearchParams(window.location.search).get('preapproval_id') || '';
    if (!preapprovalId) {
      toast('Informe o preapproval_id da assinatura do Mercado Pago.', 'error');
      return;
    }
    try {
      const payload = await apiFetch('/api/billing/confirm-premium', { method: 'POST', body: JSON.stringify({ preapprovalId }) });
      state.session = payload;
      closeModal('premiumModal');
      updatePanelHeader();
      await loadPanelData();
      renderAppData();
      toast('Premium ativado com 7 dias grátis.', 'success');
      history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      toast(error?.payload?.message || error.message || 'Não foi possível confirmar o Premium.', 'error');
    }
  }

  async function handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const preapprovalId = params.get('preapproval_id') || '';
    if (preapprovalId && state.session?.user) {
      els.preapprovalIdInput.value = preapprovalId;
      openModal('premiumModal');
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function bindForms() {
    els.loginForm.addEventListener('submit', onLoginSubmit);
    els.signupForm.addEventListener('submit', onSignupSubmit);
    els.contactForm.addEventListener('submit', onContactSubmit);

    els.listForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!isPremium()) return showPremiumGate();
      const title = $('#listTitle').value.trim();
      const notes = $('#listNotes').value.trim();
      if (!title) return toast('Informe o título da lista.', 'error');
      state.appData.listas.unshift({ id: crypto.randomUUID(), title, notes, createdAt: new Date().toISOString() });
      els.listForm.reset();
      persistAppData();
    });

    els.pantryForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!isPremium()) return showPremiumGate();
      const name = $('#pantryName').value.trim();
      const quantity = $('#pantryQuantity').value.trim();
      const expiry = $('#pantryExpiry').value;
      if (!name) return toast('Informe o nome do item.', 'error');
      state.appData.despensa.unshift({ id: crypto.randomUUID(), name, quantity, expiry, createdAt: new Date().toISOString() });
      els.pantryForm.reset();
      persistAppData();
    });

    els.recipeForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!isPremium()) return showPremiumGate();
      const title = $('#recipeTitle').value.trim();
      const ingredients = $('#recipeIngredients').value.trim();
      const method = $('#recipeMethod').value.trim();
      if (!title) return toast('Informe o título da receita.', 'error');
      state.appData.receitas.unshift({ id: crypto.randomUUID(), title, ingredients, method, createdAt: new Date().toISOString() });
      els.recipeForm.reset();
      persistAppData();
    });

    els.plannerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!isPremium()) return showPremiumGate();
      state.appData.planejador.notes = $('#plannerNotes').value.trim();
      persistAppData();
    });
  }

  function bindUi() {
    els.year.textContent = new Date().getFullYear();
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light') document.body.classList.add('light');

    els.themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light');
      localStorage.setItem(THEME_KEY, document.body.classList.contains('light') ? 'light' : 'dark');
    });

    els.mobileMenuBtn.addEventListener('click', () => {
      els.mobileMenu.classList.toggle('open');
    });

    [els.headerAuthBtn, els.mobileMenuAuthBtn].forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.session?.user) enterPanel();
        else openModal('authModal');
        closeMenu();
      });
    });

    [els.heroStartBtn, els.heroPanelBtn].forEach((btn) => btn.addEventListener('click', enterPanel));
    [els.pricingPremiumBtn, els.settingsUpgradeBtn].forEach((btn) => btn.addEventListener('click', () => {
      if (!state.session?.user) {
        openModal('authModal');
        return;
      }
      showPremiumGate();
    }));

    els.premiumCheckoutBtn.addEventListener('click', async () => {
      if (!state.session?.user) {
        closeModal('premiumModal');
        openModal('authModal');
        return;
      }
      try {
        const payload = await apiFetch('/api/billing/checkout-link');
        window.location.href = payload.checkoutUrl;
      } catch (error) {
        toast(error?.payload?.message || error.message || 'Não foi possível abrir o checkout.', 'error');
      }
    });

    els.confirmPremiumBtn.addEventListener('click', confirmPremium);
    els.logoutBtn.addEventListener('click', () => {
      saveToken('');
      state.session = null;
      state.appData = { listas: [], despensa: [], receitas: [], planejador: { notes: '' } };
      els.panelShell.classList.add('hidden');
      updateAuthButtons();
      toast('Você saiu da sua conta.', 'success');
    });

    els.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => setTab(btn.dataset.tab));
    });

    els.authTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        els.authTabs.forEach((item) => item.classList.toggle('active', item === tab));
        els.authForms.forEach((form) => form.classList.toggle('active', form.id === `${tab.dataset.authView}Form`));
        $('#authModalTitle').textContent = tab.dataset.authView === 'login' ? 'Entrar' : 'Criar conta';
      });
    });

    $$('[data-close]').forEach((element) => {
      element.addEventListener('click', () => closeModal(element.dataset.close));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeModal('authModal');
        closeModal('premiumModal');
        closeMenu();
      }
    });

    document.addEventListener('click', (event) => {
      const action = event.target.closest('.paywall-action');
      if (action) showPremiumGate();
    });
  }

  bindUi();
  bindForms();
  restoreSession().then(handlePaymentReturn);
})();
