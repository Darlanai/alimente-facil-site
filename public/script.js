document.addEventListener('DOMContentLoaded', () => {
const API_BASE_URL = (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
) ? 'http://localhost:3000' : window.location.origin;

    const app = {
        isAppMode: false,
        isLoggedIn: false,
        userPlan: 'free',
        activeModule: 'inicio',
        activeListId: 'listaDaSemana',
        intervals: [],

        checkoutLinks: {
            'premium': 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=ae9349b69ef94a27ad19786352488fa5'
        },

        state: {},
        defaultState: {
            user: { nome: null },
            listas: {
                'listaDaSemana': {
                    nome: "Lista da Semana",
                    items: [
                        { id: 1, name: "Feijão Preto", qtd: 1, unid: "kg", valor: 7.20, checked: false }
                    ]
                },
                'comprasMensais': {
                    nome: "Compras Mensais",
                    items: [
                        { id: 2, name: "Papel Higiênico", qtd: 1, unid: "un", valor: 25.50, checked: false }
                    ]
                }
            },
            despensa: [
                { id: 3, name: "Arroz", qtd: 1, unid: "kg", valor: 8.50, validade: "2025-12-25", stock: 50 },
                { id: 4, name: "Tomates", qtd: 6, unid: "un", valor: 5.00, validade: "2024-10-28", stock: 75 }
            ],
            essenciais: [
                { id: 100, name: "Arroz", preco: 8.50, unid: "kg" }
            ],

orcamento: {
                total: 500.00
            },
            aiUsage: {
                tokensThisMonth: 0,
                dailyMsgs: 0,
                lastMsgDate: null,
                minuteHistory: []
            },
            receitas: {
                1: { id: 1, name: "Molho Rústico de Tomate", desc: "Perfeito para usar tomates maduros.", content: "<h4>Ingredientes</h4><ul><li>5 tomates maduros</li><li>2 dentes de alho</li><li>Azeite</li><li>Manjericão</li></ul><h4>Preparo</h4><p>Pique os tomates e o alho. Refogue no azeite. Adicione manjericão e cozinhe por 20 minutos.</p>", ingredients: [{name: "Tomate", qty: "5", unit: "un"},{name: "Alho", qty: "2", unit: "dentes"},{name: "Azeite", qty: "fio", unit: ""},{name: "Manjericão", qty: "a gosto", unit: ""}] },
                2: { id: 2, name: "Frango Grelhado", desc: "Receita base.", content: "<h4>Ingredientes</h4><ul><li>2 filés de frango</li><li>Sal e pimenta</li><li>Limão</li></ul><h4>Preparo</h4><p>Tempere o frango com sal, pimenta e limão. Grelhe em uma frigideira quente até dourar.</p>", ingredients: [{name: "Peito de Frango", qty: "2", unit: "filés"},{name: "Sal", qty: "a gosto", unit: ""},{name: "Pimenta", qty: "a gosto", unit: ""},{name: "Limão", qty: "1/2", unit: "un"}] },
                3: { id: 3, name: "Salada de Quinoa", desc: "Opção leve.", content: "<h4>Ingredientes</h4><ul><li>1 xícara de quinoa</li><li>Pepino</li><li>Tomate cereja</li><li>Hortelã</li></ul><h4>Preparo</h4><p>Cozinhe a quinoa. Pique os vegetais. Misture tudo com hortelã, azeite e limão.</p>", ingredients: [{name: "Quinoa", qty: "1", unit: "xícara"},{name: "Pepino", qty: "1/2", unit: "un"},{name: "Tomate", qty: "10", unit: "un cereja"},{name: "Hortelã", qty: "a gosto", unit: ""}] }
            },
            planejador: {}
        },

        charts: {},
        isIAProcessing: false,
        speechRecognition: null,
        currentPlannerDayTarget: null,
        tempRecipeIngredients: [],

        init() {
            this.loadState();
            this.cacheDOMElements();
            this.createAutocompleteElement();
            this.attachEventListeners();
            this.bindGlobalAutocompleteFields?.(document);
            this.applySavedTheme();
            this.updateBodyClasses();
            this.updateStartButton();
            this.setupSpeechRecognition();
            this.initDockMenu();
            this.initDraggableDock();
            this.initPWA();
            this.initRoboAssistant();

            if (this.isAppMode) {
                 this.activateModuleUI(this.activeModule);
                 this.renderAllPanelContent();
            } else {
                this.initLandingPage();
            }
        },

        handleRealPDF() {
            window.print();
        },

        handleRealShare(title, text) {
            if (navigator.share) {
                navigator.share({
                    title: title || 'Alimente Fácil',
                    text: text || 'Confira minha organização no Alimente Fácil!',
                    url: window.location.href
                }).catch((error) => console.log('Compartilhamento cancelado', error));
            } else {
                navigator.clipboard.writeText(`${title} - ${text}`).then(() => {
                    this.showNotification("Link copiado para a área de transferência!", "success");
                });
            }
        },

        handleGenerateListFromPlanner() {
            let totalIngredients = 0;
            const targetListId = this.activeListId;

            if (!this.state.listas[targetListId]) {
                this.showNotification("Crie ou selecione uma lista de compras primeiro.", "error");
                return;
            }

            for (const day in this.state.planejador) {
                for (const meal in this.state.planejador[day]) {
                    const mealData = this.state.planejador[day][meal];
                    if (mealData && mealData.id) {
                        const recipe = this.state.receitas[mealData.id];
                        if (recipe && recipe.ingredients) {
                            recipe.ingredients.forEach(ing => {
                                this.state.listas[targetListId].items.unshift({
                                    id: this.generateId(),
                                    name: ing.name,
                                    qtd: parseFloat(ing.qty) || 1,
                                    unid: ing.unit || 'un',
                                    valor: 0,
                                    checked: false
                                });
                                totalIngredients++;
                            });
                        }
                    }
                }
            }

            if (totalIngredients > 0) {
                this.saveState();
                this.renderListaWidget();
                if (this.activeModule === 'lista') this.renderListas();
                this.showNotification(`Sucesso! ${totalIngredients} ingredientes adicionados à lista.`, "success");
            } else {
                this.showNotification("Seu planejador está vazio ou as receitas não têm ingredientes.", "info");
            }
        },

        handleRealSubscription(planId) {
            if (!this.isLoggedIn) {
                this.showAuthModal();
                return;
            }

            const link = this.checkoutLinks[planId];

            if (link) {
                this.showNotification("Redirecionando para o Mercado Pago...", "success");

                setTimeout(() => {
                    window.open(link, '_blank');
                }, 1000);

                this.userPlan = planId;
                this.saveState();
                this.updatePlanButtonsState();

            } else {
                this.showNotification("Erro: Plano não configurado.", "error");
            }
        },

initDockMenu() {
            const dock = document.querySelector('.glass-dock');
            if (!dock) return;

            const viewDockItems = () => Array.from(dock.querySelectorAll('.dock-item:not(.dock-action)'));
            const homeBtn = () => dock.querySelector('.dock-item[data-target="home"]');
            const appBtn  = () => dock.querySelector('.dock-item[data-target="app"]');

            const updateStates = (targetBtn) => {
                viewDockItems().forEach(btn => btn.classList.remove('active'));
                if (targetBtn) targetBtn.classList.add('active');

                const h = homeBtn();
                const a = appBtn();
                if (h && a) {
                    h.classList.toggle('hint', !!this.isAppMode);
                    a.classList.toggle('hint', !this.isAppMode);
                }
            };

            dock.addEventListener('click', (e) => {
                const btn = e.target.closest('.dock-item');
                if (!btn) return;
                e.preventDefault();
                e.stopPropagation();

                const target = btn.dataset.target;
                if (target === 'app') {
                    if (!this.isLoggedIn) {
                        this.showAuthModal();
                        return;
                    }
                    this.enterAppMode();
                    updateStates(btn);
                    return;
                }

                if (target === 'home') {
                    this.exitAppMode();
                    updateStates(btn);
                }
            });

            setTimeout(() => {
                if (this.isAppMode) updateStates(appBtn());
                else updateStates(homeBtn());
            }, 50);
        },

        initDraggableDock() {
            return;
        },

initPWA() {

            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('./service-worker.js').catch(() => {  });
                });
            }

            let deferredPrompt = null;
            const installMenu = document.getElementById('pwa-install-menu');
            const floatingBanner = document.getElementById('pwa-floating-banner');
            const closeBannerBtn = document.getElementById('pwa-banner-close-btn');

            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                if (installMenu) installMenu.style.display = 'flex';

                if (floatingBanner) floatingBanner.style.display = 'flex';
            });

            window.addEventListener('appinstalled', () => {
                deferredPrompt = null;
                if (installMenu) installMenu.style.display = 'none';
                if (floatingBanner) floatingBanner.style.display = 'none';
                this.showNotification('Alimente Fácil instalado com sucesso! ✅', 'success');
            });

            if (closeBannerBtn) {
                closeBannerBtn.addEventListener('click', () => {
                    floatingBanner.style.display = 'none';
                });
            }

            document.querySelectorAll('.btn-install-pwa, #pwa-install-menu').forEach(btn => {
                btn.addEventListener('click', async (ev) => {
                    ev.preventDefault(); ev.stopPropagation();
                    document.getElementById('menuItems')?.classList.remove('open');
                    document.getElementById('hamburger')?.classList.remove('open');

                    if (!deferredPrompt) {
                        this.showNotification('Para instalar: Vá no menu do navegador ⋮ e clique em "Adicionar à tela inicial".', 'info');
                        return;
                    }

                    deferredPrompt.prompt();
                    try { await deferredPrompt.userChoice; } catch (e) {  }

                    deferredPrompt = null;
                    if (installMenu) installMenu.style.display = 'none';
                    if (floatingBanner) floatingBanner.style.display = 'none';
                });
            });

            document.querySelectorAll('[data-action="open-plans"]').forEach((el) => {
                el.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    document.getElementById('menuItems')?.classList.remove('open');
                    document.getElementById('hamburger')?.classList.remove('open');
                    this.openModal('plans-modal');
                });
            });
        },
        saveState() {
            try {
                const stateToSave = {
                    isAppMode: this.isAppMode, isLoggedIn: this.isLoggedIn, userPlan: this.userPlan,
                    activeModule: this.activeModule, activeListId: this.activeListId, data: this.state
                };
                localStorage.setItem('alimenteFacilState_vFinal', JSON.stringify(stateToSave));
                localStorage.setItem('themePreference', document.body.classList.contains('lua-mode') ? 'lua' : 'sol');
            } catch (e) { console.error("Erro ao salvar o estado:", e); }
        },

        loadState() {
            try {
                const savedState = localStorage.getItem('alimenteFacilState_vFinal');
                if (savedState) {
                    const parsedState = JSON.parse(savedState);
                    this.isAppMode = parsedState.isAppMode || false;
                    this.isLoggedIn = parsedState.isLoggedIn || false;
                    this.userPlan = parsedState.userPlan || 'free';
                    this.activeModule = parsedState.activeModule || 'inicio';
                    this.activeListId = parsedState.activeListId || 'listaDaSemana';
                    this.state = parsedState.data || JSON.parse(JSON.stringify(this.defaultState));
                    this.state.user = this.state.user || { nome: null };
                    this.state.listas = this.state.listas || {};
                    this.state.despensa = this.state.despensa || [];
                    this.state.essenciais = this.state.essenciais || [];
                    this.state.orcamento = this.state.orcamento || { total: 500.00 };
                    this.state.receitas = this.state.receitas || {};
                    this.state.planejador = this.state.planejador || {};
                    if (Object.keys(this.state.listas).length === 0 || !this.state.listas['listaDaSemana']) {
                        this.state.listas['listaDaSemana'] = JSON.parse(JSON.stringify(this.defaultState.listas.listaDaSemana));
                    }
                    if (!this.state.listas[this.activeListId]) { this.activeListId = 'listaDaSemana'; }
                } else {
                    this.state = JSON.parse(JSON.stringify(this.defaultState));
                    this.isAppMode = false;
              this.setVideoPlayback('panel-video-container', false);
              this.setVideoPlayback('landing-video-container', true); this.isLoggedIn = false; this.userPlan = 'free';
                    this.activeModule = 'inicio'; this.activeListId = 'listaDaSemana'; this.state.user = { nome: null };
                }
            } catch (e) {
                this.state = JSON.parse(JSON.stringify(this.defaultState));
                this.isAppMode = false; this.isLoggedIn = false; this.userPlan = 'free';
                this.activeModule = 'inicio'; this.activeListId = 'listaDaSemana'; this.state.user = { nome: null };
            }
        },

generateId: () => Date.now().toString(36) + Math.random().toString(36).substring(2),

        renderUniversalCard({ type, data, actions = [], isClickable = false, status = '' }) {
            const content = this.renderCardContent(type, data);
            const actionButtons = actions.map(action =>
                `<button type="button" class="card__action card__action--${action.type} ${action.class || ''}" data-action="${action.type}" data-id="${data.id}" aria-label="${action.label}"><i class="${action.icon}"></i></button>`
            ).join('');

            const isChecked = data.checked ? 'card--checked is-checked' : '';
            const statusClass = status ? `card--${status}` : isChecked;
            const clickableClass = isClickable ? 'card--clickable' : '';
            const badgeHTML = data.badge ? `<span class="card__badge">${data.badge}</span>` : '';

            return `
                <div class="card card--${type} ${statusClass} ${clickableClass} placeholder-item" data-id="${data.id}" data-name="${this.escapeHtml(data.name)}">
                    <div class="card__header">
                        <div class="card__drag-handle drag-handle" aria-label="Arrastar item"><i class="fa-solid fa-grip-vertical"></i></div>
                        <div class="card__title">${this.escapeHtml(data.name)}</div>
                        ${badgeHTML}
                    </div>
                    <div class="card__content">
                        ${content}
                    </div>
                    ${actions.length ? `<div class="card__footer">${actionButtons}</div>` : ''}
                </div>
            `;
        },

        renderCardContent(type, data) {
            switch (type) {
                case 'list': return this.renderListContent(data);
                case 'pantry': return this.renderPantryContent(data);
                case 'recipe': return this.renderRecipeContent(data);
                case 'saved-list': return this.renderSavedListContent(data);
                case 'essential': return this.renderEssentialContent(data);
                default: return '';
            }
        },

        renderListContent(data) {
            const checked = data.checked ? 'checked' : '';
            return `
                <div class="card__row">
                    <label class="card__checkbox">
                        <input type="checkbox" ${checked} data-id="${data.id}">
                        <span class="card__checkmark"></span>
                    </label>
                </div>
                <div class="card__details">
                    <span>Qtd: <strong>${data.qtd}</strong></span>
                    <span>Un: <strong>${data.unid}</strong></span>
                    <span>R$ <strong>${parseFloat(data.valor || 0).toFixed(2)}</strong></span>
                </div>
                <div class="card__checked-actions ${data.checked ? 'visible' : 'hidden'}">
                    <div class="card__validade-group" style="display:flex; flex-direction:column;">
                        <label for="validade-${data.id}" style="font-size:0.75rem; color:var(--text-secondary);">Validade</label>
                        <input type="date" id="validade-${data.id}" class="card__input validade-input-capture" value="${data.validade || ''}" style="height:32px !important; padding:0 8px !important;">
                    </div>
                    <div class="card__confirm-group">
                        <button type="button" class="card__action card__action--cancel cancel-move-btn" data-id="${data.id}" aria-label="Cancelar"><i class="fa-solid fa-times-circle" style="color:var(--color-danger);"></i></button>
                        <button type="button" class="card__action card__action--confirm move-to-despensa-btn" data-id="${data.id}" aria-label="Confirmar"><i class="fa-solid fa-check-circle" style="color:var(--color-success);"></i></button>
                    </div>
                </div>
            `;
        },

        renderPantryContent(data) {
            const stock = data.stock || 100;
            const stockBars = Array(4).fill().map((_, i) => `<div class="card__stock-bar ${i < Math.round(stock / 25) ? 'active' : ''}"></div>`).join('');

            let validadeDisplay = "Não informada";
            let validadeClass = "";
            if (data.validade) {
                const hoje = new Date().toISOString().split('T')[0];
                if (data.validade < hoje) { validadeDisplay = "Vencido"; validadeClass = "card__validade--expired"; }
                else { validadeDisplay = data.validade.split('-').reverse().join('/'); }
            }

            return `
                <div class="card__row">
                    <div class="card__stock item-stock-level" title="Nível de estoque: ${stock}%">
                        ${stockBars}
                    </div>
                </div>
                <div class="card__details">
                    <span>Qtd: <strong>${data.qtd}</strong> ${data.unid}</span>
                    <span>R$ <strong>${parseFloat(data.valor || 0).toFixed(2)}</strong></span>
                </div>
                <div class="card__validade ${validadeClass}">
                    Val: <span>${validadeDisplay}</span>
                </div>
            `;
        },

        renderRecipeContent(data) {
            const ingredientsCount = Array.isArray(data.ingredients) ? data.ingredients.length : 0;
            return `
                <div class="card__row">
                    <span class="card__badge">${ingredientsCount} ingr.</span>
                </div>
                <div class="card__details">
                    <span>⏱️ ${data.prepTime || '30 min'}</span>
                </div>
            `;
        },

        renderSavedListContent(data) {
            const itemCount = Array.isArray(data.items) ? data.items.length : 0;
            const total = Array.isArray(data.items) ? data.items.reduce((acc, item) => acc + (parseFloat(item.valor || 0) * parseFloat(item.qtd || 0)), 0) : 0;
            return `
                <div class="card__details">
                    <span>📦 ${itemCount} itens</span>
                    <span>💰 R$ ${total.toFixed(2)}</span>
                </div>
            `;
        },

        renderEssentialContent(data) {
            return `
                <div class="card__details">
                    <span>💰 R$ ${parseFloat(data.preco || 0).toFixed(2)} / ${data.unid}</span>
                </div>
            `;
        },

        cacheDOMElements() {

             this.elements = {
                 body: document.body,
                 mainContainer: document.querySelector('.main-container'),
                 hamburgerMenuWrapper: document.querySelector('.hamburger-menu-wrapper'),
                 nodeCluster: document.querySelector('.node-cluster'),
                 contactForm: document.getElementById('contact-form'),
                 cardViewerOverlay: document.getElementById('card-viewer-modal-overlay'),
                 appPanelContainer: document.querySelector('.app-panel-container-standalone'),
                 appSidebar: document.querySelector('.app-sidebar'),
                 sidebarOverlay: document.querySelector('.sidebar-overlay'),
                 menuToggleBtn: document.getElementById('menu-toggle-btn'),
                 navItems: document.querySelectorAll('.nav-item'),
                 modulesArea: document.querySelector('.modules-area'),
                 moduleContainers: document.querySelectorAll('.module-container'),
                 homeButtonPanel: document.getElementById('home-btn-panel'),
                 logoutBtnPanel: document.getElementById('logout-btn'),
                 themeToggleBtnPanel: document.getElementById('theme-toggle-btn-panel'),
                 modalOverlays: document.querySelectorAll('.modal-overlay'),
                 chefIaFab: document.getElementById('chef-ia-fab-placeholder'),
                 panelAccessLink: document.getElementById('panel-access-link'),
		 hamburger: document.getElementById('hamburger'),
                 menuItems: document.getElementById('menuItems'),
                 landingAuthBtn: document.getElementById('landing-auth-btn'),
                 landingThemeToggle: document.getElementById('landing-theme-toggle'),
            };
        },

attachEventListeners() {

            document.getElementById('landing-auth-btn')?.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.isLoggedIn) {
                    this.openConfirmModal("Sair", "Deseja sair da sua conta?", () => this.handleLogout());
                } else {
                    this.showAuthModal();
                }
            });

            this.elements.panelAccessLink?.addEventListener('click', (e) => {
                e.preventDefault(); this.handleStartButtonClick();
                this.elements.nodeCluster?.classList.remove('is-open'); this.elements.hamburgerMenuWrapper?.classList.remove('is-open');
            });

            document.querySelector('[data-action="open-calculator"]')?.addEventListener('click', (e) => {
                e.preventDefault(); this.showCalculatorSection();
                this.elements.nodeCluster?.classList.remove('is-open'); this.elements.hamburgerMenuWrapper?.classList.remove('is-open');
            });

            const toggleHamburgerMenu = (e) => {
                e.stopPropagation(); const isOpen = this.elements.nodeCluster?.classList.toggle('is-open');
                this.elements.hamburgerMenuWrapper?.classList.toggle('is-open');
                this.elements.hamburgerMenuWrapper?.setAttribute('aria-expanded', isOpen);
            };
            this.elements.hamburgerMenuWrapper?.addEventListener('click', toggleHamburgerMenu);
            this.elements.hamburgerMenuWrapper?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHamburgerMenu(e); } });

document.addEventListener('click', (e) => {

                if (this.elements.nodeCluster?.classList.contains('is-open') && !e.target.closest('.node-cluster') && !e.target.closest('.hamburger-menu-wrapper')) {
                    this.elements.nodeCluster?.classList.remove('is-open');
                    this.elements.hamburgerMenuWrapper?.classList.remove('is-open');
                    this.elements.hamburgerMenuWrapper?.setAttribute('aria-expanded', 'false');
                }

                if (this.elements.appSidebar && this.elements.appSidebar.classList.contains('is-open')) {
                    if (!e.target.closest('.app-sidebar') && !e.target.closest('#menu-toggle-btn')) {
                        this.closeSidebar();
                    }
                }
            });

            document.addEventListener('touchstart', (e) => {
                if (!e.target.closest('.app-sidebar') && !e.target.closest('.card')) {

                    if (document.activeElement && document.activeElement !== document.body) {
                        document.activeElement.blur();
                    }
                }
            }, { passive: true });

            this.elements.nodeCluster?.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if(!link || link.dataset.action === 'open-calculator' || link.id === 'panel-access-link') return;
                if (link.hash) {
                    e.preventDefault();
                    const targetElement = document.querySelector(link.hash);
                    if(targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
                    this.elements.nodeCluster?.classList.remove('is-open'); this.elements.hamburgerMenuWrapper?.classList.remove('is-open');
                }
            });

            this.elements.contactForm?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = this.elements.contactForm;
                const name = String(form?.querySelector('#contact-name')?.value || '').trim();
                const email = String(form?.querySelector('#contact-email')?.value || '').trim();
                const message = String(form?.querySelector('#contact-message')?.value || '').trim();
                try {
                    const response = await this.apiFetchJson('/api/contact', {
                        method: 'POST',
                        body: JSON.stringify({ name, email, message })
                    });
                    this.showNotification(response?.message || 'Sua mensagem foi enviada! Obrigado pelo contato. 🚀', 'success');
                    form?.reset();
                } catch (error) {
                    this.showNotification(error?.message || 'Não foi possível enviar sua mensagem.', 'error');
                }
            });
            this.elements.menuToggleBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.elements.appSidebar?.classList.toggle('is-open'); this.elements.sidebarOverlay?.classList.toggle('is-visible'); });
            this.elements.sidebarOverlay?.addEventListener('click', () => this.closeSidebar());
            this.elements.navItems.forEach(item => { item.addEventListener('click', () => this.activateModuleAndRender(item.dataset.module)); });
            this.elements.homeButtonPanel?.addEventListener('click', () => this.exitAppMode());
            this.elements.logoutBtnPanel?.addEventListener('click', () => this.handleLogout());
            this.elements.themeToggleBtnPanel?.addEventListener('click', () => this.toggleTheme());
            this.elements.chefIaFab?.addEventListener('click', () => this.showChatbot());

            document.addEventListener('keydown', (e) => {
                const card = e.target.closest?.('.chef-demo-card.is-clickable');
                if (!card) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });

            this.elements.body.addEventListener('keydown', e => {
                const savedListEl = e.target.closest('.saved-list-name');
                if (savedListEl && e.key === 'Enter') {
                    e.preventDefault();
                    const listId = savedListEl.closest('.saved-list-item').dataset.listId;
                    this.activeListId = listId; this.saveState(); this.renderListasSalvas(); this.renderListaAtiva(listId); this.renderOrcamento();
                    if (window.innerWidth <= 991) { document.getElementById('list-manager')?.classList.add('view-active-list'); }
                }
            });

this.elements.body.addEventListener('click', e => {
                 const target = (e.target instanceof Element) ? e.target : e.target?.parentElement;
                 if (!target) return;
                 const closest = (selector) => target.closest(selector);

                 const stepperBtn = closest('.stepper-btn');
                 if (stepperBtn) {
                     e.preventDefault();
                     const input = stepperBtn.parentElement.querySelector('input');
                     if (input) {
                         let val = parseFloat(input.value) || 0;
                         if (stepperBtn.classList.contains('minus')) val = Math.max(0, val - 1);
                         if (stepperBtn.classList.contains('plus')) val = val + 1;
                         input.value = val;
                     }
                     return;
                 }

                 if (closest('#pantry-save-btn')) {
                     this.handleSavePantryEdit();
                     return;
                 }

                 const moduleTargetBtn = closest('[data-module-target]');
                 if (moduleTargetBtn && this.isAppMode) { this.activateModuleAndRender(moduleTargetBtn.dataset.moduleTarget); }
                 const expandBtnSimple = closest('[data-module]:not(.nav-item)');
                 if (expandBtnSimple && this.isAppMode && closest('.card-actions')) { this.activateModuleAndRender(expandBtnSimple.dataset.module); }

                 const tabBtn = closest('.mobile-tab-btn');
                 if (tabBtn) {
                    const targetId = tabBtn.dataset.tabTarget;
                    const tabContainer = closest('.mobile-tab-nav');
                    const contentContainer = closest('.calculator-info-container') || closest('.section-content').querySelector('.calculator-info-container');
                    if (tabContainer && contentContainer && targetId) {
                        tabContainer.querySelectorAll('.mobile-tab-btn').forEach(btn => { btn.classList.remove('active'); btn.setAttribute('aria-selected', 'false'); });
                        contentContainer.querySelectorAll('.mobile-tab-content').forEach(content => { content.classList.remove('active'); });
                        tabBtn.classList.add('active'); tabBtn.setAttribute('aria-selected', 'true');
                        const targetContent = contentContainer.querySelector(`#${targetId}`);
                        if (targetContent) targetContent.classList.add('active');
                    }
                 }

                 const modalOpenBtn = closest('[data-modal-open]');
                 const modalCloseBtn = closest('[data-modal-close]');
                 const modalOverlay = target.classList.contains('modal-overlay');
                 if (modalOpenBtn) {
                      const modalId = modalOpenBtn.dataset.modalOpen;
                      if (modalId === 'item-details-modal') { this.populateItemDetailsModal(modalOpenBtn); }
                      else if (modalId === 'recipe-picker-modal') { this.currentPlannerDayTarget = modalOpenBtn.dataset.dayTarget; this.populateRecipePicker(); }
                      else if (modalId === 'ai-chat-modal') { this.setupChatbotModal(); if (modalOpenBtn.dataset.chefPrompt) { this.prefillChefPrompt(modalOpenBtn.dataset.chefPrompt, { autoSend: modalOpenBtn.dataset.chefAutosend === 'true' }); } }
                      else if (modalId === 'essentials-modal') { this.renderItensEssenciais(); }
                      this.openModal(modalId);
                 }
                 if (modalCloseBtn) { this.closeModal(modalCloseBtn.dataset.modalClose || closest('.modal-overlay')?.id); }
                 if (modalOverlay && target.id !== 'card-viewer-modal-overlay') { e.target.classList.remove('is-visible'); }
                 const editFromModalBtn = closest('.edit-btn-from-modal');
                 if(editFromModalBtn) {
                    const id = editFromModalBtn.dataset.itemId;
                    const itemEl = document.querySelector(`.placeholder-item[data-id="${id}"]`);
                    if(itemEl) { this.closeModal('item-details-modal'); this.handleOpenEditModal(itemEl); }
                 }

                 const recipeItemEl = closest('.recipe-list-item') || closest('.card--recipe');
                 if(recipeItemEl) {
                      const recipeId = recipeItemEl.dataset.recipeId || recipeItemEl.dataset.id;
                      if (closest('.delete-recipe-btn')) { this.handleDeleteRecipe(recipeId); }
                      else if (closest('.edit-recipe-btn')) { this.handleOpenRecipeEditModal(recipeId); }
                      else if (!closest('.icon-button')) {
                        if (window.innerWidth < 992) {

                            this.showRecipeDetailModal(recipeId);
                        } else {

                            this.renderRecipeDetail(recipeId);
                            document.querySelectorAll('.recipe-list-item').forEach(el => {
                                el.classList.remove('active');
                                el.style.borderColor = 'rgba(255,255,255,0.1)';
                            });
                            recipeItemEl.classList.add('active');
                            recipeItemEl.style.borderColor = 'var(--primary-color)';

                            const titleEl = document.getElementById('recipe-detail-title-desktop');
                            if(titleEl) titleEl.innerHTML = `<i class="fa-solid fa-book-open"></i> ${this.escapeHtml(this.state.receitas[recipeId]?.name)}`;
                        }
                    }
                    return;
                 }

                 const itemEl = closest('.placeholder-item');
                 if (itemEl) {
                    const id = itemEl.dataset.id;
                    const itemName = itemEl.dataset.name || 'este item';
                    const isDespensa = closest('[id*="despensa-items"]') ? true : false;
                    const isLista = closest('[id*="lista-items"]') || closest('#list-view-modal-body') ? true : false;
                    const isEssential = closest('#essentials-list-container') ? true : false;

                    if (isDespensa && !closest('.icon-button') && !closest('.item-stock-level') && !closest('.drag-handle')) {
                        const item = this.state.despensa.find(i => i.id.toString() === id);
                        if (window.innerWidth >= 992 && item) {
                            this.renderPantryDetailDesktop(item);
                            document.querySelectorAll('#despensa-list-container .placeholder-item').forEach(el => el.style.borderColor = 'rgba(255,255,255,0.1)');
                            itemEl.style.borderColor = 'var(--primary-color)';
                        } else {
                            this.handleOpenPantryView(itemEl);
                        }
                        return;
                    }

                    if (closest('.delete-btn')) {
                        let message = `Tem certeza que deseja excluir "${itemName}"?`;
                        let typeToDelete = isDespensa ? 'despensa' : (isLista ? 'lista' : (isEssential ? 'essencial' : null));
                        if (isDespensa && this.isItemInRecipe && this.isItemInRecipe(itemName)) { message += '<br><small style="color: var(--accent-yellow);">Atenção: Este item é usado em uma ou mais receitas.</small>'; }
                        if(typeToDelete) this.openConfirmModal("Excluir Item", message, () => this.handleDeleteItem(typeToDelete, id));
                    }
                    else if (closest('.edit-btn')) { this.handleOpenEditModal(itemEl); }
                    else if (isEssential && closest('.edit-essential-btn')) { this.handleOpenEssentialEdit(itemEl); }
                    else if (isLista && closest('.move-to-despensa-btn')) { this.handleMoveToDespensa(itemEl); }
                    else if (isLista && closest('.cancel-move-btn')) { this.handleToggleItemChecked(id, false); }
                    else if (isLista && target.type === 'checkbox') { this.handleToggleItemChecked(id, target.checked); }
                    else if (isDespensa && closest('.item-stock-level')) { this.handleStockClick(closest('.item-stock-level'), e); }
                 }

const savedListEl = closest('.saved-list-item') || closest('.card--saved-list');
                 if (savedListEl) {
                    const listId = savedListEl.dataset.listId || savedListEl.dataset.id;

                    if (closest('.delete-list-btn')) {
                        this.handleDeleteListaAtiva(listId);
                        return;
                    }

                    if (closest('.select-list-btn')) {
                        this.activeListId = listId;
                        const listManager = document.getElementById('list-manager');
                        if (listManager) listManager.classList.add('view-active-list');
                        this.renderListaAtiva(listId);
                        return;
                    }

                    this.handleOpenListViewModal(listId);
                    return;
                 }

if (closest('#module-lista') && closest('.btn-create-list')) {
                    this.openListNameModal({
                        title: 'Nova lista',
                        placeholder: 'Ex: Compras de amanhã',
                        initialValue: '',
                        confirmText: 'Criar e Adicionar Itens',
                        onConfirm: (listName) => {
                            const listNameFinal = String(listName).trim() || "Nova Lista";

                            if (this.userPlan === 'free' && Object.keys(this.state.listas).length >= 2) {
                                this.showPlansModal('Limite de 2 listas atingido no plano Gratuito.');
                                return;
                            }

                            const newListId = this.generateId();

                            this.state.listas[newListId] = { nome: listNameFinal, items: [] };
                            this.activeListId = newListId;
                            this.saveState();

                            this.renderListasSalvas();

                            const listManager = document.getElementById('list-manager');
                            if (listManager) {
                                listManager.classList.add('view-active-list');
                            }

                            this.renderListaAtiva(newListId);

                            setTimeout(() => {
                                const inputNome = document.getElementById('lista-form-nome-full');
                                if (inputNome) inputNome.focus();
                            }, 100);

                            this.showNotification(`Lista "${listNameFinal}" criada!`, 'success');
                        }
                    });
                 }

                 else if (closest('#list-back-btn')) {
                    document.getElementById('list-manager')?.classList.remove('view-active-list');
                    this.renderListasSalvas();
                 }

                 else if (closest('#lista-save-changes-btn')) { this.handleSaveListaAtiva(); }
                 else if (closest('#lista-delete-btn')) { const listIdToDelete = document.getElementById('active-list-id-input')?.value; if(listIdToDelete) this.handleDeleteListaAtiva(listIdToDelete); }
                 else if (closest('.add-recipe-btn')) { this.handleOpenRecipeEditModal(null); }

                 const recipeActionBtn = closest('.edit-recipe-btn, .delete-recipe-btn, .pdf-btn, .share-btn, .print-btn');
                 if (recipeActionBtn) {
                    const rId = recipeActionBtn.dataset.recipeId;
                    if (rId) {
                        if (recipeActionBtn.classList.contains('delete-recipe-btn')) { this.handleDeleteRecipe(rId); return; }
                        if (recipeActionBtn.classList.contains('edit-recipe-btn')) { this.handleOpenRecipeEditModal(rId); return; }
                        if (recipeActionBtn.classList.contains('print-btn')) { this.handleRealPDF(); return; }
                         if (recipeActionBtn.classList.contains('pdf-btn')) { this.handleRealPDF(); return; }
                        if (recipeActionBtn.classList.contains('share-btn')) {
                            const recipeName = this.state.receitas[rId]?.name || "Receita";
                            this.handleRealShare("Alimente Fácil", `Veja esta receita: ${recipeName}`);
                            return;
                        }
                    }
                 }

                 else if (closest('#recipe-detail-close-btn')) { document.getElementById('module-receitas')?.classList.remove('detail-is-visible'); document.querySelectorAll('.recipe-list-item.active').forEach(el => el.classList.remove('active')); }

                 else if (closest('.add-meal-btn')) { const button = closest('.add-meal-btn'); this.currentPlannerDayTarget = button.dataset.dayTarget; this.populateRecipePicker(); this.openModal('recipe-picker-modal'); }
                 else if (closest('.add-meal-slot-btn')) { const button = closest('.add-meal-slot-btn'); this.currentPlannerDayTarget = button.dataset.dayTarget; this.populateRecipePicker(); this.openModal('recipe-picker-modal'); }
                 else if (closest('.clear-plan-btn')) { this.openConfirmModal("Limpar Semana", "Deseja remover todas as refeições planejadas para esta semana?", this.executeClearPlannerWeek.bind(this)); }
                 else if (closest('.day-clear-btn')) { const dayKey = closest('.day-clear-btn').dataset.day; this.openConfirmModal("Limpar Dia", `Deseja remover todas as refeições de ${dayKey}?`, () => this.executeClearPlannerDay({day: dayKey})); }
                 else if (closest('.planner-day-nav')) { const btn = closest('.planner-day-nav'); if (window.innerWidth >= 992) { this.renderPlannerDetailDesktop(btn.dataset.day); this.setActiveModuleNav('.planner-day-nav', btn); } else { this.openPlannerDayDetailModal(btn.dataset.day); } return; }
                 else if (closest('.analysis-nav-item')) { const btn = closest('.analysis-nav-item'); if (window.innerWidth >= 992) { this.renderAnalysisDetailDesktop(btn.dataset.analysisKey); this.setActiveModuleNav('.analysis-nav-item', btn); } else { this.openAnalysisDetailModal(btn.dataset.analysisKey); } return; }
                 else if (closest('.analysis-mobile-open-btn')) { const btn = closest('.analysis-mobile-open-btn'); this.openAnalysisDetailModal(btn.dataset.analysisKey || document.getElementById('analysis-data-select')?.value || 'gastos_categoria'); return; }
                 else if (closest('.config-nav-item')) { const btn = closest('.config-nav-item'); if (window.innerWidth >= 992) { this.renderConfigDetailDesktop(btn.dataset.configSection); this.setActiveModuleNav('.config-nav-item', btn); } else { this.openConfigSectionModal(btn.dataset.configSection); } return; }

                 const mealItem = closest('.planner-meal-item');
                 if (mealItem) {
                      const recipeId = mealItem.dataset.recipeId;
                      const day = mealItem.dataset.day;
                      const meal = mealItem.dataset.meal;
                      if (closest('.meal-view-btn') || closest('.meal-item-name')) { if (window.innerWidth < 992) { this.showRecipeDetailModal(recipeId); } else { this.showRecipeDetailModal(recipeId); } }
                      else if (closest('.meal-complete-btn')) { this.handleToggleCompleteMeal(day, meal); }
                      else if (closest('.meal-delete-btn')) { this.handleDeleteMeal(day, meal); }
                 }

                 else if(closest('.save-btn, .save-plan-btn')) { this.showNotification("Dados salvos com sucesso!", "success"); }
                 else if(closest('.print-btn')) { this.handleRealPDF(); }
                  else if(closest('.pdf-btn')) { this.handleRealPDF(); }
                 else if(closest('.share-btn')) { this.handleRealShare("Alimente Fácil", "Minha organização!"); }
                 else if(closest('.generate-list-btn')) { this.handleGenerateListFromPlanner(); }
                 else if(closest('.import-recipe-btn')) {
                      const input = document.createElement('input'); input.type = 'file'; input.accept = '.json, .txt';
                      input.onchange = () => this.showNotification("Arquivo carregado! Processando receita...", "success");
                      input.click();
                 }
                 else if(closest('.change-chart-btn')) {
                      const select = document.getElementById('analysis-type-select');
                      if(select) { const options = ['pie', 'doughnut', 'bar', 'line']; let nextIndex = options.indexOf(select.value) + 1; if(nextIndex >= options.length) nextIndex = 0; select.value = options[nextIndex]; this.updateDynamicChart(); }
                 }
                 else if(closest('.add-item-despensa-btn')) { this.handleOpenDespensaAddItemModal(); }

                 const authToggleLink = closest('.auth-toggle-link');
                 if (authToggleLink) { const targetViewId = authToggleLink.dataset.view; const authModal = document.getElementById('auth-modal'); authModal?.querySelectorAll('.auth-form-container').forEach(view => view.classList.remove('active')); document.getElementById(targetViewId)?.classList.add('active'); }

                 const subscribeBtn = closest('.btn[data-action="subscribe"]');
                 if (subscribeBtn) { this.handleRealSubscription(subscribeBtn.dataset.plan); }

            });

this.elements.body.addEventListener('submit', e => {
    e.preventDefault();
    console.log('Submit detectado', e.target);
    if (e.target.closest('#login-form')) {
        console.log('Chamando handleLogin');
        this.handleLogin();
    } else if (e.target.closest('#signup-form')) {
        console.log('Chamando handleSignup');
        this.handleSignup();
    } else if (e.target.closest('#forgot-password-form')) {
        this.handleForgotPassword();
    } else if (e.target.closest('#module-lista-widget .add-item-form')) {
        this.handleAddItem('lista', e.target);
    } else if (e.target.closest('#module-lista .add-item-form')) {
        this.handleAddItem('lista', e.target, document.getElementById('active-list-id-input')?.value || this.activeListId);
    }
});

             document.getElementById('item-edit-save-btn')?.addEventListener('click', () => this.handleSaveEditModal());
             document.getElementById('budget-save-btn')?.addEventListener('click', () => this.handleSaveOrcamento());
             document.getElementById('essentials-add-btn')?.addEventListener('click', () => this.handleAddEssential());

        },
        bindGlobalAutocompleteFields(scope = document) {
            ['#lista-form-nome-dash','#lista-form-nome-full','#edit-item-name','#essential-name','#recipe-ing-name','#pantry-edit-name','#config-name','#config-email','#config-name-modal','#config-email-modal'].forEach((selector) => {
                scope.querySelectorAll?.(selector).forEach((input) => {
                    input.setAttribute('autocomplete', 'off');
                });
            });
        },

        updateBodyClasses() { this.elements.body.classList.toggle('app-mode', this.isAppMode); },

updateStartButton() {
            const accessLink = this.elements.panelAccessLink;
            if (accessLink) {
                const iconEl = accessLink.querySelector('.node-icon i');
                const labelEl = accessLink.querySelector('.node-label');
                if (this.isLoggedIn) {
                    iconEl.className = 'fa-solid fa-rocket';
                    labelEl.textContent = 'Meu Painel';
                    accessLink.title = 'Acessar Painel';
                } else {
                    iconEl.className = 'fa-solid fa-power-off';
                    labelEl.textContent = 'Acessar Painel';
                    accessLink.title = 'Login / Cadastro';
                }
            }

            const landingAuthBtn = document.getElementById('landing-auth-btn');
            if (landingAuthBtn) {

                landingAuthBtn.innerHTML = '<i class="fa-solid fa-power-off"></i>';

                if (this.isLoggedIn) {

                    landingAuthBtn.classList.add('power-on');
                    landingAuthBtn.title = "Desconectar / Sair";
                } else {

                    landingAuthBtn.classList.remove('power-on');
                    landingAuthBtn.title = "Iniciar Sessão";
                }
            }
        },

        handleStartButtonClick(){
            if(!this.isLoggedIn){ this.showAuthModal(); return; }
            this.enterAppMode();
        },

        enterAppMode() {
             if (this.isAppMode) return;
             this.clearIntervals();
             this.isAppMode = true;
              this.setVideoPlayback('landing-video-container', false);
              this.setVideoPlayback('panel-video-container', true);
             this.updateBodyClasses();
             this.activateModuleUI(this.activeModule);
             this.renderAllPanelContent();
             this.saveState();
             window.scrollTo(0, 0);
        },

        exitAppMode() {
             if (!this.isAppMode) return;
             this.clearIntervals();
             this.isAppMode = false;
             this.updateBodyClasses();
             this.closeSidebar();
             this.saveState();
             window.scrollTo(0, 0);
             this.initLandingPage();
        },

        handleLogout() {
            this.isLoggedIn = false;
            this.userPlan = 'free';
            this.state = JSON.parse(JSON.stringify(this.defaultState));
            this.state.user = { nome: null };
            this.activeListId = 'listaDaSemana';
            this.activeModule = 'inicio';
            this.exitAppMode();
            this.updateStartButton();
            this.saveState();
            this.showNotification("Você saiu da sua conta.", "info");
        },

        handleLogin() {

            if (typeof this._realHandleLogin === 'function') {
                this._realHandleLogin();
            } else {
                this.showAuthModal();
            }
        },

        handleSignup() {
            if (typeof this._realHandleSignup === 'function') {
                this._realHandleSignup();
            } else {
                this.showAuthModal();
            }
        },

        forceCleanFakeAuthState() {
            try {
                const raw = localStorage.getItem('alimenteFacilState_vFinal');
                if (!raw) return;
                const parsed = JSON.parse(raw);
                if (parsed.isLoggedIn && parsed.userPlan === 'premium' && !localStorage.getItem('alimenteFacilAuthToken')) {
                    parsed.isLoggedIn = false;
                    parsed.userPlan = 'free';
                    parsed.isAppMode = false;
                    localStorage.setItem('alimenteFacilState_vFinal', JSON.stringify(parsed));
                    this.isLoggedIn = false;
                    this.userPlan = 'free';
                    this.isAppMode = false;
                }
            } catch (e) {}
        },

        toggleTheme() {
            document.body.classList.toggle('lua-mode');
            this.updateThemeIcons();
            this.saveState();
        },

        applySavedTheme() {
            const savedTheme = localStorage.getItem('themePreference');
            if (savedTheme === 'lua') { document.body.classList.add('lua-mode'); }
            else { document.body.classList.remove('lua-mode'); }
            this.updateThemeIcons();
        },
updateThemeIcons() {
            const isLuaMode = document.body.classList.contains('lua-mode');

            const panelIcon = this.elements.themeToggleBtnPanel?.querySelector('i');
            if (panelIcon) {
                panelIcon.className = isLuaMode ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
            }

            const landingIcon = document.querySelector('#landing-theme-toggle i');
            if (landingIcon) {
                landingIcon.className = isLuaMode ? 'fa-regular fa-moon' : 'fa-regular fa-sun';
            }
        },

        clearIntervals() {
            this.intervals.forEach(clearInterval);
            this.intervals = [];
        },

        setVideoPlayback(containerId, shouldPlay) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const vids = container.querySelectorAll('video');
            vids.forEach(v => {
                try {
                    if (shouldPlay) {
                        const p = v.play();
                        if (p && typeof p.catch === 'function') p.catch(() => {});
                    } else {
                        v.pause();
                    }
                } catch (_) {}
            });
        },

initLandingPage() {
            this.clearIntervals();
            this.initVideoRotator();

            this.initNewHeaderLogic();

            this.setupDynamicInfo();
            this.initDicas();
            this.initHomePageCalculator();
            this.initLandingRecipes();
            this.updateStartButton();

            const handleAiCtaClick = () => {
                if (this.isLoggedIn && this.userPlan === 'premium') { this.showChatbot(); }
                else if (this.isLoggedIn) { this.showPlansModal("Este recurso não está disponível nesta versão."); }
                else { this.showAuthModal(); }
            };

            const btnDicas = document.getElementById('ai-cta-dicas');
            const btnReceitas = document.getElementById('ai-cta-receitas');

            if(btnDicas) {
                btnDicas.removeEventListener('click', handleAiCtaClick);
                btnDicas.addEventListener('click', handleAiCtaClick);
            }
            if(btnReceitas) {
                btnReceitas.removeEventListener('click', handleAiCtaClick);
                btnReceitas.addEventListener('click', handleAiCtaClick);
            }

            const header = document.getElementById('landing-header');
            const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 18);
            syncHeader();
            window.addEventListener('scroll', syncHeader, { passive: true });

            const revealEls = document.querySelectorAll('.scroll-reveal');
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) {
                revealEls.forEach(el => el.classList.add('is-visible'));
            } else if ('IntersectionObserver' in window) {
                const revealObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('is-visible');
                            revealObserver.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.12 });
                revealEls.forEach(el => revealObserver.observe(el));
            } else {
                revealEls.forEach(el => el.classList.add('is-visible'));
            }
        },

initNewHeaderLogic() {

            const updateHeaderData = () => {
                const now = new Date();
                const dateStr = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
                const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const hours = now.getHours();
                let greeting = hours < 12 ? 'Bom dia' : hours < 18 ? 'Boa tarde' : 'Boa noite';
                const user = this.isLoggedIn ? (this.state.user.nome || 'Chef') : 'Visitante';
                const greetingEl = document.querySelector('.greeting-text');
                const dateEl = document.getElementById('dateTime');
                if(greetingEl) greetingEl.textContent = `${greeting}, ${user}`;
                if(dateEl) dateEl.innerHTML = `<i class="far fa-clock"></i> ${timeStr} • ${dateStr}`;
            };
            updateHeaderData();
            this.intervals.push(setInterval(updateHeaderData, 1000));

            const verses = [
                {text: '"O Senhor é o meu pastor; de nada terei falta." (Sl 23:1)'},
                {text: '"Tudo posso naquele que me fortalece." (Fp 4:13)'},
                {text: '"Entrega o teu caminho ao Senhor." (Sl 37:5)'},
                {text: '"O amor é paciente, o amor é bondoso." (1 Co 13:4)'}
            ];
            let verseIndex = 0;
            const verseTextEl = document.querySelector('.verse-text');
            const rotateVerse = () => {
                if(!verseTextEl) return;
                verseIndex = (verseIndex + 1) % verses.length;
                verseTextEl.style.opacity = 0;
                setTimeout(() => {
                    verseTextEl.textContent = verses[verseIndex].text;
                    verseTextEl.style.opacity = 1;
                }, 300);
            };
            this.intervals.push(setInterval(rotateVerse, 15000));

            const contrastBtn = document.getElementById('landing-theme-toggle');
            if(contrastBtn) {
                 const newContrast = contrastBtn.cloneNode(true);
                 if(contrastBtn.parentNode) contrastBtn.parentNode.replaceChild(newContrast, contrastBtn);
                 newContrast.addEventListener('click', (e) => {
                     e.preventDefault(); e.stopPropagation();
                     document.body.classList.toggle('landing-lua-mode');
                     const icon = newContrast.querySelector('i');
                     if(document.body.classList.contains('landing-lua-mode')){
                         if(icon) icon.className = 'fa-regular fa-moon';
                     } else {
                         if(icon) icon.className = 'fa-regular fa-sun';
                     }
                 });
            }

            const powerBtn = document.getElementById('landing-auth-btn');
            if(powerBtn) {
                const newPower = powerBtn.cloneNode(true);
                if(powerBtn.parentNode) powerBtn.parentNode.replaceChild(newPower, powerBtn);
                newPower.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (this.isLoggedIn) {
                        this.openConfirmModal("Sair", "Deseja sair da sua conta?", () => this.handleLogout());
                    } else {
                        this.showAuthModal();
                    }
                });
                if(this.isLoggedIn) {
                    newPower.classList.add('active');
                    newPower.title = "Sair do Painel";
                } else {
                    newPower.classList.remove('active');
                    newPower.title = "Fazer Login";
                }
            }

            const hamburger = document.getElementById('hamburger');
            const menu = document.getElementById('menuItems');

            if(hamburger && menu) {
                const newHamburger = hamburger.cloneNode(true);
                if(hamburger.parentNode) hamburger.parentNode.replaceChild(newHamburger, hamburger);

                newHamburger.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    const isOpen = newHamburger.classList.contains('active');
                    if(isOpen) {
                        newHamburger.classList.remove('active');
                        menu.classList.remove('active');
                    } else {
                        newHamburger.classList.add('active');
                        menu.classList.add('active');
                    }
                });

    const originalRenderAnalysisDetailDesktop = app.renderAnalysisDetailDesktop.bind(app);
    app.renderAnalysisDetailDesktop = function(analysisKey = 'gastos_categoria') {
        originalRenderAnalysisDetailDesktop(analysisKey);
        document.querySelectorAll('.module-actions-footer .share-btn, .module-actions-footer .print-btn, .module-actions-footer .pdf-btn').forEach(btn => btn.classList.add('minimal-export-btn'));
    };

    app.openAnalysisDetailModal = function(analysisKey = 'gastos_categoria') {
        const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
        this.openDetailModal({
            title: `<i class="${cfg.icon}"></i> ${cfg.label}`,
            content: `<p class="detail-note">${cfg.note}</p><div class="analysis-config-panel"><div class="form-group"><label for="analysis-data-select">Analisar</label><select id="analysis-data-select"><option value="gastos_categoria">Gastos por Categoria (Listas)</option><option value="validade_despensa">Itens por Validade (Despensa)</option><option value="uso_receitas">Receitas Usadas (Planejador)</option></select></div><div class="form-group"><label for="analysis-type-select">Tipo de gráfico</label><select id="analysis-type-select"><option value="pie">Pizza</option><option value="doughnut">Rosca</option><option value="bar">Barras</option><option value="line">Linha</option></select></div></div><div class="chart-canvas-container" style="margin-top:1rem;"><canvas id="dynamic-analysis-chart"></canvas></div>`,
            actions: []
        });
        const footer = document.getElementById('detail-modal-footer');
        if (footer) {
            footer.className = 'modal-footer detail-modal-footer';
            footer.innerHTML = `<button type="button" class="icon-button minimal-export-btn share-btn" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button><button type="button" class="icon-button minimal-export-btn print-btn" title="Imprimir"><i class="fa-solid fa-print"></i></button><button type="button" class="icon-button minimal-export-btn pdf-btn" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>`;
        }
        document.getElementById('analysis-data-select').value = analysisKey;
        document.getElementById('analysis-data-select')?.addEventListener('change', () => this.updateDynamicChart());
        document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
        this.updateDynamicChart();
    };

    document.addEventListener('click', (e) => {
                    if (menu.classList.contains('active') && !menu.contains(e.target) && !newHamburger.contains(e.target)) {
                        menu.classList.remove('active');
                        newHamburger.classList.remove('active');
                    }
                });

                menu.querySelectorAll('a, .menu-link, .menu-cta-highlight').forEach(link => {
                    link.addEventListener('click', () => {
                        menu.classList.remove('active');
                        newHamburger.classList.remove('active');
                    });
                });
            }
        },

        initVideoRotator() {
             const container = document.getElementById('landing-video-container');
             if (!container) return;
             const videos = container.querySelectorAll('.background-video');
             if (videos.length <= 1) return;
             let currentIndex = 0;
             const interval = setInterval(() => {
                  videos[currentIndex]?.classList.remove('active');
                  currentIndex = (currentIndex + 1) % videos.length;
                  videos[currentIndex]?.classList.add('active');
             }, 7000);
             this.intervals.push(interval);
        },

        async fetchWeather(){
             const now = new Date(); const hour = now.getHours(); let icon = 'fa-sun';
             if (hour < 6 || hour > 18) { icon = 'fa-moon'; }
             return `<i class="fa-solid ${icon}" style="margin-left: 5px;"></i>`;
        },

        async setupDynamicInfo() {
             const verses = ["O Senhor é o meu pastor; nada me faltará. (Sl 23:1)", "Tudo posso naquele que me fortalece. (Fp 4:13)"];
             const verseEl = document.querySelector('.verse-info');
             if (verseEl) verseEl.textContent = verses[Math.floor(Math.random() * verses.length)];
             const dynamicInfoEl = document.querySelector('.dynamic-info');
             if (!dynamicInfoEl) return;
             const weatherIcon = await this.fetchWeather();
             const updateInfo = () => {
                  const now = new Date();
                  let greetingText = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
                  const userName = this.isLoggedIn ? this.state.user.nome : null;
                  if (userName) { dynamicInfoEl.innerHTML = `${greetingText} <strong>${this.escapeHtml(userName)}</strong> | ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} | ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ${weatherIcon}`; }
                  else { dynamicInfoEl.innerHTML = `${greetingText} | ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} | ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ${weatherIcon}`; }
             };
             updateInfo();
             const interval = setInterval(updateInfo, 30000);
             this.intervals.push(interval);
        },
        initDicas() {
            const container = document.querySelector('#dicas-valiosas .dicas-carousel');
            if(!container) return;
            const dicas = [ { name: 'Compras Inteligentes', img: 'geladeira1.jpg' }, { name: 'Aproveitamento Integral', img: 'cozinha1.jpg' }, { name: 'Despensa Eficiente', img: 'gealdeira2.jpg' }, { name: 'Congele o Futuro', img: 'geladeira.jpg' }, { name: 'Etiquetas são Amigas', img: 'etiquetas.jpg' }, { name: 'Reinvente as Sobras', img: 'almoco.jpg' }, ];
            container.innerHTML = this.generateContentCards(dicas, 'Dica');
        },
        initLandingRecipes() {
            const container = document.querySelector('#receitas-landing .receitas-carousel');
            if(!container) return;
            const recipes = [ { name: 'Salada de Manga', img: 'salada_manga.jpg' }, { name: 'Creme de Abóbora', img: 'pure_abobora.jpg' }, { name: 'Bruschetta Clássica', img: 'bruscheta.jpg' }, { name: 'Salada de Frutas', img: 'salada_frutas.jpg' }, { name: 'Sopa de Legumes', img: 'sopalegumes.jpg' }, { name: 'Omelete Simples', img: 'omelete.jpg' }, ];
            container.innerHTML = this.generateContentCards(recipes, 'Receita');
        },

        generateContentCards(items, placeholder) {
            const contentData = this.getLandingContentData();
            const createCardHTML = (item) => {
                const data = contentData[item.name] || {};
                const description = data.description || data.prepMode || 'Uma deliciosa opção para o seu dia a dia.';
                return `
                    <div class="content-card" data-name="${item.name}">
                        <img src="${item.img}" alt="" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/400x400/101012/00f2ea?text=${placeholder}';">
                        <div class="content-card-content">
                            <h3>${item.name}</h3>
                            <p>${description}</p>
                        </div>
                    </div>`;
            };
            const allItems = [...items, ...items];
            const cardsHTML = allItems.map(item => createCardHTML(item)).join('');
            const originalItemCount = items.length;
            return `<div class="carousel-track" style="--original-item-count: ${originalItemCount}">${cardsHTML}</div>`;
        },
        getLandingContentData() {
             return { 'Salada de Manga': { prepMode: 'Corte a manga e a cebola em cubos. Pique o coentro. Misture tudo delicadamente e tempere com limão e pimenta.' }, 'Creme de Abóbora': { prepMode: 'Refogue cebola e alho, adicione a abóbora em cubos e caldo. Cozinhe até ficar macia, depois bata no liquidificador e tempere.' }, 'Bruschetta Clássica': { prepMode: 'Toste fatias de pão com alho. Cubra com uma mistura de tomates picados, manjericão fresco, azeite, sal e pimenta.' }, 'Salada de Frutas': { prepMode: 'Pique mamão, banana, maçã e uvas. Misture tudo em uma tigela grande e regue com suco de laranja para não escurecerem.' }, 'Sopa de Legumes': { prepMode: 'Pique batatas, cenoura e abobrinha. Refogue com cebola e alho, cubra com caldo e cozinhe até os legumes ficarem macios.' }, 'Omelete Simples': { prepMode: 'Bata 2 ovos com um pouco de leite, sal e pimenta. Despeje em uma frigela quente, adicione queijo, dobre e sirva.' }, 'Compras Inteligentes': { description: 'Antes de sair de casa, faça um inventário rápido da sua despensa e geladeira. Crie uma lista detalhada e, no mercado, siga-a rigorosamente. Isso evita compras por impulso e garante que você compre apenas o necessário, economizando dinheiro e evitando acúmulo.'}, 'Aproveitamento Integral': { description: 'Muitas partes de vegetais que descartamos são nutritivas. Talos de brócolis e couve-flor podem virar sopas cremosas ou recheios. Folhas de cenoura rendem um ótimo pesto. Cascas de batata, bem lavadas, tornam-se chips crocantes e deliciosos.'}, 'Despensa Eficiente': { description: 'Organize sua despensa com a técnica "Primeiro que Entra, Primeiro que Sai". Ao guardar novas compras, posicione os itens mais antigos na frente, garantindo que eles sejam usados antes do vencimento. Potes transparentes ajudam a visualizar o que você tem.'}, 'Congele o Futuro': { description: 'O congelador é seu melhor amigo contra o desperdício. Sobrou comida? Congele em porções individuais para refeições rápidas. Frutas muito maduras podem ser picadas e congeladas para se tornarem a base de vitaminas, smoothies e sorvetes caseiros.'}, 'Etiquetas são Amigas': { description: 'Crie o hábito de etiquetar tudo que você guarda, seja na geladeira ou no congelador. Anote o nome do prato e a data de armazenamento. Isso acaba com o mistério dos potes "esquecidos" e ajuda a consumir tudo dentro da validade e com segurança.'}, 'Reinvente as Sobras': { description: 'As sobras de ontem podem ser o ingrediente principal de hoje. O frango assado vira recheio de uma torta ou salpicão. O arroz cozido se transforma em deliciosos bolinhos de arroz. Use a criatividade para dar uma nova vida aos alimentos e evitar que acabem no lixo.'}, 'Otimizar Compras': { description: 'Aprenda a criar listas de compras baseadas no que você já tem para evitar duplicatas e economizar.' }, 'Reduzir Desperdício': { description: 'Descubra como usar talos e folhas em receitas criativas e nutritivas, aproveitando 100% dos alimentos.' }, 'Planejamento Semanal': { description: 'Deixe a IA montar um cardápio semanal para você, otimizando ingredientes, tempo e seu orçamento.' } };
        },
        showCalculatorSection() {
            const calculatorSection = document.getElementById('calculadora');
            if (calculatorSection) { calculatorSection.scrollIntoView({ behavior: 'smooth' }); }
        },

        initHomePageCalculator() {
            const container = document.getElementById('home-calculator-grid');
            const resultEl = document.getElementById('home-calculator-result');
            const sentenceEl = document.getElementById('calculator-context-sentence');
            const clearBtn = document.getElementById('home-calculator-clear');
            const scoreContainer = document.getElementById('sustainability-score-container');
            if (!container || !resultEl || !clearBtn || !scoreContainer) return;
            let wastedItems = {};
            const allItems = ALL_ITEMS_DATA;
            const updateResult = () => {
                let weeklyWaste = 0; let sentenceParts = [];
                for (const name in wastedItems) {
                    const itemData = allItems.find(i => i.name === name);
                    if (itemData) {
                        const count = wastedItems[name];
                        weeklyWaste += count * itemData.price;
                        let unitText = itemData.unit_desc || `unidade de ${name}`;
                        if (count > 1) {
                             if (unitText.endsWith('ão')) { unitText = unitText.slice(0, -2) + 'ões'; }
                             else if (unitText.endsWith('r') || unitText.endsWith('s') || unitText.endsWith('z')) { unitText = unitText + 'es'; }
                             else if (!unitText.endsWith('s')) { unitText = unitText + 's'; }
                        }
                        sentenceParts.push(`<strong>${count} ${unitText}</strong>`);
                    }
                }
                const annualWaste = weeklyWaste * 52;
                resultEl.textContent = `R$ ${annualWaste.toFixed(2).replace('.', ',')}`;
                let scoreHTML = '';
                scoreContainer.innerHTML = scoreHTML;
                if (sentenceParts.length === 0) { sentenceEl.innerHTML = `Selecione os itens que você mais desperdiça semanalmente para ver o impacto.`; }
                else { sentenceEl.innerHTML = `Este é seu prejuízo aproximado desperdiçando ${sentenceParts.join(', ')} por semana.`; }
            };

            const renderItems = () => {
                const currentContainer = document.getElementById('home-calculator-grid');
                if (!currentContainer) return;
                currentContainer.innerHTML = allItems.map(item => {
                    const iconName = item.icon || 'icone-default.png';
                    const iconPath = `/icones/${iconName}`;
                    return `
                    <div class="home-calc-item" data-name="${item.name}" title="${item.name}" role="button" tabindex="0" aria-label="Adicionar ${item.name}">
                        <img src="${iconPath}" alt="${item.name}" class="calc-item-icon" loading="lazy" onerror="this.style.display='none';">
                        <span class="calc-item-name">${item.name}</span>
                        <span class="calc-count">0</span>
                    </div>
                 `;
                }).join('');
                 for (const name in wastedItems) {
                     const itemEl = currentContainer.querySelector(`.home-calc-item[data-name="${item.name}"]`);
                     if(itemEl) { itemEl.classList.add('has-count'); itemEl.querySelector('.calc-count').textContent = wastedItems[name]; }
                 }
            };
             container?.addEventListener('click', e => {
                 const itemEl = e.target.closest('.home-calc-item');
                 if (!itemEl) return;
                 const name = itemEl.dataset.name;
                 wastedItems[name] = (wastedItems[name] || 0) + 1;
                 itemEl.classList.add('has-count');
                 itemEl.querySelector('.calc-count').textContent = wastedItems[name];
                 updateResult();
             });
             container?.addEventListener('keydown', e => {
                 if (e.key === 'Enter' || e.key === ' ') {
                    const itemEl = e.target.closest('.home-calc-item');
                    if (!itemEl) return;
                    e.preventDefault();
                    const name = itemEl.dataset.name;
                    wastedItems[name] = (wastedItems[name] || 0) + 1;
                    itemEl.classList.add('has-count');
                    itemEl.querySelector('.calc-count').textContent = wastedItems[name];
                    updateResult();
                 }
             });
             clearBtn.onclick = (e) => { e.preventDefault(); wastedItems = {}; updateResult(); renderItems(); };
             renderItems();
             updateResult();
        },

        openModal(modalId) {
             const modal = document.getElementById(modalId);
             if (modal) { modal.classList.add('is-visible'); }
        },
        closeModal(modalId) {
             const modal = document.getElementById(modalId);
             if (modal) { modal.classList.remove('is-visible'); }
        },

        openDetailModal({ title = 'Detalhes', content = '', actions = [], headerActions = '' } = {}) {
             const titleEl = document.getElementById('detail-modal-title');
             const bodyEl = document.getElementById('detail-modal-body');
             const footerEl = document.getElementById('detail-modal-footer');
             const headerActionsEl = document.getElementById('detail-modal-header-actions');
             if (!titleEl || !bodyEl || !footerEl || !headerActionsEl) return;
             titleEl.innerHTML = title;
             bodyEl.innerHTML = `<div class="detail-rich-content">${content}</div>`;
             headerActionsEl.innerHTML = headerActions || '';
             footerEl.innerHTML = (actions || []).map((action, index) => `<button type="button" class="btn ${action.className || 'btn-secondary'} detail-action-btn" data-detail-action-index="${index}">${action.icon ? `<i class="${action.icon}"></i>` : ''}${action.label}</button>`).join('');
             footerEl.querySelectorAll('[data-detail-action-index]').forEach(btn => {
                 btn.addEventListener('click', () => {
                     const cfg = actions[Number(btn.dataset.detailActionIndex)];
                     if (cfg && typeof cfg.onClick === 'function') cfg.onClick();
                 });
             });
             this.openModal('detail-modal');
        },

        setActiveModuleNav(selector, activeElement) {
             document.querySelectorAll(selector).forEach(el => el.classList.remove('active'));
             activeElement?.classList.add('active');
        },

        getPlannerDaysMap() {
             return { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' };
        },

        getAnalysisOptions() {
             return {
                gastos_categoria: { icon: 'fa-solid fa-layer-group', label: 'Gastos por categoria', note: 'Agrupa os itens das listas por categoria para mostrar o peso financeiro de cada grupo.' },
                validade_despensa: { icon: 'fa-solid fa-hourglass-half', label: 'Validade da despensa', note: 'Exibe risco de perda por vencimento com foco no que precisa de atenção imediata.' },
                uso_receitas: { icon: 'fa-solid fa-utensils', label: 'Uso de receitas', note: 'Mostra quais receitas estão guiando seu planejamento semanal.' }
             };
        },

        prefillChefPrompt(prompt, options = {}) {
            const modal = document.getElementById('ai-chat-modal');
            if (!modal) return;
            const input = modal.querySelector('#ai-chat-input');
            if (!input) return;

            const text = String(prompt || '').trim();
            if (text) input.value = text;

            setTimeout(() => {
                try { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } catch(e) {}
                if (options.autoSend) {
                    const btn = modal.querySelector('#ai-chat-send-btn');
                    if (btn) btn.click();
                }
            }, 50);
        },
        closeAllModals() {
            this.elements.modalOverlays?.forEach(overlay => overlay.classList.remove('is-visible'));
            this.elements.cardViewerOverlay?.classList.remove('active');
            this.closeSidebar();
        },
        showAuthModal() { this.openModal('auth-modal'); },
        showPlansModal(customMessage) {
             const plansModal = document.getElementById('plans-modal');
             if(plansModal){
                 const subtitleEl = plansModal.querySelector('p.page-subtitle');
                 if(subtitleEl) { subtitleEl.innerHTML = customMessage || 'Assine o plano do Alimente Fácil e organize sua rotina alimentar com simplicidade.'; }
                 this.updatePlanButtonsState();
             }
             this.openModal('plans-modal');
        },
        updatePlanButtonsState() {
            const plansModal = document.getElementById('plans-modal');
            if (!plansModal) return;
            plansModal.querySelectorAll('.plan-card').forEach(card => {
                const planId = card.id.replace('plan-', '');
                const button = card.querySelector('.btn[data-action="subscribe"]');
                const cancelLink = card.querySelector('.cancel-link');
                if (button) {
                     button.disabled = (planId === this.userPlan);
                     button.textContent = (planId === this.userPlan) ? 'Seu Plano Atual' : `Assinar ${planId.replace('_', ' ').replace('ai', 'IA')}`;
                }
                if (cancelLink) {
                    cancelLink.style.display = (planId === this.userPlan && planId !== 'free') ? 'block' : 'none';
                    cancelLink.onclick = (e) => {
                        e.preventDefault();
                        this.openConfirmModal("Cancelar Assinatura", `Tem certeza que deseja cancelar o plano ${planId}? Você voltará ao plano Gratuito.`, () => {
                            this.userPlan = 'free'; this.saveState(); this.closeModal('plans-modal'); this.showNotification("Assinatura cancelada.", "info"); this.updatePlanButtonsState(); this.activateModuleAndRender(this.activeModule);
                        });
                    };
                }
            });
            const freePlanCard = plansModal.querySelector('#plan-free');
            const freeButton = freePlanCard?.querySelector('.btn');
             if (freeButton) {
                 freeButton.disabled = (this.userPlan === 'free');
                 freeButton.textContent = (this.userPlan === 'free') ? 'Seu Plano Atual' : 'Usar Gratuito';
             }
        },

        openConfirmModal(title, message, onConfirm) {
             const confirmModal = document.getElementById('custom-confirm-modal');
             if (!confirmModal) return;
             confirmModal.classList.remove('recipe-editor-modal');
             confirmModal.querySelector('#confirm-title').textContent = title;
             confirmModal.querySelector('#confirm-message').innerHTML = message;
             const confirmOkBtn = confirmModal.querySelector('#confirm-ok-btn');
             const confirmCancelBtn = confirmModal.querySelector('#confirm-cancel-btn');
             confirmOkBtn.textContent = 'Confirmar';
             confirmOkBtn.classList.remove('primary');
             confirmOkBtn.classList.add('danger');
             confirmCancelBtn.style.display = 'inline-block';
             const newOkBtn = confirmOkBtn.cloneNode(true);
             confirmOkBtn.parentNode.replaceChild(newOkBtn, confirmOkBtn);
             newOkBtn.addEventListener('click', () => { if (onConfirm) onConfirm(); this.closeModal('custom-confirm-modal'); }, { once: true });
              const newCancelBtn = confirmCancelBtn.cloneNode(true);
              confirmCancelBtn.parentNode.replaceChild(newCancelBtn, confirmCancelBtn);
              newCancelBtn.addEventListener('click', () => this.closeModal('custom-confirm-modal'), { once: true });
             this.openModal('custom-confirm-modal');
        },
        showInfoModal(title, message) {
             const confirmModal = document.getElementById('custom-confirm-modal');
             if (!confirmModal) return;
             confirmModal.classList.remove('recipe-editor-modal');
             confirmModal.querySelector('#confirm-title').textContent = title;
             confirmModal.querySelector('#confirm-message').innerHTML = message;
             const confirmOkBtn = confirmModal.querySelector('#confirm-ok-btn');
             const confirmCancelBtn = confirmModal.querySelector('#confirm-cancel-btn');
             confirmCancelBtn.style.display = 'none';
             confirmOkBtn.textContent = 'OK';
             confirmOkBtn.classList.remove('danger');
             confirmOkBtn.classList.add('primary');
             const newOkBtn = confirmOkBtn.cloneNode(true);
             confirmOkBtn.parentNode.replaceChild(newOkBtn, confirmOkBtn);
             newOkBtn.addEventListener('click', () => this.closeModal('custom-confirm-modal'), { once: true });
             this.openModal('custom-confirm-modal');
        },
        showNotification(message, type = 'info') {
            document.querySelector('.notification')?.remove(); const notification = document.createElement('div'); notification.className = `notification ${type}`; notification.innerHTML = message; document.body.appendChild(notification);
            const styleId = 'notification-style'; if (!document.getElementById(styleId)) { const style = document.createElement('style'); style.id = styleId;
            style.innerHTML = `.notification { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); padding: 1rem 2rem; border-radius: 8px; color: #fff; z-index: 9999; opacity: 0; transition: opacity 0.5s, bottom 0.5s; font-family: 'Roboto', sans-serif; box-shadow: 0 5px 15px rgba(0,0,0,0.3); border: 1px solid var(--glass-border); background: var(--glass-color); backdrop-filter: blur(10px); }
            .notification.info { background: var(--glass-on-color); color: var(--glass-on-text); text-shadow: 0 1px 1px rgba(255,255,255,0.2); border-color: var(--glass-on-color); }
            .notification.success { background: var(--green); }
            .notification.error { background: var(--red); }
            .notification.show { opacity: 1; bottom: 40px; }`;
            document.head.appendChild(style); }
            setTimeout(() => notification.classList.add('show'), 10); setTimeout(() => { notification.classList.remove('show'); setTimeout(() => notification.remove(), 500); }, 3500);
        },

        closeSidebar() {
             this.elements.appSidebar?.classList.remove('is-open');
             this.elements.sidebarOverlay?.classList.remove('is-visible');
        },
        activateModuleAndRender(moduleKey) {
            if (!moduleKey || (this.activeModule === moduleKey && this.isAppMode)) return;
            if (['analises', 'planejador'].includes(moduleKey) && this.userPlan === 'free') {
                this.showPlansModal("Acesse este módulo com um plano Premium!");
                return;
            }
            if (moduleKey === 'lista' && this.userPlan === 'free' && Object.keys(this.state.listas).length >= 2 && !this.state.listas[this.activeListId]) {
                this.showPlansModal("Crie listas ilimitadas com o plano Premium!");
                return;
            }

            this.activeModule = moduleKey;
            this.activateModuleUI(moduleKey);
            this.renderModuleContent(moduleKey);
            this.closeSidebar();
            this.saveState();
        },

        activateModuleUI(moduleKey) {
            this.elements.navItems.forEach(nav => nav.classList.toggle('active', nav.dataset.module === moduleKey));
            this.elements.moduleContainers.forEach(container => { container.classList.toggle('active', container.id === `module-${moduleKey}`); });
             document.getElementById('list-manager')?.classList.remove('view-active-list');
             document.getElementById('module-receitas')?.classList.remove('detail-is-visible');
             document.querySelectorAll('.recipe-list-item.active').forEach(el => el.classList.remove('active'));
        },
        renderModuleContent(moduleKey) {
            const moduleContainer = document.getElementById(`module-${moduleKey}`);
            if (!moduleContainer) { console.error(`Container para módulo "${moduleKey}" não encontrado.`); this.elements.modulesArea.innerHTML = `<p>Erro: Módulo não encontrado.</p>`; return; }
            const renderMap = { 'inicio': this.renderInicio, 'lista': this.renderListas, 'despensa': this.renderDespensa, 'receitas': this.renderReceitas, 'planejador': this.renderPlanejador, 'analises': this.renderAnalises, 'configuracoes': this.renderConfiguracoes, };
            const renderFunction = renderMap[moduleKey];
            Object.values(this.charts).forEach(chart => chart?.destroy());
            this.charts = {};
            if (renderFunction) { renderFunction.call(this, moduleContainer); if (this.elements.modulesArea && moduleKey !== 'inicio') { this.elements.modulesArea.scrollTop = 0; } }
            else { moduleContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-person-digging"></i><p>Módulo "${moduleKey}" em construção.</p></div>`; }
        },

        renderAllPanelContent() {
             this.renderInicio(document.getElementById('module-inicio'));
             this.renderOrcamento();
             this.initSortableItems('lista-items-inicio');
             this.initSortableItems('despensa-items-inicio');
             if (window.innerWidth >= 992) { this.initSortableModules('modular-grid-container'); }
        },

renderListas(container) {
    if (!container) container = document.getElementById('module-lista');
    if (!container) return;

    container.innerHTML = `
        <div class="master-detail-layout" id="list-manager">
            <div class="md-list-column dashboard-card">
                <div class="card-header">
                    <h3><i class="fa-solid fa-list-ul"></i> Minhas Listas</h3>
                </div>
                <div class="card-content">
                    <button class="btn btn-secondary btn-create-list" style="width:100%; margin-bottom: 1rem;">
                        <i class="fa-solid fa-plus"></i> Nova Lista
                    </button>
                    <div id="saved-lists-container"></div>
                </div>
            </div>

            <div class="md-detail-column dashboard-card" id="lista-detail-desktop">
<div class="card-header">
    <button id="list-back-btn" class="icon-button mobile-only" aria-label="Voltar">
        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
    </button>
    <h3 id="active-list-title"><i class="fa-solid fa-cart-shopping"></i> Selecione uma Lista</h3>
</div>

                 <div class="add-item-form-container">
                    <form class="add-item-form">
                        <input type="hidden" id="active-list-id-input" value="">
                        <div class="form-group form-group-flex"> <label>Nome</label> <input type="text" id="lista-form-nome-full" placeholder="Ex: Arroz"> </div>
                        <div class="form-group form-group-small"> <label>Qtd</label> <input type="number" id="lista-form-qtd-full" value="1" min="0.1" step="any"> </div>
                        <div class="form-group form-group-small"> <label>Unid</label> <select id="lista-form-unid-full"><option value="un">un</option><option value="kg">kg</option><option value="g">g</option><option value="L">L</option><option value="ml">ml</option><option value="pct">pct</option><option value="cx">cx</option></select> </div>
                        <div class="form-group form-group-medium"> <label>Valor</label> <input type="text" id="lista-form-valor-full" placeholder="0.00"> </div>
                        <button type="submit" class="btn btn-primary btn-add-item" id="lista-add-item-btn-full"> <i class="fa-solid fa-plus"></i> </button>
                    </form>
                </div>
                 <div class="card-content no-padding-top" id="lista-items-full" data-group="shared-items" data-list-type="lista">
                    <div class="empty-state-placeholder"><p>Selecione uma lista ao lado para ver os itens.</p></div>
                 </div>
                 <div class="card-footer module-actions-footer" id="active-list-actions"></div>
            </div>
        </div>
    `;
    this.renderListasSalvas();

    if(window.innerWidth >= 992 && this.activeListId) {
        this.renderListaAtiva(this.activeListId);
    }
},

        renderListaWidget() {
            const container = document.getElementById('lista-items-inicio');
            const nomeContainer = document.getElementById('inicio-lista-nome');
            const listaAtual = this.state.listas[this.activeListId];
            if (!container || !nomeContainer) return;
            let listNameValue = '';
            let listNamePlaceholder = 'Insira o nome da lista...';
            if (listaAtual) {
                listNameValue = listaAtual.nome;
                container.innerHTML = listaAtual.items.map(item => this.createListaItemHTML(item)).join('');
                if (listaAtual.items.length === 0) { container.innerHTML = '<p class="empty-list-message">Lista vazia.</p>'; }
            } else { container.innerHTML = '<p class="empty-list-message">Adicione itens para criar sua lista.</p>'; }
            nomeContainer.innerHTML = `<input type="text" id="widget-list-name-input" value="${this.escapeHtml(listNameValue)}" placeholder="${listNamePlaceholder}" aria-label="Nome da lista ativa">`;
            const widgetInput = nomeContainer.querySelector('#widget-list-name-input');
            const saveName = () => {
                if (!widgetInput) return;
                const newName = widgetInput.value.trim();
                if (listaAtual) {
                    if (!newName) { widgetInput.value = listaAtual.nome; return; }
                    if (newName === listaAtual.nome) return;
                    this.state.listas[this.activeListId].nome = newName;
                    this.showNotification(`Lista "${newName}" renomeada!`, "info");
                    this.renderListasSalvas();
                    this.saveState();
                }
                const mainInput = document.getElementById('active-list-name-input');
                if (mainInput) mainInput.value = newName;
            };
            widgetInput?.addEventListener('blur', saveName);
            widgetInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); widgetInput.blur(); } });
            widgetInput?.addEventListener('input', (e) => { const mainInput = document.getElementById('active-list-name-input'); if (mainInput) mainInput.value = e.target.value; });
        },

        renderListaAtiva(listId) {
             const container = document.getElementById('lista-items-full'); const titleEl = document.getElementById('active-list-title'); const actionsContainer = document.getElementById('active-list-actions'); const idInput = document.getElementById('active-list-id-input'); const nameFormInput = document.getElementById('lista-form-nome-full'); const qtyFormInput = document.getElementById('lista-form-qtd-full'); const valorFormInput = document.getElementById('lista-form-valor-full');
             if (!container || !titleEl || !actionsContainer || !idInput || !nameFormInput || !qtyFormInput || !valorFormInput) return;
             let itemsHTML = ''; let listName = 'Nova Lista'; let listNameEditable = '';
             let listNamePlaceholder = 'Nome da Lista...';
             let actionsHTML = `
                 <span class="module-actions-spacer"></span>
                 <button class="icon-button" id="lista-save-changes-btn" title="Salvar"><i class="fa-solid fa-floppy-disk"></i></button>
             `;
             if (listId === null || listId === undefined || listId === 'new') {
                  idInput.value = 'new'; itemsHTML = '<p class="empty-list-message">Adicione itens à sua nova lista.</p>';
                  nameFormInput.value = ''; qtyFormInput.value = '1'; valorFormInput.value = '';
                  listNamePlaceholder = 'Insira o nome da lista...';
             } else {
                  const lista = this.state.listas[listId];
                  if (lista) {
                       idInput.value = listId; listName = this.escapeHtml(lista.nome); listNameEditable = lista.nome; listNamePlaceholder = 'Nome da Lista...';
                       itemsHTML = lista.items.map(item => this.createListaItemHTML(item)).join('');
                       if (lista.items.length === 0) { itemsHTML = '<p class="empty-list-message">Esta lista está vazia.</p>'; }
actionsHTML = `
                           <div style="display: flex; gap: 10px; width: 100%; justify-content: flex-end;">
                               <button class="icon-button" id="lista-save-changes-btn" title="Salvar" style="color: var(--primary-color); border-color: var(--primary-color);"><i class="fa-solid fa-floppy-disk"></i></button>
                               <button class="icon-button danger" id="lista-delete-btn" title="Excluir" style="color: var(--red); border-color: rgba(255,59,48,0.3);"><i class="fa-solid fa-trash"></i></button>
                           </div>
                       `;

                  } else { idInput.value = ''; listName = 'Erro: Lista não encontrada'; itemsHTML = '<p class="empty-list-message error">Erro ao carregar a lista.</p>'; actionsHTML = ''; }
             }
             titleEl.innerHTML = `<i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> <input type="text" id="active-list-name-input" value="${listNameEditable}" placeholder="${listNamePlaceholder}" aria-label="Nome da lista ativa">`;
             actionsContainer.innerHTML = actionsHTML; container.innerHTML = itemsHTML;
             this.initSortableItems('lista-items-full');
        },

        handleOpenListViewModal(listId) {
            const lista = this.state.listas[listId];
            if (!lista) return;

            const modalHeader = document.querySelector('#list-view-modal .modal-header');
            const modalBody = document.getElementById('list-view-modal-body');
            const modalFooter = document.getElementById('list-view-modal-footer');
            const idInput = document.getElementById('modal-list-id-input');

            if (modalHeader) {
                modalHeader.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1; overflow: hidden;">
                        <button class="icon-button" data-modal-close="list-view-modal" style="border:none; background:transparent; font-size:1.2rem;"><i class="fa-solid fa-arrow-left"></i></button>
                        <h3 style="margin:0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 1.1rem;">${this.escapeHtml(lista.nome)}</h3>
                    </div>
                `;
            }

            if (modalFooter) {
                modalFooter.innerHTML = `
                    <button class="icon-button share-btn" data-list-id="${listId}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
                    <button class="icon-button print-btn" data-list-id="${listId}" title="Imprimir"><i class="fa-solid fa-print"></i></button>
                    <button class="icon-button pdf-btn" data-list-id="${listId}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
                    <button class="icon-button delete-list-btn" data-list-id="${listId}" title="Excluir"><i class="fa-solid fa-trash" style="color: var(--red);"></i></button>
                `;
            }

            if (idInput) idInput.value = listId;

            if (modalBody) {
                modalBody.setAttribute('data-list-id', listId);
                modalBody.innerHTML = lista.items.map(item => this.createListaItemHTML(item)).join('');
                if (lista.items.length === 0) {
                    modalBody.innerHTML = '<p class="empty-list-message">Lista vazia.</p>';
                }
                this.initSortableItems('list-view-modal-body');
            }

            this.openModal('list-view-modal');

            const editBtn = document.getElementById('list-view-edit-btn');
            if (editBtn) {
                editBtn.onclick = () => {
                    this.closeModal('list-view-modal');
                    this.openListEditView(listId);
                };
            }
        },

handleOpenPantryView(itemEl) {
            const id = itemEl.dataset.id;
            const item = this.state.despensa.find(i => i.id.toString() === id);
            if (!item) return;

            const actionsContainer = document.getElementById('pantry-view-actions-container');
            if (actionsContainer) {
                actionsContainer.innerHTML = `<button class="btn btn-danger delete-btn" data-item-id="${id}"><i class="fa-solid fa-trash"></i> Excluir</button>`;
            }

            const nameInput = document.getElementById('pantry-edit-name');
            const qtdInput = document.getElementById('pantry-edit-qtd');
            const unidSelect = document.getElementById('pantry-edit-unid');
            const stockInput = document.getElementById('pantry-edit-stock');
            const validadeInput = document.getElementById('pantry-edit-validade');
            const idHidden = document.getElementById('pantry-edit-id');

            if(nameInput) nameInput.value = item.name;
            if(qtdInput) qtdInput.value = item.qtd || 1;
            if(unidSelect) unidSelect.value = item.unid || 'un';
            if(validadeInput) validadeInput.value = item.validade || '';
            if(idHidden) idHidden.value = item.id;

            if(stockInput) {
                stockInput.value = item.stock || 100;
                const updateLabels = (val) => {
                    const labels = document.querySelectorAll('.stock-labels span');
                    labels.forEach(l => l.style.color = '#666');
                    if(val < 25) labels[0].style.color = 'var(--red)';
                    else if(val < 50) labels[1].style.color = 'var(--accent-yellow)';
                    else if(val < 75) labels[2].style.color = 'var(--primary-color)';
                    else labels[3].style.color = 'var(--green)';
                };
                updateLabels(stockInput.value);
                stockInput.oninput = (e) => updateLabels(e.target.value);
            }

            this.openModal('pantry-view-modal');
        },

handleSavePantryEdit() {
             const btn = document.getElementById('pantry-save-btn');
             const originalText = btn ? btn.innerHTML : 'Salvar';
             if(btn) { btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...'; btn.disabled = true; }

             setTimeout(() => {
                 const id = document.getElementById('pantry-edit-id').value;
                 if (!id) { if(btn){btn.innerHTML = originalText; btn.disabled = false;} return; }

                 const type = document.getElementById('pantry-edit-form-fullscreen')?.dataset.editType || 'despensa';
                 const listId = document.getElementById('pantry-edit-form-fullscreen')?.dataset.listId;

                 const updatedData = {
                     name: document.getElementById('pantry-edit-name').value.trim() || "Item sem nome",
                     qtd: parseFloat(document.getElementById('pantry-edit-qtd').value) || 1,
                     unid: document.getElementById('pantry-edit-unid').value,
                 };

                 if (type === 'despensa') {
                     updatedData.stock = parseInt(document.getElementById('pantry-edit-stock').value) || 100;
                     updatedData.validade = document.getElementById('pantry-edit-validade').value || null;
                     const itemIndex = this.state.despensa.findIndex(i => i.id.toString() === id);
                     if (itemIndex > -1) {
                         this.state.despensa[itemIndex] = { ...this.state.despensa[itemIndex], ...updatedData };
                         this.renderDespensaWidget();
                         if(this.activeModule === 'despensa') this.renderDespensa();
                         this.showNotification("Item atualizado com sucesso!", "success");
                     }
                 } else if (type === 'lista' && listId && this.state.listas[listId]) {
                     const itemIndex = this.state.listas[listId].items.findIndex(i => i.id.toString() === id);
                     if (itemIndex > -1) {
                         this.state.listas[listId].items[itemIndex] = { ...this.state.listas[listId].items[itemIndex], ...updatedData };
                         const modalBody = document.querySelector(`#list-view-modal-body[data-list-id="${listId}"]`);
                         if (modalBody && document.getElementById('list-view-modal').classList.contains('is-visible')) { const lista = this.state.listas[listId]; modalBody.innerHTML = lista.items.map(item => this.createListaItemHTML(item)).join(''); }
                         else { this.renderListaAtiva(listId); }
                         this.renderListaWidget(); this.renderOrcamento();
                         this.showNotification("Item atualizado com sucesso!", "success");
                     }
                 }

                 this.saveState();
                 this.closeModal('pantry-view-modal');

                 if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
             }, 600);
        },

        renderListItemDetailDesktop(item, listId) {
            const container = document.getElementById('lista-detail-desktop');
            if(!container) return;
            container.innerHTML = `
                <div class="card-header">
                    <h3><i class="fa-solid fa-pencil"></i> Editar: ${this.escapeHtml(item.name)}</h3>
                    <div class="card-actions">
                        <button class="icon-button" style="color:var(--red); border-color:var(--red);" onclick="app.handleDeleteItem('lista', '${item.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="card-content">
                    <form id="list-item-desktop-form" onsubmit="return false;" style="max-width: 600px; margin: 0 auto;">
                        <div class="form-group">
                            <label>Nome do Item</label>
                            <input type="text" id="edit-item-name-dt" value="${this.escapeHtml(item.name)}" class="input-large">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Quantidade</label>
                                <div class="stepper-control">
                                    <button type="button" class="stepper-btn minus" onclick="this.nextElementSibling.value = Math.max(0.1, parseFloat(this.nextElementSibling.value) - 1)"><i class="fa-solid fa-minus"></i></button>
                                    <input type="number" id="edit-item-qtd-dt" value="${item.qtd || 1}" step="any" style="width: 70px !important; text-align: center; font-size: 1.3rem !important; font-weight: bold; background: transparent !important; border: none !important; box-shadow: none !important;">
                                    <button type="button" class="stepper-btn plus" onclick="this.previousElementSibling.value = parseFloat(this.previousElementSibling.value) + 1"><i class="fa-solid fa-plus"></i></button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Unidade</label>
                                 <select id="edit-item-unid-dt" class="input-large">
                                    ${['un','kg','g','L','ml','pct','cx'].map(u => `<option value="${u}" ${item.unid === u ? 'selected' : ''}>${u}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Valor (R$)</label>
                            <input type="number" id="edit-item-valor-dt" value="${parseFloat(item.valor || 0).toFixed(2)}" class="input-large" step="0.01">
                        </div>
                    </form>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary" id="list-item-save-btn-dt" style="width:100%;"><i class="fa-solid fa-save"></i> Salvar Alterações</button>
                </div>
            `;

            document.getElementById('list-item-save-btn-dt').addEventListener('click', () => {
                const name = document.getElementById('edit-item-name-dt').value.trim();
                const qtd = parseFloat(document.getElementById('edit-item-qtd-dt').value) || 1;
                const unid = document.getElementById('edit-item-unid-dt').value;
                const valor = parseFloat(document.getElementById('edit-item-valor-dt').value) || 0;

                if(this.state.listas[listId]) {
                    const itemIndex = this.state.listas[listId].items.findIndex(i => i.id.toString() === item.id.toString());
                    if (itemIndex > -1) {
                        this.state.listas[listId].items[itemIndex] = { ...this.state.listas[listId].items[itemIndex], name, qtd, unid, valor: valor.toFixed(2) };
                        this.saveState();
                        this.renderListaAtiva(listId);
                        this.renderListaWidget();
                        this.renderOrcamento();
                        this.showNotification("Item da lista atualizado!", "success");
                    }
                }
            });
        },

renderListasSalvas() {
            const container = document.getElementById('saved-lists-container');
            if(!container) return;
            const listIds = Object.keys(this.state.listas);
            container.innerHTML = listIds.map(listId => {
                const lista = this.state.listas[listId];
                return this.renderUniversalCard({
                    type: 'saved-list',
                    data: {
                        id: listId,
                        name: lista.nome,
                        items: lista.items || []
                    },
                    actions: [
                        { type: 'edit select-list-btn', icon: 'fa-solid fa-pencil', label: 'Editar' },
                        { type: 'danger delete-list-btn', icon: 'fa-solid fa-trash', label: 'Excluir' }
                    ],
                    isClickable: true
                });
            }).join('');
            if(listIds.length === 0) { container.innerHTML = '<p class="empty-list-message">Nenhuma lista salva. Crie uma nova acima!</p>'; }
        },
renderDespensa(container) {
    if (!container) container = document.getElementById('module-despensa');
    if (!container) return;

    container.innerHTML = `
        <div class="master-detail-layout">
            <div class="md-list-column dashboard-card">
                <div class="card-header">
                    <h3><i class="fa-solid fa-box-archive"></i> Despensa</h3>
                </div>
                <div class="card-content" id="despensa-items-full" data-group="shared-items" data-list-type="despensa">
                     <button class="btn btn-secondary btn-create-list add-item-despensa-btn" style="width:100%; margin-bottom: 1rem;">
                        <i class="fa-solid fa-plus"></i> Adicionar Item
                     </button>
                     <div id="despensa-list-container"></div>
                </div>
            </div>

            <div class="md-detail-column dashboard-card" id="despensa-detail-desktop">
                <div class="empty-state-placeholder">
                    <i class="fa-solid fa-arrow-left" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>Selecione um item da despensa para ver os detalhes e editar.</p>
                </div>
            </div>
        </div>
    `;

    const listContainer = document.getElementById('despensa-list-container');
    const sortedDespensa = [...this.state.despensa].sort((a, b) => {
        const dateA = a.validade ? new Date(a.validade + "T00:00:00-03:00").getTime() : Infinity;
        const dateB = b.validade ? new Date(b.validade + "T00:00:00-03:00").getTime() : Infinity;
        return (dateA - dateB) || a.name.localeCompare(b.name);
    });

    listContainer.innerHTML = sortedDespensa.map(item => this.createDespensaItemHTML(item)).join('');
    if(sortedDespensa.length === 0){ listContainer.innerHTML += '<p class="empty-list-message">Sua despensa está vazia.</p>'; }
    this.initSortableItems('despensa-items-full');
},

        renderDespensaWidget() {
             const container = document.getElementById('despensa-items-inicio');
             if (!container) return;
             const sortedDespensa = [...this.state.despensa].sort((a, b) => { const dateA = a.validade ? new Date(a.validade + "T00:00:00-03:00").getTime() : Infinity; const dateB = b.validade ? new Date(b.validade + "T00:00:00-03:00").getTime() : Infinity; if (dateA !== dateB) return dateA - dateB; return a.name.localeCompare(b.name); });
             container.innerHTML = sortedDespensa.map(item => this.createDespensaItemHTML(item)).join('');
             if(sortedDespensa.length === 0){ container.innerHTML = '<p class="empty-list-message">Despensa vazia.</p>'; }
        },

renderReceitas(container) {
             if (!container) container = document.getElementById('module-receitas');
             if (!container) return;

             container.innerHTML = `
                <div class="master-detail-layout">
                    <div class="md-list-column dashboard-card">
                         <div class="card-header">
                              <h3><i class="fa-solid fa-utensils"></i> Receitas</h3>
                         </div>
                         <div class="card-content">
                              <button class="btn btn-secondary add-recipe-btn" style="width:100%; margin-bottom: 1rem;">
                                  <i class="fa-solid fa-plus"></i> Nova Receita
                              </button>
                              <div id="main-recipe-grid"></div>
                         </div>

                    </div>

                    <div class="md-detail-column dashboard-card">
                         <div class="card-header" style="background: rgba(255,255,255,0.05);">
                              <h3 id="recipe-detail-title-desktop"><i class="fa-solid fa-book-open"></i> Detalhes</h3>
                         </div>
                         <div class="card-content" id="recipe-detail-desktop-body">
                              <div class="empty-state-placeholder">
                                   <i class="fa-solid fa-utensils" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                                   <p>Selecione uma receita para ver ingredientes e preparo.</p>
                              </div>
                         </div>
                         <div class="card-footer" id="recipe-detail-desktop-footer" style="display:none;"></div>
                    </div>
                </div>
             `;

const listContainer = document.getElementById('main-recipe-grid');
             const recipes = Object.values(this.state.receitas);

             listContainer.innerHTML = recipes.map(recipe => {
                 return this.renderUniversalCard({
                     type: 'recipe',
                     data: {
                         id: recipe.id,
                         name: recipe.name,
                         ingredients: recipe.ingredients || recipe.ingredientes || recipe.ingredientes?.items || []
                     },
                     actions: [
                         { type: 'edit edit-recipe-btn', icon: 'fa-solid fa-pencil', label: 'Editar' },
                         { type: 'danger delete-recipe-btn', icon: 'fa-solid fa-trash', label: 'Excluir' }
                     ],
                     isClickable: true
                 });
             }).join('');

if(recipes.length === 0){ listContainer.innerHTML = '<p class="empty-list-message">Nenhuma receita criada.</p>'; }
        },

        renderPantryDetailDesktop(item) {

    const container = document.getElementById('despensa-detail-desktop');
    if(!container) return;

    let validadeDisplay = "Não informada";
    let validadeClass = "";
    if (item.validade) {
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const [y, m, d] = item.validade.split('-').map(Number);
        const dataVal = new Date(y, m - 1, d); dataVal.setHours(0,0,0,0);
        const diffTime = dataVal - hoje;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) { validadeDisplay = `Vencido há ${Math.abs(diffDays)} dias`; validadeClass = "color: var(--red); font-weight: bold;"; }
        else if (diffDays === 0) { validadeDisplay = "Vence Hoje!"; validadeClass = "color: var(--red); font-weight: bold;"; }
        else if (diffDays <= 7) { validadeDisplay = `Vence em ${diffDays} dias`; validadeClass = "color: var(--accent-yellow);"; }
        else { validadeDisplay = item.validade.split('-').reverse().join('/'); }
    }

    container.innerHTML = `
        <div class="card-header">
            <h3><i class="fa-solid fa-pencil"></i> Editar: ${this.escapeHtml(item.name)}</h3>
            <div class="card-actions">
                <button class="icon-button" style="color:var(--red); border-color:var(--red);" onclick="app.handleDeleteItem('despensa', '${item.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
        <div class="card-content">
            <form id="pantry-desktop-form" onsubmit="return false;">
                <input type="hidden" id="pantry-edit-id" value="${item.id}">

                <div class="form-group">
                    <label>Nome do Item</label>
                    <input type="text" id="pantry-edit-name" value="${this.escapeHtml(item.name)}" class="input-large">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Quantidade</label>
                        <div class="stepper-control">
                            <button type="button" class="stepper-btn minus"><i class="fa-solid fa-minus"></i></button>
                            <input type="number" id="pantry-edit-qtd" value="${item.qtd || 1}">
                            <button type="button" class="stepper-btn plus"><i class="fa-solid fa-plus"></i></button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Unidade</label>
                         <select id="pantry-edit-unid" class="input-large">
                            ${['un','kg','g','L','ml','pct','cx'].map(u => `<option value="${u}" ${item.unid === u ? 'selected' : ''}>${u}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Validade <span style="font-size:0.8em; margin-left:10px; ${validadeClass}">(${validadeDisplay})</span></label>
                    <input type="date" id="pantry-edit-validade" value="${item.validade || ''}" class="input-large">
                </div>

                <div class="form-group">
                    <label>Nível de Estoque</label>
                    <input type="range" id="pantry-edit-stock" min="0" max="100" step="25" class="stock-range" value="${item.stock || 100}">
                    <div class="stock-labels"><span>Vazio</span><span>Baixo</span><span>Médio</span><span>Cheio</span></div>
                </div>
            </form>
        </div>
        <div class="card-footer">
            <button class="btn btn-primary" id="pantry-save-btn" style="width:100%;"><i class="fa-solid fa-save"></i> Salvar Alterações</button>
        </div>
    `;

    const stockInput = document.getElementById('pantry-edit-stock');
    if(stockInput) {
        const updateLabels = (val) => {
            const labels = container.querySelectorAll('.stock-labels span');
            labels.forEach(l => l.style.color = '#666');
            if(val < 25) labels[0].style.color = 'var(--red)';
            else if(val < 50) labels[1].style.color = 'var(--accent-yellow)';
            else if(val < 75) labels[2].style.color = 'var(--primary-color)';
            else labels[3].style.color = 'var(--green)';
        };
        updateLabels(stockInput.value);
        stockInput.oninput = (e) => updateLabels(e.target.value);
    }
},

        renderRecipeDetail(recipeId, targetElementId = 'recipe-detail-desktop-body', footerElementId = 'recipe-detail-desktop-footer') {
             const recipe = this.state.receitas[recipeId];
             const bodyEl = document.getElementById(targetElementId);
             const footerEl = document.getElementById(footerElementId);
             if (!recipe || !bodyEl || !footerEl) {
                 if (bodyEl) bodyEl.innerHTML = '<div class="recipe-detail-placeholder"><i class="fa-solid fa-question-circle"></i><p>Receita não encontrada.</p></div>';
                 if (footerEl) footerEl.style.display = 'none';
                 return;
             }
             bodyEl.innerHTML = `<div class="detail-rich-content recipe-rich-content">${recipe.content}</div>`;
             footerEl.classList.add('module-actions-footer', 'unified-detail-actions');
             footerEl.innerHTML = `
                <button type="button" class="icon-button share-btn" data-recipe-id="${recipeId}" title="Compartilhar" aria-label="Compartilhar receita">
                    <i class="fa-solid fa-share-nodes"></i><span>Compartilhar</span>
                </button>
                <button type="button" class="icon-button print-btn" data-recipe-id="${recipeId}" title="Imprimir" aria-label="Imprimir receita">
                    <i class="fa-solid fa-print"></i><span>Imprimir</span>
                </button>
                <button type="button" class="icon-button pdf-btn" data-recipe-id="${recipeId}" title="PDF" aria-label="Gerar PDF da receita">
                    <i class="fa-solid fa-file-pdf"></i><span>PDF</span>
                </button>
                <button type="button" class="icon-button edit-recipe-btn" data-recipe-id="${recipeId}" title="Editar" aria-label="Editar receita">
                    <i class="fa-solid fa-pen"></i><span>Editar</span>
                </button>
                <button type="button" class="icon-button delete-recipe-btn danger" data-recipe-id="${recipeId}" title="Excluir" aria-label="Excluir receita">
                    <i class="fa-solid fa-trash"></i><span>Excluir</span>
                </button>
             `;
             footerEl.style.display = 'grid';
        },

        showRecipeDetailModal(recipeId) {
             const recipe = this.state.receitas[recipeId];
             if (!recipe) return;
             this.openDetailModal({
                 title: `<i class="fa-solid fa-utensils"></i> ${this.escapeHtml(recipe.name)}`,
                 content: `<div class="recipe-rich-content">${recipe.content}</div>`,
                 actions: [
                    { label: 'Compartilhar', className: 'btn btn-secondary detail-action-btn share-btn', icon: 'fa-solid fa-share-nodes', onClick: () => this.handleRealShare(recipe.name, `Veja esta receita: ${recipe.name}`) },
                    { label: 'Imprimir', className: 'btn btn-secondary detail-action-btn print-btn', icon: 'fa-solid fa-print', onClick: () => this.handleRealPDF() },
                    { label: 'PDF', className: 'btn btn-secondary detail-action-btn pdf-btn', icon: 'fa-solid fa-file-pdf', onClick: () => this.handleRealPDF() },
                    { label: 'Editar', className: 'btn btn-primary detail-action-btn edit-recipe-btn', icon: 'fa-solid fa-pen', onClick: () => { this.closeModal('detail-modal'); this.handleOpenRecipeEditModal(recipeId); } },
                    { label: 'Excluir', className: 'btn btn-danger detail-action-btn delete-recipe-btn', icon: 'fa-solid fa-trash', onClick: () => { this.closeModal('detail-modal'); this.handleDeleteRecipe(recipeId); } }
                 ]
             });
        },

        renderPlannerWidget() {
             const container = document.getElementById('planner-widget-content');
             if (!container) return;
             const days = { seg: "SEG", ter: "TER", qua: "QUA", qui: "QUI", sex: "SEX", sab: "SAB", dom: "DOM" };
             let html = '';
             for (const dayKey in days) {
                  html += `<div class="planner-day-row"><strong>${days[dayKey]}</strong>`;
                  const dayMeals = this.state.planejador[dayKey];
                  html += `<div class="planner-meals" id="planner-day-${dayKey}">`;
                  if (dayMeals) {
                       if (dayMeals.cafe) html += `<span>C: <strong>${this.escapeHtml(dayMeals.cafe.name)}</strong></span>`;
                       if (dayMeals.almoco) html += `<span>A: <strong>${this.escapeHtml(dayMeals.almoco.name)}</strong></span>`;
                       if (dayMeals.jantar) html += `<span>J: <strong>${this.escapeHtml(dayMeals.jantar.name)}</strong></span>`;
                  }
                   if (!dayMeals || (!dayMeals.cafe && !dayMeals.almoco && !dayMeals.jantar)) { html += `<span style="opacity: 0.6;">Vazio</span>`; }
                  html += `</div>`;
                   html += `<div class="planner-day-actions"><button class="icon-button add-meal-btn" title="Adicionar Refeição" aria-label="Adicionar refeição para ${days[dayKey]}" data-modal-open="recipe-picker-modal" data-day-target="${dayKey}"><i class="fa-solid fa-plus" aria-hidden="true"></i></button></div>`;
                  html += `</div>`;
             }
             container.innerHTML = html;
        },

renderPlanejador(container) {
             if (!container) container = document.getElementById('module-planejador');
             if (!container) return;
             const days = this.getPlannerDaysMap();
             const dayButtons = Object.entries(days).map(([dayKey, dayLabel]) => {
                 const meals = this.state.planejador[dayKey] || {};
                 const totalMeals = ['cafe','almoco','jantar'].filter(key => meals[key]).length;
                 return `<button type="button" class="module-nav-item planner-day-nav ${dayKey === 'seg' ? 'active' : ''}" data-day="${dayKey}"><strong>${dayLabel}</strong><span>${totalMeals ? `${totalMeals} refeição(ões)` : 'Sem refeições'}</span></button>`;
             }).join('');

             container.innerHTML = `
                  <div class="master-detail-layout">
                       <div class="md-list-column dashboard-card">
                           <div class="card-header">
                               <h3><i class="fa-solid fa-calendar-week" aria-hidden="true"></i> Planejador</h3>
                               <div class="card-actions">
                                   <button class="btn btn-danger clear-plan-btn"><i class="fa-solid fa-eraser"></i> Limpar tudo</button>
                               </div>
                           </div>
                           <div class="card-content">
                               <div class="module-nav-list">${dayButtons}</div>
                           </div>
                       </div>
                       <div class="md-detail-column dashboard-card" id="planner-detail-desktop"></div>
                  </div>
             `;

             if (window.innerWidth >= 992) this.renderPlannerDetailDesktop('seg');
        },

        renderPlannerDetailDesktop(dayKey = 'seg') {
             const container = document.getElementById('planner-detail-desktop');
             if (!container) return;
             const days = this.getPlannerDaysMap();
             const mealsMap = { cafe: 'Café da Manhã', almoco: 'Almoço', jantar: 'Jantar' };
             const dayMeals = this.state.planejador[dayKey] || {};
             const mealRows = Object.entries(mealsMap).map(([mealKey, mealLabel]) => {
                 const meal = dayMeals[mealKey];
                 if (!meal) {
                     return `<div class="detail-listing-item"><div><strong>${mealLabel}</strong><p class="detail-note">Nenhuma receita planejada.</p></div><button type="button" class="btn btn-secondary add-meal-slot-btn" data-day-target="planner-full-${dayKey}-${mealKey}"><i class="fa-solid fa-plus"></i> Adicionar</button></div>`;
                 }
                 return `<div class="detail-listing-item planner-meal-item" data-recipe-id="${meal.id}" data-day="${dayKey}" data-meal="${mealKey}"><div><strong class="meal-item-name">${this.escapeHtml(mealLabel)} • ${this.escapeHtml(meal.name)}</strong><p class="detail-note">Toque em visualizar para abrir a receita ou use as ações para concluir/remover.</p></div><div class="module-detail-actions"><button type="button" class="btn btn-secondary meal-view-btn"><i class="fa-solid fa-eye"></i> Ver</button><button type="button" class="btn btn-secondary meal-complete-btn"><i class="fa-solid fa-check"></i> Concluir</button><button type="button" class="btn btn-danger meal-delete-btn"><i class="fa-solid fa-trash"></i> Remover</button></div></div>`;
             }).join('');

             container.innerHTML = `
                <div class="card-header">
                    <h3><i class="fa-solid fa-calendar-day"></i> ${days[dayKey] || 'Dia'}</h3>
                    <div class="card-actions">
                        <button class="icon-button day-clear-btn" data-day="${dayKey}" title="Limpar dia"><i class="fa-solid fa-eraser"></i></button>
                    </div>
                </div>
                <div class="card-content">
                    <div class="detail-kpi-grid">
                        <div class="detail-kpi"><strong>${Object.values(dayMeals).filter(Boolean).length}</strong><span>refeições planejadas</span></div>
                        <div class="detail-kpi"><strong>${Object.values(dayMeals).filter(m => m && m.completed).length}</strong><span>concluídas</span></div>
                    </div>
                    <div class="detail-stack" style="margin-top:1rem;">
                        ${mealRows}
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary add-meal-btn" data-day-target="${dayKey}"><i class="fa-solid fa-plus"></i> Adicionar refeição</button>

                </div>
             `;
        },

        openPlannerDayDetailModal(dayKey) {
             const days = this.getPlannerDaysMap();
             const mealsMap = { cafe: 'Café da Manhã', almoco: 'Almoço', jantar: 'Jantar' };
             const dayMeals = this.state.planejador[dayKey] || {};
             const content = Object.entries(mealsMap).map(([mealKey, mealLabel]) => {
                 const meal = dayMeals[mealKey];
                 if (!meal) {
                     return `<div class="detail-listing-item planner-meal-item planner-meal-item--empty">
                        <div class="planner-meal-copy">
                            <strong class="meal-item-name">${mealLabel}</strong>
                            <p class="detail-note">Nenhuma receita planejada.</p>
                        </div>
                        <div class="module-detail-actions">
                            <button type="button" class="btn btn-secondary add-meal-slot-btn" data-day-target="planner-full-${dayKey}-${mealKey}"><i class="fa-solid fa-plus"></i> Adicionar</button>
                        </div>
                     </div>`;
                 }
                 return `<div class="detail-listing-item planner-meal-item" data-recipe-id="${meal.id}" data-day="${dayKey}" data-meal="${mealKey}">
                    <div class="planner-meal-copy">
                        <strong class="meal-item-name">${this.escapeHtml(mealLabel)} • ${this.escapeHtml(meal.name)}</strong>
                        <p class="detail-note">Use os botões abaixo para visualizar, concluir ou remover.</p>
                    </div>
                    <div class="module-detail-actions">
                        <button type="button" class="btn btn-secondary meal-view-btn planner-modal-meal" data-recipe-id="${meal.id}"><i class="fa-solid fa-eye"></i> Ver</button>
                        <button type="button" class="btn btn-secondary meal-complete-btn planner-modal-meal" data-day="${dayKey}" data-meal="${mealKey}"><i class="fa-solid fa-check"></i> Concluir</button>
                        <button type="button" class="btn btn-danger meal-delete-btn planner-modal-meal" data-day="${dayKey}" data-meal="${mealKey}"><i class="fa-solid fa-trash"></i> Remover</button>
                    </div>
                 </div>`;
             }).join('');
             this.openDetailModal({
                title: `<i class="fa-solid fa-calendar-day"></i> ${days[dayKey] || 'Dia'}`,
                content,
                actions: [
                    { label: 'Adicionar refeição', className: 'btn-primary', icon: 'fa-solid fa-plus', onClick: () => { this.closeModal('detail-modal'); this.currentPlannerDayTarget = dayKey; this.populateRecipePicker(); this.openModal('recipe-picker-modal'); } },
                ]
             });
        },

        renderInicio(container) {
            if (!container) container = document.getElementById('module-inicio');
            if (!container) return;
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
            const userName = this.state.user.nome || 'Usuário';
            container.innerHTML = `
                <div class="welcome-section">
                    <div class="welcome-header">
                        <h2>${greeting}, <strong>${this.escapeHtml(userName)}</strong>.</h2>
                        <p class="welcome-subtitle">Painel de Controle</p>
                    </div>
                </div>
                <div class="quick-actions-grid quick-actions-grid--six">
                    <div class="action-card list" data-module-target="lista">
                        <i class="fa-solid fa-cart-shopping"></i>
                        <span>Listas</span>
                        <small>Compras</small>
                    </div>
                    <div class="action-card pantry" data-module-target="despensa">
                        <i class="fa-solid fa-box-archive"></i>
                        <span>Despensa</span>
                        <small>Estoque</small>
                    </div>
                    <div class="action-card recipe" data-module-target="receitas">
                        <i class="fa-solid fa-utensils"></i>
                        <span>Receitas</span>
                        <small>Catálogo</small>
                    </div>
                    <div class="action-card planner" data-module-target="planejador">
                        <i class="fa-solid fa-calendar-days"></i>
                        <span>Planejador</span>
                        <small>Cardápio</small>
                    </div>
                    <div class="action-card analytics" data-module-target="analises">
                        <i class="fa-solid fa-chart-pie"></i>
                        <span>Análises</span>
                        <small>Gastos</small>
                    </div>
                    <div class="action-card config" data-module-target="configuracoes">
                        <i class="fa-solid fa-sliders"></i>
                        <span>Ajustes</span>
                        <small>Sistema</small>
                    </div>
                </div>
            `;
            this.renderOrcamento();
        },

renderOrcamento() {
            const totalOrcamento = this.state.orcamento.total || 0;

            let valorTotalDespensa = this.state.despensa.reduce((acc, item) => {
                const valor = parseFloat(item.valor) || 0;
                const quantidade = parseFloat(item.qtd) || 0;
                return acc + (valor * quantidade);
            }, 0);

            const percent = totalOrcamento > 0 ? (valorTotalDespensa / totalOrcamento) * 100 : 0;
            const totalDisplay = document.getElementById('budget-total-display');
            const spentDisplay = document.getElementById('budget-spent-display');
            const barFill = document.getElementById('budget-bar-fill-display');
            const budgetInput = document.getElementById('budget-total-input');

            if(totalDisplay) totalDisplay.textContent = parseFloat(totalOrcamento).toFixed(0);
            if(spentDisplay) spentDisplay.textContent = valorTotalDespensa.toFixed(2);

            if(barFill) {
                barFill.style.width = `${Math.min(percent, 100)}%`;

                if (percent > 100) barFill.style.backgroundColor = 'var(--red)';
                else if (percent > 80) barFill.style.backgroundColor = 'var(--accent-yellow)';
                else barFill.style.backgroundColor = 'var(--green)';
            }

            if(budgetInput) budgetInput.value = parseFloat(totalOrcamento).toFixed(2);
        },

        renderItensEssenciais() {
            const container = document.getElementById('essentials-list-container');
            if(!container) return;
            container.innerHTML = this.state.essenciais.map(item => this.createEssentialItemHTML(item)).join('');
            if(this.state.essenciais.length === 0){ container.innerHTML = '<p class="empty-list-message">Nenhum item essencial adicionado.</p>'; }
        },

        renderAnalises(container) {
             if (!container) container = document.getElementById('module-analises');
             if (!container) return;
             const analysisOptions = this.getAnalysisOptions();
             const nav = Object.entries(analysisOptions).map(([key, cfg], index) => `<button type="button" class="module-nav-item analysis-nav-item ${index === 0 ? 'active' : ''}" data-analysis-key="${key}"><strong>${cfg.label}</strong><span>${cfg.note}</span></button>`).join('');
             container.innerHTML = `
                  <div class="master-detail-layout">
                       <div class="md-list-column dashboard-card">
                           <div class="card-header"><h3><i class="fa-solid fa-chart-line"></i> Análises</h3></div>
                           <div class="card-content"><div class="module-nav-list">${nav}</div></div>
                       </div>
                       <div class="md-detail-column dashboard-card" id="analises-detail-desktop"></div>
                  </div>
             `;
             const firstKey = Object.keys(analysisOptions)[0];
             if (window.innerWidth >= 992) this.renderAnalysisDetailDesktop(firstKey);
             else {
                 const select = document.getElementById('analysis-data-select');
                 if (select) select.value = firstKey;
             }
        },

        renderAnalysisDetailDesktop(analysisKey = 'gastos_categoria') {
             const container = document.getElementById('analises-detail-desktop');
             if (!container) return;
             const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
             container.innerHTML = `
                <div class="card-header">
                    <h3><i class="${cfg.icon}"></i> ${cfg.label}</h3>
                    <div class="card-actions"><button class="btn btn-secondary change-chart-btn"><i class="fa-solid fa-repeat"></i> Trocar tipo</button></div>
                </div>
                <div class="card-content">
                    <div class="detail-note" style="margin-bottom:1rem;">${cfg.note}</div>
                    <div class="analysis-config-panel">
                        <div class="form-group">
                            <label for="analysis-data-select">Analisar</label>
                            <select id="analysis-data-select">
                                <option value="gastos_categoria">Gastos por Categoria (Listas)</option>
                                <option value="validade_despensa">Itens por Validade (Despensa)</option>
                                <option value="uso_receitas">Receitas Usadas (Planejador)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="analysis-type-select">Tipo de gráfico</label>
                            <select id="analysis-type-select">
                                <option value="pie">Pizza</option>
                                <option value="doughnut">Rosca</option>
                                <option value="bar">Barras</option>
                                <option value="line">Linha</option>
                            </select>
                        </div>
                    </div>
                    <div class="chart-canvas-container" style="margin-top:1rem;"><canvas id="dynamic-analysis-chart"></canvas></div>
                </div>
                <div class="card-footer"><button class="btn btn-primary analysis-mobile-open-btn" data-analysis-key="${analysisKey}"><i class="fa-solid fa-up-right-and-down-left-from-center"></i> Abrir detalhe completo</button></div>
             `;
             document.getElementById('analysis-data-select')?.addEventListener('change', (e) => this.renderAnalysisDetailDesktop(e.target.value));
             document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
             document.getElementById('analysis-data-select').value = analysisKey;
             this.updateDynamicChart();
        },

        openAnalysisDetailModal(analysisKey = 'gastos_categoria') {
             const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
             this.openDetailModal({
                 title: `<i class="${cfg.icon}"></i> ${cfg.label}`,
                 content: `<p class="detail-note">${cfg.note}</p><div class="analysis-config-panel"><div class="form-group"><label for="analysis-data-select">Analisar</label><select id="analysis-data-select"><option value="gastos_categoria">Gastos por Categoria (Listas)</option><option value="validade_despensa">Itens por Validade (Despensa)</option><option value="uso_receitas">Receitas Usadas (Planejador)</option></select></div><div class="form-group"><label for="analysis-type-select">Tipo de gráfico</label><select id="analysis-type-select"><option value="pie">Pizza</option><option value="doughnut">Rosca</option><option value="bar">Barras</option><option value="line">Linha</option></select></div></div><div class="chart-canvas-container" style="margin-top:1rem;"><canvas id="dynamic-analysis-chart"></canvas></div>`,
                 actions: [{ label: 'Fechar', className: 'btn-secondary', onClick: () => this.closeModal('detail-modal') }]
             });
             document.getElementById('analysis-data-select').value = analysisKey;
             document.getElementById('analysis-data-select')?.addEventListener('change', () => this.updateDynamicChart());
             document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
             this.updateDynamicChart();
        },

        renderConfiguracoes(container) {
             if (!container) container = document.getElementById('module-configuracoes');
             if (!container) return;
             const nav = [
                { key: 'perfil', label: 'Perfil', note: 'Identidade básica do usuário e preferências principais.' },
                { key: 'notificacoes', label: 'Notificações', note: 'Alertas de validade, IA e lembretes.' },
                { key: 'dados', label: 'Dados', note: 'Exportação, limpeza e manutenção das informações do app.' }
             ].map((item, index) => `<button type="button" class="module-nav-item config-nav-item ${index === 0 ? 'active' : ''}" data-config-section="${item.key}"><strong>${item.label}</strong><span>${item.note}</span></button>`).join('');

             container.innerHTML = `
                  <div class="master-detail-layout">
                      <div class="md-list-column dashboard-card">
                          <div class="card-header"><h3><i class="fa-solid fa-sliders"></i> Configurações</h3></div>
                          <div class="card-content"><div class="module-nav-list">${nav}</div></div>
                      </div>
                      <div class="md-detail-column dashboard-card" id="config-detail-desktop"></div>
                  </div>
             `;
             this.bindGlobalAutocompleteFields?.(container);
             if (window.innerWidth >= 992) this.renderConfigDetailDesktop('perfil');
        },

renderConfigDetailDesktop(section = 'perfil') {
  const container = document.getElementById('config-detail-desktop');
  if (!container) return;
  let title = 'Configurações';
  let content = '';
  let footer = '';

if (section === 'perfil') {
  title = 'Perfil';
  content = `
    <div class="detail-stack">
      <div class="form-group">
        <label for="config-name">Nome</label>
        <input type="text" id="config-name" value="${this.escapeHtml(this.state.user.nome || 'User')}" autocomplete="name">
      </div>
      <div class="form-group">
        <label for="config-email">Email</label>
        <input type="email" id="config-email" value="${this.escapeHtml(this.state.user.email || '')}" placeholder="seuemail@exemplo.com" autocomplete="email">
      </div>
      <div id="config-profile-feedback" class="auth-feedback-message is-info" style="display:none;"></div>

      <!-- CAMPOS DE SENHA (AGORA JÁ INCLUÍDOS) -->
      <div id="config-profile-security-fields" class="detail-stack" style="margin-top:16px; display:block;">
        <div class="form-group">
          <label for="config-password">Senha atual</label>
          <input type="password" id="config-password" placeholder="Digite sua senha atual" autocomplete="current-password">
        </div>
      </div>

      <hr class="divider" />

      <div class="detail-listing-item" style="align-items:flex-start; gap:16px;">
        <div>
          <strong>Troca de senha</strong>
          <p class="detail-note" style="margin-top:6px;">Para alterar sua senha com segurança, clique em <strong>Esqueci minha senha</strong>. O link será enviado para o e-mail cadastrado e a alteração acontecerá conectada ao banco de dados.</p>
        </div>
        <button type="button" class="btn btn-secondary" id="config-open-forgot-password-btn">Esqueci minha senha</button>
      </div>
    </div>
  `;
  footer = `<button class="btn btn-primary" id="config-save-profile-btn">Salvar alterações</button>`;
}

 else if (section === 'notificacoes') {
    title = 'Notificações';
    content = `
      <div class="detail-stack">
        <div class="form-group inline">
          <label for="notif-validade">Notificar sobre validade</label>
          <label class="toggle-switch"><input type="checkbox" id="notif-validade" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="form-group inline">
          <label for="notif-ia">Sugestões rápidas</label>
          <label class="toggle-switch"><input type="checkbox" id="notif-ia" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="form-group inline">
          <label for="notif-email">Notificações por e-mail</label>
          <label class="toggle-switch"><input type="checkbox" id="notif-email"><span class="toggle-slider"></span></label>
        </div>
      </div>
    `;
    footer = `<button class="btn btn-primary">Salvar preferências</button>`;
  } else {
    title = 'Gerenciamento de Dados';
    content = `
      <div class="detail-stack">
        <div class="detail-listing-item">
          <div><strong>Exportar dados</strong><p class="detail-note">Baixe seus dados em JSON para backup ou migração.</p></div>
          <button class="btn btn-secondary">Exportar</button>
        </div>
        <div class="detail-listing-item">
          <div><strong>Apagar todos os dados</strong><p class="detail-note">Ação irreversível. Use apenas quando quiser reiniciar tudo.</p></div>
          <button class="btn btn-danger" id="config-delete-account-btn">Apagar conta</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="card-header"><h3><i class="fa-solid fa-sliders"></i> ${title}</h3></div>
    <div class="card-content">${content}</div>
    <div class="card-footer">${footer}</div>
  `;
  this.bindGlobalAutocompleteFields?.(container);

if (section === 'perfil') {
    const saveBtn = container.querySelector('#config-save-profile-btn');
    if (saveBtn) {
        saveBtn.onclick = async () => {
            await this.saveProfileSettings(container);
        };
    }
    container.querySelector('#config-open-forgot-password-btn')?.addEventListener('click', () => {
      this.openForgotPasswordFromSettings?.();
    });
}

  container.querySelector('#config-delete-account-btn')?.addEventListener('click', () => {
    this.openConfirmModal('Apagar Conta', 'Tem certeza que deseja apagar todos os seus dados? Esta ação é irreversível.', () => {
      this.showInfoModal('Conta Apagada', 'Seus dados foram apagados.');
      this.handleLogout();
    });
  });
},

openConfigSectionModal(section = 'perfil') {
  let title = 'Configurações';
  let content = '';
  let actions = [{ label: 'Fechar', className: 'btn-secondary', onClick: () => this.closeModal('detail-modal') }];

  if (section === 'perfil') {
    title = 'Perfil';
    content = `
      <div class="detail-stack">
        <div class="form-group">
          <label for="config-name-modal">Nome</label>
          <input type="text" id="config-name-modal" value="${this.escapeHtml(this.state.user.nome || 'User')}" autocomplete="name">
        </div>
        <div class="form-group">
          <label for="config-email-modal">Email</label>
          <input type="email" id="config-email-modal" value="${this.escapeHtml(this.state.user.email || '')}" placeholder="seuemail@exemplo.com" autocomplete="email">
        </div>
        <div id="config-profile-feedback-modal" class="auth-feedback-message is-info" style="display:none;"></div>

        <hr class="divider" />

        <div class="detail-listing-item" style="align-items:flex-start; gap:16px;">
          <div>
            <strong>Troca de senha</strong>
            <p class="detail-note" style="margin-top:6px;">Para alterar sua senha com segurança, clique em <strong>Esqueci minha senha</strong>. O link será enviado para o e-mail cadastrado.</p>
          </div>
          <button type="button" class="btn btn-secondary" id="config-open-forgot-password-btn-modal">Esqueci minha senha</button>
        </div>
      </div>
    `;
    actions.unshift({
      label: 'Salvar alterações',
      className: 'btn-primary',
      onClick: async () => {
        const modal = document.getElementById('detail-modal');
        const ok = await this.saveProfileSettings(modal || document);
        if (ok) this.closeModal('detail-modal');
      }
    });
  } else if (section === 'notificacoes') {
    title = 'Notificações';
    content = `
      <div class="detail-stack">
        <div class="form-group inline">
          <label for="notif-validade-modal">Notificar sobre validade</label>
          <label class="toggle-switch"><input type="checkbox" id="notif-validade-modal" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="form-group inline">
          <label for="notif-ia-modal">Sugestões rápidas</label>
          <label class="toggle-switch"><input type="checkbox" id="notif-ia-modal" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="form-group inline">
          <label for="notif-email-modal">Notificações por e-mail</label>
          <label class="toggle-switch"><input type="checkbox" id="notif-email-modal"><span class="toggle-slider"></span></label>
        </div>
      </div>
    `;
    actions.unshift({ label: 'Salvar preferências', className: 'btn-primary', onClick: () => this.closeModal('detail-modal') });
  } else {
    title = 'Gerenciamento de Dados';
    content = `
      <div class="detail-stack">
        <div class="detail-listing-item">
          <div><strong>Exportar dados</strong><p class="detail-note">Baixe seus dados em JSON para backup ou migração.</p></div>
          <button class="btn btn-secondary">Exportar</button>
        </div>
        <div class="detail-listing-item">
          <div><strong>Apagar todos os dados</strong><p class="detail-note">Ação irreversível. Use apenas quando quiser reiniciar tudo.</p></div>
          <button class="btn btn-danger" id="config-delete-account-btn-modal">Apagar conta</button>
        </div>
      </div>
    `;
  }

  this.openDetailModal({ title: `<i class="fa-solid fa-sliders"></i> ${title}`, content, actions });

  document.getElementById('config-open-forgot-password-btn-modal')?.addEventListener('click', () => {
    this.openForgotPasswordFromSettings?.();
  });

  if (section !== 'perfil') {
    document.getElementById('config-delete-account-btn-modal')?.addEventListener('click', () => {
      this.openConfirmModal('Apagar Conta', 'Tem certeza que deseja apagar todos os seus dados? Esta ação é irreversível.', () => {
        this.showInfoModal('Conta Apagada', 'Seus dados foram apagados.');
        this.handleLogout();
      });
    });
  }
},
        parseCurrency(value) {
            if (!value) return 0;
            if (typeof value === 'number') return value;
            return parseFloat(value.replace(',', '.')) || 0;
        },

        createListaItemHTML(item) {
            const itemName = this.escapeHtml(item.name);
            return `
                <div class="placeholder-item ${item.checked ? 'is-checked' : ''}" data-id="${item.id}" data-name="${item.name}" data-qtd="${item.qtd}" data-unid="${item.unid}" data-valor="${item.valor}">
                    <div class="item-row">
                        <div class="item-main-info">
                            <i class="fa-solid fa-grip-vertical drag-handle" title="Arrastar item" aria-label="Arrastar ${itemName}"></i>
                            <input type="checkbox" ${item.checked ? 'checked' : ''} aria-label="Marcar ${itemName}">
                            <span class="item-name">${itemName}</span>
                        </div>
                        <div class="item-actions">
                            <button class="icon-button edit-btn" title="Editar" aria-label="Editar ${itemName}"><i class="fa-solid fa-pencil" aria-hidden="true"></i></button>
                            <button class="icon-button delete-btn" title="Excluir" aria-label="Excluir ${itemName}"><i class="fa-solid fa-times" aria-hidden="true"></i></button>
                        </div>
                    </div>
                    <div class="item-details-grid">
                        <div>Qtd: <span>${item.qtd}</span></div>
                        <div>Un: <span>${item.unid}</span></div>
                        <div>Preço: <span>R$ ${parseFloat(item.valor || 0).toFixed(2)}</span></div>
                    </div>
                    <div class="item-checked-actions">
                        <div class="form-group-checked">
                            <label for="validade-${item.id}">Validade (Opcional)</label>
                            <input type="date" id="validade-${item.id}" class="item-validade-input">
                        </div>
                        <div class="confirm-actions-group">
                            <small class="confirm-pantry-text">Deseja enviar para a despensa?</small>
                            <div class="confirm-buttons">
                                <button class="icon-button cancel-move-btn" title="Não" aria-label="Cancelar e desmarcar ${itemName}">
                                    <i class="fa-solid fa-times-circle" style="color: var(--red);" aria-hidden="true"></i>
                                </button>
                                <button class="icon-button move-to-despensa-btn" title="Sim" aria-label="Confirmar e mover ${itemName} para despensa">
                                    <i class="fa-solid fa-check-circle" style="color: var(--green);" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
        },

        createDespensaItemHTML(item) {
            const itemName = this.escapeHtml(item.name);
            const stock = parseInt(item.stock) || 0;
            let bars = '';
            for(let i=0; i<4; i++) { bars += `<div class="stock-bar ${i < Math.round(stock / 25) ? 'active' : ''}"></div>`; }
            let validadeDisplay = "N/A";
            let validadeClass = "";
            let title = "Validade não informada";

            if (item.validade) {
                const hoje = new Date(); hoje.setHours(0,0,0,0);
                const [y, m, d] = item.validade.split('-').map(Number);
                const dataVal = new Date(y, m - 1, d); dataVal.setHours(0,0,0,0);
                const diffTime = dataVal - hoje; const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) { validadeDisplay = "Vencido!"; validadeClass = "expiring"; title = `Vencido há ${Math.abs(diffDays)} dia(s)`; }
                else if (diffDays === 0) { validadeDisplay = "Vence Hoje!"; validadeClass = "expiring"; title = "Vence Hoje!"; }
                else if (diffDays <= 7) { validadeDisplay = `Vence em ${diffDays}d`; validadeClass = "expiring"; title = `Vence em ${diffDays} dia(s)`; }
                else { validadeDisplay = item.validade.split('-').reverse().join('/'); title = `Válido até ${validadeDisplay}`; }
            }
            return `
                <div class="placeholder-item is-clickable" data-id="${item.id}" data-name="${item.name}" data-qtd="${item.qtd}" data-unid="${item.unid}" data-valor="${item.valor}" data-validade="${item.validade || ''}" data-stock="${item.stock}">
                    <div class="item-row">
                        <div class="item-main-info">
                            <i class="fa-solid fa-grip-vertical drag-handle" title="Arrastar item" aria-label="Arrastar ${itemName}"></i>
                            <span class="item-name">${itemName}</span>
                        </div>
                        <div>
                            <small class="stock-level-label">Estoque:</small>
                            <div class="item-stock-level" title="Nível de estoque: ${stock}%" data-stock="${stock}" aria-label="Nível de estoque: ${stock}%">
                                ${bars}
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="icon-button edit-btn" title="Editar" aria-label="Editar ${itemName}"><i class="fa-solid fa-pencil" aria-hidden="true"></i></button>
                            <button class="icon-button delete-btn" title="Excluir" aria-label="Excluir ${itemName}"><i class="fa-solid fa-times" aria-hidden="true"></i></button>
                        </div>
                    </div>
                    <div class="item-details-grid">
                        <div>Qtd: <span>${item.qtd}</span></div>
                        <div>Un: <span>${item.unid}</span></div>
                        <div>Preço: <span>R$ ${parseFloat(item.valor || 0).toFixed(2)}</span></div>
                    </div>
                    <div class="item-validade ${validadeClass}" title="${title}">Val: <span>${validadeDisplay}</span></div>
                </div>`;
        },

        createEssentialItemHTML(item) {
             const itemName = this.escapeHtml(item.name);
             return `
             <div class="placeholder-item essential-item" data-id="${item.id}" data-name="${item.name}" data-preco="${item.preco}" data-unid="${item.unid}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem;">
                 <div class="item-main-info" style="gap: 5px;">
                     <span class="item-name">${itemName}</span>
                     <small style="font-family: 'Roboto Mono', monospace; color: var(--glass-text-secondary); font-size: 0.8em;">(R$ ${parseFloat(item.preco).toFixed(2)} / ${item.unid})</small>
                 </div>
                 <div class="item-actions" style="gap: 0.2rem;">
                     <button class="icon-button edit-essential-btn" style="font-size: 0.9rem; width: 28px; height: 28px;" title="Editar" aria-label="Editar ${itemName}"><i class="fa-solid fa-pencil" aria-hidden="true"></i></button>
                     <button class="icon-button delete-btn" style="font-size: 0.9rem; width: 28px; height: 28px;" title="Excluir" aria-label="Excluir ${itemName}"><i class="fa-solid fa-times" aria-hidden="true"></i></button>
                 </div>
             </div>`;
        },

        renderModalIngredientList() {
            const container = document.getElementById('recipe-ingredients-list');
            if (!container) return;
            if (this.tempRecipeIngredients.length === 0) {
                container.innerHTML = '<p class="empty-list-message recipe-ingredient-empty">Nenhum ingrediente adicionado.</p>';
                return;
            }
            container.innerHTML = this.tempRecipeIngredients.map((ing, index) => {
                const ingName = this.escapeHtml(ing.name);
                const qtyDisplay = ing.unit === 'a gosto' ? 'a gosto' : `${this.escapeHtml(ing.qty || '')} ${this.escapeHtml(ing.unit || '')}`.trim();
                return `
                <div class="recipe-ing-item" data-index="${index}">
                    <div class="recipe-ing-copy">
                        <strong>${qtyDisplay}</strong>
                        <span>${ingName}</span>
                    </div>
                    <div class="recipe-ing-actions">
                        <button type="button" class="icon-button edit-ing-btn" title="Editar" aria-label="Editar ${ingName}"><i class="fa-solid fa-pencil" aria-hidden="true"></i></button>
                        <button type="button" class="icon-button delete-ing-btn danger" title="Excluir" aria-label="Excluir ${ingName}"><i class="fa-solid fa-times" aria-hidden="true"></i></button>
                    </div>
                </div>
            `}).join('');
        },

        handleAddItem(type, formElement, listId = null) {
            if (!formElement) return;
            const nameInput = formElement.querySelector('input[id*="nome"]');
            const qtdInput = formElement.querySelector('input[id*="qtd"]');
            const unidSelect = formElement.querySelector('select[id*="unid"]');
            const valorInput = formElement.querySelector('input[id*="valor"]');
             const validadeInput = formElement.querySelector('input[id*="validade"]');
            const name = nameInput.value.trim();
            if (!name) { this.showNotification("Por favor, informe o nome do item.", "error"); nameInput.focus(); return; }
            const itemData = { id: this.generateId(), name: name, qtd: parseFloat(qtdInput.value) || 1, unid: unidSelect.value || "un", valor: this.parseCurrency(valorInput.value).toFixed(2), };
            if (type === 'lista') {
                 itemData.checked = false;
                 let targetListId = listId === 'new' ? null : (listId || this.activeListId);
                 if (targetListId === null) {
                    const widgetInput = document.getElementById('widget-list-name-input');
                    const mainInput = document.getElementById('active-list-name-input');
                    const newName = widgetInput?.value.trim() || mainInput?.value.trim();
                    if (!newName) { this.showNotification("Dê um nome para sua nova lista antes de adicionar itens.", "error"); widgetInput?.focus(); mainInput?.focus(); return; }
                    this.handleSaveListaAtiva(true);
                    targetListId = this.activeListId;
                 }
                 if (!this.state.listas[targetListId]) { this.showNotification("Erro ao encontrar a lista. Tente novamente.", "error"); return; }
                 if (this.userPlan === 'free' && this.state.listas[targetListId].items.length >= 10) { this.showPlansModal("Limite de 10 itens por lista no plano Gratuito atingido. Faça upgrade para listas ilimitadas!"); return; }
                  this.state.listas[targetListId].items.unshift(itemData);
                  this.renderListaAtiva(targetListId); this.renderListaWidget(); this.renderOrcamento();
            } else if (type === 'despensa') {
                 itemData.stock = 100; itemData.validade = validadeInput ? validadeInput.value : '';
                 this.state.despensa.unshift(itemData);
                 this.renderDespensaWidget();
                 if(this.activeModule === 'despensa') this.renderDespensa();
            } else { return; }
            this.saveState();
            nameInput.value = ""; qtdInput.value = "1"; valorInput.value = ""; if(validadeInput) validadeInput.value = "";
            nameInput.focus();
        },

        handleDeleteItem(type, itemId) {
            if (!itemId) return;
            const id = itemId.toString();
            if (type === 'lista') {
                 const itemEl = document.querySelector(`.placeholder-item[data-id="${id}"]`);
                 if (!itemEl) {
                     const targetListId_fallback = document.getElementById('active-list-id-input')?.value || this.activeListId;
                     if (this.state.listas[targetListId_fallback]) { this.state.listas[targetListId_fallback].items = this.state.listas[targetListId_fallback].items.filter(i => i.id.toString() !== id); this.renderListaAtiva(targetListId_fallback); this.renderListaWidget(); this.renderOrcamento(); this.saveState(); }
                     return;
                 }
                 const modalBody = itemEl.closest('#list-view-modal-body');
                 let targetListId;
                 if (modalBody) { targetListId = modalBody.dataset.listId; }
                 else { targetListId = document.getElementById('active-list-id-input')?.value || this.activeListId; }
                 if (!targetListId || !this.state.listas[targetListId]) { return; }
                 this.state.listas[targetListId].items = this.state.listas[targetListId].items.filter(i => i.id.toString() !== id);
                 if (modalBody) {
                     const lista = this.state.listas[targetListId];
                     modalBody.innerHTML = lista.items.map(item => this.createListaItemHTML(item)).join('');
                     if (lista.items.length === 0) { modalBody.innerHTML = '<p class="empty-list-message">Esta lista está vazia.</p>'; }
                 } else { this.renderListaAtiva(targetListId); }
                 this.renderListaWidget(); this.renderOrcamento();
            } else if (type === 'despensa') {
                 this.state.despensa = this.state.despensa.filter(i => i.id.toString() !== id);
                 this.renderDespensaWidget();
                 if(this.activeModule === 'despensa') this.renderDespensa();

                 this.closeModal('pantry-view-modal');
            } else if (type === 'essencial') {
                 this.state.essenciais = this.state.essenciais.filter(i => i.id.toString() !== id);
                 this.renderItensEssenciais();
            } else { return; }
            this.saveState();
        },

        handleToggleItemChecked(itemId, isChecked) {
             const id = itemId.toString();
             let targetListId = null; let item = null;
             for (const lId in this.state.listas) {
                 const found = this.state.listas[lId].items.find(i => i.id.toString() === id);
                 if (found) { targetListId = lId; item = found; break; }
             }
             if (item) {
                  item.checked = isChecked;
                  if (isChecked) { item.boughtDate = new Date().toISOString(); } else { delete item.boughtDate; }
                  this.saveState();
                  const modalBody = document.getElementById('list-view-modal-body');
                  const isModalOpen = document.getElementById('list-view-modal').classList.contains('is-visible');
                  if (isModalOpen && modalBody && modalBody.getAttribute('data-list-id') === targetListId) {
                       const lista = this.state.listas[targetListId];
                       modalBody.innerHTML = lista.items.map(i => this.createListaItemHTML(i)).join('');
                       this.initSortableItems('list-view-modal-body');
                  }
                  if (this.activeModule === 'lista' && targetListId === this.activeListId) { this.renderListaAtiva(targetListId); }
                  if (this.activeModule === 'inicio' && targetListId === this.activeListId) { this.renderListaWidget(); }
                  this.renderOrcamento();
             }
        },

handleSaveListaAtiva(forceCreate = false) {
             const btn = document.getElementById('lista-save-changes-btn');
             const originalText = btn ? btn.innerHTML : 'Salvar';

             if(btn && !forceCreate) {
                 btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...';
                 btn.disabled = true;
             }

             setTimeout(() => {
                 const nameInput = document.getElementById('active-list-name-input') || document.getElementById('widget-list-name-input');
                 const idInput = document.getElementById('active-list-id-input');
                 const container = document.getElementById('lista-items-full') || document.getElementById('lista-items-inicio');

                 if (!nameInput || !container) {
                     if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
                     return;
                 }

                 const listId = idInput ? idInput.value : (this.activeListId ? this.activeListId : 'new');
                 const listName = nameInput.value.trim();

                 if (!listName) {
                     this.showNotification("Por favor, dê um nome para a lista.", "error");
                     nameInput.focus();
                     if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
                     return;
                 }

                 const itemsContainerId = this.activeModule === 'inicio' ? 'lista-items-inicio' : 'lista-items-full';
                 const itemsContainer = document.getElementById(itemsContainerId);
                 if (!itemsContainer) return;

                 const items = Array.from(itemsContainer.querySelectorAll('.placeholder-item')).map(el => {
                       const itemData = (this.state.listas[listId] && this.state.listas[listId].items) ? this.state.listas[listId].items.find(i => i.id.toString() === el.dataset.id) : {};
                       return { ...itemData, id: itemData?.id || el.dataset.id, name: el.dataset.name, qtd: parseFloat(el.dataset.qtd), unid: el.dataset.unid, valor: parseFloat(el.dataset.valor).toFixed(2), checked: el.querySelector('input[type="checkbox"]')?.checked || false };
                 });

                 if (listId === 'new' || !this.state.listas[listId]) {
                     if (this.userPlan === 'free' && Object.keys(this.state.listas).length >= 2) {
                         this.showPlansModal("Limite de 2 listas atingido no plano Gratuito. Faça upgrade para criar listas ilimitadas!");
                         if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
                         return;
                     }
                      const newListId = this.generateId();
                      this.state.listas[newListId] = { nome: listName, items: items };
                      this.activeListId = newListId;
                      if (!forceCreate) this.showNotification(`Lista "${listName}" criada com sucesso!`, "success");
                 } else {
                      if (this.state.listas[listId]) {
                           this.state.listas[listId].nome = listName;
                           this.state.listas[listId].items = items;
                           if (!forceCreate) this.showNotification(`Lista "${listName}" salva com sucesso!`, "success");
                      } else { this.showNotification("Erro ao salvar: Lista não encontrada.", "error"); if(btn) { btn.innerHTML = originalText; btn.disabled = false; } return; }
                 }
                 this.saveState(); this.renderListasSalvas(); this.renderListaAtiva(this.activeListId); this.renderListaWidget(); this.renderOrcamento();
                 if (window.innerWidth <= 991 && !forceCreate) { document.getElementById('list-manager')?.classList.remove('view-active-list'); }

                 if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
             }, forceCreate ? 0 : 600);
        },

        handleDeleteListaAtiva(listIdToDelete) {
             if (!listIdToDelete || listIdToDelete === 'new') return;
             const listName = this.state.listas[listIdToDelete]?.nome || 'Lista desconhecida';
             this.openConfirmModal('Excluir Lista', `Tem certeza que deseja excluir a lista "${listName}"?`, () => {
                  if (this.state.listas[listIdToDelete]) {
                       delete this.state.listas[listIdToDelete];
                       const remainingListIds = Object.keys(this.state.listas);
                       if (remainingListIds.length > 0) { this.activeListId = remainingListIds[0]; }
                       else { this.state.listas['listaDaSemana'] = JSON.parse(JSON.stringify(this.defaultState.listas.listaDaSemana)); this.activeListId = 'listaDaSemana'; }
                       this.saveState(); this.renderListasSalvas(); this.renderListaAtiva(this.activeListId); this.renderListaWidget(); this.renderOrcamento();
                       this.showNotification(`Lista "${listName}" excluída.`, "info");
                        if (window.innerWidth <= 991) { document.getElementById('list-manager')?.classList.remove('view-active-list'); }
                  } else { this.showNotification("Erro ao excluir: Lista não encontrada.", "error"); }
             });
        },

handleOpenEditModal(itemEl) {
            const id = itemEl.dataset.id;
            const isDespensa = itemEl.closest('[id*="despensa-items"]') ? true : false;
            const isLista = itemEl.closest('[id*="lista-items"]') || itemEl.closest('#list-view-modal-body') ? true : false;
            let item;
             const modalBody = itemEl.closest('#list-view-modal-body');
             let targetListId;
             if (modalBody) { targetListId = modalBody.dataset.listId; }
             else { targetListId = document.getElementById('active-list-id-input')?.value || this.activeListId; }
            if (isDespensa) { item = this.state.despensa.find(i => i.id.toString() === id); }
            else if (isLista) { item = this.state.listas[targetListId]?.items.find(i => i.id.toString() === id); }
            else { return; }
            if (!item) { return; }

            if (window.innerWidth >= 992) {
                if (isDespensa) {
                    this.renderPantryDetailDesktop(item);
                    document.querySelectorAll('#despensa-list-container .placeholder-item').forEach(el => el.style.borderColor = 'rgba(255,255,255,0.1)');
                    itemEl.style.borderColor = 'var(--primary-color)';
                } else if (isLista) {
                    this.renderListItemDetailDesktop(item, targetListId);
                    document.querySelectorAll('#lista-items-full .placeholder-item').forEach(el => el.style.borderColor = 'rgba(255,255,255,0.1)');
                    itemEl.style.borderColor = 'var(--primary-color)';
                }
                return;
            }

            const nameInput = document.getElementById('pantry-edit-name');
            const qtdInput = document.getElementById('pantry-edit-qtd');
            const unidSelect = document.getElementById('pantry-edit-unid');
            const validadeInput = document.getElementById('pantry-edit-validade');
            const stockInput = document.getElementById('pantry-edit-stock');
            const idHidden = document.getElementById('pantry-edit-id');

            document.getElementById('pantry-view-title').innerHTML = isDespensa ? "Editar Despensa" : "Editar Item";

            if(nameInput) nameInput.value = item.name;
            if(qtdInput) qtdInput.value = item.qtd || 1;
            if(unidSelect) unidSelect.value = item.unid || 'un';
            if(idHidden) idHidden.value = item.id;

            const form = document.getElementById('pantry-edit-form-fullscreen');
            if (form) {
                form.dataset.editType = isDespensa ? 'despensa' : 'lista';
                form.dataset.listId = isLista ? targetListId : '';
            }

            const stockGroup = stockInput ? stockInput.closest('.form-group') : null;
            const valGroup = validadeInput ? validadeInput.closest('.form-group') : null;

            if (isDespensa) {
                if(stockGroup) stockGroup.style.display = 'block';
                if(valGroup) valGroup.style.display = 'block';
                if(stockInput) { stockInput.value = item.stock || 100; stockInput.dispatchEvent(new Event('input')); }
                if(validadeInput) validadeInput.value = item.validade || '';
            } else {
                if(stockGroup) stockGroup.style.display = 'none';
                if(valGroup) valGroup.style.display = 'none';
            }

            const actionsContainer = document.getElementById('pantry-view-actions-container');
            if (actionsContainer) {
                actionsContainer.innerHTML = `<button class="btn btn-danger delete-btn" data-item-id="${id}"><i class="fa-solid fa-trash"></i> Excluir</button>`;
            }

            this.openModal('pantry-view-modal');
        },

        handleSaveEditModal() {

        },

        handleMoveToDespensa(itemEl) {
             const id = itemEl?.dataset.id;
             const modalBody = itemEl.closest('#list-view-modal-body');
             let targetListId;
             if (modalBody) { targetListId = modalBody.dataset.listId; }
             else { targetListId = document.getElementById('active-list-id-input')?.value || this.activeListId; }
             if (!id || !targetListId || !this.state.listas[targetListId]) return;
             const itemIndex = this.state.listas[targetListId].items.findIndex(i => i.id.toString() === id);
             if (itemIndex > -1) {
                  const [itemData] = this.state.listas[targetListId].items.splice(itemIndex, 1);
                  const validadeInput = itemEl.querySelector(`#validade-${itemData.id}`);
                  const validadeValue = validadeInput ? validadeInput.value : null;
                  itemData.stock = 100; itemData.validade = validadeValue || null; delete itemData.checked;
                  this.state.despensa.unshift(itemData); this.saveState();
                  if (modalBody) {
                      const lista = this.state.listas[targetListId];
                      modalBody.innerHTML = lista.items.map(item => this.createListaItemHTML(item)).join('');
                      if (lista.items.length === 0) { modalBody.innerHTML = '<p class="empty-list-message">Esta lista está vazia.</p>'; }
                  } else { this.renderListaAtiva(targetListId); }
                  this.renderListaWidget(); this.renderDespensaWidget(); if(this.activeModule === 'despensa') this.renderDespensa(); this.renderOrcamento();
                  this.showNotification(`"${itemData.name}" movido para a Despensa.`, "info");
             }
        },

        populateItemDetailsModal(itemOrButton) {
              const itemEl = itemOrButton.closest('.placeholder-item'); if (!itemEl) return;
              const data = itemEl.dataset;
              const titleEl = document.getElementById('item-detail-title');
              const qtdEl = document.getElementById('item-detail-qtd');
              const unidEl = document.getElementById('item-detail-unid');
              const valorEl = document.getElementById('item-detail-valor');
              const validadeEl = document.getElementById('item-detail-validade');
              const editBtn = document.querySelector('#item-details-modal .edit-btn-from-modal');
              if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-box" aria-hidden="true"></i> ${this.escapeHtml(data.name || 'Item')}`;
              if (qtdEl) qtdEl.textContent = data.qtd || 'N/A';
              if (unidEl) unidEl.textContent = data.unid || 'N/A';
              if (valorEl) valorEl.textContent = `R$ ${parseFloat(data.valor || 0).toFixed(2)}`;
              let validadeDisplay = "N/A";
              if (data.validade) { validadeDisplay = data.validade.split('-').reverse().join('/'); }
              if (validadeEl) validadeEl.textContent = validadeDisplay;
              if (editBtn) editBtn.dataset.itemId = data.id;
         },
        handleSaveOrcamento() {
             const input = document.getElementById('budget-total-input'); if (!input) return;
             const newValue = parseFloat(input.value);
             if (!isNaN(newValue) && newValue >= 0) { this.state.orcamento.total = newValue; this.saveState(); this.renderOrcamento(); }
             this.closeModal('budget-modal');
        },
        handleAddEssential() {
             const nameInput = document.getElementById('essential-name'); const priceInput = document.getElementById('essential-price'); const unitInput = document.getElementById('essential-unit'); if (!nameInput || !priceInput || !unitInput) return;
             const name = nameInput.value.trim(); const price = this.parseCurrency(priceInput.value).toFixed(2); const unit = unitInput.value.trim() || "un";
             if (!name) { this.showNotification("Informe o nome do item essencial.", "error"); nameInput.focus(); return; }
             const newItem = { id: this.generateId(), name: name, preco: price, unid: unit };
             this.state.essenciais.unshift(newItem); this.saveState(); this.renderItensEssenciais();
             nameInput.value = ""; priceInput.value = ""; unitInput.value = ""; nameInput.focus();
        },
         handleOpenEssentialEdit(itemEl) {
             const id = itemEl.dataset.id;
             const item = this.state.essenciais.find(i => i.id.toString() === id);
             if (!item) return;
             const nameInput = document.getElementById('essential-name'); const priceInput = document.getElementById('essential-price'); const unitInput = document.getElementById('essential-unit');
             nameInput.value = item.name; priceInput.value = item.preco; unitInput.value = item.unid;
             const addButton = document.getElementById('essentials-add-btn');
             const originalText = addButton.innerHTML;
             addButton.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Alteração';
             addButton.onclick = () => {
                 item.name = nameInput.value.trim() || item.name;
                 item.preco = this.parseCurrency(priceInput.value).toFixed(2);
                 item.unid = unitInput.value.trim() || item.unid;
                 this.saveState(); this.renderItensEssenciais();
                 nameInput.value = ""; priceInput.value = ""; unitInput.value = "";
                 addButton.innerHTML = originalText;
                 addButton.onclick = () => this.handleAddEssential();
             };
         },
         handleOpenDespensaAddItemModal() {
             document.getElementById('edit-item-id').value = '';
             document.getElementById('edit-item-type').value = 'despensa';
             document.getElementById('item-edit-title').innerHTML = `<i class="fa-solid fa-plus" aria-hidden="true"></i> Adicionar à Despensa`;
             document.getElementById('edit-item-name').value = '';
             document.getElementById('edit-item-qtd').value = 1;
             document.getElementById('edit-item-unid').value = 'un';
             document.getElementById('edit-item-valor').value = '';
             document.getElementById('edit-item-validade').value = '';
             document.getElementById('edit-item-stock').value = 100;
             document.getElementById('edit-item-despensa-fields').style.display = 'block';
             this.openModal('item-edit-modal');
         },

handleOpenRecipeEditModal(recipeId) {

              this.closeModal('recipe-detail-modal');

              const isEditing = recipeId !== null && recipeId !== undefined;
              const recipe = isEditing ? this.state.receitas[recipeId] : null;
               if (isEditing && !recipe) { this.showNotification("Receita não encontrada para edição.", "error"); return; }
                if (this.userPlan === 'free' && !isEditing && Object.keys(this.state.receitas).length >= 5) { this.showPlansModal("Limite de 5 receitas atingido no plano Gratuito. Faça upgrade para receitas ilimitadas!"); return; }
              this.tempRecipeIngredients = recipe?.ingredients ? JSON.parse(JSON.stringify(recipe.ingredients)) : [];
              const title = isEditing ? `Editar "${recipe.name}"` : "Criar Nova Receita";
              const content = `
                   <form id="recipe-edit-form" onsubmit="return false;">
                       <input type="hidden" id="recipe-edit-id" value="${recipeId || ''}">
                       <div class="form-group"> <label for="recipe-edit-name">Nome da Receita</label> <input type="text" id="recipe-edit-name" value="${this.escapeHtml(recipe?.name || '')}" required> </div>
                       <div class="form-group"> <label for="recipe-edit-desc">Descrição Curta</label> <input type="text" id="recipe-edit-desc" value="${this.escapeHtml(recipe?.desc || '')}"> </div>
                       <hr class="divider">
                       <label style="display: block; font-size: 0.9rem; font-weight: 500; color: var(--glass-text-primary); margin-bottom: 0.5rem;">Ingredientes</label>
                       <div id="recipe-ing-form" class="add-item-form-container" style="padding: 0; border: none; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 1rem;">
                           <div class="add-item-form" style="padding: 0.75rem;">
                               <div class="form-group form-group-flex"> <label for="recipe-ing-name">Nome</label> <input type="text" id="recipe-ing-name" placeholder="Ex: Arroz"> </div>
                               <div class="form-group form-group-small"> <label for="recipe-ing-qtd">Qtd</label> <input type="text" id="recipe-ing-qtd" value="1"> </div>
                               <div class="form-group form-group-small"> <label for="recipe-ing-unid">Unid</label> <select id="recipe-ing-unid" aria-label="Unidade do ingrediente">${['un','kg','g','L','ml','pct','cx', 'xícara', 'colher', 'pitada', 'dentes', 'a gosto', 'fio'].map(u => `<option value="${u}">${u}</option>`).join('')}</select> </div>
                               <button type="button" class="btn-add-item" id="recipe-add-ing-btn" title="Adicionar Ingrediente" aria-label="Adicionar Ingrediente"> <i class="fa-solid fa-plus" aria-hidden="true"></i> </button>
                           </div>
                       </div>
                       <div id="recipe-ingredients-list"></div>
                       <hr class="divider">
                       <div class="form-group"> <label for="recipe-edit-content">Modo de Preparo</label> <textarea id="recipe-edit-content" rows="6">${recipe?.content?.replace(/<h4>.*?<\/h4>|<p>|<\/p>|<br>/g, '').replace(/<ul>.*?<\/ul>/s, '') || ''}</textarea> </div>
                   <div style="height: 40px;"></div></form>
              `;
              this.openConfirmModal(title, content, () => this.handleSaveRecipe());
              const okButton = document.getElementById('confirm-ok-btn');
              if (okButton) { okButton.textContent = 'Salvar Receita'; okButton.classList.remove('btn-danger'); okButton.classList.add('btn-primary'); }
              const modal = document.getElementById('custom-confirm-modal');
              if (!modal) return;
              modal.classList.add('recipe-editor-modal');
              const titleEl = modal.querySelector('#confirm-title');
              if (titleEl) titleEl.innerHTML = `${id ? '<i class="fa-solid fa-pen"></i> ' : '<i class="fa-solid fa-plus"></i> '}${this.escapeHtml(title)}`;
              this.renderModalIngredientList();
              const addIngBtn = modal.querySelector('#recipe-add-ing-btn');
              const ingListContainer = modal.querySelector('#recipe-ingredients-list');
              const addIngFormContainer = modal.querySelector('#recipe-ing-form');
              addIngBtn?.addEventListener('click', (e) => {
                  e.preventDefault();
                  const nameInput = addIngFormContainer.querySelector('#recipe-ing-name');
                  const qtdInput = addIngFormContainer.querySelector('#recipe-ing-qtd');
                  const unidSelect = addIngFormContainer.querySelector('#recipe-ing-unid');
                  const name = nameInput.value.trim();
                  if (!name) return;
                  this.tempRecipeIngredients.push({ name: name, qty: qtdInput.value.trim() || '1', unit: unidSelect.value });
                  this.renderModalIngredientList();
                  nameInput.value = ''; qtdInput.value = '1'; unidSelect.value = 'un'; nameInput.focus();
              });
              ingListContainer?.addEventListener('click', (e) => {
                  const itemEl = e.target.closest('.recipe-ing-item');
                  if (!itemEl) return;
                  const index = parseInt(itemEl.dataset.index);
                  const ingredient = this.tempRecipeIngredients[index];
                  if (!ingredient) return;
                  if (e.target.closest('.delete-ing-btn')) { this.tempRecipeIngredients.splice(index, 1); this.renderModalIngredientList(); }
                  else if (e.target.closest('.edit-ing-btn')) {
                      addIngFormContainer.querySelector('#recipe-ing-name').value = ingredient.name;
                      addIngFormContainer.querySelector('#recipe-ing-qtd').value = ingredient.qty;
                      addIngFormContainer.querySelector('#recipe-ing-unid').value = ingredient.unit;
                      this.tempRecipeIngredients.splice(index, 1);
                      this.renderModalIngredientList();
                      addIngFormContainer.querySelector('#recipe-ing-name').focus();
                  }
              });
         },

handleSaveRecipe() {

             const btn = document.getElementById('confirm-ok-btn');
             const originalText = btn ? btn.innerHTML : 'Salvar';
             if(btn) {
                 btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...';
                 btn.disabled = true;
             }

             setTimeout(() => {
                 const form = document.getElementById('recipe-edit-form');
                 if (!form) { if(btn) { btn.innerHTML = originalText; btn.disabled = false; } return; }

                 const id = form.querySelector('#recipe-edit-id').value;
                 const name = form.querySelector('#recipe-edit-name').value.trim();
                 const desc = form.querySelector('#recipe-edit-desc').value.trim();
                 const contentText = form.querySelector('#recipe-edit-content').value;

                 if (!name) {
                     this.showNotification("O nome da receita é obrigatório.", "error");
                     if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
                     return;
                 }

                 const ingredients = this.tempRecipeIngredients;
                 const contentHTML = `<h4>Ingredientes</h4><ul>${ingredients.map(ing => `<li>${this.escapeHtml(ing.qty)} ${this.escapeHtml(ing.unit)} ${this.escapeHtml(ing.name)}</li>`).join('')}</ul><h4>Preparo</h4><p>${contentText.replace(/\n/g, '<br>')}</p>`;
                 const recipeData = { name, desc, content: contentHTML, ingredients };

                 if (id) {
                      if (this.state.receitas[id]) { this.state.receitas[id] = { ...this.state.receitas[id], ...recipeData }; this.showNotification(`Receita "${name}" atualizada!`, "success"); }
                      else { this.showNotification("Erro ao atualizar: Receita não encontrada.", "error"); if(btn) { btn.innerHTML = originalText; btn.disabled = false; } return; }
                 } else {
                      const newId = this.generateId(); this.state.receitas[newId] = { id: newId, ...recipeData }; this.showNotification(`Receita "${name}" criada!`, "success");
                 }

                 this.saveState(); this.renderReceitas(); this.tempRecipeIngredients = [];

                 if (window.innerWidth >= 992 && document.getElementById('module-receitas')?.classList.contains('detail-is-visible')) {
                    const currentDetailId = document.querySelector('.recipe-list-item.active')?.dataset.recipeId;
                    if (currentDetailId === id || (!id && currentDetailId)) {
                        this.renderRecipeDetail(id || Object.keys(this.state.receitas).find(key => this.state.receitas[key].name === name));
                    }
                 }

                 this.closeModal('custom-confirm-modal');

                 if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
             }, 600);
        },

        handleDeleteRecipe(recipeId) {
              const recipeName = this.state.receitas[recipeId]?.name || "Receita desconhecida";
              this.openConfirmModal("Excluir Receita", `Tem certeza que deseja excluir "${recipeName}"?`, () => {
                   if (this.state.receitas[recipeId]) {
                        delete this.state.receitas[recipeId]; this.saveState(); this.renderReceitas();
                        if (window.innerWidth >= 992 && document.getElementById('module-receitas')?.classList.contains('detail-is-visible')) { const currentDetailId = document.querySelector('.recipe-list-item.active')?.dataset.recipeId; if(currentDetailId === recipeId) { document.getElementById('recipe-detail-desktop-body').innerHTML = '<div class="recipe-detail-placeholder"><i class="fa-solid fa-utensils"></i><p>Receita excluída.</p></div>'; document.getElementById('recipe-detail-desktop-footer').style.display = 'none'; document.getElementById('module-receitas')?.classList.remove('detail-is-visible'); } }
                        this.showNotification(`Receita "${recipeName}" excluída.`, "info");
                   } else { this.showNotification("Erro ao excluir: Receita não encontrada.", "error"); }
              });
         },

        handleDeleteMeal(day, meal) {
            if (this.state.planejador[day] && this.state.planejador[day][meal]) {
                const mealName = this.state.planejador[day][meal].name;
                this.openConfirmModal("Remover Refeição", `Deseja remover "${mealName}" do planejamento?`, () => {
                    delete this.state.planejador[day][meal]; this.saveState();
                    if (this.activeModule === 'planejador') { this.renderPlanejador(); }
                    this.renderPlannerWidget();
                    this.showNotification("Refeição removida.", "info");
                });
            }
        },

        handleToggleCompleteMeal(day, meal) {
            if (this.state.planejador[day] && this.state.planejador[day][meal]) {
                const mealData = this.state.planejador[day][meal];
                mealData.completed = !mealData.completed;
                this.saveState();
                const mealElement = document.getElementById(`planner-full-${day}-${meal}`)?.querySelector('.planner-meal-item');
                if (mealElement) {
                    mealElement.classList.toggle('completed', mealData.completed);
                    const checkBtn = mealElement.querySelector('.meal-complete-btn');
                    if (checkBtn) { checkBtn.style.color = mealData.completed ? 'var(--green)' : 'var(--glass-text-secondary)'; }
                }
            }
        },

        getCategory(itemName) {
            const lowerName = itemName.toLowerCase();
            if (['arroz', 'feijão', 'macarrão', 'farinha', 'quinoa', 'aveia', 'lentilha', 'grão de bico'].some(k => lowerName.includes(k))) return 'Grãos e Cereais';
            if (['tomate', 'alface', 'batata', 'cebola', 'cenoura', 'abóbora', 'brócolis', 'maçã', 'banana', 'laranja', 'uva'].some(k => lowerName.includes(k))) return 'Hortifrúti';
            if (['frango', 'alcatra', 'contrafilé', 'carne de porco', 'peixe', 'camarão'].some(k => lowerName.includes(k))) return 'Carnes e Peixes';
            if (['leite', 'queijo', 'iogurte', 'manteiga', 'ovos'].some(k => lowerName.includes(k))) return 'Laticínios e Ovos';
            if (['papel higiênico', 'sabonete', 'shampoo', 'detergente'].some(k => lowerName.includes(k))) return 'Limpeza e Higiene';
            return 'Outros';
        },

        getCategoryDataFromLists() {
            const categories = {};
            for (const listId in this.state.listas) {
                const lista = this.state.listas[listId];
                for (const item of lista.items) {
                    const category = this.getCategory(item.name);
                    const totalValue = (parseFloat(item.qtd) || 0) * (parseFloat(item.valor) || 0);
                    categories[category] = (categories[category] || 0) + totalValue;
                }
            }
            return categories;
        },

        getPantryValidityData() {
            const counts = { vencidos: 0, vencendo: 0, ok: 0 };
            const hoje = new Date(); hoje.setHours(0,0,0,0);
            const semanaQueVem = new Date(hoje); semanaQueVem.setDate(hoje.getDate() + 7);
            for (const item of this.state.despensa) {
                if (!item.validade) { counts.ok++; continue; }
                try {
                    const [y, m, d] = item.validade.split('-').map(Number);
                    const dataVal = new Date(y, m - 1, d); dataVal.setHours(0,0,0,0);
                    if (dataVal < hoje) { counts.vencidos++; }
                    else if (dataVal <= semanaQueVem) { counts.vencendo++; }
                    else { counts.ok++; }
                } catch (e) { counts.ok++; }
            }
            return counts;
        },

        getPlannerMealCountData() {
            const counts = {};
            for (const day in this.state.planejador) {
                for (const meal in this.state.planejador[day]) {
                    if (this.state.planejador[day][meal]) {
                        const recipeName = this.state.planejador[day][meal].name;
                        counts[recipeName] = (counts[recipeName] || 0) + 1;
                    }
                }
            }
            return counts;
        },

        updateDynamicChart() {
            const dataType = document.getElementById('analysis-data-select')?.value || 'gastos_categoria';
            const chartType = document.getElementById('analysis-type-select')?.value || 'pie';
            let chartData = {}; let chartLabel = ''; let chartOnClickHandler = null; let datasetLabel = '';
            const baseColors = [ 'rgba(0, 255, 240, 0.9)', 'rgba(255, 230, 0, 0.9)', 'rgba(215, 80, 255, 0.9)', 'rgba(50, 255, 100, 0.9)', 'rgba(255, 80, 80, 0.9)', 'rgba(200, 200, 200, 0.9)' ];
            if (dataType === 'gastos_categoria') {
                const data = this.getCategoryDataFromLists();
                chartLabel = 'Gastos por Categoria (Listas)'; datasetLabel = 'Gastos R$';
                chartData = { labels: Object.keys(data), datasets: [{ data: Object.values(data) }] };
                chartOnClickHandler = (label, value) => this.showChartDetail_Categorias(label, value);
            } else if (dataType === 'validade_despensa') {
                const data = this.getPantryValidityData();
                chartLabel = 'Itens por Validade (Despensa)'; datasetLabel = 'Nº de Itens';
                const labels = ['Vencidos', 'Vence em 7 dias', 'Itens OK'];
                const dataValues = [data.vencidos, data.vencendo, data.ok];
                chartData = { labels: labels, datasets: [{ data: dataValues }] };
                chartOnClickHandler = (label, value, index) => { const key = ['vencidos', 'vencendo', 'ok'][index]; this.showChartDetail_Validade(key, label, value); };
            } else if (dataType === 'uso_receitas') {
                const data = this.getPlannerMealCountData();
                chartLabel = 'Receitas Mais Usadas (Planejador)'; datasetLabel = 'Nº de Usos';
                chartData = { labels: Object.keys(data), datasets: [{ data: Object.values(data) }] };
                chartOnClickHandler = (label, value) => { this.showInfoModal(`Receita: ${label}`, `<p>A receita "${label}" foi usada <strong>${value}</strong> vez(es) no seu planejamento.</p>`); };
            }
            chartData.datasets[0].label = datasetLabel;
            this.charts.dynamicChart?.destroy();
            const ctx = document.getElementById('dynamic-analysis-chart')?.getContext('2d');
            if (!ctx) return;
            chartData.datasets[0].backgroundColor = baseColors;
            chartData.datasets[0].borderColor = baseColors.map(c => c.replace('0.7', '1'));
            chartData.datasets[0].borderWidth = 1;
            const isBarOrLine = chartType === 'bar' || chartType === 'line';
            this.charts.dynamicChart = new Chart(ctx, {
                type: chartType, data: chartData,
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { color: 'var(--glass-text-primary)' } }, title: { display: true, text: chartLabel, color: 'var(--glass-text-primary)', font: { size: 16 } } },
                    scales: isBarOrLine ? { y: { beginAtZero: true, ticks: { color: 'var(--glass-text-secondary)', stepSize: 1 }, grid: { color: 'var(--glass-border)' } }, x: { ticks: { color: 'var(--glass-text-primary)' }, grid: { color: 'transparent' } } } : {},
                    onClick: (evt, elements) => { if (elements.length === 0 || !chartOnClickHandler) return; const index = elements[0].index; const label = chartData.labels[index]; const value = chartData.datasets[0].data[index]; chartOnClickHandler(label, value, index); }
                }
            });
        },

        showChartDetail_Categorias(categoryName, categoryValue) {
            let itemsHtml = '<ul style="list-style-type: none; padding-left: 0; max-height: 300px; overflow-y: auto;">';
            let itemCount = 0;
            for (const listId in this.state.listas) {
                for (const item of this.state.listas[listId].items) {
                    if (this.getCategory(item.name) === categoryName) {
                        const totalValue = (parseFloat(item.qtd) || 0) * (parseFloat(item.valor) || 0);
                        itemsHtml += ` <li style="display: flex; justify-content: space-between; padding: 5px; border-bottom: 1px solid var(--glass-border);"> <span>${this.escapeHtml(item.name)} (Qtd: ${item.qtd})</span> <span style="font-family: 'Roboto Mono', monospace;">R$ ${totalValue.toFixed(2)}</span> </li> `;
                        itemCount++;
                    }
                }
            }
            itemsHtml += '</ul>';
            const title = `Itens em "${categoryName}"`;
            const message = ` <p>Total gasto na categoria: <strong>R$ ${categoryValue.toFixed(2)}</strong> (${itemCount} itens)</p> ${itemsHtml} `;
            this.showInfoModal(title, message);
        },

        showChartDetail_Validade(statusKey, statusLabel, statusValue) {
            let itemsHtml = '<ul style="list-style-type: none; padding-left: 0; max-height: 300px; overflow-y: auto;">';
            const hoje = new Date(); hoje.setHours(0,0,0,0);
            const semanaQueVem = new Date(hoje); semanaQueVem.setDate(hoje.getDate() + 7);
            for (const item of this.state.despensa) {
                let itemStatus = 'ok';
                if (item.validade) {
                    try {
                        const [y, m, d] = item.validade.split('-').map(Number);
                        const dataVal = new Date(y, m - 1, d); dataVal.setHours(0,0,0,0);
                        if (dataVal < hoje) itemStatus = 'vencidos'; else if (dataVal <= semanaQueVem) itemStatus = 'vencendo';
                    } catch (e) { }
                }
                if (itemStatus === statusKey) { itemsHtml += ` <li style="display: flex; justify-content: space-between; padding: 5px; border-bottom: 1px solid var(--glass-border);"> <span>${this.escapeHtml(item.name)}</span> <span style="font-family: 'Roboto Mono', monospace;">Val: ${item.validade ? item.validade.split('-').reverse().join('/') : 'N/A'}</span> </li> `; }
            }
            itemsHtml += '</ul>';
            const title = `Itens com Status: "${statusLabel}"`;
            const message = ` <p>Total de itens: <strong>${statusValue}</strong></p> ${itemsHtml} `;
            this.showInfoModal(title, message);
        },

        handleAddMealToPlanner(recipeRef, targetContainerId) {
             const resolvedTargetId = targetContainerId && targetContainerId.startsWith('planner-') ? targetContainerId : `planner-full-${targetContainerId}`;
             const match = resolvedTargetId.match(/planner-(?:full|day)-(\w+)(?:-(\w+))?/);
             if (!match) return;
             const dayKey = match[1];
             const mealKey = match[2];
             const recipe = this.state.receitas[recipeRef] || Object.values(this.state.receitas).find(r => r.name === recipeRef);
             if (!recipe) { this.showNotification('Receita não encontrada.', 'error'); return; }
             if (!this.state.planejador[dayKey]) { this.state.planejador[dayKey] = {}; }
             const plannerEntry = { id: recipe.id, name: recipe.name, completed: false };
             if (mealKey) {
                 this.state.planejador[dayKey][mealKey] = plannerEntry;
             } else {
                 this.state.planejador[dayKey] = {
                     cafe: { ...plannerEntry },
                     almoco: { ...plannerEntry },
                     jantar: { ...plannerEntry }
                 };
             }
             this.saveState();
             this.renderPlannerWidget();
             if (this.activeModule === 'planejador') this.renderPlanejador();
             this.showNotification(`"${recipe.name}" adicionada ao planejador.`, 'success');
        },

        populateRecipePicker() {
             const container = document.getElementById('recipe-picker-list-container');
             if (!container) return;
             const recipes = Object.values(this.state.receitas);
             if (recipes.length === 0) {
                 container.innerHTML = '<p class="empty-list-message">Nenhuma receita cadastrada.</p>';
                 return;
             }
             container.innerHTML = recipes.map(recipe => `
                <div class="recipe-picker-item">
                    <div class="recipe-picker-copy">
                        <strong>${this.escapeHtml(recipe.name)}</strong>
                        <span>${this.escapeHtml(recipe.desc || 'Receita salva no app.')}</span>
                    </div>
                    <button type="button" class="btn btn-primary btn-add-recipe" data-recipe-id="${recipe.id}" aria-label="Adicionar ${this.escapeHtml(recipe.name)}">
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        <span>Adicionar</span>
                    </button>
                </div>
             `).join('');
             if (!this.boundHandleRecipePickerAdd) {
                 this.boundHandleRecipePickerAdd = this.handleRecipePickerAdd.bind(this);
             }
             container.removeEventListener('click', this.boundHandleRecipePickerAdd);
             container.addEventListener('click', this.boundHandleRecipePickerAdd);
        },

         handleRecipePickerAdd(e) {
              const addBtn = e.target.closest('.btn-add-recipe');
              if (!addBtn || !this.currentPlannerDayTarget) return;
              this.handleAddMealToPlanner(addBtn.dataset.recipeId, this.currentPlannerDayTarget);
              this.closeModal('recipe-picker-modal');
              this.currentPlannerDayTarget = null;
         },

        initSortableItems(containerId) {
            const el = document.getElementById(containerId);
            if (!el) return;
            if (el.sortableInstance) { el.sortableInstance.destroy(); }
            el.sortableInstance = new Sortable(el, {
                 group: 'shared-items', animation: 150, handle: '.drag-handle', ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen',
                 onEnd: (evt) => {
                     const itemEl = evt.item; const id = itemEl.dataset.id; const fromListType = evt.from.dataset.listType; const toListType = evt.to.dataset.listType; const oldIndex = evt.oldDraggableIndex; const newIndex = evt.newDraggableIndex; let itemData;
                     const sourceListId = evt.from.closest('[id^="lista-items"]') ? (document.getElementById('active-list-id-input')?.value || this.activeListId) : null;
                     const targetListId = evt.to.closest('[id^="lista-items"]') ? (document.getElementById('active-list-id-input')?.value || this.activeListId) : null;
                     if (fromListType === toListType) {
                          if (toListType === 'lista') { if(this.state.listas[targetListId]){ const items = this.state.listas[targetListId].items; const [movedItem] = items.splice(oldIndex, 1); if(movedItem) items.splice(newIndex, 0, movedItem); } }
                          else { const items = this.state.despensa; const [movedItem] = items.splice(oldIndex, 1); if(movedItem) items.splice(newIndex, 0, movedItem); }
                     } else {
                          if (fromListType === 'lista' && this.state.listas[sourceListId]) { const items = this.state.listas[sourceListId].items; const itemIndex = items.findIndex(i => i.id.toString() === id); if (itemIndex > -1) [itemData] = items.splice(itemIndex, 1); }
                          else if (fromListType === 'despensa') { const items = this.state.despensa; const itemIndex = items.findIndex(i => i.id.toString() === id); if (itemIndex > -1) [itemData] = items.splice(itemIndex, 1); }
                          if (!itemData) return;
                          if (toListType === 'despensa') { itemData.stock = itemData.stock !== undefined ? itemData.stock : 100; itemData.validade = itemData.validade || null; delete itemData.checked; this.state.despensa.splice(newIndex, 0, itemData); }
                          else { delete itemData.stock; delete itemData.validade; itemData.checked = itemData.checked || false; if(this.state.listas[targetListId]){ this.state.listas[targetListId].items.splice(newIndex, 0, itemData); } }
                     }
                     this.saveState(); this.renderListaWidget(); this.renderDespensaWidget(); if (this.activeModule === 'lista') this.renderListas(); if (this.activeModule === 'despensa') this.renderDespensa(); this.renderOrcamento();
                 }
            });
        },

        initSortableModules(containerId) {
             const el = document.getElementById(containerId); if(!el) return;
             if (el.sortableInstanceModules) { el.sortableInstanceModules.destroy(); }
             if (window.innerWidth < 992) return;
             el.sortableInstanceModules = new Sortable(el, { group: 'dashboard-modules', animation: 200, handle: '.card-header, .planner-header', filter: '.card-actions, .card-actions *, .icon-button', ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', onEnd: (evt) => { localStorage.setItem('moduleOrder', JSON.stringify(el.sortableInstanceModules.toArray())); } });
             const savedOrder = JSON.parse(localStorage.getItem('moduleOrder')); if (savedOrder) { el.sortableInstanceModules.sort(savedOrder); }
        },

        openListNameModal({ title = 'Nome da lista', placeholder = 'Digite...', initialValue = '', confirmText = 'Salvar', onConfirm }) {

            let overlay = document.getElementById('list-name-modal');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'list-name-modal';
                overlay.className = 'modal-overlay';
                overlay.innerHTML = `
                    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="list-name-modal-title">
                        <div class="modal-header">
                            <h3 id="list-name-modal-title" style="margin:0;">${title}</h3>
                            <button class="icon-button close-btn" data-close="1"><i class="fa-solid fa-times"></i></button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <input id="list-name-modal-input" type="text" placeholder="${placeholder}" style="width:100%;">
                            </div>
                        </div>
                        <div class="modal-footer" style="display:flex; gap:10px; justify-content:flex-end;">
                            <button class="btn btn-secondary" data-cancel="1" type="button">Cancelar</button>
                            <button class="btn btn-primary" id="list-name-modal-confirm" type="button">${confirmText}</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);
                overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            }

            const titleEl = overlay.querySelector('#list-name-modal-title');
            const input = overlay.querySelector('#list-name-modal-input');
            const btnConfirm = overlay.querySelector('#list-name-modal-confirm');
            const btnCancel = overlay.querySelector('[data-cancel]');
            const btnClose = overlay.querySelector('[data-close]');

const close = () => {
                overlay.classList.remove('active');
                overlay.style.display = 'none';
            }

            titleEl.textContent = title;
            input.placeholder = placeholder;
            input.value = initialValue || '';

            const confirm = () => {
                const val = (input.value || '').trim();
                if (!val) { this.showNotification('Digite um nome válido.', 'error'); input.focus(); return; }
                close();
                if (typeof onConfirm === 'function') onConfirm(val);
            };

            const newBtn = btnConfirm.cloneNode(true);
            btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);

            newBtn.addEventListener('click', confirm);
            input.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); confirm(); } };
            btnCancel.onclick = close;
            btnClose.onclick = close;

overlay.style.display = 'flex';
            overlay.classList.add('active');
            setTimeout(() => input.focus(), 50);

        },

openListEditView(listId) {
            this.activeListId = listId;
            this.saveState();
            this.renderListasSalvas();
            this.renderListaAtiva(listId);

            const listManager = document.getElementById('list-manager');
            if (listManager) listManager.classList.add('view-active-list');

            setTimeout(() => {
                const inputItem = document.getElementById('lista-form-nome-full');
                if (inputItem) {
                    inputItem.focus();
                    inputItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        },

        createAutocompleteElement() {
            const el = document.createElement('div'); el.id = 'autocomplete-suggestions'; document.body.appendChild(el); this.elements.autocompleteSuggestions = el; this.activeAutocompleteInput = null;
        },

        handleAutocomplete(inputElement) {
            const rawQuery = inputElement.value.trim();
            const query = this.normalizeSearchText(rawQuery);
            this.activeAutocompleteInput = inputElement;
            if (query.length < 1) { this.hideAutocomplete(); return; }

            const suggestionMap = new Map();
            const pushSuggestion = (item) => {
                if (!item?.name) return;
                const key = this.normalizeSearchText(item.name);
                if (!key || suggestionMap.has(key) || !key.includes(query)) return;
                suggestionMap.set(key, item);
            };

            ALL_ITEMS_DATA.forEach(pushSuggestion);
            (this.state?.despensa || []).forEach(item => pushSuggestion({ name: item.name, price: Number(item.valor || 0), unit_desc: item.unid || 'un' }));
            (this.state?.essenciais || []).forEach(item => pushSuggestion({ name: item.name, price: Number(item.preco || 0), unit_desc: item.unid || 'un' }));
            Object.values(this.state?.receitas || {}).forEach(recipe => {
                (recipe?.ingredients || []).forEach(ing => pushSuggestion({ name: ing.name, price: 0, unit_desc: ing.unit || 'un' }));
            });

            const suggestions = Array.from(suggestionMap.values()).slice(0, 10);
            if (suggestions.length === 0) {
                this.showAutocomplete([{ name: `Insira manual: ${rawQuery}` }], query, inputElement);
                return;
            }

            this.showAutocomplete(suggestions, query, inputElement);
        },
        showAutocomplete(suggestions, query, inputElement) {
            const suggestionsEl = this.elements.autocompleteSuggestions;
            if (!suggestionsEl) return;
            suggestionsEl.innerHTML = suggestions.map(item => {
                const isManual = String(item.name).startsWith('Insira manual:');
                const safeName = this.escapeHtml(item.name);
                let nameHtml = safeName;
                if (!isManual && query) {
                    const normalizedName = this.normalizeSearchText(item.name);
                    const matchIndex = normalizedName.indexOf(query);
                    if (matchIndex >= 0) {
                        const originalName = String(item.name);
                        const sliceEnd = Math.min(originalName.length, matchIndex + query.length);
                        const before = this.escapeHtml(originalName.slice(0, matchIndex));
                        const hit = this.escapeHtml(originalName.slice(matchIndex, sliceEnd));
                        const after = this.escapeHtml(originalName.slice(sliceEnd));
                        nameHtml = `${before}<strong>${hit}</strong>${after}`;
                    }
                }
                return ` <div class="autocomplete-item" data-name="${safeName}" data-manual="${isManual ? '1' : '0'}"> ${nameHtml} </div> `;
            }).join('');
            const rect = inputElement.getBoundingClientRect();
            suggestionsEl.style.left = `${rect.left}px`;
            suggestionsEl.style.top = `${rect.bottom + 5}px`;
            suggestionsEl.style.width = `${rect.width}px`;
            suggestionsEl.style.display = 'block';
        },
        hideAutocomplete() { if (this.elements.autocompleteSuggestions) { this.elements.autocompleteSuggestions.style.display = 'none'; } this.activeAutocompleteInput = null; },
        selectAutocompleteItem(itemName) {
            if (!this.activeAutocompleteInput) { this.hideAutocomplete(); return; }
            if (String(itemName).startsWith('Insira manual:')) {
                const manual = String(itemName).replace('Insira manual:', '').trim();
                if (manual) this.activeAutocompleteInput.value = manual;
                this.hideAutocomplete();
                return;
            }
            const normalizedItemName = this.normalizeSearchText(itemName);
            const itemData = ALL_ITEMS_DATA.find(item => this.normalizeSearchText(item.name) === normalizedItemName)
                || (this.state?.despensa || []).find(item => this.normalizeSearchText(item.name) === normalizedItemName)
                || (this.state?.essenciais || []).find(item => this.normalizeSearchText(item.name) === normalizedItemName)
                || Object.values(this.state?.receitas || {}).flatMap(recipe => recipe?.ingredients || []).find(ing => this.normalizeSearchText(ing.name) === normalizedItemName);
            if (!itemData) {
                this.activeAutocompleteInput.value = itemName;
                this.hideAutocomplete();
                this.activeAutocompleteInput.focus();
                return;
            }
            const inputId = this.activeAutocompleteInput.id;
            this.activeAutocompleteInput.value = itemData.name;
            const form = this.activeAutocompleteInput.closest('form, .modal-box, .dashboard-card');
            if (!form) { this.hideAutocomplete(); return; }
            const unitSource = itemData.unit_desc || itemData.unid || itemData.unit || 'un';
            const unitMatch = String(unitSource).match(/^(un|kg|g|L|ml|pct|cx|xícara|colher|pitada|dentes|a gosto|fio)/i);
            const itemUnit = unitMatch ? unitMatch[1] : 'un';

            if (inputId.includes('lista-form-nome')) {
                const suffix = inputId.includes('-dash') ? '-dash' : '-full';
                const qtdInput = form.querySelector(`input[id="lista-form-qtd${suffix}"]`);
                if (qtdInput) qtdInput.value = 1;
                const unidSelect = form.querySelector(`select[id="lista-form-unid${suffix}"]`);
                if (unidSelect) unidSelect.value = itemUnit;
                const valorInput = form.querySelector(`input[id="lista-form-valor${suffix}"]`);
                if (valorInput) valorInput.value = itemData.price.toFixed(2);
            } else if (inputId === 'edit-item-name') {
                form.querySelector('#edit-item-qtd').value = 1;
                form.querySelector('#edit-item-unid').value = itemUnit;
                form.querySelector('#edit-item-valor').value = itemData.price.toFixed(2);
            } else if (inputId === 'essential-name') {
                form.querySelector('#essential-price').value = itemData.price.toFixed(2);
                form.querySelector('#essential-unit').value = itemUnit;
            } else if (inputId === 'pantry-edit-name') {
                const qtdInput = form.querySelector('#pantry-edit-qtd');
                if (qtdInput) qtdInput.value = 1;
                const unidSelect = form.querySelector('#pantry-edit-unid');
                if (unidSelect) unidSelect.value = itemUnit;
            } else if (inputId === 'recipe-ing-name') {
                const qtdInput = form.querySelector('#recipe-ing-qtd');
                if (qtdInput && !String(qtdInput.value || '').trim()) qtdInput.value = 1;
                const unidSelect = form.querySelector('#recipe-ing-unid');
                if (unidSelect) unidSelect.value = itemUnit;
            }

            this.hideAutocomplete(); this.activeAutocompleteInput.focus();
        },
        escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); },
        escapeHtml(str) { return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); },

        setupSpeechRecognition() {
             const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SpeechRecognition) { return; }
             this.speechRecognition = new SpeechRecognition(); this.speechRecognition.continuous = false; this.speechRecognition.lang = 'pt-BR'; this.speechRecognition.interimResults = false; this.speechRecognition.maxAlternatives = 1;
             const chatbotInput = document.getElementById('ai-chat-input');
             this.speechRecognition.onresult = (event) => { if(chatbotInput) chatbotInput.value = event.results[0][0].transcript; };
             this.speechRecognition.onspeechend = () => { this.speechRecognition.stop(); };
             this.speechRecognition.onerror = (event) => { console.error("Speech recognition error:", event.error); };
        },
        startVoiceRecognition() {
             if (!this.speechRecognition) return this.showNotification("O reconhecimento de voz não é suportado no seu navegador.", "error");
             try { this.speechRecognition.start(); } catch(e) { console.error("Could not start speech recognition:", e); }
        },

        showChatbot() {
             if(this.userPlan !== 'premium') { this.showPlansModal("Este recurso não está disponível nesta versão."); return; }
             this.setupChatbotModal(); this.openModal('ai-chat-modal'); document.getElementById('ai-chat-input')?.focus();
        },

        setupChatbotModal() {
             const chatbotModal = document.getElementById('ai-chat-modal'); if (!chatbotModal || chatbotModal.dataset.initialized === 'true') return;
             const sendBtn = chatbotModal.querySelector('#ai-chat-send-btn'); const input = chatbotModal.querySelector('#ai-chat-input'); const messagesContainer = chatbotModal.querySelector('#ai-chat-messages-container');
	     const voiceBtn = chatbotModal.querySelector('#ai-voice-btn');
             if (voiceBtn) voiceBtn.onclick = () => this.startVoiceRecognition();
             const sendMessage = () => {
                 const userText = input.value.trim();
                 if (!userText || this.isIAProcessing) return;
                 input.value = '';
                 const userMessage = document.createElement('div');
                 userMessage.className = 'chat-message user';
                 userMessage.innerHTML = `<div class="bubble">${this.escapeHtml(userText)}</div>`;
                 messagesContainer.appendChild(userMessage);
                 messagesContainer.scrollTop = messagesContainer.scrollHeight;
                 this.triggerChefIAAnalysis(userText);
             };
             sendBtn.onclick = sendMessage;
             input.onkeyup = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
             messagesContainer.onclick = (e) => {
                 const button = e.target.closest('[data-action]'); if (!button) return;
                 const { action, listId, recipeId, items } = button.dataset;
                 if (action === 'view-list' && listId) { this.closeAllModals(); this.activeListId = listId; this.activateModuleAndRender('lista'); }
                 else if (action === 'view-recipe' && recipeId) { this.closeAllModals(); this.activateModuleAndRender('receitas'); setTimeout(() => { if (window.innerWidth < 992) { this.showRecipeDetailModal(recipeId); } else { this.renderRecipeDetail(recipeId); document.getElementById('module-receitas')?.classList.add('detail-is-visible'); document.querySelector(`.recipe-list-item[data-recipe-id="${recipeId}"]`)?.classList.add('active'); } }, 100); }
                 else if (action === 'create-list-low-stock' && items) { this.executeCreateListFromIA(JSON.parse(items), "Lista - Estoque Baixo"); this.closeModal('ai-chat-modal'); }
             };
             chatbotModal.dataset.initialized = 'true';
        },

        executeCreateListFromIA(itemsArray, listName) {
             const newListId = this.generateId();
             this.state.listas[newListId] = { nome: listName, items: itemsArray.map(name => ({ id: this.generateId(), name: name, qtd: 1, unid: 'un', valor: 0, checked: false })) };
             this.activeListId = newListId; this.saveState(); this.showNotification(`Lista "${listName}" criada pela IA.`, "success"); this.activateModuleAndRender('lista');
        },

        getChefIACapabilitiesText() {
            return "";
        },

async triggerChefIAAnalysis(prompt) {
            if (this.isIAProcessing) return;

            const lowerPrompt = String(prompt || '').toLowerCase();
            const outOfScopeWords = ['criptomoeda', 'aposta esportiva', 'partido político', 'eleição', 'programação avançada'];
            if (outOfScopeWords.some(word => lowerPrompt.includes(word))) {
                const messagesContainer = document.getElementById('ai-chat-messages-container');
                const filterMessage = document.createElement('div');
                filterMessage.className = 'chat-message ia';
                filterMessage.innerHTML = '<div class="bubble">Posso ir muito fundo em alimentação, receitas, listas, despensa, planejamento, economia doméstica e também operar recursos do Alimente Fácil. Para outros temas fora desse universo, meu foco é limitado.</div>';
                messagesContainer.appendChild(filterMessage);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                return;
            }

            const now = new Date();
            const todayStr = now.toDateString();
            if (!this.state.aiUsage) this.state.aiUsage = { tokensThisMonth: 0, dailyMsgs: 0, lastMsgDate: null, minuteHistory: [] };

            if (this.state.aiUsage.lastMsgDate !== todayStr) {
                this.state.aiUsage.dailyMsgs = 0;
                this.state.aiUsage.lastMsgDate = todayStr;
            }

            const oneMinAgo = now.getTime() - 60000;
            this.state.aiUsage.minuteHistory = this.state.aiUsage.minuteHistory.filter(time => time > oneMinAgo);

            if (this.state.aiUsage.minuteHistory.length >= 5) {
                this.showNotification("Limite de mensagens por minuto atingido. Aguarde um instante.", "error");
                return;
            }
            if (this.state.aiUsage.dailyMsgs >= 30) {
                this.showNotification("Limite diário de uso da IA atingido.", "error");
                return;
            }

            this.isIAProcessing = true;

            const sendBtn = document.getElementById('ai-chat-send-btn');
            if (sendBtn) {
                sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                sendBtn.disabled = true;
            }

            const messagesContainer = document.getElementById('ai-chat-messages-container');
            const thinkingMessage = document.createElement('div');
            thinkingMessage.className = 'chat-message ia';
            thinkingMessage.innerHTML = '<div class="bubble typing-indicator"><span></span><span></span><span></span></div>';
            messagesContainer.appendChild(thinkingMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            try {
                this.state.aiUsage.minuteHistory.push(now.getTime());
                this.state.aiUsage.dailyMsgs++;

                const apiResponse = await this.callGeminiAPI(prompt);
                this.processIAResponse(apiResponse.json, apiResponse.html, thinkingMessage);
            } catch (error) {
                console.error("Erro interno:", error);
                thinkingMessage.innerHTML = `<div class="bubble" style="color:var(--red)">Ocorreu um erro de conexão. Tente novamente.</div>`;
            } finally {
                this.isIAProcessing = false;
                if (sendBtn) {
                    sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i>';
                    sendBtn.disabled = false;
                }
                this.saveState();
            }
        },

async callGeminiAPI(userText) {

            return new Promise((resolve) => {
                setTimeout(() => {
                    const txt = String(userText || '').toLowerCase();
                    const pantryItems = Object.values(this.state.estoque || {}).slice(0, 8).map(item => item.name || item.nome).filter(Boolean);
                    const activeList = this.state.listas[this.activeListId] || null;
                    const activeListName = activeList?.nome || 'sua lista atual';
                    const inferredBudget = Number(this.state?.orcamento?.total || 0);
                    const capText = this.getChefIACapabilitiesText();

                    let responseObj = {
                        intent: "answer_question",
                        data: {},
                        response_text_html: `<strong>Assistente desativado.</strong><br>${capText}<br><br>Posso montar receitas, criar listas, sugerir economia, reaproveitar alimentos, organizar sua rotina alimentar e orientar você dentro do sistema.`
                    };

                    const makeListItems = (names) => names.map(name => ({ name, quantity: 1, unit: 'un' }));

                    if (txt.includes('lista') || txt.includes('comprar') || txt.includes('mercado') || txt.includes('supermercado')) {
                        let items = [
                            { name: 'Arroz', quantity: 2, unit: 'kg' },
                            { name: 'Feijão Preto', quantity: 1, unit: 'kg' },
                            { name: 'Tomate', quantity: 6, unit: 'un' },
                            { name: 'Cebola', quantity: 3, unit: 'un' },
                            { name: 'Alho', quantity: 1, unit: 'un' }
                        ];

                        if (txt.includes('café da manhã')) items = makeListItems(['Ovos', 'Pão de Forma', 'Banana', 'Leite']);
                        if (txt.includes('fitness') || txt.includes('saud') || txt.includes('dieta')) items = makeListItems(['Peito de Frango', 'Batata Doce', 'Ovos', 'Brócolis', 'Aveia']);
                        if (txt.includes('barata') || txt.includes('econ') || txt.includes('econom')) items = makeListItems(['Arroz', 'Feijão Preto', 'Macarrão', 'Ovos', 'Tomate', 'Cebola']);
                        if (txt.includes('churrasco')) items = makeListItems(['Carne Bovina', 'Linguiça', 'Pão Francês', 'Vinagre', 'Tomate', 'Cebola']);

                        responseObj = {
                            intent: "create_shopping_list",
                            data: { list_name: txt.includes('semana') ? 'Lista da Semana' : 'Compras Inteligentes', items },
                            response_text_html: `Montei uma lista estratégica com foco em praticidade, economia e boa cobertura de refeições.<br><small style='opacity:.8'>Base atual: orçamento alvo de R$ ${inferredBudget.toFixed(2)} e contexto do app.</small><br><button class='af-option-btn' style='margin-top:10px; width:100%;' data-action='view-list' data-list-id='[NEW_LIST_ID]'><i class='fa-solid fa-eye'></i> Abrir lista criada</button>`
                        };
                    } else if (txt.includes('adicion') && (txt.includes('lista') || txt.includes('compras'))) {
                        responseObj = {
                            intent: "update_shopping_list",
                            data: { list_id: this.activeListId, changes: { add: [{ name: 'Banana', quantity: 6, unit: 'un' }, { name: 'Leite', quantity: 2, unit: 'l' }] } },
                            response_text_html: `Adicionei itens úteis em <strong>${activeListName}</strong> e mantive a estrutura pronta para edição.`
                        };
                    } else if (txt.includes('receita') || txt.includes('frango') || txt.includes('ideia') || txt.includes('cozinhar') || txt.includes('jantar') || txt.includes('almoço')) {
                        const usePantry = pantryItems.length ? pantryItems.slice(0, 3) : ['Peito de Frango', 'Cebola', 'Tomate'];
                        responseObj = {
                            intent: "create_recipe",
                            data: {
                                recipe_name: `Receita • ${usePantry[0] || 'Prato Rápido'}`,
                                desc: "Receita pensada para rotina real: sabor, custo equilibrado e execução simples.",
                                ingredients: [
                                    { name: usePantry[0] || 'Peito de Frango', qty: '2', unit: 'porções' },
                                    { name: usePantry[1] || 'Cebola', qty: '1', unit: 'un' },
                                    { name: usePantry[2] || 'Tomate', qty: '2', unit: 'un' }
                                ],
                                prepMode: 'Tempere a proteína ou base principal. Refogue aromáticos, una os ingredientes e finalize em fogo médio até ganhar textura e sabor. Sirva com acompanhamento simples.'
                            },
                            response_text_html: "Criei uma receita com pegada profissional, simples de executar e boa para o dia a dia. Já deixei salva no sistema.<br><button class='af-option-btn' style='margin-top:10px; width:100%;' data-action='view-recipe' data-recipe-id='[NEW_RECIPE_ID]'><i class='fa-solid fa-utensils'></i> Abrir receita criada</button>"
                        };
                    } else if (txt.includes('semana') || txt.includes('cardápio') || txt.includes('planejar') || txt.includes('planejador')) {
                        responseObj = {
                            intent: "answer_question",
                            data: {},
                            response_text_html: "Posso estruturar sua semana com lógica de produção, reaproveitamento e economia: base de grãos, proteína em dois ciclos, legumes versáteis e refeições com encaixe entre almoço e jantar. Me peça algo como <strong>monte uma lista da semana</strong> ou <strong>crie uma receita rápida</strong> que eu já executo dentro do sistema."
                        };
                    } else if (txt.includes('despensa') || txt.includes('geladeira') || txt.includes('armário')) {
                        responseObj = {
                            intent: "answer_question",
                            data: {},
                            response_text_html: `Enxergo a cozinha como sistema: compras, estoque, validade, organização e fluxo de uso. Hoje encontrei estes itens como referência: <strong>${pantryItems.join(', ') || 'nenhum item catalogado ainda'}</strong>. Posso sugerir o que priorizar, o que comprar menos e o que reaproveitar primeiro.`
                        };
                    }

                    resolve({ json: responseObj, html: null });
                }, 1200);
            });
        },

        processIAResponse(jsonResponse, htmlResponse, thinkingMessageElement) {
            let newRecipeId, newListId;
            let finalHtml = htmlResponse || jsonResponse.response_text_html;
            try {
                const intent = jsonResponse.intent; const data = jsonResponse.data;
                switch (intent) {
                    case 'create_shopping_list': newListId = this.executeCreateList(data); if (newListId) finalHtml = finalHtml.replace('[NEW_LIST_ID]', newListId); break;
                    case 'create_recipe': newRecipeId = this.executeCreateRecipe(data); if (newRecipeId) finalHtml = finalHtml.replace('[NEW_RECIPE_ID]', newRecipeId); break;
                    case 'update_shopping_list': this.executeUpdateList(data); break;
                    case 'add_recipe_to_planner': this.executeAddRecipeToPlanner(data); break;
                    case 'answer_question': break;
                    default: console.warn("Intent IA não reconhecido:", intent);
                }
            } catch(e) { console.error("Erro ao executar ação IA:", e); finalHtml += `<br><small style="color:var(--red)">Erro ao executar ação: ${e.message}</small>`; }
            this.saveState();
            thinkingMessageElement.innerHTML = `<div class="bubble">${finalHtml}</div>`;
            if (['create_shopping_list', 'update_shopping_list'].includes(jsonResponse.intent)) { if (this.activeModule === 'lista') this.renderListas(); this.renderListaWidget(); this.renderListasSalvas(); }
            if (['create_recipe'].includes(jsonResponse.intent)) { if (this.activeModule === 'receitas') this.renderReceitas(); }
            if (['add_recipe_to_planner'].includes(jsonResponse.intent)) { if (this.activeModule === 'planejador') this.renderPlanejador(); this.renderPlannerWidget(); }
        },

        executeCreateList(listData) {
            const newListId = this.generateId();
            this.state.listas[newListId] = { nome: listData.list_name || "Lista da IA", items: (listData.items || []).map(item => ({ id: this.generateId(), name: item.name || "Item", qtd: item.quantity || 1, unid: item.unit || "un", checked: false, valor: 0 })) };
            return newListId;
        },
        executeCreateRecipe(recipeData) {
            const newId = this.generateId(); const ingredients = recipeData.ingredients || []; const prepMode = recipeData.prepMode || "Não informado.";
            this.state.receitas[newId] = { id: newId, name: recipeData.recipe_name || "Receita sugerida", desc: recipeData.desc || "Criada automaticamente", content: `<h4>Ingredientes</h4><ul>${ingredients.map(ing => `<li>${ing.qty || ''} ${ing.unit || ''} ${ing.name || '?'}` ).join('')}</ul><h4>Preparo</h4><p>${prepMode.replace(/\n/g, '<br>')}</p>`, ingredients: ingredients.map(ing => ({ name: ing.name || "?", qty: ing.qty || "1", unit: ing.unit || "un" })) };
            return newId;
        },
        executeAddRecipeToPlanner(data) {
             const { recipe_id, day, meal } = data;
             let recipe = this.state.receitas[recipe_id];
             if (!recipe) { const foundKey = Object.keys(this.state.receitas).find(k => this.state.receitas[k].name.toLowerCase().includes(String(recipe_id).toLowerCase())); recipe = this.state.receitas[foundKey]; }
             if(recipe && day && meal) { if(!this.state.planejador[day]) this.state.planejador[day] = {}; this.state.planejador[day][meal] = { id: recipe.id, name: recipe.name }; }
        },
        executeUpdateList(data) {
            const { list_id, changes } = data; const targetId = list_id || this.activeListId;
            if (this.state.listas[targetId] && changes && changes.add) { changes.add.forEach(item => { this.state.listas[targetId].items.unshift({ id: this.generateId(), name: item.name, qtd: item.quantity || 1, unid: item.unit || 'un', checked: false, valor: 0 }); }); }
        },
        executeClearPlannerDay(data) { if(data.day && this.state.planejador[data.day]) delete this.state.planejador[data.day]; },
        executeClearPlannerWeek() { this.state.planejador = {}; },

        initRoboAssistant() {
            const chatbot = {
                widget: document.getElementById('af-chatbot'), toggleBtn: document.getElementById('af-chatbot-toggle'), closeBtn: document.getElementById('af-chatbot-close'), homeBtn: document.getElementById('af-chatbot-home'), bodyEl: document.getElementById('af-chatbot-body'),
                menuTree: {
                    start: { text: "Olá! 👋 Sou o Assistente Virtual do Alimente Fácil. Como posso te ajudar hoje?", options: [ { label: "📝 Quero me Cadastrar", next: "guide_signup" }, { label: "💎 Planos e Preços", next: "guide_plans" }, { label: "🚀 Como funciona o Painel?", next: "guide_features" }, { label: "📞 Preciso de Suporte", next: "guide_support" } ] },
                    guide_signup: { text: "É muito simples! Você pode criar uma conta gratuita agora mesmo.", options: [ { label: "Abrir Cadastro Agora", action: "open_auth_signup", icon: "fa-user-plus" }, { label: "Já tenho conta (Login)", action: "open_auth_login", icon: "fa-sign-in-alt" }, { label: "Voltar ao Início", next: "start", icon: "fa-arrow-left" } ] },
                    guide_plans: { text: "Temos um plano simples e direto para organizar sua rotina alimentar.", options: [ { label: "Ver Tabela de Planos", action: "open_plans_modal", icon: "fa-table" }, { label: "Voltar ao Início", next: "start", icon: "fa-arrow-left" } ] },
                    guide_features: { text: "O Alimente Fácil tem 4 pilares principais.", options: [ { label: "🛒 Listas de Compras", next: "feat_lists" }, { label: "📦 Gestão de Despensa", next: "feat_pantry" }, { label: "🍳 Receitas", next: "feat_recipes" }, { label: "📅 Planejador Semanal", next: "feat_planner" }, { label: "Voltar ao Início", next: "start", icon: "fa-arrow-left" } ] },
                    feat_lists: { text: "Crie listas inteligentes que calculam o total automaticamente.", options: [ { label: "Ir para Listas", action: "nav_lista", icon: "fa-external-link-alt" }, { label: "Voltar", next: "guide_features", icon: "fa-arrow-left" } ] },
                    feat_pantry: { text: "Controle a validade e estoque da sua despensa.", options: [ { label: "Ir para Despensa", action: "nav_despensa", icon: "fa-external-link-alt" }, { label: "Voltar", next: "guide_features", icon: "fa-arrow-left" } ] },
                    feat_recipes: { text: "Salve receitas e calcule custos.", options: [ { label: "Ir para Receitas", action: "nav_receitas", icon: "fa-external-link-alt" }, { label: "Voltar", next: "guide_features", icon: "fa-arrow-left" } ] },
                    feat_planner: { text: "Organize o cardápio da semana inteira.", options: [ { label: "Ir para Planejador", action: "nav_planejador", icon: "fa-external-link-alt" }, { label: "Voltar", next: "guide_features", icon: "fa-arrow-left" } ] },
                    guide_support: { text: "Use nosso formulário de contato na página inicial.", options: [ { label: "Ir para Contato", action: "scroll_contact", icon: "fa-envelope" }, { label: "Voltar ao Início", next: "start", icon: "fa-arrow-left" } ] }
                },
                renderMessage(text, sender = 'bot') { const msgDiv = document.createElement('div'); msgDiv.className = `af-msg ${sender}`; msgDiv.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); this.bodyEl.appendChild(msgDiv); this.scrollToBottom(); },
                renderOptions(options) { const optionsDiv = document.createElement('div'); optionsDiv.className = 'af-options-container'; options.forEach(opt => { const btn = document.createElement('button'); btn.className = 'af-option-btn'; const iconHtml = opt.icon ? `<i class="fa-solid ${opt.icon}"></i>` : `<i class="fa-solid fa-chevron-right"></i>`; btn.innerHTML = `${iconHtml} ${opt.label}`; btn.onclick = () => { this.renderMessage(opt.label, 'user'); setTimeout(() => { if (opt.next) { this.navigateMenu(opt.next); } else if (opt.action) { this.executeAction(opt.action); } }, 600); }; optionsDiv.appendChild(btn); }); this.bodyEl.appendChild(optionsDiv); this.scrollToBottom(); },
                navigateMenu(menuKey) { const menu = this.menuTree[menuKey]; if (menu) { this.renderMessage(menu.text, 'bot'); this.renderOptions(menu.options); } },
                executeAction(action) {
                    switch(action) {
                        case 'open_auth_signup': this.renderMessage("Abrindo cadastro...", 'bot'); app.showAuthModal(); setTimeout(() => document.querySelector('.auth-toggle-link[data-view="signup-view"]')?.click(), 100); break;
                        case 'open_auth_login': this.renderMessage("Abrindo login...", 'bot'); app.showAuthModal(); break;
                        case 'open_plans_modal': this.renderMessage("Mostrando planos...", 'bot'); app.showPlansModal(); break;
                        case 'scroll_contact': this.renderMessage("Indo para contato...", 'bot'); document.getElementById('sobre')?.scrollIntoView({ behavior: 'smooth' }); app.elements.nodeCluster?.classList.remove('is-open'); break;
                        case 'nav_lista': case 'nav_despensa': case 'nav_receitas': case 'nav_planejador':
                            const module = action.split('_')[1];
                            if (app.isAppMode) { this.renderMessage(`Navegando para ${module}...`, 'bot'); app.activateModuleAndRender(module); }
                            else { this.renderMessage("Faça login primeiro.", 'bot'); this.renderOptions([{ label: "Login", action: "open_auth_login" }]); } break;
                    }
                },
                scrollToBottom() { this.bodyEl.scrollTop = this.bodyEl.scrollHeight; },
                toggle() { const isOpen = this.widget.classList.contains('af-open'); if (isOpen) { this.widget.classList.remove('af-open'); this.widget.setAttribute('aria-hidden', 'true'); this.toggleBtn.classList.remove('af-hidden'); } else { this.widget.classList.add('af-open'); this.widget.setAttribute('aria-hidden', 'false'); this.toggleBtn.classList.add('af-hidden'); if (this.bodyEl.children.length === 0) { this.navigateMenu('start'); } } },
                restart() { this.bodyEl.innerHTML = ''; this.navigateMenu('start'); }
            };
            if(chatbot.toggleBtn) chatbot.toggleBtn.addEventListener('click', () => chatbot.toggle());
            if(chatbot.closeBtn) chatbot.closeBtn.addEventListener('click', () => chatbot.toggle());
            if(chatbot.homeBtn) chatbot.homeBtn.addEventListener('click', () => chatbot.restart());
            document.addEventListener('click', (e) => { const isOpen = chatbot.widget.classList.contains('af-open'); const clickedInside = chatbot.widget.contains(e.target); const clickedToggle = chatbot.toggleBtn.contains(e.target); if (isOpen && !clickedInside && !clickedToggle) { chatbot.toggle(); } });
        }
    };

const ALL_ITEMS_DATA = [
    { name: 'Abacate', price: 5.00, unit_desc: 'unidade de abacate', icon: 'icone-abacate.png' },
    { name: 'Abacaxi', price: 7.00, unit_desc: 'unidade de abacaxi', icon: 'icone-abacaxi.png' },
    { name: 'Abóbora', price: 4.50, unit_desc: 'kg de abóbora', icon: 'icone-abobora.png' },
    { name: 'Abobrinha', price: 3.00, unit_desc: 'unidade de abobrinha', icon: 'icone-abobrinha.png' },
    { name: 'Açafrão', price: 2.50, unit_desc: 'pitada de açafrão', icon: 'icone-acafrao.png' },
    { name: 'Açúcar', price: 4.00, unit_desc: 'kg de açúcar', icon: 'icone-acucar.png' },
    { name: 'Agrião', price: 3.50, unit_desc: 'maço de agrião', icon: 'icone-agriao.png' },
    { name: 'Aipo', price: 4.00, unit_desc: 'talo de aipo', icon: 'icone-aipo.png' },
    { name: 'Alcatra', price: 45.00, unit_desc: 'kg de alcatra', icon: 'icone-alcatra.png' },
    { name: 'Alface', price: 3.00, unit_desc: 'pé de alface', icon: 'icone-alface.png' },
    { name: 'Alho', price: 1.00, unit_desc: 'dente de alho', icon: 'icone-alho.png' },
    { name: 'Alho Poró', price: 4.50, unit_desc: 'talo de alho poró', icon: 'icone-alho-poro.png' },
    { name: 'Amêndoas', price: 8.00, unit_desc: 'punhado de amêndoas', icon: 'icone-amendoas.png' },
    { name: 'Arroz', price: 8.50, unit_desc: 'kg de arroz', icon: 'icone-arroz.png' },
    { name: 'Aveia', price: 6.00, unit_desc: 'colher de sopa de aveia', icon: 'icone-aveia.png' },
    { name: 'Azeite', price: 2.00, unit_desc: 'fio de azeite', icon: 'icone-azeite.png' },
    { name: 'Azeitona', price: 1.50, unit_desc: 'colher de azeitona', icon: 'icone-azeitona.png' },
    { name: 'Bacon', price: 15.00, unit_desc: 'fatia de bacon', icon: 'icone-bacon.png' },
    { name: 'Banana', price: 0.80, unit_desc: 'unidade de banana', icon: 'icone-banana.png' },
    { name: 'Batata', price: 0.80, unit_desc: 'unidade de batata', icon: 'icone-batata.png' },
    { name: 'Batata Doce', price: 1.20, unit_desc: 'unidade de batata doce', icon: 'icone-batata-doce.png' },
    { name: 'Berinjela', price: 2.50, unit_desc: 'unidade de berinjela', icon: 'icone-berinjela.png' },
    { name: 'Beterraba', price: 1.00, unit_desc: 'unidade de beterraba', icon: 'icone-beterraba.png' },
    { name: 'Bolo', price: 10.00, unit_desc: 'fatia de bolo', icon: 'icone-bolo.png' },
    { name: 'Brócolis', price: 5.00, unit_desc: 'buquê de brócolis', icon: 'icone-brocolis.png' },
    { name: 'Cacau em Pó', price: 3.00, unit_desc: 'colher de cacau', icon: 'icone-cacau-em-po.png' },
    { name: 'Camarão', price: 60.00, unit_desc: '100g de camarão', icon: 'icone-camarao.png' },
    { name: 'Carne de Porco', price: 25.00, unit_desc: 'bife de porco', icon: 'icone-carne-de-porco.png' },
    { name: 'Castanha', price: 9.00, unit_desc: 'punhado de castanha', icon: 'icone-castanha.png' },
    { name: 'Cebola', price: 0.70, unit_desc: 'unidade de cebola', icon: 'icone-cebola.png' },
    { name: 'Cebolinha', price: 0.50, unit_desc: 'ramo de cebolinha', icon: 'icone-cebolinha.png' },
    { name: 'Cenoura', price: 0.90, unit_desc: 'unidade de cenoura', icon: 'icone-cenoura.png' },
    { name: 'Cereja', price: 2.00, unit_desc: 'unidade de cereja', icon: 'icone-cereja.png' },
    { name: 'Champignon', price: 6.00, unit_desc: 'xícara de champignon', icon: 'icone-champignon.png' },
    { name: 'Chã de Dentro', price: 42.00, unit_desc: 'bife de chã', icon: 'icone-cha-de-dentro.png' },
    { name: 'Chia', price: 2.00, unit_desc: 'colher de chia', icon: 'icone-chia.png' },
    { name: 'Chocolate', price: 8.00, unit_desc: 'barra de chocolate', icon: 'icone-chocolate.png' },
    { name: 'Coco', price: 5.00, unit_desc: 'unidade de coco', icon: 'icone-coco.png' },
    { name: 'Coentro', price: 0.50, unit_desc: 'ramo de coentro', icon: 'icone-coentro.png' },
    { name: 'Cogumelo', price: 12.00, unit_desc: '100g de cogumelo', icon: 'icone-cogumelo.png' },
    { name: 'Contrafilé', price: 48.00, unit_desc: 'bife de contrafilé', icon: 'icone-contrafile.png' },
    { name: 'Cookie', price: 3.00, unit_desc: 'unidade de cookie', icon: 'icone-cookie.png' },
    { name: 'Couve', price: 3.50, unit_desc: 'folha de couve', icon: 'icone-couve.png' },
    { name: 'Couve-flor', price: 5.50, unit_desc: 'buquê de couve-flor', icon: 'icone-couve-flor.png' },
    { name: 'Coxa de Frango', price: 18.00, unit_desc: 'coxa de frango', icon: 'icone-coxa-de-frango.png' },
    { name: 'Croissant', price: 5.00, unit_desc: 'unidade de croissant', icon: 'icone-croissant.png' },
    { name: 'Espinafre', price: 4.00, unit_desc: 'maço de espinafre', icon: 'icone-espinafre.png' },
    { name: 'Farinha', price: 5.00, unit_desc: 'kg de farinha', icon: 'icone-farinha.png' },
    { name: 'Feijão', price: 8.00, unit_desc: 'kg de feijão', icon: 'icone-feijao.png' },
    { name: 'Feijão Preto', price: 7.20, unit_desc: 'kg de feijão preto', icon: 'icone-feijao-preto.png' },
    { name: 'Gengibre', price: 1.50, unit_desc: 'pedaço de gengibre', icon: 'icone-gengibre.png' },
    { name: 'Grão de Bico', price: 7.00, unit_desc: 'xícara de grão de bico', icon: 'icone-grao-de-bico.png' },
    { name: 'Inhame', price: 1.50, unit_desc: 'unidade de inhame', icon: 'icone-inhame.png' },
    { name: 'Iogurte', price: 3.50, unit_desc: 'pote de iogurte', icon: 'icone-iogurte.png' },
    { name: 'Kiwi', price: 1.80, unit_desc: 'unidade de kiwi', icon: 'icone-kiwi.png' },
    { name: 'Laranja', price: 0.90, unit_desc: 'unidade de laranja', icon: 'icone-laranja.png' },
    { name: 'Leite', price: 5.50, unit_desc: 'litro de leite', icon: 'icone-leite.png' },
    { name: 'Lentilha', price: 7.50, unit_desc: 'xícara de lentilha', icon: 'icone-lentilha.png' },
    { name: 'Limão', price: 0.60, unit_desc: 'unidade de limão', icon: 'icone-limao.png' },
    { name: 'Linguiça', price: 22.00, unit_desc: 'gomo de linguiça', icon: 'icone-linguica.png' },
    { name: 'Linhaça', price: 1.50, unit_desc: 'colher de linhaça', icon: 'icone-linhaca.png' },
    { name: 'Maçã', price: 1.50, unit_desc: 'unidade de maçã', icon: 'icone-maca.png' },
    { name: 'Macarrão', price: 6.00, unit_desc: 'pacote de macarrão', icon: 'icone-macarrao.png' },
    { name: 'Mamão', price: 6.00, unit_desc: 'unidade de mamão', icon: 'icone-mamao.png' },
    { name: 'Manga', price: 4.00, unit_desc: 'unidade de manga', icon: 'icone-manga.png' },
    { name: 'Manjericão', price: 0.50, unit_desc: 'ramo de manjericão', icon: 'icone-manjericao.png' },
    { name: 'Manteiga', price: 8.00, unit_desc: 'tablete de manteiga', icon: 'icone-manteiga.png' },
    { name: 'Maracujá', price: 2.00, unit_desc: 'unidade de maracujá', icon: 'icone-maracuja.png' },
    { name: 'Mel', price: 3.00, unit_desc: 'colher de mel', icon: 'icone-mel.png' },
    { name: 'Melancia', price: 10.00, unit_desc: 'fatia de melancia', icon: 'icone-melancia.png' },
    { name: 'Melão', price: 8.00, unit_desc: 'fatia de melão', icon: 'icone-melao.png' },
    { name: 'Milho', price: 2.00, unit_desc: 'espiga de milho', icon: 'icone-milho.png' },
    { name: 'Molho de Tomate', price: 4.00, unit_desc: 'lata de molho', icon: 'icone-molho-de-tomate.png' },
    { name: 'Molho Shoyu', price: 8.00, unit_desc: 'frasco de shoyu', icon: 'icone-molho-shoyu.png' },
    { name: 'Amendoim', price: 5.00, unit_desc: 'pacote de amendoim', icon: 'icone-amendoim.png' },
    { name: 'Morango', price: 1.00, unit_desc: 'caixa de morango', icon: 'icone-morango.png' },
    { name: 'Nabo', price: 2.50, unit_desc: 'unidade de nabo', icon: 'icone-nabo.png' },
    { name: 'Nozes', price: 5.00, unit_desc: 'punhado de nozes', icon: 'icone-nozes.png' },
    { name: 'Óleo de Soja', price: 9.00, unit_desc: 'litro de óleo', icon: 'icone-oleo-de-soja.png' },
    { name: 'Orégano', price: 0.50, unit_desc: 'pitada de orégano', icon: 'icone-oregano.png' },
    { name: 'Ovos', price: 1.00, unit_desc: 'unidade de ovo', icon: 'icone-ovos.png' },
    { name: 'Palmito', price: 9.00, unit_desc: 'vidro de palmito', icon: 'icone-palmito.png' },
    { name: 'Pão de Forma', price: 8.00, unit_desc: 'pacote de pão', icon: 'icone-pao-de-forma.png' },
    { name: 'Pão Francês', price: 0.80, unit_desc: 'unidade de pão', icon: 'icone-pao-frances.png' },
    { name: 'Papel Higiênico', price: 25.50, unit_desc: 'pacote', icon: 'icone-papel-higienico.png' },
    { name: 'Peito de Frango', price: 20.00, unit_desc: 'kg de peito de frango', icon: 'icone-peito-de-frango.png' },
    { name: 'Peixe', price: 35.00, unit_desc: 'posta de peixe', icon: 'icone-peixe.png' },
    { name: 'Pepino', price: 1.50, unit_desc: 'unidade de pepino', icon: 'icone-pepino.png' },
    { name: 'Pera', price: 2.00, unit_desc: 'unidade de pera', icon: 'icone-pera.png' },
    { name: 'Pêssego', price: 2.50, unit_desc: 'unidade de pêssego', icon: 'icone-pessego.png' },
    { name: 'Pimentão', price: 1.80, unit_desc: 'unidade de pimentão', icon: 'icone-pimentao.png' },
    { name: 'Pimenta', price: 0.50, unit_desc: 'pitada de pimenta', icon: 'icone-pimenta.png' },
    { name: 'Queijo', price: 12.00, unit_desc: '100g de queijo', icon: 'icone-queijo.png' },
    { name: 'Quinoa', price: 10.00, unit_desc: 'xícara de quinoa', icon: 'icone-quinoa.png' },
    { name: 'Quiabo', price: 0.50, unit_desc: 'unidade de quiabo', icon: 'icone-quiabo.png' },
    { name: 'Rabanete', price: 0.70, unit_desc: 'unidade de rabanete', icon: 'icone-rabanete.png' },
    { name: 'Repolho', price: 4.00, unit_desc: 'unidade de repolho', icon: 'icone-repolho.png' },
    { name: 'Rúcula', price: 3.50, unit_desc: 'maço de rúcula', icon: 'icone-rucula.png' },
    { name: 'Sal', price: 2.00, unit_desc: 'kg de sal', icon: 'icone-sal.png' },
    { name: 'Salsa', price: 0.50, unit_desc: 'ramo de salsa', icon: 'icone-salsa.png' },
    { name: 'Salsão', price: 4.00, unit_desc: 'talo de salsão', icon: 'icone-salsao.png' },
    { name: 'Tomate', price: 5.00, unit_desc: 'kg de tomate', icon: 'icone-tomate.png' },
    { name: 'Uva', price: 9.00, unit_desc: 'cacho de uva', icon: 'icone-uva.png' },
    { name: 'Vagem', price: 3.00, unit_desc: 'punhado de vagem', icon: 'icone-vagem.png' },
    { name: 'Vinagre', price: 4.00, unit_desc: 'litro de vinagre', icon: 'icone-vinagre.png' },
    { name: 'Cravo-da-índia', price: 3.00, unit_desc: 'unidade de cravo', icon: 'icone-cravo-da-india.png' },
    { name: 'Canela em Pau', price: 4.00, unit_desc: 'pau de canela', icon: 'icone-canela-em-pau.png' },
    { name: 'Zimbro', price: 1.00, unit_desc: 'baga de zimbro', icon: 'icone-zimbro.png' }
];

(() => {
    const originalLoadState = app.loadState.bind(app);
    app.loadState = function() {
        originalLoadState();
        this.listSortMode = this.listSortMode || 'date_desc';
        this.autocompleteTimeout = null;
        this.inlineListEdit = null;
        this.pendingCustomMeal = null;
        Object.entries(this.state?.listas || {}).forEach(([listId, lista]) => {
            if (!lista.createdAt) lista.createdAt = listId === 'listaDaSemana' ? '2026-01-01T00:00:00.000Z' : new Date().toISOString();
        });
    };

    app.saveState = function() {
        try {
            const stateToSave = {
                isAppMode: this.isAppMode,
                isLoggedIn: this.isLoggedIn,
                userPlan: this.userPlan,
                activeModule: this.activeModule,
                activeListId: this.activeListId,
                listSortMode: this.listSortMode || 'date_desc',
                data: this.state
            };
            localStorage.setItem('alimenteFacilState_vFinal', JSON.stringify(stateToSave));
            localStorage.setItem('themePreference', document.body.classList.contains('lua-mode') ? 'lua' : 'sol');
        } catch (e) { console.error('Erro ao salvar estado', e); }
    };

    app.sortSavedLists = function(lists = []) {
        const getTotal = (lista) => (lista.items || []).reduce((acc, item) => acc + ((parseFloat(item.valor) || 0) * (parseFloat(item.qtd) || 0)), 0);
        const getCount = (lista) => (lista.items || []).length;
        const sorted = [...lists];
        switch (this.listSortMode) {
            case 'name_asc':
                sorted.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
                break;
            case 'total_desc':
                sorted.sort((a, b) => getTotal(b) - getTotal(a) || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
                break;
            case 'items_desc':
                sorted.sort((a, b) => getCount(b) - getCount(a) || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
                break;
            case 'date_desc':
            default:
                sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                break;
        }
        return sorted;
    };

    app.renderListas = function(container) {
        if (!container) container = document.getElementById('module-lista');
        if (!container) return;
        container.innerHTML = `
            <div class="master-detail-layout" id="list-manager">
                <div class="md-list-column dashboard-card">
                    <div class="card-header"><h3><i class="fa-solid fa-list-ul"></i> Minhas Listas</h3></div>
                    <div class="card-content">
                        <div style="display:flex; gap:.65rem; align-items:center; margin-bottom:1rem;">
                            <button class="btn btn-secondary btn-create-list" style="flex:1; margin:0;"><i class="fa-solid fa-plus"></i> Nova Lista</button>
                            <select id="list-sort-select" class="input-large" style="max-width:190px;">
                                <option value="name_asc">Nome (A-Z)</option>
                                <option value="date_desc">Data de criação</option>
                                <option value="total_desc">Valor total</option>
                                <option value="items_desc">Quantidade de itens</option>
                            </select>
                        </div>
                        <div id="saved-lists-container"></div>
                    </div>
                </div>
                <div class="md-detail-column dashboard-card" id="lista-detail-desktop">
                    <div class="card-header">
                        <button id="list-back-btn" class="icon-button mobile-only" aria-label="Voltar"><i class="fa-solid fa-arrow-left"></i></button>
                        <h3 id="active-list-title"><i class="fa-solid fa-cart-shopping"></i> Selecione uma Lista</h3>
                    </div>
                    <div class="add-item-form-container">
                        <form class="add-item-form">
                            <input type="hidden" id="active-list-id-input" value="">
                            <div class="form-group form-group-flex"><label>Nome</label><input type="text" id="lista-form-nome-full" placeholder="Ex: Arroz"></div>
                            <div class="form-group form-group-small"><label>Qtd</label><input type="number" id="lista-form-qtd-full" value="1" min="0.1" step="any"></div>
                            <div class="form-group form-group-small"><label>Unid</label><select id="lista-form-unid-full"><option value="un">un</option><option value="kg">kg</option><option value="g">g</option><option value="L">L</option><option value="ml">ml</option><option value="pct">pct</option><option value="cx">cx</option></select></div>
                            <div class="form-group form-group-medium"><label>Valor</label><input type="text" id="lista-form-valor-full" placeholder="0.00"></div>
                            <button type="submit" class="btn btn-primary btn-add-item" id="lista-add-item-btn-full"><i class="fa-solid fa-plus"></i></button>
                        </form>
                    </div>
                    <div class="card-content no-padding-top" id="lista-items-full" data-group="shared-items" data-list-type="lista"><div class="empty-state-placeholder"><p>Selecione uma lista ao lado para ver os itens.</p></div></div>
                    <div class="card-footer module-actions-footer" id="active-list-actions"></div>
                </div>
            </div>`;
        const sortSelect = document.getElementById('list-sort-select');
        if (sortSelect) sortSelect.value = this.listSortMode || 'date_desc';
        this.renderListasSalvas();
        if (this.activeListId) this.renderListaAtiva(this.activeListId);
    };

    app.renderListasSalvas = function() {
        const container = document.getElementById('saved-lists-container');
        if (!container) return;
        const lists = this.sortSavedLists(Object.entries(this.state.listas).map(([listId, lista]) => ({ listId, ...lista })));
        container.innerHTML = lists.map(lista => this.renderUniversalCard({
            type: 'saved-list',
            data: { id: lista.listId, name: lista.nome, items: lista.items || [] },
            actions: [
                { type: 'edit select-list-btn', icon: 'fa-solid fa-pencil', label: 'Editar' },
                { type: 'danger delete-list-btn', icon: 'fa-solid fa-trash', label: 'Excluir' }
            ],
            isClickable: true
        })).join('') || '<p class="empty-list-message">Nenhuma lista salva. Crie uma nova acima!</p>';
    };

    app.renderListaAtiva = function(listId) {
        const container = document.getElementById('lista-items-full');
        const titleEl = document.getElementById('active-list-title');
        const actionsContainer = document.getElementById('active-list-actions');
        const idInput = document.getElementById('active-list-id-input');
        const nameFormInput = document.getElementById('lista-form-nome-full');
        const qtyFormInput = document.getElementById('lista-form-qtd-full');
        const valorFormInput = document.getElementById('lista-form-valor-full');
        if (!container || !titleEl || !actionsContainer || !idInput || !nameFormInput || !qtyFormInput || !valorFormInput) return;
        const lista = this.state.listas[listId];
        if (!lista) return;
        idInput.value = listId;
        titleEl.innerHTML = `<i class="fa-solid fa-cart-shopping"></i> <input type="text" id="active-list-name-input" value="${this.escapeHtml(lista.nome)}" placeholder="Nome da lista" aria-label="Nome da lista ativa">`;
        container.innerHTML = (lista.items || []).map(item => this.createListaItemHTML(item)).join('') || '<p class="empty-list-message">Esta lista está vazia.</p>';
        actionsContainer.innerHTML = `<button class="icon-button" id="lista-save-changes-btn" title="Salvar"><i class="fa-solid fa-floppy-disk"></i></button><button class="icon-button danger" id="lista-delete-btn" title="Excluir"><i class="fa-solid fa-trash"></i></button>`;
        this.initSortableItems('lista-items-full');
    };

    app.getListIdFromItemElement = function(itemEl) {
        const modalBody = itemEl?.closest('#list-view-modal-body');
        if (modalBody?.dataset.listId) return modalBody.dataset.listId;
        return document.getElementById('active-list-id-input')?.value || this.activeListId;
    };

    app.refreshListContexts = function(listId) {
        if (this.activeModule === 'lista' && listId === (document.getElementById('active-list-id-input')?.value || this.activeListId)) this.renderListaAtiva(listId);
        const modalBody = document.getElementById('list-view-modal-body');
        if (modalBody && modalBody.dataset.listId === listId && document.getElementById('list-view-modal')?.classList.contains('is-visible')) {
            const lista = this.state.listas[listId];
            modalBody.innerHTML = (lista?.items || []).map(item => this.createListaItemHTML(item)).join('') || '<p class="empty-list-message">Lista vazia.</p>';
            this.initSortableItems('list-view-modal-body');
        }
        this.renderListaWidget();
        this.renderOrcamento();
    };

    app.startInlineListEdit = function(itemEl) {
        const listId = this.getListIdFromItemElement(itemEl);
        const itemId = itemEl?.dataset.id;
        const item = this.state.listas[listId]?.items.find(i => i.id.toString() === String(itemId));
        if (!item) return;
        this.inlineListEdit = { listId, itemId: item.id, draft: { name: item.name, qtd: item.qtd, unid: item.unid, valor: parseFloat(item.valor || 0).toFixed(2) } };
        this.refreshListContexts(listId);
    };
    app.cancelInlineListEdit = function() {
        const listId = this.inlineListEdit?.listId;
        this.inlineListEdit = null;
        if (listId) this.refreshListContexts(listId);
    };
    app.handleSaveInlineListEdit = function(itemEl) {
        const listId = this.getListIdFromItemElement(itemEl) || this.inlineListEdit?.listId;
        const itemId = itemEl?.dataset.id || this.inlineListEdit?.itemId;
        const itemIndex = this.state.listas[listId]?.items.findIndex(i => i.id.toString() === String(itemId));
        if (itemIndex == null || itemIndex < 0) return;
        const name = itemEl.querySelector('.inline-edit-name')?.value.trim();
        const qtd = parseFloat(itemEl.querySelector('.inline-edit-qtd')?.value) || 1;
        const unid = itemEl.querySelector('.inline-edit-unid')?.value || 'un';
        const valor = parseFloat(itemEl.querySelector('.inline-edit-valor')?.value) || 0;
        if (!name) return this.showNotification('Informe o nome do item.', 'error');
        this.state.listas[listId].items[itemIndex] = { ...this.state.listas[listId].items[itemIndex], name, qtd, unid, valor: valor.toFixed(2) };
        this.inlineListEdit = null;
        this.saveState();
        this.refreshListContexts(listId);
        this.showNotification('Item da lista atualizado!', 'success');
    };

    app.createListaItemHTML = function(item) {
        const itemName = this.escapeHtml(item.name);
        const isEditing = this.inlineListEdit && String(this.inlineListEdit.itemId) === String(item.id);
        const draft = isEditing ? (this.inlineListEdit.draft || {}) : null;
        if (isEditing) {
            return `<div class="placeholder-item inline-editing" data-id="${item.id}" data-name="${this.escapeHtml(item.name)}"><div class="item-inline-edit-grid"><div class="inline-field inline-name-field"><label>Nome</label><input type="text" class="inline-edit-name" value="${this.escapeHtml(draft.name ?? item.name)}"></div><div class="inline-field"><label>Qtd</label><input type="number" class="inline-edit-qtd" value="${draft.qtd ?? item.qtd}" min="0.1" step="any"></div><div class="inline-field"><label>Unid</label><select class="inline-edit-unid">${['un','kg','g','L','ml','pct','cx'].map(u => `<option value="${u}" ${(draft.unid ?? item.unid) === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div><div class="inline-field"><label>Valor</label><input type="number" class="inline-edit-valor" value="${parseFloat(draft.valor ?? item.valor ?? 0).toFixed(2)}" min="0" step="0.01"></div><div class="item-actions inline-edit-actions"><button class="icon-button save-inline-edit-btn" title="Salvar"><i class="fa-solid fa-check"></i></button><button class="icon-button cancel-inline-edit-btn" title="Cancelar"><i class="fa-solid fa-xmark"></i></button></div></div></div>`;
        }
        return `<div class="placeholder-item ${item.checked ? 'is-checked' : ''}" data-id="${item.id}" data-name="${item.name}" data-qtd="${item.qtd}" data-unid="${item.unid}" data-valor="${item.valor}"><div class="item-row"><div class="item-main-info"><i class="fa-solid fa-grip-vertical drag-handle" title="Arrastar item"></i><input type="checkbox" ${item.checked ? 'checked' : ''} aria-label="Marcar ${itemName}"><span class="item-name">${itemName}</span></div><div class="item-actions"><button class="icon-button edit-btn" title="Editar"><i class="fa-solid fa-pencil"></i></button><button class="icon-button delete-btn" title="Excluir"><i class="fa-solid fa-times"></i></button></div></div><div class="item-details-grid"><div>Qtd: <span>${item.qtd}</span></div><div>Un: <span>${item.unid}</span></div><div>Preço: <span>R$ ${parseFloat(item.valor || 0).toFixed(2)}</span></div></div><div class="item-checked-actions"><div class="form-group-checked"><label for="validade-${item.id}">Validade (Opcional)</label><input type="date" id="validade-${item.id}" class="item-validade-input"></div><div class="confirm-actions-group"><small class="confirm-pantry-text">Deseja enviar para a despensa?</small><div class="confirm-buttons"><button class="icon-button cancel-move-btn" title="Não"><i class="fa-solid fa-times-circle" style="color: var(--red);"></i></button><button class="icon-button move-to-despensa-btn" title="Sim"><i class="fa-solid fa-check-circle" style="color: var(--green);"></i></button></div></div></div></div>`;
    };

    app._legacy_handleAutocomplete_v1 = function(inputElement) {
        const rawQuery = inputElement.value.trim();
        const query = this.normalizeSearchText(rawQuery);
        this.activeAutocompleteInput = inputElement;
        if (this.autocompleteTimeout) clearTimeout(this.autocompleteTimeout);
        if (this.elements.autocompleteSuggestions) this.elements.autocompleteSuggestions.innerHTML = '';
        if (query.length < 1) return this.hideAutocomplete();
        this.autocompleteTimeout = setTimeout(() => {
            const unique = new Map();
            const pushSuggestion = (item) => {
                if (!item?.name) return;
                const key = this.normalizeSearchText(item.name);
                if (!key || unique.has(key) || !key.includes(query)) return;
                unique.set(key, item);
            };
            ALL_ITEMS_DATA.forEach(pushSuggestion);
            (this.state?.despensa || []).forEach(item => pushSuggestion({ name: item.name, price: Number(item.valor || 0), unit_desc: item.unid || 'un' }));
            (this.state?.essenciais || []).forEach(item => pushSuggestion({ name: item.name, price: Number(item.preco || 0), unit_desc: item.unid || 'un' }));
            Object.values(this.state?.receitas || {}).forEach(recipe => {
                (recipe?.ingredients || []).forEach(ing => pushSuggestion({ name: ing.name, price: 0, unit_desc: ing.unit || 'un' }));
            });
            const suggestions = Array.from(unique.values()).slice(0, 10);
            if (!suggestions.length) return this.showAutocomplete([{ name: `Insira manual: ${rawQuery}` }], query, inputElement);
            this.showAutocomplete(suggestions, query, inputElement);
        }, 120);
    };
    app._legacy_hideAutocomplete_v1 = function() {
        if (this.autocompleteTimeout) clearTimeout(this.autocompleteTimeout);
        if (this.elements.autocompleteSuggestions) {
            this.elements.autocompleteSuggestions.style.display = 'none';
            this.elements.autocompleteSuggestions.innerHTML = '';
        }
        this.activeAutocompleteInput = null;
    };

    app.handleOpenListViewModal = function(listId) {
        const lista = this.state.listas[listId];
        if (!lista) return;
        const header = document.querySelector('#list-view-modal .modal-header');
        const body = document.getElementById('list-view-modal-body');
        const footer = document.getElementById('list-view-modal-footer');
        const idInput = document.getElementById('modal-list-id-input');
        if (header) header.innerHTML = `<button class="icon-button" data-modal-close="list-view-modal"><i class="fa-solid fa-arrow-left"></i></button><h3 id="list-view-modal-title" style="flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${this.escapeHtml(lista.nome)}</h3><button class="icon-button" id="list-view-edit-btn" title="Editar"><i class="fa-solid fa-pencil"></i></button>`;
        if (footer) footer.innerHTML = `<button class="icon-button pdf-btn" data-list-id="${listId}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button><button class="icon-button print-btn" data-list-id="${listId}" title="Imprimir"><i class="fa-solid fa-print"></i></button><button class="icon-button share-btn" data-list-id="${listId}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>`;
        if (idInput) idInput.value = listId;
        if (body) {
            body.dataset.listId = listId;
            body.innerHTML = (lista.items || []).map(item => this.createListaItemHTML(item)).join('') || '<p class="empty-list-message">Lista vazia.</p>';
            this.initSortableItems('list-view-modal-body');
        }
        this.openModal('list-view-modal');
        document.getElementById('list-view-edit-btn')?.addEventListener('click', () => { this.closeModal('list-view-modal'); this.openListEditView(listId); }, { once: true });
    };

    app.handleOpenPantryView = function(itemEl) {
        const id = itemEl?.dataset.id;
        const item = this.state.despensa.find(i => i.id.toString() === String(id));
        if (!item) return;
        const titleEl = document.getElementById('pantry-view-title');
        const bodyEl = document.getElementById('pantry-view-body');
        const footerEl = document.getElementById('pantry-view-footer');
        if (!titleEl || !bodyEl || !footerEl) return;
        titleEl.textContent = item.name;
        const stock = parseInt(item.stock || 0, 10);
        const stockBars = Array.from({ length: 4 }, (_, i) => `<div class="card__stock-bar ${i < Math.round(stock / 25) ? 'active' : ''}"></div>`).join('');
        bodyEl.innerHTML = `<div class="pantry-view-readonly"><div class="detail-kpi-grid"><div class="detail-kpi"><strong>${this.escapeHtml(item.name)}</strong><span>Item da despensa</span></div><div class="detail-kpi"><strong>${item.qtd}</strong><span>Quantidade</span></div><div class="detail-kpi"><strong>${this.escapeHtml(item.unid || 'un')}</strong><span>Unidade</span></div><div class="detail-kpi"><strong>R$ ${parseFloat(item.valor || 0).toFixed(2)}</strong><span>Valor unitário</span></div></div><div class="detail-stack" style="margin-top:1rem;"><div class="detail-listing-item"><div><strong>Validade</strong><p class="detail-note">${item.validade ? item.validade.split('-').reverse().join('/') : 'Não informada'}</p></div></div><div class="detail-listing-item"><div><strong>Nível de estoque</strong><p class="detail-note">${stock}%</p></div><div class="card__stock">${stockBars}</div></div></div></div>`;
        footerEl.innerHTML = `<button class="icon-button share-btn" data-item-id="${item.id}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button><button class="icon-button print-btn" data-item-id="${item.id}" title="Imprimir"><i class="fa-solid fa-print"></i></button><button class="icon-button pdf-btn" data-item-id="${item.id}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>`;
        this.openModal('pantry-view-modal');
    };

    app.handleOpenDespensaEditModal = function(itemEl) {
        const id = itemEl?.dataset.id;
        const item = this.state.despensa.find(i => i.id.toString() === String(id));
        if (!item) return;
        document.getElementById('edit-item-id').value = item.id;
        document.getElementById('edit-item-type').value = 'despensa';
        document.getElementById('item-edit-title').innerHTML = `<i class="fa-solid fa-pencil"></i> Editar Item da Despensa`;
        document.getElementById('edit-item-name').value = item.name;
        document.getElementById('edit-item-qtd').value = item.qtd || 1;
        document.getElementById('edit-item-unid').value = item.unid || 'un';
        document.getElementById('edit-item-valor').value = parseFloat(item.valor || 0).toFixed(2);
        document.getElementById('edit-item-validade').value = item.validade || '';
        document.getElementById('edit-item-stock').value = item.stock || 100;
        document.getElementById('edit-item-despensa-fields').style.display = 'block';
        const footer = document.querySelector('#item-edit-modal .modal-footer');
        if (footer) footer.innerHTML = `<button class="icon-button" data-modal-close="item-edit-modal" aria-label="Cancelar"><i class="fa-solid fa-xmark"></i></button><button class="icon-button" id="item-edit-save-btn" aria-label="Salvar"><i class="fa-solid fa-floppy-disk"></i></button>`;
        document.getElementById('item-edit-save-btn')?.addEventListener('click', () => this.handleSaveEditModal(), { once: true });
        this.openModal('item-edit-modal');
    };

    app.handleSaveEditModal = function() {
        const id = document.getElementById('edit-item-id')?.value;
        const type = document.getElementById('edit-item-type')?.value;
        if (!id || type !== 'despensa') return;
        const idx = this.state.despensa.findIndex(i => i.id.toString() === String(id));
        if (idx < 0) return;
        this.state.despensa[idx] = {
            ...this.state.despensa[idx],
            name: document.getElementById('edit-item-name')?.value.trim() || 'Item sem nome',
            qtd: parseFloat(document.getElementById('edit-item-qtd')?.value) || 1,
            unid: document.getElementById('edit-item-unid')?.value || 'un',
            valor: (parseFloat(document.getElementById('edit-item-valor')?.value) || 0).toFixed(2),
            validade: document.getElementById('edit-item-validade')?.value || '',
            stock: parseInt(document.getElementById('edit-item-stock')?.value || '100', 10)
        };
        this.saveState();
        this.renderDespensaWidget();
        if (this.activeModule === 'despensa') this.renderDespensa();
        this.closeModal('item-edit-modal');
        this.showNotification('Item da despensa atualizado!', 'success');
    };

    app.showRecipeDetailModal = function(recipeId) {
        const recipe = this.state.receitas[recipeId];
        if (!recipe) return;
        const titleEl = document.getElementById('recipe-detail-modal-title');
        const bodyEl = document.getElementById('recipe-detail-modal-body');
        const footerEl = document.getElementById('recipe-detail-modal-footer');
        if (!titleEl || !bodyEl || !footerEl) return;
        titleEl.textContent = recipe.name;
        bodyEl.innerHTML = `<div class="recipe-rich-content"><div class="detail-stack" style="margin-bottom:1rem;"><div class="detail-listing-item"><div><strong>Descrição</strong><p class="detail-note">${this.escapeHtml(recipe.desc || 'Receita salva no app.')}</p></div></div></div>${recipe.content}</div>`;
        footerEl.innerHTML = `<button type="button" class="icon-button share-btn" data-recipe-id="${recipeId}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button><button type="button" class="icon-button pdf-btn" data-recipe-id="${recipeId}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button><button type="button" class="icon-button print-btn" data-recipe-id="${recipeId}" title="Imprimir"><i class="fa-solid fa-print"></i></button>`;
        this.openModal('recipe-detail-modal');
    };

    app.handleOpenRecipeEditModal = function(recipeId, options = {}) {
        this.closeModal('recipe-detail-modal');
        const isEditing = recipeId !== null && recipeId !== undefined;
        const recipe = isEditing ? this.state.receitas[recipeId] : null;
        if (isEditing && !recipe) return this.showNotification('Receita não encontrada para edição.', 'error');
        if (this.userPlan === 'free' && !isEditing && Object.keys(this.state.receitas).length >= 5) return this.showPlansModal('Limite de 5 receitas atingido no plano Gratuito.');
        this.tempRecipeIngredients = recipe?.ingredients ? JSON.parse(JSON.stringify(recipe.ingredients)) : [];
        const initialName = options.initialName || recipe?.name || '';
        const prepText = recipe?.content?.replace(/<h4>Ingredientes<\/h4>/gi, '').replace(/<ul>[\s\S]*?<\/ul>/i, '').replace(/<h4>Preparo<\/h4>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() || '';
        const content = `<form id="recipe-edit-form" onsubmit="return false;"><input type="hidden" id="recipe-edit-id" value="${recipeId || ''}"><div class="form-group"><label for="recipe-edit-name">Nome da Receita</label><input type="text" id="recipe-edit-name" value="${this.escapeHtml(initialName)}" required></div><div class="form-group"><label for="recipe-edit-desc">Descrição Curta</label><input type="text" id="recipe-edit-desc" value="${this.escapeHtml(recipe?.desc || '')}"></div><hr class="divider"><label style="display:block; font-size:.9rem; font-weight:500; color:var(--glass-text-primary); margin-bottom:.5rem;">Ingredientes</label><div id="recipe-ing-form" class="add-item-form-container" style="padding:0; border:none; background:rgba(0,0,0,0.2); border-radius:8px; margin-bottom:1rem;"><div class="add-item-form" style="padding:.75rem;"><div class="form-group form-group-flex"><label for="recipe-ing-name">Nome</label><input type="text" id="recipe-ing-name" placeholder="Ex: Arroz"></div><div class="form-group form-group-small"><label for="recipe-ing-qtd">Qtd</label><input type="text" id="recipe-ing-qtd" value="1"></div><div class="form-group form-group-small"><label for="recipe-ing-unid">Unid</label><select id="recipe-ing-unid">${['un','kg','g','L','ml','pct','cx','xícara','colher','pitada','dentes','a gosto','fio'].map(u => `<option value="${u}">${u}</option>`).join('')}</select></div><button type="button" class="btn-add-item" id="recipe-add-ing-btn"><i class="fa-solid fa-plus"></i></button></div></div><div id="recipe-ingredients-list"></div><hr class="divider"><div class="form-group"><label for="recipe-edit-content">Modo de Preparo</label><textarea id="recipe-edit-content" rows="7">${this.escapeHtml(prepText)}</textarea></div></form>`;
        this.openConfirmModal(isEditing ? 'Editar Receita' : 'Criar Receita', content, () => this.handleSaveRecipe());
        const modal = document.getElementById('custom-confirm-modal');
        if (!modal) return;
        modal.classList.add('recipe-editor-modal');
        const footer = modal.querySelector('.modal-footer');
        if (footer) {
            footer.innerHTML = `${isEditing ? `<button type="button" class="icon-button danger" id="recipe-editor-delete-btn"><i class="fa-solid fa-trash"></i></button>` : ''}<button type="button" class="icon-button" id="recipe-editor-save-btn"><i class="fa-solid fa-floppy-disk"></i></button>`;
            footer.querySelector('#recipe-editor-save-btn')?.addEventListener('click', () => this.handleSaveRecipe(), { once: true });
            footer.querySelector('#recipe-editor-delete-btn')?.addEventListener('click', () => { this.closeModal('custom-confirm-modal'); this.handleDeleteRecipe(recipeId); }, { once: true });
        }
        this.renderModalIngredientList();
        const addIngBtn = modal.querySelector('#recipe-add-ing-btn');
        const ingListContainer = modal.querySelector('#recipe-ingredients-list');
        const addIngFormContainer = modal.querySelector('#recipe-ing-form');
        addIngBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            const nameInput = addIngFormContainer.querySelector('#recipe-ing-name');
            const qtdInput = addIngFormContainer.querySelector('#recipe-ing-qtd');
            const unidSelect = addIngFormContainer.querySelector('#recipe-ing-unid');
            const name = nameInput.value.trim();
            if (!name) return;
            this.tempRecipeIngredients.push({ name, qty: qtdInput.value.trim() || '1', unit: unidSelect.value });
            this.renderModalIngredientList();
            nameInput.value = ''; qtdInput.value = '1'; unidSelect.value = 'un'; nameInput.focus();
        });
        ingListContainer?.addEventListener('click', (e) => {
            const itemEl = e.target.closest('.recipe-ing-item');
            if (!itemEl) return;
            const index = parseInt(itemEl.dataset.index, 10);
            const ingredient = this.tempRecipeIngredients[index];
            if (!ingredient) return;
            if (e.target.closest('.delete-ing-btn')) { this.tempRecipeIngredients.splice(index, 1); this.renderModalIngredientList(); }
            else if (e.target.closest('.edit-ing-btn')) {
                addIngFormContainer.querySelector('#recipe-ing-name').value = ingredient.name;
                addIngFormContainer.querySelector('#recipe-ing-qtd').value = ingredient.qty;
                addIngFormContainer.querySelector('#recipe-ing-unid').value = ingredient.unit;
                this.tempRecipeIngredients.splice(index, 1);
                this.renderModalIngredientList();
            }
        });
    };

    app.getPlannerDaysMap = function() { return { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' }; };
    app.getPlannerMealsForDay = function(dayKey) {
        const dayMeals = this.state.planejador[dayKey] || {};
        const items = [];
        [['cafe','Café da Manhã'], ['almoco','Almoço'], ['jantar','Jantar']].forEach(([key, label]) => { if (dayMeals[key]) items.push({ key, mealLabel: label, recipeId: dayMeals[key].recipeId || dayMeals[key].id, ...dayMeals[key] }); });
        (dayMeals.extras || []).forEach(extra => items.push({ key: `extra:${extra.key}`, mealLabel: extra.mealLabel || 'Refeição', recipeId: extra.recipeId || extra.id, ...extra }));
        return items;
    };
    app.renderPlanejador = function(container) {
        if (!container) container = document.getElementById('module-planejador');
        if (!container) return;
        const days = this.getPlannerDaysMap();
        const cards = Object.entries(days).map(([dayKey, dayLabel]) => {
            const meals = this.getPlannerMealsForDay(dayKey);
            const preview = meals.length ? meals.slice(0, 3).map(meal => `<div class="planner-meal-slot"><strong>${this.escapeHtml(meal.mealLabel)}</strong><div class="detail-note">${this.escapeHtml(meal.name)}</div></div>`).join('') : '<div class="planner-meal-slot"><div class="detail-note">Nenhuma refeição planejada.</div></div>';
            return `<div class="planner-day-card" data-day="${dayKey}"><div class="planner-day-header"><span>${dayLabel}</span><div style="display:flex; gap:.45rem;"><button type="button" class="icon-button day-clear-btn" data-day="${dayKey}" title="Limpar dia"><i class="fa-solid fa-eraser"></i></button><button type="button" class="icon-button add-meal-btn" data-day-target="${dayKey}" title="Inserir refeição"><i class="fa-solid fa-plus"></i></button></div></div><div class="planner-meal-slots">${preview}</div></div>`;
        }).join('');
        container.innerHTML = `<div class="dashboard-card"><div class="card-header"><h3><i class="fa-solid fa-calendar-week"></i> Planejador</h3><div class="card-actions"><button class="icon-button clear-plan-btn" title="Limpar tudo"><i class="fa-solid fa-eraser"></i></button></div></div><div class="card-content"><div class="planner-grid">${cards}</div></div><div class="card-footer module-actions-footer"><button class="icon-button share-btn" title="Compartilhar planejamento"><i class="fa-solid fa-share-alt"></i></button><button class="icon-button print-btn" title="Imprimir planejamento"><i class="fa-solid fa-print"></i></button><button class="icon-button pdf-btn" title="Gerar PDF do planejamento"><i class="fa-solid fa-file-pdf"></i></button></div></div>`;
    };
    app.openPlannerDayDetailModal = function(dayKey) {
        const titleEl = document.getElementById('detail-modal-title');
        const bodyEl = document.getElementById('detail-modal-body');
        const footerEl = document.getElementById('detail-modal-footer');
        const headerActionsEl = document.getElementById('detail-modal-header-actions');
        const meals = this.getPlannerMealsForDay(dayKey);
        titleEl.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ${this.getPlannerDaysMap()[dayKey] || 'Dia'}`;
        headerActionsEl.innerHTML = `<button class="icon-button add-meal-btn" data-day-target="${dayKey}" title="Inserir refeição"><i class="fa-solid fa-plus"></i></button>`;
        bodyEl.innerHTML = `<div class="detail-rich-content"><div class="detail-kpi-grid"><div class="detail-kpi"><strong>${meals.length}</strong><span>refeições planejadas</span></div><div class="detail-kpi"><strong>${meals.filter(meal => meal.completed).length}</strong><span>marcadas como usadas</span></div></div><div class="detail-stack" style="margin-top:1rem;">${meals.length ? meals.map(meal => `<div class="detail-listing-item planner-meal-item ${meal.completed ? 'completed' : ''}" data-recipe-id="${meal.recipeId || meal.id}" data-day="${dayKey}" data-meal="${meal.key}"><div><strong class="meal-item-name">${this.escapeHtml(meal.mealLabel)} • ${this.escapeHtml(meal.name)}</strong><p class="detail-note">${meal.time ? `Horário: ${this.escapeHtml(meal.time)}` : 'Toque em visualizar para abrir a receita.'}</p></div><div class="module-detail-actions meal-item-actions"><button type="button" class="icon-button meal-delete-btn" title="Remover"><i class="fa-solid fa-trash"></i></button><button type="button" class="icon-button meal-view-btn" title="Ver receita"><i class="fa-solid fa-eye"></i></button><button type="button" class="icon-button meal-complete-btn ${meal.completed ? 'is-complete' : ''}" title="Marcar como usado"><i class="fa-solid fa-check"></i></button></div></div>`).join('') : '<div class="detail-listing-item"><div><strong>Nenhuma refeição planejada.</strong><p class="detail-note">Use o botão inserir para escolher uma receita.</p></div></div>'}</div></div>`;
        footerEl.className = 'modal-footer detail-modal-footer unified-detail-actions';
        footerEl.innerHTML = `<button type="button" class="icon-button share-btn" data-day="${dayKey}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i><span>Compartilhar</span></button><button type="button" class="icon-button print-btn" data-day="${dayKey}" title="Imprimir"><i class="fa-solid fa-print"></i><span>Imprimir</span></button><button type="button" class="icon-button pdf-btn" data-day="${dayKey}" title="PDF"><i class="fa-solid fa-file-pdf"></i><span>PDF</span></button>`;
        this.openModal('detail-modal');
    };
    app.openPlannerMealTypeMenu = function(dayKey) {
        this.openDetailModal({ title: `<i class="fa-solid fa-plus"></i> Inserir refeição`, content: `<div class="detail-stack"><button type="button" class="btn btn-secondary planner-type-option" data-day="${dayKey}" data-meal="cafe">Café da manhã</button><button type="button" class="btn btn-secondary planner-type-option" data-day="${dayKey}" data-meal="almoco">Almoço</button><button type="button" class="btn btn-secondary planner-type-option" data-day="${dayKey}" data-meal="jantar">Jantar</button><button type="button" class="btn btn-primary planner-custom-meal-option" data-day="${dayKey}">Criar refeição</button></div>`, actions: [] });
        document.querySelectorAll('.planner-type-option').forEach(btn => btn.addEventListener('click', () => { this.closeModal('detail-modal'); this.currentPlannerDayTarget = `planner-full-${btn.dataset.day}-${btn.dataset.meal}`; this.pendingCustomMeal = null; this.populateRecipePicker(); this.openModal('recipe-picker-modal'); }));
        document.querySelector('.planner-custom-meal-option')?.addEventListener('click', () => { const day = document.querySelector('.planner-custom-meal-option').dataset.day; this.closeModal('detail-modal'); this.openPlannerCustomMealModal(day); });
    };
    app.openPlannerCustomMealModal = function(dayKey) {
        const formHtml = `<div class="form-group"><label for="planner-custom-name">Nome da refeição</label><input type="text" id="planner-custom-name" placeholder="Ex: Lanche da tarde"></div><div class="form-group"><label for="planner-custom-time">Horário</label><input type="time" id="planner-custom-time"></div>`;
        this.openConfirmModal('Criar refeição', formHtml, () => {
            const mealLabel = document.getElementById('planner-custom-name')?.value.trim();
            const time = document.getElementById('planner-custom-time')?.value || '';
            if (!mealLabel) return this.showNotification('Digite o nome da refeição.', 'error');
            this.pendingCustomMeal = { dayKey, mealLabel, time };
            this.closeModal('custom-confirm-modal');
            this.populateRecipePicker();
            this.openModal('recipe-picker-modal');
        });
    };
    app.handleAddMealToPlanner = function(recipeRef, targetContainerId) {
        const recipe = this.state.receitas[recipeRef] || Object.values(this.state.receitas).find(r => r.name === recipeRef);
        if (!recipe) return this.showNotification('Receita não encontrada.', 'error');
        if (this.pendingCustomMeal) {
            const { dayKey, mealLabel, time } = this.pendingCustomMeal;
            if (!this.state.planejador[dayKey]) this.state.planejador[dayKey] = {};
            if (!Array.isArray(this.state.planejador[dayKey].extras)) this.state.planejador[dayKey].extras = [];
            this.state.planejador[dayKey].extras.push({ key: this.generateId(), id: recipe.id, recipeId: recipe.id, name: recipe.name, mealLabel, time, completed: false });
            this.pendingCustomMeal = null;
        } else {
            const match = String(targetContainerId || '').match(/planner-(?:full|day)-(\w+)(?:-(\w+))?/);
            if (!match) return;
            const [, dayKey, mealKey] = match;
            if (!this.state.planejador[dayKey]) this.state.planejador[dayKey] = {};
            this.state.planejador[dayKey][mealKey] = { id: recipe.id, recipeId: recipe.id, name: recipe.name, completed: false };
        }
        this.saveState();
        this.renderPlannerWidget();
        if (this.activeModule === 'planejador') this.renderPlanejador();
        this.showNotification(`"${recipe.name}" adicionada ao planejador.`, 'success');
    };
    app.populateRecipePicker = function() {
        const container = document.getElementById('recipe-picker-list-container');
        if (!container) return;
        const recipes = Object.values(this.state.receitas);
        const helper = this.pendingCustomMeal ? `<p class="detail-note" style="margin-bottom:1rem;">Selecione a receita para <strong>${this.escapeHtml(this.pendingCustomMeal.mealLabel)}</strong>${this.pendingCustomMeal.time ? ` às ${this.escapeHtml(this.pendingCustomMeal.time)}` : ''}.</p>` : '';
        if (!recipes.length) {
            container.innerHTML = '<p class="empty-list-message">Nenhuma receita cadastrada.</p><button type="button" class="btn btn-primary add-recipe-btn" style="width:100%; margin-top:1rem;"><i class="fa-solid fa-plus"></i> Criar nova receita</button>';
            return;
        }
        container.innerHTML = `${helper}${recipes.map(recipe => `<div class="recipe-picker-item"><div class="recipe-picker-copy"><strong>${this.escapeHtml(recipe.name)}</strong><span>${this.escapeHtml(recipe.desc || 'Receita salva no app.')}</span></div><button type="button" class="btn btn-primary btn-add-recipe" data-recipe-id="${recipe.id}"><i class="fa-solid fa-plus"></i><span>Adicionar</span></button></div>`).join('')}<button type="button" class="btn btn-secondary add-recipe-btn" style="width:100%; margin-top:1rem;"><i class="fa-solid fa-plus"></i> Criar nova receita</button>`;
        if (!this.boundHandleRecipePickerAdd) this.boundHandleRecipePickerAdd = this.handleRecipePickerAdd.bind(this);
        container.removeEventListener('click', this.boundHandleRecipePickerAdd);
        container.addEventListener('click', this.boundHandleRecipePickerAdd);
    };
    app.handleRecipePickerAdd = function(e) {
        const addBtn = e.target.closest('.btn-add-recipe');
        if (!addBtn || (!this.currentPlannerDayTarget && !this.pendingCustomMeal)) return;
        this.handleAddMealToPlanner(addBtn.dataset.recipeId, this.currentPlannerDayTarget);
        this.closeModal('recipe-picker-modal');
        this.currentPlannerDayTarget = null;
    };
    app.handleDeleteMeal = function(day, meal) {
        const dayState = this.state.planejador[day] || {};
        const mealData = String(meal).startsWith('extra:') ? (dayState.extras || []).find(extra => extra.key === meal.replace('extra:', '')) : dayState[meal];
        if (!mealData) return;
        this.openConfirmModal('Remover Refeição', `Deseja remover "${mealData.name}" do planejamento?`, () => {
            if (String(meal).startsWith('extra:')) dayState.extras = (dayState.extras || []).filter(extra => extra.key !== meal.replace('extra:', ''));
            else delete dayState[meal];
            this.saveState();
            if (this.activeModule === 'planejador') this.renderPlanejador();
            this.renderPlannerWidget();
            if (document.getElementById('detail-modal')?.classList.contains('is-visible')) this.openPlannerDayDetailModal(day);
            this.showNotification('Refeição removida.', 'info');
        });
    };
    app.handleToggleCompleteMeal = function(day, meal) {
        const dayState = this.state.planejador[day] || {};
        const mealData = String(meal).startsWith('extra:') ? (dayState.extras || []).find(extra => extra.key === meal.replace('extra:', '')) : dayState[meal];
        if (!mealData) return;
        mealData.completed = !mealData.completed;
        this.saveState();
        if (this.activeModule === 'planejador') this.renderPlanejador();
        this.renderPlannerWidget();
        if (document.getElementById('detail-modal')?.classList.contains('is-visible')) this.openPlannerDayDetailModal(day);
    };

    app.renderAnalysisDetailDesktop = function(analysisKey = 'gastos_categoria') {
        const container = document.getElementById('analises-detail-desktop');
        if (!container) return;
        const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
        container.innerHTML = `<div class="card-header"><h3><i class="${cfg.icon}"></i> ${cfg.label}</h3><div class="card-actions"><button class="icon-button analysis-mobile-open-btn" data-analysis-key="${analysisKey}" title="Abrir detalhe"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button></div></div><div class="card-content"><div class="detail-note" style="margin-bottom:1rem;">${cfg.note}</div><div class="analysis-config-panel"><div class="form-group"><label for="analysis-data-select">Analisar</label><select id="analysis-data-select"><option value="gastos_categoria">Gastos por Categoria (Listas)</option><option value="validade_despensa">Itens por Validade (Despensa)</option><option value="uso_receitas">Receitas Usadas (Planejador)</option></select></div><div class="form-group"><label for="analysis-type-select">Tipo de gráfico</label><select id="analysis-type-select"><option value="pie">Pizza</option><option value="doughnut">Rosca</option><option value="bar">Barras</option><option value="line">Linha</option></select></div></div><div class="chart-canvas-container" style="margin-top:1rem;"><canvas id="dynamic-analysis-chart"></canvas></div></div><div class="card-footer module-actions-footer"><button class="icon-button share-btn" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button><button class="icon-button print-btn" title="Imprimir"><i class="fa-solid fa-print"></i></button><button class="icon-button pdf-btn" title="PDF"><i class="fa-solid fa-file-pdf"></i></button></div>`;
        document.getElementById('analysis-data-select').value = analysisKey;
        document.getElementById('analysis-data-select')?.addEventListener('change', (e) => this.renderAnalysisDetailDesktop(e.target.value));
        document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
        this.updateDynamicChart();
    };

    app.openAnalysisDetailModal = function(analysisKey = 'gastos_categoria') {
        const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
        this.openDetailModal({
            title: `<i class="${cfg.icon}"></i> ${cfg.label}`,
            content: `<p class="detail-note">${cfg.note}</p><div class="analysis-config-panel"><div class="form-group"><label for="analysis-data-select">Analisar</label><select id="analysis-data-select"><option value="gastos_categoria">Gastos por Categoria (Listas)</option><option value="validade_despensa">Itens por Validade (Despensa)</option><option value="uso_receitas">Receitas Usadas (Planejador)</option></select></div><div class="form-group"><label for="analysis-type-select">Tipo de gráfico</label><select id="analysis-type-select"><option value="pie">Pizza</option><option value="doughnut">Rosca</option><option value="bar">Barras</option><option value="line">Linha</option></select></div></div><div class="chart-canvas-container" style="margin-top:1rem;"><canvas id="dynamic-analysis-chart"></canvas></div>`,
            actions: [
                { label: 'Compartilhar', className: 'btn-secondary', icon: 'fa-solid fa-share-alt', onClick: () => this.handleRealShare('Análises', cfg.label) },
                { label: 'Imprimir', className: 'btn-secondary', icon: 'fa-solid fa-print', onClick: () => this.handleRealPDF() },
                { label: 'PDF', className: 'btn-secondary', icon: 'fa-solid fa-file-pdf', onClick: () => this.handleRealPDF() }
            ]
        });
        document.getElementById('analysis-data-select').value = analysisKey;
        document.getElementById('analysis-data-select')?.addEventListener('change', () => this.updateDynamicChart());
        document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
        this.updateDynamicChart();
    };

    app.installMandatoryPatches = function() {
        if (this._mandatoryPatchesInstalled) return;
        this._mandatoryPatchesInstalled = true;
        const clickHandler = (e) => {
            const target = e.target;
            const closest = (sel) => target.closest(sel);
            const itemEl = closest('.placeholder-item');
            const recipeCard = closest('.recipe-list-item, .card--recipe');
            const savedList = closest('.saved-list-item, .card--saved-list');
            if (closest('#module-lista .btn-create-list')) {
                e.preventDefault(); e.stopImmediatePropagation();
                this.openListNameModal({ title: 'Nova lista', placeholder: 'Ex: Compras de amanhã', confirmText: 'Criar e Adicionar Itens', onConfirm: (listName) => {
                    if (this.userPlan === 'free' && Object.keys(this.state.listas).length >= 2) return this.showPlansModal('Limite de 2 listas atingido no plano Gratuito.');
                    const newListId = this.generateId();
                    this.state.listas[newListId] = { nome: String(listName).trim() || 'Nova Lista', items: [], createdAt: new Date().toISOString() };
                    this.activeListId = newListId; this.saveState(); this.renderListasSalvas(); this.renderListaAtiva(newListId); document.getElementById('list-manager')?.classList.add('view-active-list'); setTimeout(() => document.getElementById('lista-form-nome-full')?.focus(), 60);
                }});
                return;
            }
            if (closest('.add-recipe-btn')) {
                e.preventDefault(); e.stopImmediatePropagation();
                this.openListNameModal({ title: 'Nova Receita', placeholder: 'Digite o nome da receita', confirmText: 'Continuar', onConfirm: (recipeName) => this.handleOpenRecipeEditModal(null, { initialName: recipeName }) });
                return;
            }
            if (savedList) {
                const listId = savedList.dataset.listId || savedList.dataset.id;
                if (closest('.select-list-btn')) { e.preventDefault(); e.stopImmediatePropagation(); this.openListEditView(listId); return; }
                if (closest('.delete-list-btn')) return;
                if (!closest('.icon-button')) { e.preventDefault(); e.stopImmediatePropagation(); this.handleOpenListViewModal(listId); return; }
            }
            if (recipeCard) {
                const recipeId = recipeCard.dataset.recipeId || recipeCard.dataset.id;
                if (closest('.edit-recipe-btn') || closest('.delete-recipe-btn')) return;
                if (!closest('.icon-button')) { e.preventDefault(); e.stopImmediatePropagation(); this.showRecipeDetailModal(recipeId); return; }
            }
            if (itemEl) {
                const isDespensa = !!closest('#despensa-list-container, [id*="despensa-items"]');
                const isLista = !!closest('#lista-items-full, #list-view-modal-body, #lista-items-inicio');
                if (isDespensa && !closest('.icon-button') && !closest('.item-stock-level') && !closest('.drag-handle')) { e.preventDefault(); e.stopImmediatePropagation(); this.handleOpenPantryView(itemEl); return; }
                if (isLista && closest('.edit-btn')) { e.preventDefault(); e.stopImmediatePropagation(); this.startInlineListEdit(itemEl); return; }
                if (isLista && closest('.save-inline-edit-btn')) { e.preventDefault(); e.stopImmediatePropagation(); this.handleSaveInlineListEdit(itemEl); return; }
                if (isLista && closest('.cancel-inline-edit-btn')) { e.preventDefault(); e.stopImmediatePropagation(); this.cancelInlineListEdit(); return; }
                if (isDespensa && closest('.edit-btn')) { e.preventDefault(); e.stopImmediatePropagation(); this.handleOpenDespensaEditModal(itemEl); return; }
            }
            if (closest('.planner-day-card') && !closest('.icon-button')) { e.preventDefault(); e.stopImmediatePropagation(); this.openPlannerDayDetailModal(closest('.planner-day-card').dataset.day); return; }
            if (closest('.add-meal-btn')) { e.preventDefault(); e.stopImmediatePropagation(); this.openPlannerMealTypeMenu(closest('.add-meal-btn').dataset.dayTarget); return; }
            if (closest('.analysis-nav-item')) { e.preventDefault(); e.stopImmediatePropagation(); this.openAnalysisDetailModal(closest('.analysis-nav-item').dataset.analysisKey); return; }
            if (closest('.analysis-mobile-open-btn')) { e.preventDefault(); e.stopImmediatePropagation(); this.openAnalysisDetailModal(closest('.analysis-mobile-open-btn').dataset.analysisKey || document.getElementById('analysis-data-select')?.value || 'gastos_categoria'); return; }
            if (closest('.generate-list-btn')) { e.preventDefault(); e.stopImmediatePropagation(); this.handleGenerateListFromPlanner(closest('.generate-list-btn').dataset.day || null); return; }
        };
        document.body.addEventListener('click', clickHandler, true);
        document.body.addEventListener('change', (e) => {
            if (e.target.id === 'list-sort-select') { this.listSortMode = e.target.value || 'date_desc'; this.saveState(); this.renderListasSalvas(); }
        }, true);
        if (this.isAppMode) this.activateModuleAndRender(this.activeModule);
    };
})();

(() => {
    const baseLoadStatePremium = app.loadState.bind(app);
    app.loadState = function() {
        baseLoadStatePremium();
        let parsedSortState = null;
        try { parsedSortState = JSON.parse(localStorage.getItem('alimenteFacilState_vFinal') || '{}'); } catch (e) {}
        this.recipeSortMode = parsedSortState?.recipeSortMode || this.recipeSortMode || 'name_asc';
        this.pantrySortMode = parsedSortState?.pantrySortMode || this.pantrySortMode || 'validade_asc';
    };

    app.saveState = function() {
        try {
            const stateToSave = {
                isAppMode: this.isAppMode,
                isLoggedIn: this.isLoggedIn,
                userPlan: this.userPlan,
                activeModule: this.activeModule,
                activeListId: this.activeListId,
                listSortMode: this.listSortMode || 'date_desc',
                recipeSortMode: this.recipeSortMode || 'name_asc',
                pantrySortMode: this.pantrySortMode || 'validade_asc',
                data: this.state
            };
            localStorage.setItem('alimenteFacilState_vFinal', JSON.stringify(stateToSave));
            localStorage.setItem('themePreference', document.body.classList.contains('lua-mode') ? 'lua' : 'sol');
        } catch (e) { console.error('Erro ao salvar estado', e); }
    };

    app.getSortMeta = function(type, mode) {
        const maps = {
            list: {
                name_asc: { label: 'Nome A–Z', icon: 'fa-arrow-up-a-z' },
                date_desc: { label: 'Mais recentes', icon: 'fa-arrow-down-wide-short' },
                total_desc: { label: 'Maior valor', icon: 'fa-arrow-down-wide-short' },
                items_desc: { label: 'Mais itens', icon: 'fa-arrow-down-wide-short' }
            },
            recipe: {
                name_asc: { label: 'Nome A–Z', icon: 'fa-arrow-up-a-z' },
                ingredients_desc: { label: 'Mais ingredientes', icon: 'fa-arrow-down-wide-short' },
                name_desc: { label: 'Nome Z–A', icon: 'fa-arrow-down-z-a' }
            },
            pantry: {
                validade_asc: { label: 'Validade próxima', icon: 'fa-arrow-up-short-wide' },
                name_asc: { label: 'Nome A–Z', icon: 'fa-arrow-up-a-z' },
                stock_desc: { label: 'Maior estoque', icon: 'fa-arrow-down-wide-short' }
            }
        };
        return maps[type]?.[mode] || { label: 'Ordenar', icon: 'fa-arrow-down-wide-short' };
    };

    app.cycleSortMode = function(type) {
        const orderMap = {
            list: ['date_desc', 'name_asc', 'total_desc', 'items_desc'],
            recipe: ['name_asc', 'ingredients_desc', 'name_desc'],
            pantry: ['validade_asc', 'name_asc', 'stock_desc']
        };
        const propMap = { list: 'listSortMode', recipe: 'recipeSortMode', pantry: 'pantrySortMode' };
        const prop = propMap[type];
        if (!prop) return;
        const order = orderMap[type] || [];
        const current = this[prop] || order[0];
        const next = order[(order.indexOf(current) + 1) % order.length] || order[0];
        this[prop] = next;
        this.saveState();
        if (type === 'list' && this.activeModule === 'lista') this.renderListas();
        if (type === 'recipe' && this.activeModule === 'receitas') this.renderReceitas();
        if (type === 'pantry' && this.activeModule === 'despensa') this.renderDespensa();
    };

    app.sortRecipesCollection = function(recipes = []) {
        const sorted = [...recipes];
        const getCount = recipe => Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0;
        switch (this.recipeSortMode) {
            case 'name_desc':
                sorted.sort((a, b) => String(b.name || '').localeCompare(String(a.name || ''), 'pt-BR'));
                break;
            case 'ingredients_desc':
                sorted.sort((a, b) => getCount(b) - getCount(a) || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
                break;
            case 'name_asc':
            default:
                sorted.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
                break;
        }
        return sorted;
    };

    app.sortPantryCollection = function(items = []) {
        const sorted = [...items];
        const validityValue = item => item.validade ? new Date(item.validade + 'T00:00:00-03:00').getTime() : Number.POSITIVE_INFINITY;
        switch (this.pantrySortMode) {
            case 'name_asc':
                sorted.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
                break;
            case 'stock_desc':
                sorted.sort((a, b) => (parseInt(b.stock || 0, 10) - parseInt(a.stock || 0, 10)) || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
                break;
            case 'validade_asc':
            default:
                sorted.sort((a, b) => (validityValue(a) - validityValue(b)) || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
                break;
        }
        return sorted;
    };

    app.renderListas = function(container) {
        if (!container) container = document.getElementById('module-lista');
        if (!container) return;
        const sortMeta = this.getSortMeta('list', this.listSortMode || 'date_desc');
        container.innerHTML = `
            <div class="master-detail-layout" id="list-manager">
                <div class="md-list-column dashboard-card">
                    <div class="card-header"><h3><i class="fa-solid fa-list-ul"></i> Minhas Listas</h3></div>
                    <div class="card-content">
                        <div class="module-toolbar">
                            <button class="btn btn-secondary btn-create-list luxury-create-btn"><i class="fa-solid fa-plus"></i><span>Nova Lista</span></button>
                            <button class="icon-button luxury-sort-btn list-cycle-sort-btn" title="Organizar listas"><i class="fa-solid ${sortMeta.icon}"></i></button>
                            <div class="sort-chip"><strong>${sortMeta.label}</strong></div>
                        </div>
                        <div id="saved-lists-container"></div>
                    </div>
                </div>
                <div class="md-detail-column dashboard-card" id="lista-detail-desktop">
                    <div class="card-header">
                        <button id="list-back-btn" class="icon-button mobile-only" aria-label="Voltar"><i class="fa-solid fa-arrow-left"></i></button>
                        <h3 id="active-list-title"><i class="fa-solid fa-cart-shopping"></i> Selecione uma Lista</h3>
                    </div>
                    <div class="add-item-form-container">
                        <form class="add-item-form">
                            <input type="hidden" id="active-list-id-input" value="">
                            <div class="form-group form-group-flex"><label>Nome</label><input type="text" id="lista-form-nome-full" placeholder="Ex: Arroz"></div>
                            <div class="form-group form-group-small"><label>Qtd</label><input type="number" id="lista-form-qtd-full" value="1" min="0.1" step="any"></div>
                            <div class="form-group form-group-small"><label>Unid</label><select id="lista-form-unid-full"><option value="un">un</option><option value="kg">kg</option><option value="g">g</option><option value="L">L</option><option value="ml">ml</option><option value="pct">pct</option><option value="cx">cx</option></select></div>
                            <div class="form-group form-group-medium"><label>Valor</label><input type="text" id="lista-form-valor-full" placeholder="0.00"></div>
                            <button type="submit" class="btn btn-primary btn-add-item" id="lista-add-item-btn-full"><i class="fa-solid fa-plus"></i></button>
                        </form>
                    </div>
                    <div class="card-content no-padding-top" id="lista-items-full" data-group="shared-items" data-list-type="lista"><div class="empty-state-placeholder"><p>Selecione uma lista ao lado para ver os itens.</p></div></div>
                    <div class="card-footer module-actions-footer" id="active-list-actions"></div>
                </div>
            </div>`;
        this.renderListasSalvas();
        if (this.activeListId) this.renderListaAtiva(this.activeListId);
    };

    app.renderDespensa = function(container) {
        if (!container) container = document.getElementById('module-despensa');
        if (!container) return;
        const sortMeta = this.getSortMeta('pantry', this.pantrySortMode || 'validade_asc');
        container.innerHTML = `
            <div class="master-detail-layout">
                <div class="md-list-column dashboard-card">
                    <div class="card-header"><h3><i class="fa-solid fa-box-archive"></i> Despensa</h3></div>
                    <div class="card-content">
                        <div class="module-toolbar">
                            <button class="btn btn-secondary btn-create-list add-item-despensa-btn luxury-create-btn"><i class="fa-solid fa-plus"></i><span>Novo Item</span></button>
                            <button class="icon-button luxury-sort-btn pantry-cycle-sort-btn" title="Organizar despensa"><i class="fa-solid ${sortMeta.icon}"></i></button>
                            <div class="sort-chip"><strong>${sortMeta.label}</strong></div>
                        </div>
                        <div id="despensa-list-container" data-group="shared-items" data-list-type="despensa"></div>
                    </div>
                </div>
                <div class="md-detail-column dashboard-card" id="despensa-detail-desktop">
                    <div class="empty-state-placeholder">
                        <i class="fa-solid fa-box-open" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.45;"></i>
                        <p>Selecione um item da despensa para abrir um visual limpo e detalhado.</p>
                    </div>
                </div>
            </div>`;
        const listContainer = document.getElementById('despensa-list-container');
        const sortedDespensa = this.sortPantryCollection(this.state.despensa || []);
        listContainer.innerHTML = sortedDespensa.map(item => this.createDespensaItemHTML(item)).join('') || '<p class="empty-list-message">Sua despensa está vazia.</p>';
        this.initSortableItems('despensa-list-container');
    };

    app.renderReceitas = function(container) {
        if (!container) container = document.getElementById('module-receitas');
        if (!container) return;
        const sortMeta = this.getSortMeta('recipe', this.recipeSortMode || 'name_asc');
        container.innerHTML = `
            <div class="master-detail-layout">
                <div class="md-list-column dashboard-card">
                    <div class="card-header"><h3><i class="fa-solid fa-utensils"></i> Receitas</h3></div>
                    <div class="card-content">
                        <div class="module-toolbar">
                            <button class="btn btn-secondary add-recipe-btn luxury-create-btn"><i class="fa-solid fa-plus"></i><span>Nova Receita</span></button>
                            <button class="icon-button luxury-sort-btn recipe-cycle-sort-btn" title="Organizar receitas"><i class="fa-solid ${sortMeta.icon}"></i></button>
                            <div class="sort-chip"><strong>${sortMeta.label}</strong></div>
                        </div>
                        <div id="main-recipe-grid"></div>
                    </div>
                </div>
                <div class="md-detail-column dashboard-card">
                    <div class="card-header"><h3 id="recipe-detail-title-desktop"><i class="fa-solid fa-book-open"></i> Detalhes</h3></div>
                    <div class="card-content" id="recipe-detail-desktop-body">
                        <div class="empty-state-placeholder">
                            <i class="fa-solid fa-utensils" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.45;"></i>
                            <p>Selecione uma receita para ver ingredientes e preparo.</p>
                        </div>
                    </div>
                    <div class="card-footer" id="recipe-detail-desktop-footer" style="display:none;"></div>
                </div>
            </div>`;
        const listContainer = document.getElementById('main-recipe-grid');
        const recipes = this.sortRecipesCollection(Object.values(this.state.receitas || {}));
        listContainer.innerHTML = recipes.map(recipe => this.renderUniversalCard({
            type: 'recipe',
            data: { id: recipe.id, name: recipe.name, ingredients: recipe.ingredients || recipe.ingredientes || recipe.ingredientes?.items || [] },
            actions: [
                { type: 'edit edit-recipe-btn', icon: 'fa-solid fa-pencil', label: 'Editar' },
                { type: 'danger delete-recipe-btn', icon: 'fa-solid fa-trash', label: 'Excluir' }
            ],
            isClickable: true
        })).join('') || '<p class="empty-list-message">Nenhuma receita criada.</p>';
    };

    app.renderPlanejador = function(container) {
        if (!container) container = document.getElementById('module-planejador');
        if (!container) return;
        const days = this.getPlannerDaysMap();
        const cards = Object.entries(days).map(([dayKey, dayLabel]) => {
            const meals = this.getPlannerMealsForDay(dayKey);
            const preview = meals.length
                ? meals.slice(0, 3).map(meal => `<div class="planner-mini-meal ${meal.completed ? 'is-complete' : ''}"><small>${this.escapeHtml(meal.mealLabel)}</small><strong>${this.escapeHtml(meal.name)}</strong></div>`).join('')
                : '<div class="planner-mini-empty">Nenhuma refeição planejada.</div>';
            return `
                <article class="planner-day-card" data-day="${dayKey}">
                    <div class="planner-day-header">
                        <div class="planner-day-copy">
                            <strong>${dayLabel}</strong>
                            <span>${meals.length ? `${meals.length} refeição(ões)` : 'Pronto para planejar'}</span>
                        </div>
                        <div class="planner-day-actions">
                            <button type="button" class="icon-button day-clear-btn" data-day="${dayKey}" title="Limpar dia"><i class="fa-solid fa-eraser"></i></button>
                            <button type="button" class="icon-button add-meal-btn" data-day-target="${dayKey}" title="Inserir refeição"><i class="fa-solid fa-plus"></i></button>
                        </div>
                    </div>
                    <div class="planner-preview-list">${preview}</div>
                </article>`;
        }).join('');
        container.innerHTML = `
            <div class="dashboard-card planner-shell">
                <div class="card-header">
                    <div>
                        <h3><i class="fa-solid fa-calendar-week"></i> Planejador</h3>
                        <div class="planner-subtitle">Semana limpa, visual premium e ações rápidas.</div>
                    </div>
                    <div class="card-actions"><button class="icon-button clear-plan-btn" title="Limpar tudo"><i class="fa-solid fa-eraser"></i></button></div>
                </div>
                <div class="card-content"><div class="planner-grid">${cards}</div></div>
                <div class="card-footer module-actions-footer">
                    <button class="icon-button minimal-export-btn share-btn" title="Compartilhar planejamento"><i class="fa-solid fa-share-alt"></i></button>
                    <button class="icon-button minimal-export-btn print-btn" title="Imprimir planejamento"><i class="fa-solid fa-print"></i></button>
                    <button class="icon-button minimal-export-btn pdf-btn" title="Gerar PDF do planejamento"><i class="fa-solid fa-file-pdf"></i></button>
                </div>
            </div>`;
    };

    const originalHandleOpenListViewModal = app.handleOpenListViewModal.bind(app);
    app.handleOpenListViewModal = function(listId) {
        originalHandleOpenListViewModal(listId);
        const footer = document.getElementById('list-view-modal-footer');
        if (footer) {
            footer.innerHTML = `<button class="icon-button minimal-export-btn pdf-btn" data-list-id="${listId}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button><button class="icon-button minimal-export-btn print-btn" data-list-id="${listId}" title="Imprimir"><i class="fa-solid fa-print"></i></button><button class="icon-button minimal-export-btn share-btn" data-list-id="${listId}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>`;
        }
    };

    const originalOpenPantryView = app.handleOpenPantryView.bind(app);
    app.handleOpenPantryView = function(itemEl) {
        originalOpenPantryView(itemEl);
        const id = itemEl?.dataset.id;
        const footer = document.getElementById('pantry-view-footer');
        if (footer && id) {
            footer.innerHTML = `<button class="icon-button minimal-export-btn pdf-btn" data-item-id="${id}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button><button class="icon-button minimal-export-btn print-btn" data-item-id="${id}" title="Imprimir"><i class="fa-solid fa-print"></i></button><button class="icon-button minimal-export-btn share-btn" data-item-id="${id}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>`;
        }
    };

    const originalShowRecipeDetailModal = app.showRecipeDetailModal.bind(app);
    app.showRecipeDetailModal = function(recipeId) {
        originalShowRecipeDetailModal(recipeId);
        const footer = document.getElementById('recipe-detail-modal-footer');
        if (footer) {
            footer.innerHTML = `<button type="button" class="icon-button minimal-export-btn share-btn" data-recipe-id="${recipeId}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button><button type="button" class="icon-button minimal-export-btn print-btn" data-recipe-id="${recipeId}" title="Imprimir"><i class="fa-solid fa-print"></i></button><button type="button" class="icon-button minimal-export-btn pdf-btn" data-recipe-id="${recipeId}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>`;
        }
    };

    const originalOpenPlannerDayDetailModal = app.openPlannerDayDetailModal.bind(app);
    app.openPlannerDayDetailModal = function(dayKey) {
        originalOpenPlannerDayDetailModal(dayKey);
        const footer = document.getElementById('detail-modal-footer');
        if (footer) {
            footer.innerHTML = `<button type="button" class="icon-button minimal-export-btn share-btn" data-day="${dayKey}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button><button type="button" class="icon-button minimal-export-btn print-btn" data-day="${dayKey}" title="Imprimir"><i class="fa-solid fa-print"></i></button><button type="button" class="icon-button minimal-export-btn pdf-btn" data-day="${dayKey}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>`;
        }
    };

    const originalRenderAnalises = app.renderAnalises.bind(app);
    app.renderAnalises = function(container) {
        originalRenderAnalises(container);
        document.querySelectorAll('.module-actions-footer .share-btn, .module-actions-footer .print-btn, .module-actions-footer .pdf-btn').forEach(btn => btn.classList.add('minimal-export-btn'));
    };

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.list-cycle-sort-btn, .recipe-cycle-sort-btn, .pantry-cycle-sort-btn');
        if (!btn) return;
        e.preventDefault();
        if (btn.classList.contains('list-cycle-sort-btn')) app.cycleSortMode('list');
        if (btn.classList.contains('recipe-cycle-sort-btn')) app.cycleSortMode('recipe');
        if (btn.classList.contains('pantry-cycle-sort-btn')) app.cycleSortMode('pantry');
    }, true);
})();

(() => {
    const unitOptions = ['un','kg','g','L','ml','pct','cx'];

    app.createListaItemHTML = function(item) {
        const itemName = this.escapeHtml(item.name || 'Item sem nome');
        const isEditing = this.inlineListEdit && String(this.inlineListEdit.itemId) === String(item.id);
        const draft = isEditing ? (this.inlineListEdit.draft || {}) : null;

        if (isEditing) {
            return `
                <div class="placeholder-item inline-editing" data-id="${item.id}" data-name="${itemName}">
                    <div class="item-inline-edit-grid">
                        <div class="inline-field inline-name-field">
                            <label>Nome</label>
                            <input type="text" class="inline-edit-name" value="${this.escapeHtml(draft?.name ?? item.name ?? '')}" placeholder="Nome do item">
                        </div>
                        <div class="inline-field inline-qtd-field">
                            <label>Qtd</label>
                            <input type="number" class="inline-edit-qtd" value="${draft?.qtd ?? item.qtd ?? 1}" min="0.1" step="any">
                        </div>
                        <div class="inline-field inline-unid-field">
                            <label>Unid</label>
                            <select class="inline-edit-unid">
                                ${unitOptions.map(u => `<option value="${u}" ${(draft?.unid ?? item.unid ?? 'un') === u ? 'selected' : ''}>${u}</option>`).join('')}
                            </select>
                        </div>
                        <div class="inline-field inline-valor-field">
                            <label>Valor</label>
                            <input type="number" class="inline-edit-valor" value="${parseFloat(draft?.valor ?? item.valor ?? 0).toFixed(2)}" min="0" step="0.01">
                        </div>
                        <div class="item-actions inline-edit-actions">
                            <button type="button" class="icon-button save-inline-edit-btn" title="Salvar"><i class="fa-solid fa-check"></i></button>
                            <button type="button" class="icon-button cancel-inline-edit-btn" title="Cancelar"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="placeholder-item ${item.checked ? 'is-checked' : ''}" data-id="${item.id}" data-name="${itemName}" data-qtd="${item.qtd}" data-unid="${item.unid}" data-valor="${item.valor}">
                <div class="item-row">
                    <div class="item-main-info">
                        <i class="fa-solid fa-grip-vertical drag-handle" title="Arrastar item"></i>
                        <input type="checkbox" ${item.checked ? 'checked' : ''} aria-label="Marcar ${itemName}">
                        <span class="item-name">${itemName}</span>
                    </div>
                    <div class="item-actions">
                        <button type="button" class="icon-button edit-btn" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                        <button type="button" class="icon-button delete-btn" title="Excluir"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                </div>
                <div class="item-details-grid">
                    <div>Qtd: <span>${item.qtd}</span></div>
                    <div>Un: <span>${this.escapeHtml(item.unid || 'un')}</span></div>
                    <div>Preço: <span>R$ ${parseFloat(item.valor || 0).toFixed(2)}</span></div>
                </div>
                <div class="item-checked-actions">
                    <div class="form-group-checked">
                        <label for="validade-${item.id}">Validade (Opcional)</label>
                        <input type="date" id="validade-${item.id}" class="item-validade-input" value="${item.validade || ''}">
                    </div>
                    <div class="confirm-actions-group">
                        <small class="confirm-pantry-text">Deseja enviar para a despensa?</small>
                        <div class="confirm-buttons">
                            <button type="button" class="icon-button cancel-move-btn" title="Não"><i class="fa-solid fa-times-circle" style="color: var(--red);"></i></button>
                            <button type="button" class="icon-button move-to-despensa-btn" title="Sim"><i class="fa-solid fa-check-circle" style="color: var(--green);"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    app.renderListas = function(container) {
        if (!container) container = document.getElementById('module-lista');
        if (!container) return;
        const sortMeta = this.getSortMeta('list', this.listSortMode || 'date_desc');
        container.innerHTML = `
            <div class="master-detail-layout" id="list-manager">
                <div class="md-list-column dashboard-card">
                    <div class="card-header"><h3><i class="fa-solid fa-list-ul"></i> Minhas Listas</h3></div>
                    <div class="card-content">
                        <div class="module-toolbar module-toolbar--ultra">
                            <button class="btn btn-secondary btn-create-list luxury-create-btn"><i class="fa-solid fa-plus"></i><span>Nova Lista</span></button>
                            <button class="icon-button luxury-sort-btn list-cycle-sort-btn" title="Organizar listas: ${sortMeta.label}" aria-label="Organizar listas: ${sortMeta.label}">
                                <i class="fa-solid fa-arrow-up-short-wide"></i>
                            </button>
                        </div>
                        <div id="saved-lists-container"></div>
                    </div>
                </div>
                <div class="md-detail-column dashboard-card" id="lista-detail-desktop">
                    <div class="card-header">
                        <button id="list-back-btn" class="icon-button mobile-only" aria-label="Voltar"><i class="fa-solid fa-arrow-left"></i></button>
                        <h3 id="active-list-title"><i class="fa-solid fa-cart-shopping"></i> Selecione uma Lista</h3>
                    </div>
                    <div class="add-item-form-container">
                        <form class="add-item-form">
                            <input type="hidden" id="active-list-id-input" value="">
                            <div class="form-group form-group-flex"><label>Nome</label><input type="text" id="lista-form-nome-full" placeholder="Ex: Arroz"></div>
                            <div class="form-group form-group-small"><label>Qtd</label><input type="number" id="lista-form-qtd-full" value="1" min="0.1" step="any"></div>
                            <div class="form-group form-group-small"><label>Unid</label><select id="lista-form-unid-full">${unitOptions.map(u => `<option value="${u}">${u}</option>`).join('')}</select></div>
                            <div class="form-group form-group-medium"><label>Valor</label><input type="text" id="lista-form-valor-full" placeholder="0.00"></div>
                            <button type="submit" class="btn btn-primary btn-add-item" id="lista-add-item-btn-full"><i class="fa-solid fa-plus"></i></button>
                        </form>
                    </div>
                    <div class="card-content no-padding-top" id="lista-items-full" data-group="shared-items" data-list-type="lista"><div class="empty-state-placeholder"><p>Selecione uma lista ao lado para ver os itens.</p></div></div>
                    <div class="card-footer module-actions-footer" id="active-list-actions"></div>
                </div>
            </div>`;
        this.renderListasSalvas();
        if (this.activeListId) this.renderListaAtiva(this.activeListId);
    };

    app.renderDespensa = function(container) {
        if (!container) container = document.getElementById('module-despensa');
        if (!container) return;
        const sortMeta = this.getSortMeta('pantry', this.pantrySortMode || 'validade_asc');
        container.innerHTML = `
            <div class="master-detail-layout">
                <div class="md-list-column dashboard-card">
                    <div class="card-header"><h3><i class="fa-solid fa-box-archive"></i> Despensa</h3></div>
                    <div class="card-content">
                        <div class="module-toolbar module-toolbar--ultra">
                            <button class="btn btn-secondary btn-create-list add-item-despensa-btn luxury-create-btn"><i class="fa-solid fa-plus"></i><span>Novo Item</span></button>
                            <button class="icon-button luxury-sort-btn pantry-cycle-sort-btn" title="Organizar despensa: ${sortMeta.label}" aria-label="Organizar despensa: ${sortMeta.label}">
                                <i class="fa-solid fa-arrow-up-short-wide"></i>
                            </button>
                        </div>
                        <div id="despensa-list-container" data-group="shared-items" data-list-type="despensa"></div>
                    </div>
                </div>
                <div class="md-detail-column dashboard-card" id="despensa-detail-desktop">
                    <div class="empty-state-placeholder">
                        <i class="fa-solid fa-box-open" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.45;"></i>
                        <p>Selecione um item da despensa para abrir um visual limpo e detalhado.</p>
                    </div>
                </div>
            </div>`;
        const listContainer = document.getElementById('despensa-list-container');
        const sortedDespensa = this.sortPantryCollection(this.state.despensa || []);
        listContainer.innerHTML = sortedDespensa.map(item => this.createDespensaItemHTML(item)).join('') || '<p class="empty-list-message">Sua despensa está vazia.</p>';
        this.initSortableItems('despensa-list-container');
    };

    app.renderReceitas = function(container) {
        if (!container) container = document.getElementById('module-receitas');
        if (!container) return;
        const sortMeta = this.getSortMeta('recipe', this.recipeSortMode || 'name_asc');
        container.innerHTML = `
            <div class="master-detail-layout">
                <div class="md-list-column dashboard-card">
                    <div class="card-header"><h3><i class="fa-solid fa-utensils"></i> Receitas</h3></div>
                    <div class="card-content">
                        <div class="module-toolbar module-toolbar--ultra">
                            <button class="btn btn-secondary add-recipe-btn luxury-create-btn"><i class="fa-solid fa-plus"></i><span>Nova Receita</span></button>
                            <button class="icon-button luxury-sort-btn recipe-cycle-sort-btn" title="Organizar receitas: ${sortMeta.label}" aria-label="Organizar receitas: ${sortMeta.label}">
                                <i class="fa-solid fa-arrow-up-short-wide"></i>
                            </button>
                        </div>
                        <div id="main-recipe-grid"></div>
                    </div>
                </div>
                <div class="md-detail-column dashboard-card recipe-detail-shell">
                    <div class="card-header"><h3 id="recipe-detail-title-desktop"><i class="fa-solid fa-book-open"></i> Detalhes</h3></div>
                    <div class="card-content" id="recipe-detail-desktop-body">
                        <div class="empty-state-placeholder">
                            <i class="fa-solid fa-utensils" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.45;"></i>
                            <p>Selecione uma receita para ver ingredientes e preparo.</p>
                        </div>
                    </div>
                    <div class="card-footer module-actions-footer" id="recipe-detail-desktop-footer" style="display:none;"></div>
                </div>
            </div>`;
        const listContainer = document.getElementById('main-recipe-grid');
        const recipes = this.sortRecipesCollection(Object.values(this.state.receitas || {}));
        listContainer.innerHTML = recipes.map(recipe => this.renderUniversalCard({
            type: 'recipe',
            data: { id: recipe.id, name: recipe.name, ingredients: recipe.ingredients || [] },
            actions: [
                { type: 'edit edit-recipe-btn', icon: 'fa-solid fa-pencil', label: 'Editar' },
                { type: 'danger delete-recipe-btn', icon: 'fa-solid fa-trash', label: 'Excluir' }
            ],
            isClickable: true
        })).join('') || '<p class="empty-list-message">Nenhuma receita criada.</p>';
    };

    app.handleOpenListViewModal = function(listId) {
        const lista = this.state.listas[listId];
        if (!lista) return;
        const header = document.querySelector('#list-view-modal .modal-header');
        const body = document.getElementById('list-view-modal-body');
        const footer = document.getElementById('list-view-modal-footer');
        const idInput = document.getElementById('modal-list-id-input');
        if (header) {
            header.innerHTML = `
                <button class="icon-button" data-modal-close="list-view-modal"><i class="fa-solid fa-arrow-left"></i></button>
                <h3 id="list-view-modal-title" style="flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${this.escapeHtml(lista.nome)}</h3>
                <button class="icon-button" id="list-view-edit-btn" title="Editar"><i class="fa-solid fa-pencil"></i></button>
            `;
        }
        if (body) {
            body.dataset.listId = listId;
            body.innerHTML = (lista.items || []).map(item => this.createListaItemHTML(item)).join('') || '<p class="empty-list-message">Lista vazia.</p>';
            this.initSortableItems('list-view-modal-body');
        }
        if (footer) {
            footer.innerHTML = `
                <button class="icon-button minimal-export-btn pdf-btn" data-list-id="${listId}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
                <button class="icon-button minimal-export-btn print-btn" data-list-id="${listId}" title="Imprimir"><i class="fa-solid fa-print"></i></button>
                <button class="icon-button minimal-export-btn share-btn" data-list-id="${listId}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
            `;
        }
        if (idInput) idInput.value = listId;
        this.openModal('list-view-modal');
        document.getElementById('list-view-edit-btn')?.addEventListener('click', () => {
            this.closeModal('list-view-modal');
            this.openListEditView(listId);
        }, { once: true });
    };

    app.handleOpenPantryView = function(itemEl) {
        const id = itemEl?.dataset.id;
        const item = this.state.despensa.find(i => String(i.id) === String(id));
        if (!item) return;
        const titleEl = document.getElementById('pantry-view-title');
        const bodyEl = document.getElementById('pantry-view-body');
        const footerEl = document.getElementById('pantry-view-footer');
        if (!titleEl || !bodyEl || !footerEl) return;

        const stock = parseInt(item.stock || 0, 10);
        const stockBars = Array.from({ length: 4 }, (_, i) => `<div class="card__stock-bar ${i < Math.max(1, Math.round(stock / 25)) ? 'active' : ''}"></div>`).join('');
        const validade = item.validade ? item.validade.split('-').reverse().join('/') : 'Não informada';

        titleEl.textContent = item.name;
        bodyEl.innerHTML = `
            <div class="pantry-view-readonly pantry-luxury-view">
                <div class="detail-kpi-grid">
                    <div class="detail-kpi"><strong>${this.escapeHtml(item.name)}</strong><span>Item salvo</span></div>
                    <div class="detail-kpi"><strong>${item.qtd}</strong><span>Quantidade</span></div>
                    <div class="detail-kpi"><strong>${this.escapeHtml(item.unid || 'un')}</strong><span>Unidade</span></div>
                    <div class="detail-kpi"><strong>R$ ${parseFloat(item.valor || 0).toFixed(2)}</strong><span>Valor unitário</span></div>
                </div>
                <div class="detail-stack" style="margin-top:1rem;">
                    <div class="detail-listing-item">
                        <div><strong>Validade</strong><p class="detail-note">${validade}</p></div>
                    </div>
                    <div class="detail-listing-item">
                        <div><strong>Nível de estoque</strong><p class="detail-note">${stock}% disponível</p></div>
                        <div class="card__stock pantry-stock-inline">${stockBars}</div>
                    </div>
                </div>
            </div>`;
        footerEl.innerHTML = `
            <button class="icon-button minimal-export-btn share-btn" data-item-id="${item.id}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
            <button class="icon-button minimal-export-btn print-btn" data-item-id="${item.id}" title="Imprimir"><i class="fa-solid fa-print"></i></button>
            <button class="icon-button minimal-export-btn pdf-btn" data-item-id="${item.id}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
        `;
        this.openModal('pantry-view-modal');
    };

    app.showRecipeDetailModal = function(recipeId) {
        const recipe = this.state.receitas[recipeId];
        if (!recipe) return;
        const titleEl = document.getElementById('recipe-detail-modal-title');
        const bodyEl = document.getElementById('recipe-detail-modal-body');
        const footerEl = document.getElementById('recipe-detail-modal-footer');
        if (!titleEl || !bodyEl || !footerEl) return;

        const ingredients = recipe.ingredients || [];
        const prepText = (recipe.content || '')
            .replace(/<h4>Ingredientes<\/h4>/gi, '')
            .replace(/<ul>[\s\S]*?<\/ul>/i, '')
            .replace(/<h4>Preparo<\/h4>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim();
        const desc = this.escapeHtml(recipe.desc || 'Receita criada no seu painel premium.');
        const ingredientChips = ingredients.length
            ? ingredients.map(ing => `<li class="recipe-chip"><span>${this.escapeHtml(ing.qty || '1')} ${this.escapeHtml(ing.unit || 'un')}</span><strong>${this.escapeHtml(ing.name || '')}</strong></li>`).join('')
            : '<li class="recipe-chip recipe-chip--empty"><strong>Sem ingredientes cadastrados</strong></li>';

        titleEl.textContent = recipe.name;
        bodyEl.innerHTML = `
            <div class="recipe-rich-content recipe-luxury-view">
                <div class="recipe-hero-head">
                    <div class="recipe-title-block">
                        <span class="recipe-eyebrow">Receita salva</span>
                        <h4>${this.escapeHtml(recipe.name)}</h4>
                        <p class="detail-note">${desc}</p>
                    </div>
                    <div class="recipe-meta-grid">
                        <div class="detail-kpi"><strong>${ingredients.length}</strong><span>ingredientes</span></div>
                        <div class="detail-kpi"><strong>${prepText ? prepText.split('\n').filter(Boolean).length || 1 : 1}</strong><span>etapas</span></div>
                    </div>
                </div>
                <div class="recipe-section-card">
                    <h5>Ingredientes</h5>
                    <ul class="recipe-ingredient-chips">${ingredientChips}</ul>
                </div>
                <div class="recipe-section-card">
                    <h5>Modo de preparo</h5>
                    <div class="recipe-prep-copy">${prepText ? prepText.split('\n').filter(Boolean).map(step => `<p>${this.escapeHtml(step)}</p>`).join('') : '<p>Adicione o modo de preparo para deixar a receita completa.</p>'}</div>
                </div>
            </div>`;
        footerEl.innerHTML = `
            <button type="button" class="icon-button minimal-export-btn share-btn" data-recipe-id="${recipeId}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
            <button type="button" class="icon-button minimal-export-btn print-btn" data-recipe-id="${recipeId}" title="Imprimir"><i class="fa-solid fa-print"></i></button>
            <button type="button" class="icon-button minimal-export-btn pdf-btn" data-recipe-id="${recipeId}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
        `;
        this.openModal('recipe-detail-modal');
    };

    app.renderPlanejador = function(container) {
        if (!container) container = document.getElementById('module-planejador');
        if (!container) return;
        const days = this.getPlannerDaysMap();
        const cards = Object.entries(days).map(([dayKey, dayLabel]) => {
            const meals = this.getPlannerMealsForDay(dayKey);
            const preview = meals.length
                ? meals.slice(0, 3).map(meal => `
                    <div class="planner-mini-meal ${meal.completed ? 'is-complete' : ''}">
                        <small>${this.escapeHtml(meal.mealLabel)}</small>
                        <strong>${this.escapeHtml(meal.name)}</strong>
                    </div>`).join('')
                : '<div class="planner-mini-empty">Nenhuma refeição planejada.</div>';
            return `
                <article class="planner-day-card" data-day="${dayKey}">
                    <div class="planner-day-header">
                        <div class="planner-day-copy">
                            <strong>${dayLabel}</strong>
                            <span>${meals.length ? `${meals.length} refeição(ões)` : 'Pronto para planejar'}</span>
                        </div>
                        <div class="planner-day-actions">
                            <button type="button" class="icon-button day-clear-btn" data-day="${dayKey}" title="Limpar dia"><i class="fa-solid fa-eraser"></i></button>
                            <button type="button" class="icon-button add-meal-btn" data-day-target="${dayKey}" title="Inserir refeição"><i class="fa-solid fa-plus"></i></button>
                        </div>
                    </div>
                    <div class="planner-preview-list">${preview}</div>
                </article>`;
        }).join('');

        container.innerHTML = `
            <div class="dashboard-card planner-shell planner-shell--ultra">
                <div class="card-header">
                    <h3><i class="fa-solid fa-calendar-week"></i> Planejador</h3>
                    <div class="card-actions"><button class="icon-button clear-plan-btn" title="Limpar tudo"><i class="fa-solid fa-eraser"></i></button></div>
                </div>
                <div class="card-content"><div class="planner-grid">${cards}</div></div>
                <div class="card-footer module-actions-footer">
                    <button class="icon-button minimal-export-btn share-btn" title="Compartilhar planejamento"><i class="fa-solid fa-share-alt"></i></button>
                    <button class="icon-button minimal-export-btn print-btn" title="Imprimir planejamento"><i class="fa-solid fa-print"></i></button>
                    <button class="icon-button minimal-export-btn pdf-btn" title="Gerar PDF do planejamento"><i class="fa-solid fa-file-pdf"></i></button>
                </div>
            </div>`;
    };

    app.openPlannerDayDetailModal = function(dayKey) {
        const titleEl = document.getElementById('detail-modal-title');
        const bodyEl = document.getElementById('detail-modal-body');
        const footerEl = document.getElementById('detail-modal-footer');
        const headerActionsEl = document.getElementById('detail-modal-header-actions');
        const meals = this.getPlannerMealsForDay(dayKey);
        titleEl.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ${this.getPlannerDaysMap()[dayKey] || 'Dia'}`;
        headerActionsEl.innerHTML = `<button class="icon-button add-meal-btn" data-day-target="${dayKey}" title="Inserir refeição"><i class="fa-solid fa-plus"></i></button>`;

        bodyEl.innerHTML = `
            <div class="detail-rich-content planner-day-detail">
                <div class="detail-kpi-grid">
                    <div class="detail-kpi"><strong>${meals.length}</strong><span>refeições planejadas</span></div>
                    <div class="detail-kpi"><strong>${meals.filter(meal => meal.completed).length}</strong><span>marcadas como usadas</span></div>
                </div>
                <div class="detail-stack planner-day-stack">
                    ${meals.length ? meals.map(meal => `
                        <div class="detail-listing-item planner-meal-item ${meal.completed ? 'completed' : ''}" data-recipe-id="${meal.recipeId || meal.id}" data-day="${dayKey}" data-meal="${meal.key}">
                            <div class="planner-meal-copy">
                                <small class="planner-meal-label">${this.escapeHtml(meal.mealLabel)}</small>
                                <strong class="meal-item-name">${this.escapeHtml(meal.name)}</strong>
                                <p class="detail-note">${meal.time ? `Horário: ${this.escapeHtml(meal.time)}` : 'Toque em visualizar para abrir a receita.'}</p>
                            </div>
                            <div class="module-detail-actions meal-item-actions">
                                <button type="button" class="icon-button meal-delete-btn" title="Remover"><i class="fa-solid fa-trash"></i></button>
                                <button type="button" class="icon-button meal-view-btn" title="Ver receita"><i class="fa-solid fa-eye"></i></button>
                                <button type="button" class="icon-button meal-complete-btn ${meal.completed ? 'is-complete' : ''}" title="Marcar como usado"><i class="fa-solid fa-check"></i></button>
                            </div>
                        </div>`).join('') : `
                        <div class="detail-listing-item">
                            <div><strong>Nenhuma refeição planejada.</strong><p class="detail-note">Use o botão inserir para escolher uma receita.</p></div>
                        </div>`}
                </div>
            </div>`;
        footerEl.className = 'modal-footer detail-modal-footer unified-detail-actions compact-export-row';
        footerEl.innerHTML = `

            <button type="button" class="icon-button minimal-export-btn share-btn" data-day="${dayKey}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
            <button type="button" class="icon-button minimal-export-btn print-btn" data-day="${dayKey}" title="Imprimir"><i class="fa-solid fa-print"></i></button>
            <button type="button" class="icon-button minimal-export-btn pdf-btn" data-day="${dayKey}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
        `;
        this.openModal('detail-modal');
    };

    app.handleGenerateListFromPlanner = function(dayKey = null) {
        const plannedDays = dayKey ? { [dayKey]: this.state.planejador[dayKey] || {} } : this.state.planejador;
        let targetListId = this.activeListId;
        if (!targetListId || !this.state.listas[targetListId]) {
            const firstListId = Object.keys(this.state.listas || {})[0];
            if (firstListId) {
                targetListId = firstListId;
            } else {
                targetListId = this.generateId();
                this.state.listas[targetListId] = {
                    nome: dayKey ? `Lista de ${this.getPlannerDaysMap()[dayKey] || 'Planejamento'}` : 'Lista do Planejamento',
                    items: [],
                    createdAt: new Date().toISOString()
                };
            }
            this.activeListId = targetListId;
        }

        let totalIngredients = 0;
        const pushIngredients = (recipe) => {
            const ingredients = recipe?.ingredients || [];
            ingredients.forEach(ing => {
                this.state.listas[targetListId].items.unshift({
                    id: this.generateId(),
                    name: ing.name,
                    qtd: parseFloat(ing.qty) || 1,
                    unid: ing.unit || 'un',
                    valor: 0,
                    checked: false
                });
                totalIngredients += 1;
            });
        };

        Object.values(plannedDays).forEach(dayState => {
            if (!dayState || typeof dayState !== 'object') return;
            ['cafe', 'almoco', 'jantar'].forEach(key => {
                const mealData = dayState[key];
                if (mealData?.recipeId || mealData?.id) pushIngredients(this.state.receitas[mealData.recipeId || mealData.id]);
            });
            (dayState.extras || []).forEach(extra => pushIngredients(this.state.receitas[extra.recipeId || extra.id]));
        });

        if (!this.state.listas[targetListId].createdAt) this.state.listas[targetListId].createdAt = new Date().toISOString();

        if (totalIngredients > 0) {
            this.saveState();
            this.renderListaWidget();
            if (this.activeModule === 'lista') this.renderListas();
            this.showNotification(`Sucesso! ${totalIngredients} ingredientes adicionados à lista.`, 'success');
        } else {
            this.showNotification('Seu planejador está vazio ou as receitas não têm ingredientes.', 'info');
        }
    };

    app.renderAnalysisDetailDesktop = function(analysisKey = 'gastos_categoria') {
        const container = document.getElementById('analises-detail-desktop');
        if (!container) return;
        const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
        container.innerHTML = `
            <div class="card-header analysis-premium-header">
                <h3><i class="${cfg.icon}"></i> ${cfg.label}</h3>
                <div class="card-actions"><button class="icon-button analysis-mobile-open-btn" data-analysis-key="${analysisKey}" title="Abrir detalhe"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button></div>
            </div>
            <div class="card-content analysis-premium-content">
                <div class="detail-note analysis-premium-note">${cfg.note}</div>
                <div class="analysis-config-panel">
                    <div class="form-group">
                        <label for="analysis-data-select">Analisar</label>
                        <select id="analysis-data-select">
                            <option value="gastos_categoria">Gastos por Categoria (Listas)</option>
                            <option value="validade_despensa">Itens por Validade (Despensa)</option>
                            <option value="uso_receitas">Receitas Usadas (Planejador)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="analysis-type-select">Tipo de gráfico</label>
                        <select id="analysis-type-select">
                            <option value="pie">Pizza</option>
                            <option value="doughnut">Rosca</option>
                            <option value="bar">Barras</option>
                            <option value="line">Linha</option>
                        </select>
                    </div>
                </div>
                <div class="chart-canvas-container analysis-premium-chart"><canvas id="dynamic-analysis-chart"></canvas></div>
            </div>
            <div class="card-footer module-actions-footer compact-export-row">
                <button class="icon-button minimal-export-btn share-btn" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
                <button class="icon-button minimal-export-btn print-btn" title="Imprimir"><i class="fa-solid fa-print"></i></button>
                <button class="icon-button minimal-export-btn pdf-btn" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
            </div>`;
        document.getElementById('analysis-data-select').value = analysisKey;
        document.getElementById('analysis-data-select')?.addEventListener('change', (e) => this.renderAnalysisDetailDesktop(e.target.value));
        document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
        this.updateDynamicChart();
    };

    app.openAnalysisDetailModal = function(analysisKey = 'gastos_categoria') {
        const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
        const titleEl = document.getElementById('detail-modal-title');
        const bodyEl = document.getElementById('detail-modal-body');
        const footerEl = document.getElementById('detail-modal-footer');
        const headerActionsEl = document.getElementById('detail-modal-header-actions');
        titleEl.innerHTML = `<i class="${cfg.icon}"></i> ${cfg.label}`;
        headerActionsEl.innerHTML = '';
        bodyEl.innerHTML = `
            <div class="analysis-premium-modal">
                <p class="detail-note analysis-premium-note">${cfg.note}</p>
                <div class="analysis-config-panel">
                    <div class="form-group">
                        <label for="analysis-data-select">Analisar</label>
                        <select id="analysis-data-select">
                            <option value="gastos_categoria">Gastos por Categoria (Listas)</option>
                            <option value="validade_despensa">Itens por Validade (Despensa)</option>
                            <option value="uso_receitas">Receitas Usadas (Planejador)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="analysis-type-select">Tipo de gráfico</label>
                        <select id="analysis-type-select">
                            <option value="pie">Pizza</option>
                            <option value="doughnut">Rosca</option>
                            <option value="bar">Barras</option>
                            <option value="line">Linha</option>
                        </select>
                    </div>
                </div>
                <div class="chart-canvas-container analysis-premium-chart"><canvas id="dynamic-analysis-chart"></canvas></div>
            </div>`;
        footerEl.className = 'modal-footer detail-modal-footer compact-export-row';
        footerEl.innerHTML = `
            <button class="icon-button minimal-export-btn share-btn" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
            <button class="icon-button minimal-export-btn print-btn" title="Imprimir"><i class="fa-solid fa-print"></i></button>
            <button class="icon-button minimal-export-btn pdf-btn" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>`;
        document.getElementById('analysis-data-select').value = analysisKey;
        document.getElementById('analysis-data-select')?.addEventListener('change', () => this.updateDynamicChart());
        document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
        this.updateDynamicChart();
        this.openModal('detail-modal');
    };

    function initHeroRotator() {
        const identity = document.querySelector('#inicio .identity-container');
        if (!identity || identity.classList.contains('has-hero-rotator')) return;

        const dataMessages = (identity.dataset.heroPhrases || '')
            .split('|')
            .map(msg => msg.trim())
            .filter(Boolean);

        const signature = identity.querySelector('.hero-signature')?.textContent?.trim();
        const statTexts = Array.from(identity.querySelectorAll('.hero-stat')).map(stat => {
            const strong = stat.querySelector('strong')?.textContent?.trim() || '';
            const span = stat.querySelector('span')?.textContent?.trim() || '';
            return [strong, span].filter(Boolean).join(' • ');
        }).filter(Boolean);

        const messages = (dataMessages.length ? dataMessages : [signature, ...statTexts])
            .filter(Boolean)
            .slice(0, 2);

        if (!messages.length) return;
        if (messages.length === 1) messages.push(messages[0]);

        identity.classList.add('has-hero-rotator');
        const rotator = document.createElement('div');
        rotator.className = 'hero-rotator';
        rotator.setAttribute('aria-live', 'polite');
        rotator.innerHTML = messages
            .map((msg, index) => `<div class="hero-rotator-item ${index === 0 ? 'is-visible' : ''}">${msg}</div>`)
            .join('');

        identity.querySelector('.simple-subtitle')?.insertAdjacentElement('afterend', rotator);

        let active = 0;
        setInterval(() => {
            const items = rotator.querySelectorAll('.hero-rotator-item');
            if (items.length < 2) return;
            items[active]?.classList.remove('is-visible');
            active = (active + 1) % items.length;
            items[active]?.classList.add('is-visible');
        }, 3200);
    }

    function installUltraClickPatch() {
        if (document.body.dataset.ultraUxPatchInstalled === 'true') return;
        document.body.dataset.ultraUxPatchInstalled = 'true';

        document.addEventListener('click', function(e) {
            const closest = sel => e.target.closest(sel);
            const itemEl = closest('.placeholder-item');
            const recipeCard = closest('.recipe-list-item, .card--recipe');
            const savedList = closest('.saved-list-item, .card--saved-list');

            if (closest('.list-cycle-sort-btn')) { e.preventDefault(); e.stopImmediatePropagation(); app.cycleSortMode('list'); return; }
            if (closest('.recipe-cycle-sort-btn')) { e.preventDefault(); e.stopImmediatePropagation(); app.cycleSortMode('recipe'); return; }
            if (closest('.pantry-cycle-sort-btn')) { e.preventDefault(); e.stopImmediatePropagation(); app.cycleSortMode('pantry'); return; }

            if (savedList && closest('.delete-list-btn')) {
                const listId = savedList.dataset.listId || savedList.dataset.id;
                if (listId) { e.preventDefault(); e.stopImmediatePropagation(); app.handleDeleteListaAtiva(listId); }
                return;
            }
            if (savedList && closest('.select-list-btn')) {
                const listId = savedList.dataset.listId || savedList.dataset.id;
                if (listId) { e.preventDefault(); e.stopImmediatePropagation(); app.openListEditView(listId); }
                return;
            }

            if (recipeCard && closest('.edit-recipe-btn')) {
                const recipeId = closest('.edit-recipe-btn').dataset.recipeId || recipeCard.dataset.recipeId || recipeCard.dataset.id;
                if (recipeId) { e.preventDefault(); e.stopImmediatePropagation(); app.handleOpenRecipeEditModal(recipeId); }
                return;
            }
            if (recipeCard && closest('.delete-recipe-btn')) {
                const recipeId = closest('.delete-recipe-btn').dataset.recipeId || recipeCard.dataset.recipeId || recipeCard.dataset.id;
                if (recipeId) { e.preventDefault(); e.stopImmediatePropagation(); app.handleDeleteRecipe(recipeId); }
                return;
            }

            if (itemEl) {
                const isList = !!itemEl.closest('#lista-items-full, #list-view-modal-body, #lista-items-inicio');
                const isPantry = !!itemEl.closest('#despensa-list-container, [id*="despensa-items"]');

                if (isList && closest('.edit-btn')) {
                    e.preventDefault(); e.stopImmediatePropagation();
                    app.startInlineListEdit(itemEl);
                    return;
                }
                if (isList && closest('.delete-btn')) {
                    e.preventDefault(); e.stopImmediatePropagation();
                    const itemName = itemEl.dataset.name || 'este item';
                    app.openConfirmModal('Excluir item', `Deseja excluir "${itemName}" da lista?`, () => app.handleDeleteItem('lista', itemEl.dataset.id));
                    return;
                }
                if (isList && closest('.save-inline-edit-btn')) {
                    e.preventDefault(); e.stopImmediatePropagation();
                    app.handleSaveInlineListEdit(itemEl);
                    return;
                }
                if (isList && closest('.cancel-inline-edit-btn')) {
                    e.preventDefault(); e.stopImmediatePropagation();
                    app.cancelInlineListEdit();
                    return;
                }
                if (isPantry && closest('.edit-btn')) {
                    e.preventDefault(); e.stopImmediatePropagation();
                    app.handleOpenDespensaEditModal(itemEl);
                    return;
                }
                if (isPantry && closest('.delete-btn')) {
                    e.preventDefault(); e.stopImmediatePropagation();
                    const itemName = itemEl.dataset.name || 'este item';
                    app.openConfirmModal('Excluir item', `Deseja excluir "${itemName}" da despensa?`, () => app.handleDeleteItem('despensa', itemEl.dataset.id));
                    return;
                }
            }
        }, true);
    }

    requestAnimationFrame(() => {
        installUltraClickPatch();
        initHeroRotator();
        if (app.isAppMode && app.activeModule && typeof app.activateModuleAndRender === 'function') {
            app.activateModuleAndRender(app.activeModule);
        }
    });
})();

(() => {
    const originalHandleDeleteItemMagnifico = app.handleDeleteItem ? app.handleDeleteItem.bind(app) : null;

    app.buildChefButton = function() {
        return '';
    };

    app.deleteListItemById = function(listId, itemId) {
        if (!listId || !this.state.listas[listId]) return;
        const id = String(itemId);
        this.state.listas[listId].items = (this.state.listas[listId].items || []).filter(item => String(item.id) !== id);
        if (this.inlineListEdit && String(this.inlineListEdit.itemId) === id) this.inlineListEdit = null;
        this.saveState();
        this.refreshListContexts(listId);
        this.showNotification('Item removido da lista.', 'info');
    };

    app.deletePantryItemById = function(itemId) {
        const id = String(itemId);
        this.state.despensa = (this.state.despensa || []).filter(item => String(item.id) !== id);
        this.saveState();
        this.renderDespensaWidget();
        if (this.activeModule === 'despensa') this.renderDespensa();
        this.closeModal('pantry-view-modal');
        const desktop = document.getElementById('despensa-detail-desktop');
        if (desktop) desktop.innerHTML = `<div class="empty-state-placeholder"><i class="fa-solid fa-box-open" style="font-size:2rem; margin-bottom:1rem; opacity:.45;"></i><p>Selecione um item da despensa para abrir um visual limpo e detalhado.</p></div>`;
        this.showNotification('Item excluído da despensa.', 'info');
    };

    app.handleDeleteItem = function(type, itemId, ctx = {}) {
        if (type === 'lista') {
            const listId = ctx?.listId || document.getElementById('list-view-modal-body')?.dataset?.listId || document.getElementById('active-list-id-input')?.value || this.activeListId;
            if (listId && this.state.listas[listId]) {
                this.deleteListItemById(listId, itemId);
                return;
            }
        }
        if (type === 'despensa') {
            this.deletePantryItemById(itemId);
            return;
        }
        if (originalHandleDeleteItemMagnifico) return originalHandleDeleteItemMagnifico(type, itemId, ctx);
    };

    app.renderPantryDetailDesktop = function(item) {
        const container = document.getElementById('despensa-detail-desktop');
        if (!container || !item) return;
        const stock = Math.max(0, Math.min(100, parseInt(item.stock || 0, 10)));
        const validade = item.validade ? item.validade.split('-').reverse().join('/') : 'Não informada';
        const stockBars = [1,2,3,4].map(level => `<div class="pantry-stock-meter-bar level-${level} ${stock >= level * 25 ? 'active' : ''}"></div>`).join('');
        const chefPrompt = `Quero analisar o item ${item.name}. Me diga formas de uso, conservação, validade, sinais de estrago e uma estimativa nutricional típica, deixando claro quando for uma estimativa.`;
        container.innerHTML = `
            <div class="card-header analysis-premium-header">
                <h3><i class="fa-solid fa-box-archive"></i> ${this.escapeHtml(item.name)}</h3>
                <div class="card-actions">
                    ${this.buildChefButton(chefPrompt, 'Chef IA')}
                    <button type="button" class="icon-button" data-pantry-edit-id="${item.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="icon-button danger" data-pantry-delete-id="${item.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="card-content">
                <div class="pantry-luxury-view">
                    <section class="pantry-hero-card">
                        <div>
                            <span class="pantry-eyebrow">Item da despensa</span>
                            <h4>${this.escapeHtml(item.name)}</h4>
                            <p class="detail-note">Visual premium com foco em estoque, validade e organização.</p>
                        </div>
                        <div class="detail-kpi"><strong>R$ ${parseFloat(item.valor || 0).toFixed(2)}</strong><span>valor unitário</span></div>
                    </section>
                    <section class="pantry-meta-grid">
                        <div class="pantry-meta-pill"><strong>${item.qtd}</strong><span>Quantidade</span></div>
                        <div class="pantry-meta-pill"><strong>${this.escapeHtml(item.unid || 'un')}</strong><span>Unidade</span></div>
                        <div class="pantry-meta-pill"><strong>${validade}</strong><span>Validade</span></div>
                        <div class="pantry-meta-pill"><strong>${stock}%</strong><span>Estoque atual</span></div>
                    </section>
                    <section class="pantry-stock-card">
                        <div>
                            <h5 style="margin:0 0 .45rem; color:#fff;">Nível de estoque</h5>
                            <p class="detail-note">Use as barras para acompanhar visualmente o nível disponível e decidir quando repor.</p>
                        </div>
                        <div class="pantry-stock-meter">${stockBars}</div>
                    </section>
                    <section class="pantry-nutrition-card">
                        <h5 style="margin:0 0 .45rem; color:#fff;">Informações nutricionais</h5>
                        <p class="detail-note">Este item ainda não possui tabela nutricional cadastrada no painel.</p>
                        <ul>
                            <li>Use uma estimativa típica do produto como referência.</li>
                            <li>Peça também sugestões de conservação, uso e reaproveitamento.</li>
                            <li>Quando houver embalagem, confira rótulo, peso, validade e conservação.</li>
                        </ul>
                    </section>
                </div>
            </div>
            <div class="card-footer module-actions-footer compact-export-row">
                ${this.buildChefButton(chefPrompt, 'Chef IA', 'chef-glass-btn')}
                <button class="icon-button minimal-export-btn share-btn" data-item-id="${item.id}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
                <button class="icon-button minimal-export-btn print-btn" data-item-id="${item.id}" title="Imprimir"><i class="fa-solid fa-print"></i></button>
                <button class="icon-button minimal-export-btn pdf-btn" data-item-id="${item.id}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
            </div>`;
    };

    app.handleOpenPantryView = function(itemEl) {
        const id = itemEl?.dataset?.id;
        const item = (this.state.despensa || []).find(i => String(i.id) === String(id));
        if (!item) return;
        const titleEl = document.getElementById('pantry-view-title');
        const bodyEl = document.getElementById('pantry-view-body');
        const footerEl = document.getElementById('pantry-view-footer');
        if (!titleEl || !bodyEl || !footerEl) return;
        const stock = Math.max(0, Math.min(100, parseInt(item.stock || 0, 10)));
        const validade = item.validade ? item.validade.split('-').reverse().join('/') : 'Não informada';
        const stockBars = [1,2,3,4].map(level => `<div class="pantry-stock-meter-bar level-${level} ${stock >= level * 25 ? 'active' : ''}"></div>`).join('');
        const chefPrompt = `Quero conferir informações do produto ${item.name}. Me diga estimativas nutricionais típicas, dicas de conservação, validade, sinais de estrago e ideias de uso. Quando for estimativa, deixe isso claro.`;
        titleEl.textContent = item.name;
        bodyEl.innerHTML = `
            <div class="pantry-luxury-view">
                <section class="pantry-hero-card">
                    <div>
                        <span class="pantry-eyebrow">Despensa premium</span>
                        <h4>${this.escapeHtml(item.name)}</h4>
                        <p class="detail-note">Organizado, legível e pensado para uso inteligente do produto.</p>
                    </div>
                    <div class="detail-kpi"><strong>${stock}%</strong><span>estoque atual</span></div>
                </section>
                <section class="pantry-meta-grid">
                    <div class="pantry-meta-pill"><strong>${item.qtd}</strong><span>Quantidade</span></div>
                    <div class="pantry-meta-pill"><strong>${this.escapeHtml(item.unid || 'un')}</strong><span>Unidade</span></div>
                    <div class="pantry-meta-pill"><strong>R$ ${parseFloat(item.valor || 0).toFixed(2)}</strong><span>Valor unitário</span></div>
                    <div class="pantry-meta-pill"><strong>${validade}</strong><span>Validade</span></div>
                </section>
                <section class="pantry-stock-card">
                    <div>
                        <h5 style="margin:0 0 .45rem; color:#fff;">Gráfico rápido do estoque</h5>
                        <p class="detail-note">Barras mais altas significam mais disponibilidade do item.</p>
                    </div>
                    <div class="pantry-stock-meter">${stockBars}</div>
                </section>
                <section class="pantry-nutrition-card">
                    <h5 style="margin:0 0 .45rem; color:#fff;">Informações nutricionais</h5>
                    <p class="detail-note">Ainda não há dados nutricionais cadastrados manualmente.</p>
                    <ul>
                        <li>Considere uma estimativa típica do produto.</li>
                        <li>Cheque conservação, aproveitamento e sinais de vencimento.</li>
                        <li>Use o botão abaixo para conferir o produto com apoio da IA.</li>
                    </ul>
                </section>
                <section class="pantry-chef-card">
                    <div class="pantry-chef-copy">
                        <strong>Conferir produto</strong>
                        <p>Entenda melhor uso, validade, armazenamento e uma estimativa nutricional do item.</p>
                    </div>
                    ${this.buildChefButton(chefPrompt, 'Conferir com Chef IA', 'chef-glass-btn')}
                </section>
            </div>`;
        footerEl.innerHTML = `
            <button class="icon-button minimal-export-btn share-btn" data-item-id="${item.id}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
            <button class="icon-button minimal-export-btn print-btn" data-item-id="${item.id}" title="Imprimir"><i class="fa-solid fa-print"></i></button>
            <button class="icon-button minimal-export-btn pdf-btn" data-item-id="${item.id}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>`;
        this.openModal('pantry-view-modal');
    };

    app.renderRecipeDetail = function(recipeId, targetElementId = 'recipe-detail-desktop-body', footerElementId = 'recipe-detail-desktop-footer') {
        const recipe = this.state.receitas[recipeId];
        const bodyEl = document.getElementById(targetElementId);
        const footerEl = document.getElementById(footerElementId);
        if (!recipe || !bodyEl || !footerEl) return;
        const ingredients = recipe.ingredients || [];
        const prepText = (recipe.content || '').replace(/<h4>Ingredientes<\/h4>/gi, '').replace(/<ul>[\s\S]*?<\/ul>/i, '').replace(/<h4>Preparo<\/h4>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
        const desc = this.escapeHtml(recipe.desc || 'Receita salva com visual premium.');
        const ingredientChips = ingredients.length ? ingredients.map(ing => `<li class="recipe-chip"><span>${this.escapeHtml(ing.qty || '1')} ${this.escapeHtml(ing.unit || 'un')}</span><strong>${this.escapeHtml(ing.name || '')}</strong></li>`).join('') : '<li class="recipe-chip recipe-chip--empty"><strong>Sem ingredientes cadastrados</strong></li>';
        const chefPrompt = `Tenho a receita ${recipe.name}. Quero sugestões de melhorias, substituições, forma de servir, tempo de preparo e uma lista de compras organizada.`;
        bodyEl.innerHTML = `
            <div class="recipe-rich-content recipe-luxury-view">
                <div class="recipe-hero-head">
                    <div class="recipe-title-block">
                        <span class="recipe-eyebrow">Receita premium</span>
                        <h4>${this.escapeHtml(recipe.name)}</h4>
                        <p class="detail-note">${desc}</p>
                    </div>
                    <div class="recipe-meta-grid">
                        <div class="detail-kpi"><strong>${ingredients.length}</strong><span>ingredientes</span></div>
                        <div class="detail-kpi"><strong>${prepText ? prepText.split('\n').filter(Boolean).length || 1 : 1}</strong><span>etapas</span></div>
                    </div>
                </div>
                <div class="recipe-section-card">
                    <h5>Ingredientes</h5>
                    <ul class="recipe-ingredient-chips">${ingredientChips}</ul>
                </div>
                <div class="recipe-section-card">
                    <h5>Modo de preparo</h5>
                    <div class="recipe-prep-copy">${prepText ? prepText.split('\n').filter(Boolean).map(step => `<p>${this.escapeHtml(step)}</p>`).join('') : '<p>Adicione o modo de preparo para deixar a receita completa.</p>'}</div>
                </div>
            </div>`;
        footerEl.className = 'card-footer module-actions-footer compact-export-row';
        footerEl.innerHTML = `
            ${this.buildChefButton(chefPrompt, 'Chef IA', 'chef-glass-btn')}
            <button type="button" class="icon-button minimal-export-btn share-btn" data-recipe-id="${recipeId}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
            <button type="button" class="icon-button minimal-export-btn print-btn" data-recipe-id="${recipeId}" title="Imprimir"><i class="fa-solid fa-print"></i></button>
            <button type="button" class="icon-button minimal-export-btn pdf-btn" data-recipe-id="${recipeId}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
            <button type="button" class="icon-button edit-recipe-btn" data-recipe-id="${recipeId}" title="Editar"><i class="fa-solid fa-pen"></i></button>
            <button type="button" class="icon-button delete-recipe-btn danger" data-recipe-id="${recipeId}" title="Excluir"><i class="fa-solid fa-trash"></i></button>`;
        footerEl.style.display = 'flex';
    };

    app.showRecipeDetailModal = function(recipeId) {
        const recipe = this.state.receitas[recipeId];
        if (!recipe) return;
        const titleEl = document.getElementById('recipe-detail-modal-title');
        const bodyEl = document.getElementById('recipe-detail-modal-body');
        const footerEl = document.getElementById('recipe-detail-modal-footer');
        if (!titleEl || !bodyEl || !footerEl) return;
        const ingredients = recipe.ingredients || [];
        const prepText = (recipe.content || '').replace(/<h4>Ingredientes<\/h4>/gi, '').replace(/<ul>[\s\S]*?<\/ul>/i, '').replace(/<h4>Preparo<\/h4>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
        const desc = this.escapeHtml(recipe.desc || 'Receita salva com visual premium.');
        const ingredientChips = ingredients.length ? ingredients.map(ing => `<li class="recipe-chip"><span>${this.escapeHtml(ing.qty || '1')} ${this.escapeHtml(ing.unit || 'un')}</span><strong>${this.escapeHtml(ing.name || '')}</strong></li>`).join('') : '<li class="recipe-chip recipe-chip--empty"><strong>Sem ingredientes cadastrados</strong></li>';
        const chefPrompt = `Tenho a receita ${recipe.name}. Quero uma versão ainda melhor, com substituições, apresentação e dicas de armazenamento.`;
        titleEl.textContent = recipe.name;
        bodyEl.innerHTML = `
            <div class="recipe-rich-content recipe-luxury-view">
                <div class="recipe-hero-head">
                    <div class="recipe-title-block">
                        <span class="recipe-eyebrow">Receita premium</span>
                        <h4>${this.escapeHtml(recipe.name)}</h4>
                        <p class="detail-note">${desc}</p>
                    </div>
                    <div class="recipe-meta-grid">
                        <div class="detail-kpi"><strong>${ingredients.length}</strong><span>ingredientes</span></div>
                        <div class="detail-kpi"><strong>${prepText ? prepText.split('\n').filter(Boolean).length || 1 : 1}</strong><span>etapas</span></div>
                    </div>
                </div>
                <div class="recipe-section-card">
                    <h5>Ingredientes</h5>
                    <ul class="recipe-ingredient-chips">${ingredientChips}</ul>
                </div>
                <div class="recipe-section-card">
                    <h5>Modo de preparo</h5>
                    <div class="recipe-prep-copy">${prepText ? prepText.split('\n').filter(Boolean).map(step => `<p>${this.escapeHtml(step)}</p>`).join('') : '<p>Adicione o modo de preparo para deixar a receita completa.</p>'}</div>
                </div>
            </div>`;
        footerEl.innerHTML = `
            ${this.buildChefButton(chefPrompt, 'Chef IA', 'chef-glass-btn')}
            <button type="button" class="icon-button minimal-export-btn share-btn" data-recipe-id="${recipeId}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
            <button type="button" class="icon-button minimal-export-btn print-btn" data-recipe-id="${recipeId}" title="Imprimir"><i class="fa-solid fa-print"></i></button>
            <button type="button" class="icon-button minimal-export-btn pdf-btn" data-recipe-id="${recipeId}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>`;
        this.openModal('recipe-detail-modal');
    };

    app.renderPlanejador = function(container) {
        if (!container) container = document.getElementById('module-planejador');
        if (!container) return;
        const days = this.getPlannerDaysMap();
        const cards = Object.entries(days).map(([dayKey, dayLabel]) => {
            const meals = this.getPlannerMealsForDay(dayKey);
            const preview = meals.length
                ? meals.slice(0, 3).map(meal => `
                    <div class="planner-mini-meal ${meal.completed ? 'is-complete' : ''}">
                        <small>${this.escapeHtml(meal.mealLabel)}</small>
                        <strong>${this.escapeHtml(meal.name)}</strong>
                    </div>`).join('')
                : '<div class="planner-mini-empty">Nenhuma refeição planejada.</div>';
            return `
                <article class="planner-day-card" data-day="${dayKey}">
                    <div class="planner-day-header">
                        <div class="planner-day-copy">
                            <strong>${dayLabel}</strong>
                            <span>${meals.length ? `${meals.length} refeição(ões)` : 'Pronto para planejar'}</span>
                        </div>
                        <div class="planner-day-actions">
                            <button type="button" class="icon-button day-clear-btn" data-day="${dayKey}" title="Limpar dia"><i class="fa-solid fa-eraser"></i></button>
                            <button type="button" class="icon-button add-meal-btn" data-day-target="${dayKey}" title="Inserir refeição"><i class="fa-solid fa-plus"></i></button>
                        </div>
                    </div>
                    <div class="planner-preview-list">${preview}</div>
                </article>`;
        }).join('');
        container.innerHTML = `
            <div class="dashboard-card planner-shell planner-shell--ultra">
                <div class="card-header">
                    <h3><i class="fa-solid fa-calendar-week"></i> Planejador</h3>
                    <div class="card-actions">
                        ${this.buildChefButton('Monte um planejamento alimentar bonito, econômico e inteligente para a semana com base nas minhas receitas.', 'Chef IA')}
                        <button class="icon-button clear-plan-btn" title="Limpar tudo"><i class="fa-solid fa-eraser"></i></button>
                    </div>
                </div>
                <div class="card-content"><div class="planner-grid">${cards}</div></div>
                <div class="card-footer module-actions-footer compact-export-row">
                    <button class="icon-button minimal-export-btn share-btn" title="Compartilhar planejamento"><i class="fa-solid fa-share-alt"></i></button>
                    <button class="icon-button minimal-export-btn print-btn" title="Imprimir planejamento"><i class="fa-solid fa-print"></i></button>
                    <button class="icon-button minimal-export-btn pdf-btn" title="Gerar PDF do planejamento"><i class="fa-solid fa-file-pdf"></i></button>
                </div>
            </div>`;
    };

    app.openPlannerDayDetailModal = function(dayKey) {
        const titleEl = document.getElementById('detail-modal-title');
        const bodyEl = document.getElementById('detail-modal-body');
        const footerEl = document.getElementById('detail-modal-footer');
        const headerActionsEl = document.getElementById('detail-modal-header-actions');
        const dayLabel = this.getPlannerDaysMap()[dayKey] || 'Dia';
        const dayMeals = this.state.planejador[dayKey] || {};
        const standardSlots = [
            { key: 'cafe', label: 'Café da Manhã', icon: 'fa-solid fa-mug-saucer' },
            { key: 'almoco', label: 'Almoço', icon: 'fa-solid fa-bowl-food' },
            { key: 'jantar', label: 'Jantar', icon: 'fa-solid fa-utensils' }
        ];
        const slotCards = standardSlots.map(slot => {
            const meal = dayMeals[slot.key];
            if (!meal) {
                return `
                    <article class="planner-slot-card planner-slot-empty" data-day="${dayKey}" data-meal="${slot.key}">
                        <div class="planner-slot-head">
                            <div class="planner-slot-title"><small>${slot.label}</small><strong>Sem receita definida</strong></div>
                            <i class="${slot.icon}" style="opacity:.7;"></i>
                        </div>
                        <div class="planner-slot-body"><p>Escolha uma receita para deixar o seu ${slot.label.toLowerCase()} lindo e organizado.</p></div>
                        <div class="planner-slot-actions"><button type="button" class="icon-button planner-slot-direct-btn" data-day="${dayKey}" data-meal="${slot.key}" title="Escolher receita"><i class="fa-solid fa-plus"></i></button></div>
                    </article>`;
            }
            const recipeId = meal.recipeId || meal.id || '';
            const chefPrompt = `Tenho ${slot.label} com a receita ${meal.name}. Quero melhorar apresentação, combinações, preparo e lista de compras complementar.`;
            return `
                <article class="planner-slot-card ${meal.completed ? 'completed' : ''}" data-day="${dayKey}" data-meal="${slot.key}" data-recipe-id="${recipeId}">
                    <div class="planner-slot-head">
                        <div class="planner-slot-title">
                            <small>${slot.label}</small>
                            <strong>${this.escapeHtml(meal.name || 'Refeição')}</strong>
                            ${meal.time ? `<span class="planner-slot-time">${this.escapeHtml(meal.time)}</span>` : ''}
                        </div>
                        <i class="${slot.icon}" style="opacity:.78;"></i>
                    </div>
                    <div class="planner-slot-body"><p>${meal.completed ? 'Marcada como usada. Ótimo para acompanhar sua rotina.' : 'Use os botões ao lado para visualizar, concluir ou remover.'}</p></div>
                    <div class="planner-slot-actions">
                        ${this.buildChefButton(chefPrompt, 'Chef IA')}
                        <button type="button" class="icon-button meal-delete-btn" title="Remover"><i class="fa-solid fa-trash"></i></button>
                        <button type="button" class="icon-button meal-view-btn" title="Ver receita"><i class="fa-solid fa-eye"></i></button>
                        <button type="button" class="icon-button meal-complete-btn ${meal.completed ? 'is-complete' : ''}" title="Marcar como usado"><i class="fa-solid fa-check"></i></button>
                    </div>
                </article>`;
        }).join('');
        const extras = (dayMeals.extras || []).map(extra => {
            const recipeId = extra.recipeId || extra.id || '';
            const chefPrompt = `Tenho a refeição ${extra.mealLabel || 'extra'} com a receita ${extra.name}. Quero combinações, apresentação e organização.`;
            return `
                <article class="planner-slot-card" data-day="${dayKey}" data-meal="${extra.key}" data-recipe-id="${recipeId}">
                    <div class="planner-slot-head">
                        <div class="planner-slot-title">
                            <small>${this.escapeHtml(extra.mealLabel || 'Refeição Extra')}</small>
                            <strong>${this.escapeHtml(extra.name || 'Receita')}</strong>
                            ${extra.time ? `<span class="planner-slot-time">${this.escapeHtml(extra.time)}</span>` : ''}
                        </div>
                        <i class="fa-solid fa-star" style="opacity:.78;"></i>
                    </div>
                    <div class="planner-slot-body"><p>Refeição personalizada adicionada ao seu dia.</p></div>
                    <div class="planner-slot-actions">
                        ${this.buildChefButton(chefPrompt, 'Chef IA')}
                        <button type="button" class="icon-button meal-delete-btn" title="Remover"><i class="fa-solid fa-trash"></i></button>
                        <button type="button" class="icon-button meal-view-btn" title="Ver receita"><i class="fa-solid fa-eye"></i></button>
                        <button type="button" class="icon-button meal-complete-btn ${extra.completed ? 'is-complete' : ''}" title="Marcar como usado"><i class="fa-solid fa-check"></i></button>
                    </div>
                </article>`;
        }).join('');
        const addCard = `
            <article class="planner-slot-card planner-slot-add-card">
                <div class="planner-slot-head"><div class="planner-slot-title"><small>Personalizado</small><strong>Adicionar refeição</strong></div><i class="fa-solid fa-sparkles" style="opacity:.78;"></i></div>
                <div class="planner-slot-body"><p>Crie uma refeição com nome e horário personalizados e escolha a receita depois.</p></div>
                <div class="planner-slot-actions"><button type="button" class="icon-button planner-custom-meal-launch" data-day="${dayKey}" title="Criar refeição"><i class="fa-solid fa-plus"></i></button></div>
            </article>`;
        titleEl.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ${dayLabel}`;
        headerActionsEl.innerHTML = `<button class="icon-button add-meal-btn" data-day-target="${dayKey}" title="Inserir refeição"><i class="fa-solid fa-plus"></i></button>`;
        bodyEl.innerHTML = `
            <div class="planner-day-detail-shell">
                <div class="detail-kpi-grid">
                    <div class="detail-kpi"><strong>${this.getPlannerMealsForDay(dayKey).length}</strong><span>refeições no dia</span></div>
                    <div class="detail-kpi"><strong>${this.getPlannerMealsForDay(dayKey).filter(meal => meal.completed).length}</strong><span>marcadas como usadas</span></div>
                </div>
                <div class="planner-slot-grid">${slotCards}${extras}${addCard}</div>
            </div>`;
        footerEl.className = 'modal-footer detail-modal-footer compact-export-row';
        footerEl.innerHTML = `

            <button type="button" class="icon-button minimal-export-btn share-btn" data-day="${dayKey}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
            <button type="button" class="icon-button minimal-export-btn print-btn" data-day="${dayKey}" title="Imprimir"><i class="fa-solid fa-print"></i></button>
            <button type="button" class="icon-button minimal-export-btn pdf-btn" data-day="${dayKey}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>`;
        this.openModal('detail-modal');
    };

    app.renderAnalises = function(container) {
        if (!container) container = document.getElementById('module-analises');
        if (!container) return;
        const analysisOptions = this.getAnalysisOptions();
        const spend = Object.values(this.getCategoryDataFromLists()).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
        const pantryStats = this.getPantryValidityData();
        const plannerUsage = this.getPlannerMealCountData();
        const plannedCount = Object.values(plannerUsage).reduce((sum, value) => sum + (parseInt(value, 10) || 0), 0);
        const nav = Object.entries(analysisOptions).map(([key, cfg], index) => `
            <button type="button" class="module-nav-item analysis-nav-item ${index === 0 ? 'active' : ''}" data-analysis-key="${key}">
                <strong>${cfg.label}</strong>
                <span>${cfg.note}</span>
            </button>`).join('');
        container.innerHTML = `
            <div class="analysis-luxe-shell">
                <div class="analysis-hero-grid">
                    <div class="analysis-kpi-card"><strong>R$ ${spend.toFixed(2)}</strong><small>gasto mapeado nas listas</small></div>
                    <div class="analysis-kpi-card"><strong>${(this.state.despensa || []).length}</strong><small>itens na despensa</small></div>
                    <div class="analysis-kpi-card"><strong>${pantryStats.vencidos + pantryStats.vencendo}</strong><small>itens que pedem atenção</small></div>
                    <div class="analysis-kpi-card"><strong>${plannedCount}</strong><small>usos de receitas no planejador</small></div>
                </div>
                <div class="master-detail-layout">
                    <div class="md-list-column dashboard-card">
                        <div class="card-header analysis-premium-header">
                            <h3><i class="fa-solid fa-chart-line"></i> Análises</h3>
                            <div class="card-actions">${this.buildChefButton('Analise meus dados alimentares e me dê insights claros, práticos e elegantes sobre gastos, validade e uso de receitas.', 'Chef IA')}</div>
                        </div>
                        <div class="card-content"><div class="module-nav-list analysis-nav-grid">${nav}</div></div>
                    </div>
                    <div class="md-detail-column dashboard-card analysis-preview-panel" id="analises-detail-desktop"></div>
                </div>
            </div>`;
        const firstKey = Object.keys(analysisOptions)[0];
        this.renderAnalysisDetailDesktop(firstKey);
    };

    app.renderAnalysisDetailDesktop = function(analysisKey = 'gastos_categoria') {
        const container = document.getElementById('analises-detail-desktop');
        if (!container) return;
        const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
        container.innerHTML = `
            <div class="card-header analysis-premium-header">
                <h3><i class="${cfg.icon}"></i> ${cfg.label}</h3>
                <div class="card-actions">
                    ${this.buildChefButton(`Analise ${cfg.label} e me dê insights claros, oportunidades de economia e o que devo priorizar.`, 'Chef IA')}
                    <button class="btn btn-secondary change-chart-btn"><i class="fa-solid fa-repeat"></i> Trocar tipo</button>
                </div>
            </div>
            <div class="card-content analysis-premium-content">
                <p class="detail-note analysis-premium-note">${cfg.note}</p>
                <div class="analysis-config-panel">
                    <div class="form-group">
                        <label for="analysis-data-select">Analisar</label>
                        <select id="analysis-data-select">
                            <option value="gastos_categoria">Gastos por Categoria (Listas)</option>
                            <option value="validade_despensa">Itens por Validade (Despensa)</option>
                            <option value="uso_receitas">Receitas Usadas (Planejador)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="analysis-type-select">Tipo de gráfico</label>
                        <select id="analysis-type-select">
                            <option value="pie">Pizza</option>
                            <option value="doughnut">Rosca</option>
                            <option value="bar">Barras</option>
                            <option value="line">Linha</option>
                        </select>
                    </div>
                </div>
                <div class="chart-canvas-container analysis-premium-chart"><canvas id="dynamic-analysis-chart"></canvas></div>
            </div>
            <div class="card-footer module-actions-footer compact-export-row analysis-premium-actions">
                ${this.buildChefButton(`Resuma ${cfg.label} em linguagem simples e me diga a melhor ação agora.`, 'Chef IA', 'chef-glass-btn')}
                <button class="icon-button minimal-export-btn share-btn" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
                <button class="icon-button minimal-export-btn print-btn" title="Imprimir"><i class="fa-solid fa-print"></i></button>
                <button class="icon-button minimal-export-btn pdf-btn" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
            </div>`;
        document.getElementById('analysis-data-select').value = analysisKey;
        document.getElementById('analysis-data-select')?.addEventListener('change', (e) => this.renderAnalysisDetailDesktop(e.target.value));
        document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
        this.updateDynamicChart();
    };

    app.openAnalysisDetailModal = function(analysisKey = 'gastos_categoria') {
        const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
        const titleEl = document.getElementById('detail-modal-title');
        const bodyEl = document.getElementById('detail-modal-body');
        const footerEl = document.getElementById('detail-modal-footer');
        const headerActionsEl = document.getElementById('detail-modal-header-actions');
        titleEl.innerHTML = `<i class="${cfg.icon}"></i> ${cfg.label}`;
        headerActionsEl.innerHTML = this.buildChefButton(`Analise ${cfg.label} e me diga insights acionáveis, elegantes e fáceis de entender.`, 'Chef IA');
        bodyEl.innerHTML = `
            <div class="analysis-premium-modal">
                <p class="detail-note analysis-premium-note">${cfg.note}</p>
                <div class="analysis-config-panel">
                    <div class="form-group">
                        <label for="analysis-data-select">Analisar</label>
                        <select id="analysis-data-select">
                            <option value="gastos_categoria">Gastos por Categoria (Listas)</option>
                            <option value="validade_despensa">Itens por Validade (Despensa)</option>
                            <option value="uso_receitas">Receitas Usadas (Planejador)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="analysis-type-select">Tipo de gráfico</label>
                        <select id="analysis-type-select">
                            <option value="pie">Pizza</option>
                            <option value="doughnut">Rosca</option>
                            <option value="bar">Barras</option>
                            <option value="line">Linha</option>
                        </select>
                    </div>
                </div>
                <div class="chart-canvas-container analysis-premium-chart"><canvas id="dynamic-analysis-chart"></canvas></div>
            </div>`;
        footerEl.className = 'modal-footer detail-modal-footer compact-export-row';
        footerEl.innerHTML = `
            <button class="icon-button minimal-export-btn share-btn" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
            <button class="icon-button minimal-export-btn print-btn" title="Imprimir"><i class="fa-solid fa-print"></i></button>
            <button class="icon-button minimal-export-btn pdf-btn" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>`;
        document.getElementById('analysis-data-select').value = analysisKey;
        document.getElementById('analysis-data-select')?.addEventListener('change', () => this.updateDynamicChart());
        document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
        this.updateDynamicChart();
        this.openModal('detail-modal');
    };

    function installMagnificoCapture() {
        if (document.body.dataset.magnificoCaptureInstalled === 'true') return;
        document.body.dataset.magnificoCaptureInstalled = 'true';
        document.addEventListener('click', function(e) {
            const closest = (sel) => e.target.closest(sel);

            const savedCard = closest('.card--saved-list, .saved-list-item');
            if (savedCard && closest('.delete-list-btn')) {
                const listId = closest('.delete-list-btn').dataset.listId || savedCard.dataset.listId || savedCard.dataset.id;
                if (listId) {
                    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
                    app.handleDeleteListaAtiva(listId);
                }
                return;
            }
            if (savedCard && closest('.select-list-btn')) {
                const listId = closest('.select-list-btn').dataset.listId || savedCard.dataset.listId || savedCard.dataset.id;
                if (listId) {
                    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
                    app.openListEditView(listId);
                }
                return;
            }

            const recipeCard = closest('.card--recipe, .recipe-list-item');
            if (recipeCard && closest('.delete-recipe-btn')) {
                const recipeId = closest('.delete-recipe-btn').dataset.recipeId || recipeCard.dataset.recipeId || recipeCard.dataset.id;
                if (recipeId) {
                    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
                    app.handleDeleteRecipe(recipeId);
                }
                return;
            }
            if (recipeCard && closest('.edit-recipe-btn')) {
                const recipeId = closest('.edit-recipe-btn').dataset.recipeId || recipeCard.dataset.recipeId || recipeCard.dataset.id;
                if (recipeId) {
                    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
                    app.handleOpenRecipeEditModal(recipeId);
                }
                return;
            }

            const itemEl = closest('.placeholder-item[data-id]');
            if (itemEl) {
                const listId = app.getListIdFromItemElement ? app.getListIdFromItemElement(itemEl) : (document.getElementById('active-list-id-input')?.value || app.activeListId);
                const itemName = itemEl.dataset.name || 'este item';
                const isList = !!itemEl.closest('#lista-items-full, #list-view-modal-body');
                const isPantry = !!itemEl.closest('#despensa-list-container');
                if (isList && closest('.delete-btn')) {
                    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
                    app.openConfirmModal('Excluir item', `Deseja excluir "${itemName}" da lista?`, () => app.deleteListItemById(listId, itemEl.dataset.id));
                    return;
                }
                if (isList && closest('.edit-btn')) {
                    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
                    app.startInlineListEdit(itemEl);
                    return;
                }
                if (isPantry && closest('.delete-btn')) {
                    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
                    app.openConfirmModal('Excluir item', `Deseja excluir "${itemName}" da despensa?`, () => app.deletePantryItemById(itemEl.dataset.id));
                    return;
                }
                if (isPantry && closest('.edit-btn')) {
                    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
                    app.handleOpenDespensaEditModal(itemEl);
                    return;
                }
                if (isPantry && !closest('.icon-button, .drag-handle, .item-stock-level')) {
                    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
                    app.handleOpenPantryView(itemEl);
                    return;
                }
            }

            if (closest('[data-pantry-delete-id]')) {
                const itemId = closest('[data-pantry-delete-id]').dataset.pantryDeleteId;
                if (itemId) {
                    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
                    const item = (app.state.despensa || []).find(entry => String(entry.id) === String(itemId));
                    app.openConfirmModal('Excluir item', `Deseja excluir "${item?.name || 'este item'}" da despensa?`, () => app.deletePantryItemById(itemId));
                }
                return;
            }
            if (closest('[data-pantry-edit-id]')) {
                const itemId = closest('[data-pantry-edit-id]').dataset.pantryEditId;
                const itemNode = document.querySelector(`#despensa-list-container .placeholder-item[data-id="${itemId}"]`);
                if (itemNode) {
                    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
                    app.handleOpenDespensaEditModal(itemNode);
                }
                return;
            }

            if (closest('.planner-slot-direct-btn')) {
                const btn = closest('.planner-slot-direct-btn');
                e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
                app.currentPlannerDayTarget = `planner-full-${btn.dataset.day}-${btn.dataset.meal}`;
                app.pendingCustomMeal = null;
                app.populateRecipePicker();
                app.openModal('recipe-picker-modal');
                return;
            }
            if (closest('.planner-custom-meal-launch')) {
                const btn = closest('.planner-custom-meal-launch');
                e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
                app.openPlannerCustomMealModal(btn.dataset.day);
                return;
            }
        }, true);
    }

    requestAnimationFrame(() => {
        installMagnificoCapture();
    });
})();

(() => {
    const originalGetAnalysisOptionsV5 = app.getAnalysisOptions ? app.getAnalysisOptions.bind(app) : null;
    let modalStackSeed = 21000;

    app.getAnalysisOptions = function() {
        const base = originalGetAnalysisOptionsV5 ? originalGetAnalysisOptionsV5() : {};
        return {
            gastos_categoria: { icon: 'fa-solid fa-layer-group', label: 'Gastos por categoria', note: 'Veja onde o orçamento pesa mais dentro das suas listas.' },
            gastos_lista: { icon: 'fa-solid fa-cart-shopping', label: 'Total por lista', note: 'Compara o custo estimado de cada lista criada no painel.' },
            validade_despensa: { icon: 'fa-solid fa-hourglass-half', label: 'Validade da despensa', note: 'Destaca risco de perda, vencidos e itens que merecem prioridade.' },
            estoque_despensa: { icon: 'fa-solid fa-boxes-stacked', label: 'Nível de estoque', note: 'Mostra quais itens estão baixos, médios ou altos em estoque.' },
            uso_receitas: { icon: 'fa-solid fa-utensils', label: 'Uso de receitas', note: 'Revela as receitas mais usadas no seu planejamento.' },
            rotina_semana: { icon: 'fa-solid fa-calendar-days', label: 'Carga da semana', note: 'Analisa quantas refeições foram planejadas por dia da semana.' },
            ...Object.fromEntries(Object.entries(base).filter(([k]) => !['gastos_categoria','validade_despensa','uso_receitas'].includes(k)))
        };
    };

    app.getListTotalsData = function() {
        const data = {};
        Object.entries(this.state.listas || {}).forEach(([id, lista]) => {
            const total = (lista.items || []).reduce((sum, item) => sum + ((parseFloat(item.qtd) || 0) * (parseFloat(item.valor) || 0)), 0);
            data[lista.nome || `Lista ${id}`] = Number(total.toFixed(2));
        });
        return data;
    };

    app.getPantryStockBandsData = function() {
        const bands = { 'Baixo estoque': 0, 'Estoque médio': 0, 'Estoque alto': 0 };
        (this.state.despensa || []).forEach(item => {
            const stock = parseInt(item.stock || 0, 10);
            if (stock <= 25) bands['Baixo estoque'] += 1;
            else if (stock <= 75) bands['Estoque médio'] += 1;
            else bands['Estoque alto'] += 1;
        });
        return bands;
    };

    app.getPlannerWeekLoadData = function() {
        const map = this.getPlannerDaysMap ? this.getPlannerDaysMap() : { seg:'Segunda', ter:'Terça', qua:'Quarta', qui:'Quinta', sex:'Sexta', sab:'Sábado', dom:'Domingo' };
        const data = {};
        Object.entries(map).forEach(([key, label]) => {
            const dayMeals = (this.getPlannerMealsForDay ? this.getPlannerMealsForDay(key) : []) || [];
            data[label] = dayMeals.length;
        });
        return data;
    };

    app.getAnalysisSelectOptionsHTML = function(selectedKey = 'gastos_categoria') {
        return Object.entries(this.getAnalysisOptions()).map(([key, cfg]) => `<option value="${key}" ${key === selectedKey ? 'selected' : ''}>${cfg.label}</option>`).join('');
    };

    app.getChartTypeOptionsHTML = function(selectedKey = 'doughnut') {
        const options = [
            ['doughnut', 'Rosca'],
            ['bar', 'Barras'],
            ['line', 'Linha'],
            ['pie', 'Pizza'],
            ['polarArea', 'Polar'],
            ['radar', 'Radar']
        ];
        return options.map(([key, label]) => `<option value="${key}" ${key === selectedKey ? 'selected' : ''}>${label}</option>`).join('');
    };

    app.openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modalStackSeed += 10;
        let z = modalStackSeed;
        if (modalId === 'ai-chat-modal') z += 80;
        modal.style.zIndex = String(z);
        const box = modal.querySelector('.modal-box');
        if (box) box.style.zIndex = String(z + 1);
        modal.classList.add('is-visible');
        document.body.classList.add('modal-open');
    };

    app.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove('is-visible');
        setTimeout(() => {
            if (!document.querySelector('.modal-overlay.is-visible')) document.body.classList.remove('modal-open');
        }, 10);
    };

    app.buildExportButtons = function(extraAttrs = '') {
        return `
            <button type="button" class="icon-button minimal-export-btn share-btn" ${extraAttrs} title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
            <button type="button" class="icon-button minimal-export-btn print-btn" ${extraAttrs} title="Imprimir"><i class="fa-solid fa-print"></i></button>
            <button type="button" class="icon-button minimal-export-btn pdf-btn" ${extraAttrs} title="PDF"><i class="fa-solid fa-file-pdf"></i></button>`;
    };

    app.openChefFromListHeader = function() {
        const listName = document.getElementById('active-list-name-input')?.value?.trim() || 'Nova lista';
        const prompt = `Quero criar ou melhorar a lista "${listName}". Monte categorias, itens essenciais, quantidades base, substituições econômicas e uma versão mais inteligente da lista.`;
        this.setupChatbotModal?.();
        this.openModal('ai-chat-modal');
        this.prefillChefPrompt(prompt);
    };

    app.renderListaAtiva = function(listId) {
        const container = document.getElementById('lista-items-full');
        const titleEl = document.getElementById('active-list-title');
        const actionsContainer = document.getElementById('active-list-actions');
        const idInput = document.getElementById('active-list-id-input');
        const nameFormInput = document.getElementById('lista-form-nome-full');
        const qtyFormInput = document.getElementById('lista-form-qtd-full');
        const valorFormInput = document.getElementById('lista-form-valor-full');
        if (!container || !titleEl || !actionsContainer || !idInput || !nameFormInput || !qtyFormInput || !valorFormInput) return;

        let itemsHTML = '<p class="empty-list-message">Adicione itens à sua nova lista.</p>';
        let listNameEditable = '';
        let listNamePlaceholder = 'Nome da Lista...';
        let footerHTML = '';
        if (listId === null || listId === undefined || listId === 'new') {
            idInput.value = 'new';
            nameFormInput.value = ''; qtyFormInput.value = '1'; valorFormInput.value = '';
        } else {
            const lista = this.state.listas[listId];
            if (!lista) return;
            idInput.value = listId;
            listNameEditable = lista.nome || '';
            itemsHTML = (lista.items || []).map(item => this.createListaItemHTML(item)).join('') || '<p class="empty-list-message">Esta lista está vazia.</p>';
            footerHTML = `<button type="button" class="icon-button danger" id="lista-delete-btn" title="Excluir lista"><i class="fa-solid fa-trash"></i></button>`;
        }

        titleEl.innerHTML = `
            <span class="list-edit-title-shell">
                <span class="list-name-chip">
                    <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>
                    <input type="text" id="active-list-name-input" value="${this.escapeHtml(listNameEditable)}" placeholder="${listNamePlaceholder}" aria-label="Nome da lista ativa">
                </span>
                <span class="list-title-actions">
                    <button type="button" class="icon-button smart-save-btn" id="lista-save-changes-btn" title="Salvar lista"><i class="fa-solid fa-floppy-disk"></i></button>

                </span>
            </span>`;
        actionsContainer.innerHTML = footerHTML;
        actionsContainer.style.display = footerHTML ? 'flex' : 'none';
        container.innerHTML = itemsHTML;
        this.initSortableItems('lista-items-full');
    };

    app.populateRecipePicker = function() {
        const container = document.getElementById('recipe-picker-list-container');
        if (!container) return;
        const recipes = Object.values(this.state.receitas || {});
        if (!recipes.length) {
            container.innerHTML = `
                <div class="recipe-picker-item">
                    <div class="recipe-picker-copy">
                        <strong>Nenhuma receita ainda</strong>
                        <span>Crie uma receita nova para começar o seu planejamento com estilo.</span>
                    </div>
                    <button type="button" class="recipe-picker-create-btn" data-create-recipe="1"><i class="fa-solid fa-plus"></i><span>Criar nova receita</span></button>
                </div>`;
            return;
        }
        const cards = recipes.map(recipe => `
            <div class="recipe-picker-item">
                <div class="recipe-picker-copy">
                    <strong>${this.escapeHtml(recipe.name)}</strong>
                    <span>${this.escapeHtml(recipe.desc || 'Receita pronta para entrar no planejador.')}</span>
                </div>
                <button type="button" class="btn btn-primary btn-add-recipe" data-recipe-id="${recipe.id}" aria-label="Adicionar ${this.escapeHtml(recipe.name)}">
                    <i class="fa-solid fa-plus"></i><span>Adicionar</span>
                </button>
            </div>`).join('');
        container.innerHTML = `${cards}<button type="button" class="recipe-picker-create-btn" data-create-recipe="1"><i class="fa-solid fa-sparkles"></i><span>Criar nova receita</span></button>`;
        if (!this.boundHandleRecipePickerAdd) this.boundHandleRecipePickerAdd = this.handleRecipePickerAdd.bind(this);
        container.removeEventListener('click', this.boundHandleRecipePickerAdd);
        container.addEventListener('click', this.boundHandleRecipePickerAdd);
    };

    app.renderAnalysisDetailDesktop = function(analysisKey = 'gastos_categoria') {
        const container = document.getElementById('analises-detail-desktop');
        if (!container) return;
        const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
        container.innerHTML = `
            <div class="card-header analysis-premium-header">
                <h3><i class="${cfg.icon}"></i> ${cfg.label}</h3>
                <div class="card-actions">
                    ${this.buildChefButton(`Analise ${cfg.label} e me dê insights claros, práticos e de alto nível.`, 'Chef IA')}
                    <button class="btn btn-secondary change-chart-btn"><i class="fa-solid fa-repeat"></i> Trocar tipo</button>
                </div>
            </div>
            <div class="card-content analysis-premium-content">
                <p class="detail-note analysis-premium-note">${cfg.note}</p>
                <div class="analysis-config-panel">
                    <div class="form-group">
                        <label for="analysis-data-select">Analisar</label>
                        <select id="analysis-data-select">${this.getAnalysisSelectOptionsHTML(analysisKey)}</select>
                    </div>
                    <div class="form-group">
                        <label for="analysis-type-select">Tipo de gráfico</label>
                        <select id="analysis-type-select">${this.getChartTypeOptionsHTML('doughnut')}</select>
                    </div>
                </div>
                <div class="chart-canvas-container analysis-premium-chart"><canvas id="dynamic-analysis-chart"></canvas></div>
            </div>
            <div class="card-footer module-actions-footer compact-export-row analysis-premium-actions">
                ${this.buildChefButton(`Quero uma leitura 360 graus de ${cfg.label}, com riscos, oportunidades e ações recomendadas.`, 'Chef IA', 'chef-glass-btn')}
                ${this.buildExportButtons('data-analysis="1"')}
            </div>`;
        document.getElementById('analysis-data-select')?.addEventListener('change', (e) => this.renderAnalysisDetailDesktop(e.target.value));
        document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
        this.updateDynamicChart();
    };

    app.openAnalysisDetailModal = function(analysisKey = 'gastos_categoria') {
        const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
        const titleEl = document.getElementById('detail-modal-title');
        const bodyEl = document.getElementById('detail-modal-body');
        const footerEl = document.getElementById('detail-modal-footer');
        const headerActionsEl = document.getElementById('detail-modal-header-actions');
        titleEl.innerHTML = `<i class="${cfg.icon}"></i> ${cfg.label}`;
        headerActionsEl.innerHTML = this.buildChefButton(`Faça uma análise 360 graus de ${cfg.label} e proponha ações práticas.`, 'Chef IA');
        bodyEl.innerHTML = `
            <div class="analysis-premium-modal">
                <p class="detail-note analysis-premium-note">${cfg.note}</p>
                <div class="analysis-config-panel">
                    <div class="form-group"><label for="analysis-data-select">Analisar</label><select id="analysis-data-select">${this.getAnalysisSelectOptionsHTML(analysisKey)}</select></div>
                    <div class="form-group"><label for="analysis-type-select">Tipo de gráfico</label><select id="analysis-type-select">${this.getChartTypeOptionsHTML('doughnut')}</select></div>
                </div>
                <div class="chart-canvas-container analysis-premium-chart"><canvas id="dynamic-analysis-chart"></canvas></div>
            </div>`;
        footerEl.className = 'modal-footer detail-modal-footer compact-export-row';
        footerEl.innerHTML = `${this.buildChefButton(`Resuma ${cfg.label} para mim como um consultor premium.`, 'Chef IA', 'chef-glass-btn')}${this.buildExportButtons('data-analysis="1"')}`;
        document.getElementById('analysis-data-select')?.addEventListener('change', () => this.updateDynamicChart());
        document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
        this.updateDynamicChart();
        this.openModal('detail-modal');
    };

    app.updateDynamicChart = function() {
        const dataType = document.getElementById('analysis-data-select')?.value || 'gastos_categoria';
        const chartType = document.getElementById('analysis-type-select')?.value || 'doughnut';
        let labels = [];
        let values = [];
        let title = '';
        let datasetLabel = '';
        let onClick = null;

        if (dataType === 'gastos_categoria') {
            const data = this.getCategoryDataFromLists();
            labels = Object.keys(data); values = Object.values(data); title = 'Gastos por categoria'; datasetLabel = 'R$ por categoria';
            onClick = (label, value) => this.showChartDetail_Categorias(label, value);
        } else if (dataType === 'gastos_lista') {
            const data = this.getListTotalsData();
            labels = Object.keys(data); values = Object.values(data); title = 'Total por lista'; datasetLabel = 'R$ por lista';
            onClick = (label, value) => this.showInfoModal(`Lista: ${label}`, `<p>Total estimado: <strong>R$ ${Number(value || 0).toFixed(2)}</strong>.</p>`);
        } else if (dataType === 'validade_despensa') {
            const data = this.getPantryValidityData();
            labels = ['Vencidos', 'Vence em 7 dias', 'Itens OK']; values = [data.vencidos, data.vencendo, data.ok]; title = 'Validade da despensa'; datasetLabel = 'Itens por status';
            onClick = (label, value, index) => { const key = ['vencidos', 'vencendo', 'ok'][index]; this.showChartDetail_Validade(key, label, value); };
        } else if (dataType === 'estoque_despensa') {
            const data = this.getPantryStockBandsData();
            labels = Object.keys(data); values = Object.values(data); title = 'Nível de estoque'; datasetLabel = 'Itens por faixa';
            onClick = (label, value) => this.showInfoModal(`Estoque: ${label}`, `<p>Você tem <strong>${value}</strong> item(ns) na faixa <strong>${label}</strong>.</p>`);
        } else if (dataType === 'uso_receitas') {
            const data = this.getPlannerMealCountData();
            labels = Object.keys(data); values = Object.values(data); title = 'Uso de receitas'; datasetLabel = 'Nº de usos';
            onClick = (label, value) => this.showInfoModal(`Receita: ${label}`, `<p>A receita <strong>${label}</strong> apareceu <strong>${value}</strong> vez(es)</p>`);
        } else if (dataType === 'rotina_semana') {
            const data = this.getPlannerWeekLoadData();
            labels = Object.keys(data); values = Object.values(data); title = 'Carga da semana'; datasetLabel = 'Refeições por dia';
            onClick = (label, value) => this.showInfoModal(`Dia: ${label}`, `<p>Você tem <strong>${value}</strong> refeição(ões) planejada(s) para ${label}.</p>`);
        }

        if (!labels.length) { labels = ['Sem dados']; values = [1]; datasetLabel = 'Sem dados'; }
        const ctx = document.getElementById('dynamic-analysis-chart')?.getContext('2d');
        if (!ctx || typeof Chart === 'undefined') return;
        const baseColors = ['rgba(0, 242, 234, 0.88)','rgba(84, 157, 255, 0.88)','rgba(255, 108, 108, 0.88)','rgba(255, 205, 86, 0.88)','rgba(156, 118, 255, 0.88)','rgba(92, 255, 162, 0.88)','rgba(224,224,224,0.88)'];
        const borderColors = ['rgba(0, 242, 234, 1)','rgba(84, 157, 255, 1)','rgba(255, 108, 108, 1)','rgba(255, 205, 86, 1)','rgba(156, 118, 255, 1)','rgba(92, 255, 162, 1)','rgba(240,240,240,1)'];
        this.charts.dynamicChart?.destroy();
        const scales = (chartType === 'bar' || chartType === 'line') ? {
            y: { beginAtZero: true, ticks: { color: '#cfd6e4' }, grid: { color: 'rgba(255,255,255,.08)' } },
            x: { ticks: { color: '#ffffff' }, grid: { color: 'transparent' } }
        } : (chartType === 'radar' ? {
            r: { angleLines: { color: 'rgba(255,255,255,.08)' }, grid: { color: 'rgba(255,255,255,.08)' }, pointLabels: { color: '#ffffff' }, ticks: { color: '#cfd6e4', backdropColor: 'transparent' } }
        } : {});
        this.charts.dynamicChart = new Chart(ctx, {
            type: chartType,
            data: {
                labels,
                datasets: [{
                    label: datasetLabel,
                    data: values,
                    backgroundColor: baseColors,
                    borderColor: borderColors,
                    borderWidth: 1.5,
                    fill: chartType === 'radar'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#f5f7fb' } },
                    title: { display: true, text: title, color: '#ffffff', font: { size: 16, weight: '700' } }
                },
                scales,
                onClick: (evt, elements) => {
                    if (!elements.length || !onClick) return;
                    const idx = elements[0].index;
                    onClick(labels[idx], values[idx], idx);
                }
            }
        });
    };

    window.addEventListener('click', function(e) {
        const closest = (sel) => e.target.closest(sel);

        if (closest('.open-chef-list-btn')) {
            e.preventDefault(); e.stopPropagation();
            app.openChefFromListHeader();
            return;
        }
        if (closest('#lista-delete-btn')) {
            const listId = document.getElementById('active-list-id-input')?.value || app.activeListId;
            const listName = app.state.listas?.[listId]?.nome || 'esta lista';
            e.preventDefault(); e.stopPropagation();
            app.openConfirmModal('Excluir lista', `Deseja excluir "${listName}"?`, () => app.handleDeleteListaAtiva(listId));
            return;
        }
        if (closest('#lista-items-full .delete-btn') || closest('#list-view-modal-body .delete-btn')) {
            const itemEl = closest('.placeholder-item[data-id]');
            const listId = app.getListIdFromItemElement ? app.getListIdFromItemElement(itemEl) : (document.getElementById('active-list-id-input')?.value || app.activeListId);
            const itemName = itemEl?.dataset?.name || 'este item';
            if (itemEl && listId) {
                e.preventDefault(); e.stopPropagation();
                app.openConfirmModal('Excluir item', `Deseja excluir "${itemName}" da lista?`, () => app.deleteListItemById(listId, itemEl.dataset.id));
                return;
            }
        }
        if (closest('#despensa-list-container .delete-btn') || closest('[data-pantry-delete-id]')) {
            const itemId = closest('[data-pantry-delete-id]')?.dataset?.pantryDeleteId || closest('.placeholder-item[data-id]')?.dataset?.id;
            const item = (app.state.despensa || []).find(entry => String(entry.id) === String(itemId));
            if (itemId) {
                e.preventDefault(); e.stopPropagation();
                app.openConfirmModal('Excluir item', `Deseja excluir "${item?.name || 'este item'}" da despensa?`, () => app.deletePantryItemById(itemId));
                return;
            }
        }
        if (closest('.planner-slot-direct-btn')) {
            const btn = closest('.planner-slot-direct-btn');
            e.preventDefault(); e.stopPropagation();
            app.closeModal('detail-modal');
            setTimeout(() => {
                app.currentPlannerDayTarget = `planner-full-${btn.dataset.day}-${btn.dataset.meal}`;
                app.pendingCustomMeal = null;
                app.populateRecipePicker();
                app.openModal('recipe-picker-modal');
            }, 40);
            return;
        }
        if (closest('#detail-modal .add-meal-btn')) {
            const btn = closest('#detail-modal .add-meal-btn');
            e.preventDefault(); e.stopPropagation();
            app.closeModal('detail-modal');
            setTimeout(() => {
                app.currentPlannerDayTarget = btn.dataset.dayTarget || btn.dataset.day || 'seg';
                app.populateRecipePicker();
                app.openModal('recipe-picker-modal');
            }, 40);
            return;
        }
        if (closest('.planner-custom-meal-launch')) {
            const btn = closest('.planner-custom-meal-launch');
            e.preventDefault(); e.stopPropagation();
            app.closeModal('detail-modal');
            setTimeout(() => app.openPlannerCustomMealModal(btn.dataset.day), 40);
            return;
        }
        if (closest('[data-create-recipe="1"]')) {
            e.preventDefault(); e.stopPropagation();
            app.closeModal('recipe-picker-modal');
            setTimeout(() => {
                app.openListNameModal({
                    title: 'Nova Receita',
                    placeholder: 'Digite o nome da receita',
                    confirmText: 'Continuar',
                    onConfirm: (recipeName) => app.handleOpenRecipeEditModal(null, { initialName: recipeName })
                });
            }, 40);
            return;
        }
    }, true);
})();

window.app = app;

    app.init();
    app.installMandatoryPatches();

});

(() => {
  if (!window.app) return;
  const app = window.app;
  const unitOptions = ['un','kg','g','L','ml','pct','cx'];
  let afFinalPatchBound = false;

  app.getChefIACapabilitiesText = function() {
    return '';
  };

  app.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (!this.__modalStackSeed) this.__modalStackSeed = 30000;
    this.__modalStackSeed += 10;
    let z = this.__modalStackSeed;
    if (modalId === 'custom-confirm-modal') z = 41000;
    if (modalId === 'recipe-picker-modal') z = Math.max(z, 39500);
    if (modalId === 'ai-chat-modal') z = Math.max(z, 40500);
    if (modalId === 'detail-modal' || modalId === 'recipe-detail-modal' || modalId === 'list-view-modal' || modalId === 'pantry-view-modal') z = Math.max(z, 38000);
    modal.style.zIndex = String(z);
    const box = modal.querySelector('.modal-box');
    if (box) box.style.zIndex = String(z + 1);
    modal.classList.add('is-visible');
    document.body.classList.add('modal-open');
  };

  app.refreshPlannerViews = function(dayKey = null) {
    this.saveState();
    this.renderPlannerWidget?.();
    if (this.activeModule === 'planejador') this.renderPlanejador();
    if (dayKey && document.getElementById('detail-modal')?.classList.contains('is-visible')) this.openPlannerDayDetailModal(dayKey);
  };

  app.executeClearPlannerDay = function(data = {}) {
    const day = data.day;
    if (!day) return;
    if (this.state.planejador[day]) delete this.state.planejador[day];
    this.refreshPlannerViews(day);
    this.showNotification(`Planejamento de ${this.getPlannerDaysMap()[day] || day} limpo.`, 'info');
  };

  app.executeClearPlannerWeek = function() {
    this.state.planejador = {};
    this.refreshPlannerViews();
    this.closeModal('detail-modal');
    this.showNotification('Semana limpa com sucesso.', 'info');
  };

  app.renderListaAtiva = function(listId) {
    const container = document.getElementById('lista-items-full');
    const titleEl = document.getElementById('active-list-title');
    const actionsContainer = document.getElementById('active-list-actions');
    const idInput = document.getElementById('active-list-id-input');
    const nameFormInput = document.getElementById('lista-form-nome-full');
    const qtyFormInput = document.getElementById('lista-form-qtd-full');
    const valorFormInput = document.getElementById('lista-form-valor-full');
    if (!container || !titleEl || !actionsContainer || !idInput || !nameFormInput || !qtyFormInput || !valorFormInput) return;

    let itemsHTML = '<p class="empty-list-message">Adicione itens à sua nova lista.</p>';
    let listNameEditable = '';
    if (listId === null || listId === undefined || listId === 'new') {
      idInput.value = 'new';
      nameFormInput.value = '';
      qtyFormInput.value = '1';
      valorFormInput.value = '';
    } else {
      const lista = this.state.listas[listId];
      if (!lista) return;
      idInput.value = listId;
      listNameEditable = lista.nome || '';
      itemsHTML = (lista.items || []).map(item => this.createListaItemHTML(item)).join('') || '<p class="empty-list-message">Esta lista está vazia.</p>';
    }

    titleEl.innerHTML = `
      <span class="list-edit-title-shell">
        <span class="list-name-chip">
          <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>
          <input type="text" id="active-list-name-input" value="${this.escapeHtml(listNameEditable)}" placeholder="Nome da Lista..." aria-label="Nome da lista ativa">
        </span>
        <span class="list-title-actions">
          <button type="button" class="icon-button smart-save-btn" id="lista-save-changes-btn" title="Salvar lista"><i class="fa-solid fa-floppy-disk"></i></button>

        </span>
      </span>`;
    actionsContainer.innerHTML = '';
    actionsContainer.style.display = 'none';
    container.innerHTML = itemsHTML;
    this.initSortableItems?.('lista-items-full');
  };

  app.handleOpenRecipeEditModal = function(recipeId, options = {}) {
    const isEditing = recipeId !== null && recipeId !== undefined && !!this.state.receitas[recipeId];
    const recipe = isEditing ? this.state.receitas[recipeId] : null;
    if (recipeId && !recipe) { this.showNotification('Receita não encontrada.', 'error'); return; }
    if (!isEditing && this.userPlan === 'free' && Object.keys(this.state.receitas || {}).length >= 5) {
      this.showPlansModal('Limite de 5 receitas atingido no plano Gratuito. Faça upgrade para receitas ilimitadas!');
      return;
    }
    this.closeModal('recipe-detail-modal');
    this.tempRecipeIngredients = recipe?.ingredients ? JSON.parse(JSON.stringify(recipe.ingredients)) : [];
    const recipeName = options.initialName || recipe?.name || '';
    const title = isEditing ? `Editar "${recipe.name}"` : 'Criar Nova Receita';
    const contentText = (recipe?.content || '')
      .replace(/<h4>Ingredientes<\/h4>/gi, '')
      .replace(/<ul>[\s\S]*?<\/ul>/i, '')
      .replace(/<h4>Preparo<\/h4>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();

    const content = `
      <form id="recipe-edit-form" onsubmit="return false;">
        <input type="hidden" id="recipe-edit-id" value="${isEditing ? recipeId : ''}">
        <div class="form-group"><label for="recipe-edit-name">Nome da Receita</label><input type="text" id="recipe-edit-name" value="${this.escapeHtml(recipeName)}" required></div>
        <div class="form-group"><label for="recipe-edit-desc">Descrição Curta</label><input type="text" id="recipe-edit-desc" value="${this.escapeHtml(recipe?.desc || '')}"></div>
        <hr class="divider">
        <label style="display:block; font-size:.9rem; font-weight:600; margin-bottom:.55rem;">Ingredientes</label>
        <div id="recipe-ing-form" class="add-item-form-container" style="padding:0; border:none; background:rgba(0,0,0,.18); border-radius:16px; margin-bottom:1rem;">
          <div class="add-item-form" style="padding:.8rem;">
            <div class="form-group form-group-flex"><label for="recipe-ing-name">Nome</label><input type="text" id="recipe-ing-name" placeholder="Ex: Arroz"></div>
            <div class="form-group form-group-small"><label for="recipe-ing-qtd">Qtd</label><input type="text" id="recipe-ing-qtd" value="1"></div>
            <div class="form-group form-group-small"><label for="recipe-ing-unid">Unid</label><select id="recipe-ing-unid">${['un','kg','g','L','ml','pct','cx','xícara','colher','pitada','dentes','a gosto','fio'].map(u => `<option value="${u}">${u}</option>`).join('')}</select></div>
            <button type="button" class="btn-add-item" id="recipe-add-ing-btn" aria-label="Adicionar ingrediente"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
        <div id="recipe-ingredients-list"></div>
        <hr class="divider">
        <div class="form-group"><label for="recipe-edit-content">Modo de Preparo</label><textarea id="recipe-edit-content" rows="6">${this.escapeHtml(contentText)}</textarea></div>
      </form>`;

    this.openConfirmModal(title, content, () => this.handleSaveRecipe());
    const modal = document.getElementById('custom-confirm-modal');
    if (!modal) return;
    modal.classList.add('recipe-editor-modal');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    if (okBtn) okBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar';
    if (cancelBtn) cancelBtn.textContent = 'Cancelar';

    const footer = modal.querySelector('.modal-footer');
    footer?.querySelector('#recipe-editor-delete-btn')?.remove();
    if (isEditing && footer) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.id = 'recipe-editor-delete-btn';
      delBtn.className = 'btn btn-danger';
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Excluir';
      delBtn.addEventListener('click', () => {
        this.closeModal('custom-confirm-modal');
        this.handleDeleteRecipe(recipeId);
      }, { once: true });
      footer.insertBefore(delBtn, okBtn || null);
    }

    this.renderModalIngredientList?.();
    const addIngBtn = modal.querySelector('#recipe-add-ing-btn');
    const listWrap = modal.querySelector('#recipe-ingredients-list');
    const formWrap = modal.querySelector('#recipe-ing-form');
    addIngBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      const nameInput = formWrap.querySelector('#recipe-ing-name');
      const qtdInput = formWrap.querySelector('#recipe-ing-qtd');
      const unidSelect = formWrap.querySelector('#recipe-ing-unid');
      const name = nameInput.value.trim();
      if (!name) return;
      this.tempRecipeIngredients.push({ name, qty: qtdInput.value.trim() || '1', unit: unidSelect.value || 'un' });
      this.renderModalIngredientList?.();
      nameInput.value = '';
      qtdInput.value = '1';
      unidSelect.value = 'un';
      nameInput.focus();
    });
    listWrap?.addEventListener('click', (e) => {
      const itemEl = e.target.closest('.recipe-ing-item');
      if (!itemEl) return;
      const index = parseInt(itemEl.dataset.index || '-1', 10);
      const ingredient = this.tempRecipeIngredients[index];
      if (!ingredient) return;
      if (e.target.closest('.delete-ing-btn')) {
        this.tempRecipeIngredients.splice(index, 1);
        this.renderModalIngredientList?.();
      } else if (e.target.closest('.edit-ing-btn')) {
        formWrap.querySelector('#recipe-ing-name').value = ingredient.name;
        formWrap.querySelector('#recipe-ing-qtd').value = ingredient.qty;
        formWrap.querySelector('#recipe-ing-unid').value = ingredient.unit;
        this.tempRecipeIngredients.splice(index, 1);
        this.renderModalIngredientList?.();
        formWrap.querySelector('#recipe-ing-name').focus();
      }
    });
  };

  app.handleDeleteRecipe = function(recipeId) {
    const recipeName = this.state.receitas?.[recipeId]?.name || 'Receita';
    this.openConfirmModal('Excluir Receita', `Deseja excluir "${recipeName}"?`, () => {
      if (!this.state.receitas?.[recipeId]) return;
      delete this.state.receitas[recipeId];
      Object.keys(this.state.planejador || {}).forEach(day => {
        const dayState = this.state.planejador[day] || {};
        ['cafe','almoco','jantar'].forEach(slot => {
          const slotData = dayState[slot];
          if (slotData && String(slotData.recipeId || slotData.id) === String(recipeId)) delete dayState[slot];
        });
        if (Array.isArray(dayState.extras)) dayState.extras = dayState.extras.filter(extra => String(extra.recipeId || extra.id) !== String(recipeId));
      });
      this.saveState();
      if (this.activeModule === 'receitas') this.renderReceitas();
      this.renderPlannerWidget?.();
      this.closeModal('recipe-detail-modal');
      this.showNotification(`Receita "${recipeName}" excluída.`, 'info');
    });
  };

  app.handleDeleteMeal = function(day, meal) {
    const dayState = this.state.planejador[day] || {};
    const isExtra = String(meal).startsWith('extra:');
    const mealKey = isExtra ? String(meal).replace('extra:', '') : meal;
    const mealData = isExtra ? (dayState.extras || []).find(extra => String(extra.key) === mealKey) : dayState[mealKey];
    if (!mealData) return;
    this.openConfirmModal('Remover Refeição', `Deseja remover "${mealData.name}" do planejamento?`, () => {
      if (isExtra) dayState.extras = (dayState.extras || []).filter(extra => String(extra.key) !== mealKey);
      else delete dayState[mealKey];
      this.refreshPlannerViews(day);
      this.showNotification('Refeição removida.', 'info');
    });
  };

  app.handleToggleCompleteMeal = function(day, meal) {
    const dayState = this.state.planejador[day] || {};
    const isExtra = String(meal).startsWith('extra:');
    const mealKey = isExtra ? String(meal).replace('extra:', '') : meal;
    const mealData = isExtra ? (dayState.extras || []).find(extra => String(extra.key) === mealKey) : dayState[mealKey];
    if (!mealData) return;
    mealData.completed = !mealData.completed;
    this.refreshPlannerViews(day);
  };

  app.handleGenerateListFromPlanner = function(dayKey = null) {
    const daysSource = dayKey ? { [dayKey]: this.state.planejador?.[dayKey] || {} } : (this.state.planejador || {});
    const ingredientMap = new Map();
    const addIngredient = (ing) => {
      if (!ing?.name) return;
      const key = `${String(ing.name).trim().toLowerCase()}|${String(ing.unit || 'un').toLowerCase()}`;
      const current = ingredientMap.get(key) || { id: this.generateId(), name: ing.name, qtd: 0, unid: ing.unit || 'un', valor: 0, checked: false };
      const qty = parseFloat(ing.qty || ing.quantity || 1) || 1;
      current.qtd = Number((current.qtd + qty).toFixed(2));
      ingredientMap.set(key, current);
    };
    Object.values(daysSource).forEach(dayState => {
      if (!dayState || typeof dayState !== 'object') return;
      ['cafe','almoco','jantar'].forEach(slot => {
        const ref = dayState[slot];
        const recipe = ref ? this.state.receitas?.[ref.recipeId || ref.id] : null;
        (recipe?.ingredients || []).forEach(addIngredient);
      });
      (dayState.extras || []).forEach(extra => {
        const recipe = this.state.receitas?.[extra.recipeId || extra.id];
        (recipe?.ingredients || []).forEach(addIngredient);
      });
    });
    if (!ingredientMap.size) {
      this.showNotification('Seu planejador está vazio ou as receitas não têm ingredientes.', 'info');
      return;
    }
    const newListId = this.generateId();
    const listName = dayKey ? `Lista ${this.getPlannerDaysMap()[dayKey] || 'do dia'}` : 'Lista do Planejamento';
    this.state.listas[newListId] = {
      nome: listName,
      createdAt: new Date().toISOString(),
      items: Array.from(ingredientMap.values())
    };
    this.activeListId = newListId;
    this.saveState();
    this.renderListasSalvas?.();
    this.renderListaWidget?.();
    this.renderOrcamento?.();
    this.showNotification(`Lista "${listName}" criada com ${ingredientMap.size} ingrediente(s).`, 'success');
    this.closeModal('detail-modal');
    this.activateModuleAndRender?.('lista');
    setTimeout(() => {
      document.getElementById('list-manager')?.classList.add('view-active-list');
      this.renderListaAtiva?.(newListId);
    }, 80);
  };

  app.handleOpenPantryView = function(itemEl) {
    const id = itemEl?.dataset?.id;
    const item = (this.state.despensa || []).find(i => String(i.id) === String(id));
    if (!item) return;
    const titleEl = document.getElementById('pantry-view-title');
    const bodyEl = document.getElementById('pantry-view-body');
    const footerEl = document.getElementById('pantry-view-footer');
    if (!titleEl || !bodyEl || !footerEl) return;
    const stock = Math.max(0, Math.min(100, parseInt(item.stock || 0, 10)));
    const validade = item.validade ? item.validade.split('-').reverse().join('/') : 'Não informada';
    const stockBars = Array.from({length: 4}, (_, i) => `<div class="card__stock-bar ${i < Math.max(1, Math.round(stock / 25)) ? 'active' : ''}"></div>`).join('');
    const chefPrompt = `Analise o item ${item.name}. Quero conservação, uso ideal, combinação culinária, valor nutricional estimado e alerta de validade, deixando claro o que for estimativa.`;
    titleEl.textContent = item.name;
    bodyEl.innerHTML = `
      <div class="pantry-view-readonly pantry-luxury-view">
        <div class="detail-kpi-grid">
          <div class="detail-kpi"><strong>${this.escapeHtml(item.name)}</strong><span>Item salvo</span></div>
          <div class="detail-kpi"><strong>${item.qtd}</strong><span>Quantidade</span></div>
          <div class="detail-kpi"><strong>${this.escapeHtml(item.unid || 'un')}</strong><span>Unidade</span></div>
          <div class="detail-kpi"><strong>R$ ${parseFloat(item.valor || 0).toFixed(2)}</strong><span>Valor unitário</span></div>
        </div>
        <div class="detail-stack">
          <div class="detail-listing-item"><div><strong>Validade</strong><p class="detail-note">${validade}</p></div></div>
          <div class="detail-listing-item"><div><strong>Nível de estoque</strong><p class="detail-note">${stock}% disponível</p></div><div class="card__stock pantry-stock-inline">${stockBars}</div></div>
          <div class="detail-listing-item"><div><strong>Informações nutricionais</strong><p class="detail-note">Estimativa visual: energia, macronutrientes e sugestões de uso podem ser avaliadas com base no tipo do produto.</p></div></div>
        </div>
        <div class="pantry-ai-card">${this.buildChefButton(chefPrompt, 'Conferir com Chef IA')}</div>
      </div>`;
    footerEl.innerHTML = this.buildExportButtons(`data-item-id="${item.id}"`);
    this.openModal('pantry-view-modal');
  };

  app.renderPlanejador = function(container) {
    if (!container) container = document.getElementById('module-planejador');
    if (!container) return;
    const days = this.getPlannerDaysMap();
    const cards = Object.entries(days).map(([dayKey, dayLabel]) => {
      const meals = this.getPlannerMealsForDay(dayKey);
      const preview = meals.length
        ? meals.slice(0, 3).map(meal => `<div class="planner-mini-meal ${meal.completed ? 'is-complete' : ''}"><small>${this.escapeHtml(meal.mealLabel)}</small><strong>${this.escapeHtml(meal.name)}</strong></div>`).join('')
        : '<div class="planner-mini-empty">Nenhuma refeição planejada.</div>';
      return `
        <article class="planner-day-card" data-day="${dayKey}">
          <div class="planner-day-header">
            <div class="planner-day-copy"><strong>${dayLabel}</strong><span>${meals.length ? `${meals.length} refeição(ões)` : 'Pronto para planejar'}</span></div>
            <div class="planner-day-actions">
              <button type="button" class="icon-button day-clear-btn" data-day="${dayKey}" title="Limpar dia"><i class="fa-solid fa-eraser"></i></button>
              <button type="button" class="icon-button add-meal-btn" data-day-target="${dayKey}" title="Inserir refeição"><i class="fa-solid fa-plus"></i></button>
            </div>
          </div>
          <div class="planner-preview-list">${preview}</div>
        </article>`;
    }).join('');
    container.innerHTML = `
      <div class="dashboard-card planner-shell planner-shell--ultra">
        <div class="card-header">
          <h3><i class="fa-solid fa-calendar-week"></i> Planejador</h3>
          <div class="card-actions">
            ${this.buildChefButton('Monte um planejamento alimentar bonito, econômico, inteligente e totalmente adaptado à minha rotina.', 'Chef IA')}
            <button class="icon-button clear-plan-btn" title="Limpar tudo"><i class="fa-solid fa-eraser"></i></button>
          </div>
        </div>
        <div class="card-content"><div class="planner-grid">${cards}</div></div>
        <div class="card-footer module-actions-footer compact-export-row">${this.buildExportButtons('data-planner="1"')}</div>
      </div>`;
  };

  app.openPlannerDayDetailModal = function(dayKey) {
    const titleEl = document.getElementById('detail-modal-title');
    const bodyEl = document.getElementById('detail-modal-body');
    const footerEl = document.getElementById('detail-modal-footer');
    const headerActionsEl = document.getElementById('detail-modal-header-actions');
    const dayLabel = this.getPlannerDaysMap()[dayKey] || 'Dia';
    const dayMeals = this.state.planejador[dayKey] || {};
    const standardSlots = [
      { key: 'cafe', label: 'Café da Manhã', icon: 'fa-solid fa-mug-saucer' },
      { key: 'almoco', label: 'Almoço', icon: 'fa-solid fa-bowl-food' },
      { key: 'jantar', label: 'Jantar', icon: 'fa-solid fa-utensils' }
    ];
    const slotCards = standardSlots.map(slot => {
      const meal = dayMeals[slot.key];
      if (!meal) {
        return `
          <article class="planner-slot-card planner-slot-empty" data-day="${dayKey}" data-meal="${slot.key}">
            <div class="planner-slot-head"><div class="planner-slot-title"><small>${slot.label}</small><strong>Sem receita definida</strong></div><i class="${slot.icon}" style="opacity:.72"></i></div>
            <div class="planner-slot-body"><p>Escolha uma receita para deixar o seu ${slot.label.toLowerCase()} organizado e bonito.</p></div>
            <div class="planner-slot-actions"><button type="button" class="icon-button planner-slot-direct-btn" data-day="${dayKey}" data-meal="${slot.key}" title="Escolher receita"><i class="fa-solid fa-plus"></i></button></div>
          </article>`;
      }
      const recipeId = meal.recipeId || meal.id || '';
      return `
        <article class="planner-slot-card ${meal.completed ? 'completed' : ''} planner-meal-item" data-day="${dayKey}" data-meal="${slot.key}" data-recipe-id="${recipeId}">
          <div class="planner-slot-head">
            <div class="planner-slot-title"><small>${slot.label}</small><strong>${this.escapeHtml(meal.name || 'Refeição')}</strong>${meal.time ? `<span class="planner-slot-time">${this.escapeHtml(meal.time)}</span>` : ''}</div>
            <i class="${slot.icon}" style="opacity:.78"></i>
          </div>
          <div class="planner-slot-body"><p>${meal.completed ? 'Marcada como usada. Ótimo para acompanhar sua rotina.' : 'Use os botões ao lado para visualizar, concluir ou remover.'}</p></div>
          <div class="planner-slot-actions meal-item-actions">
            <button type="button" class="icon-button meal-delete-btn" title="Remover"><i class="fa-solid fa-trash"></i></button>
            <button type="button" class="icon-button meal-view-btn" title="Ver receita"><i class="fa-solid fa-eye"></i></button>
            <button type="button" class="icon-button meal-complete-btn ${meal.completed ? 'is-complete' : ''}" title="Marcar como usado"><i class="fa-solid fa-check"></i></button>
          </div>
        </article>`;
    }).join('');

    const extras = (dayMeals.extras || []).map(extra => {
      const recipeId = extra.recipeId || extra.id || '';
      return `
        <article class="planner-slot-card planner-meal-item ${extra.completed ? 'completed' : ''}" data-day="${dayKey}" data-meal="extra:${extra.key}" data-recipe-id="${recipeId}">
          <div class="planner-slot-head"><div class="planner-slot-title"><small>${this.escapeHtml(extra.mealLabel || 'Refeição extra')}</small><strong>${this.escapeHtml(extra.name || 'Receita')}</strong>${extra.time ? `<span class="planner-slot-time">${this.escapeHtml(extra.time)}</span>` : ''}</div><i class="fa-solid fa-star" style="opacity:.78"></i></div>
          <div class="planner-slot-body"><p>Refeição personalizada adicionada ao seu dia.</p></div>
          <div class="planner-slot-actions meal-item-actions">
            <button type="button" class="icon-button meal-delete-btn" title="Remover"><i class="fa-solid fa-trash"></i></button>
            <button type="button" class="icon-button meal-view-btn" title="Ver receita"><i class="fa-solid fa-eye"></i></button>
            <button type="button" class="icon-button meal-complete-btn ${extra.completed ? 'is-complete' : ''}" title="Marcar como usado"><i class="fa-solid fa-check"></i></button>
          </div>
        </article>`;
    }).join('');

    titleEl.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ${dayLabel}`;
    headerActionsEl.innerHTML = `<button class="icon-button add-meal-btn" data-day-target="${dayKey}" title="Inserir refeição"><i class="fa-solid fa-plus"></i></button>`;
    bodyEl.innerHTML = `
      <div class="planner-day-detail-shell">
        <div class="detail-kpi-grid">
          <div class="detail-kpi"><strong>${this.getPlannerMealsForDay(dayKey).length}</strong><span>refeições no dia</span></div>
          <div class="detail-kpi"><strong>${this.getPlannerMealsForDay(dayKey).filter(meal => meal.completed).length}</strong><span>marcadas como usadas</span></div>
        </div>
        <div class="planner-slot-grid">${slotCards}${extras}
          <article class="planner-slot-card planner-slot-add-card">
            <div class="planner-slot-head"><div class="planner-slot-title"><small>Personalizado</small><strong>Adicionar refeição</strong></div><i class="fa-solid fa-sparkles" style="opacity:.78"></i></div>
            <div class="planner-slot-body"><p>Crie uma refeição com nome e horário personalizados e escolha a receita depois.</p></div>
            <div class="planner-slot-actions"><button type="button" class="icon-button planner-custom-meal-launch" data-day="${dayKey}" title="Criar refeição"><i class="fa-solid fa-plus"></i></button></div>
          </article>
        </div>
      </div>`;
    footerEl.className = 'modal-footer detail-modal-footer compact-export-row';
    footerEl.innerHTML = `${this.buildExportButtons(`data-day="${dayKey}"`)}`;
    this.openModal('detail-modal');
  };

  app.renderAnalises = function(container) {
    if (!container) container = document.getElementById('module-analises');
    if (!container) return;
    const analysisOptions = this.getAnalysisOptions();
    const spend = Object.values(this.getCategoryDataFromLists()).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
    const pantryStats = this.getPantryValidityData();
    const plannerUsage = this.getPlannerMealCountData ? this.getPlannerMealCountData() : {};
    const plannedCount = Object.values(plannerUsage).reduce((sum, value) => sum + (parseInt(value, 10) || 0), 0);
    const nav = Object.entries(analysisOptions).map(([key, cfg], index) => `
      <button type="button" class="module-nav-item analysis-nav-item ${index === 0 ? 'active' : ''}" data-analysis-key="${key}">
        <strong>${cfg.label}</strong>
        <span>${cfg.note}</span>
      </button>`).join('');
    container.innerHTML = `
      <div class="analysis-luxe-shell">
        <div class="analysis-hero-grid">
          <div class="analysis-kpi-card"><strong>R$ ${spend.toFixed(2)}</strong><small>gasto mapeado nas listas</small></div>
          <div class="analysis-kpi-card"><strong>${(this.state.despensa || []).length}</strong><small>itens na despensa</small></div>
          <div class="analysis-kpi-card"><strong>${pantryStats.vencidos + pantryStats.vencendo}</strong><small>itens que pedem atenção</small></div>
          <div class="analysis-kpi-card"><strong>${plannedCount}</strong><small>usos no planejador</small></div>
        </div>
        <div class="master-detail-layout">
          <div class="md-list-column dashboard-card">
            <div class="card-header analysis-premium-header"><h3><i class="fa-solid fa-chart-line"></i> Análises</h3><div class="card-actions">${this.buildChefButton('Faça uma análise 360 graus dos meus dados alimentares, com riscos, oportunidades e prioridades práticas.', 'Chef IA')}</div></div>
            <div class="card-content"><div class="module-nav-list analysis-nav-grid">${nav}</div></div>
          </div>
          <div class="md-detail-column dashboard-card analysis-preview-panel" id="analises-detail-desktop"></div>
        </div>
      </div>`;
    this.renderAnalysisDetailDesktop(Object.keys(analysisOptions)[0] || 'gastos_categoria');
  };

  app.renderAnalysisDetailDesktop = function(analysisKey = 'gastos_categoria') {
    const container = document.getElementById('analises-detail-desktop');
    if (!container) return;
    const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
    container.innerHTML = `
      <div class="card-header analysis-premium-header">
        <h3><i class="${cfg.icon}"></i> ${cfg.label}</h3>
        <div class="card-actions">
          ${this.buildChefButton(`Analise ${cfg.label} e me dê uma leitura 360 graus com ações práticas.`, 'Chef IA')}
          <button class="icon-button analysis-mobile-open-btn" data-analysis-key="${analysisKey}" title="Abrir detalhe"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button>
        </div>
      </div>
      <div class="card-content analysis-premium-content">
        <p class="detail-note analysis-premium-note">${cfg.note}</p>
        <div class="analysis-config-panel">
          <div class="form-group"><label for="analysis-data-select">Analisar</label><select id="analysis-data-select">${this.getAnalysisSelectOptionsHTML(analysisKey)}</select></div>
          <div class="form-group"><label for="analysis-type-select">Tipo de gráfico</label><select id="analysis-type-select">${this.getChartTypeOptionsHTML('doughnut')}</select></div>
        </div>
        <div class="analysis-premium-chart"><canvas id="dynamic-analysis-chart"></canvas></div>
      </div>
      <div class="card-footer module-actions-footer compact-export-row">
        ${this.buildChefButton(`Explique ${cfg.label} como um consultor premium.`, 'Chef IA', 'chef-glass-btn')}
        ${this.buildExportButtons(`data-analysis="${analysisKey}"`)}
      </div>`;
    document.getElementById('analysis-data-select')?.addEventListener('change', (e) => this.renderAnalysisDetailDesktop(e.target.value));
    document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
    this.updateDynamicChart();
  };

  app.openAnalysisDetailModal = function(analysisKey = 'gastos_categoria') {
    const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
    const titleEl = document.getElementById('detail-modal-title');
    const bodyEl = document.getElementById('detail-modal-body');
    const footerEl = document.getElementById('detail-modal-footer');
    const headerActionsEl = document.getElementById('detail-modal-header-actions');
    if (!titleEl || !bodyEl || !footerEl || !headerActionsEl) return;
    titleEl.innerHTML = `<i class="${cfg.icon}"></i> ${cfg.label}`;
    headerActionsEl.innerHTML = this.buildChefButton(`Faça uma leitura 360 graus de ${cfg.label} no meu painel.`, 'Chef IA');
    bodyEl.innerHTML = `
      <div class="analysis-premium-modal">
        <p class="detail-note analysis-premium-note">${cfg.note}</p>
        <div class="analysis-config-panel">
          <div class="form-group"><label for="analysis-data-select">Analisar</label><select id="analysis-data-select">${this.getAnalysisSelectOptionsHTML(analysisKey)}</select></div>
          <div class="form-group"><label for="analysis-type-select">Tipo de gráfico</label><select id="analysis-type-select">${this.getChartTypeOptionsHTML('doughnut')}</select></div>
        </div>
        <div class="analysis-premium-chart"><canvas id="dynamic-analysis-chart"></canvas></div>
      </div>`;
    footerEl.className = 'modal-footer detail-modal-footer compact-export-row';
    footerEl.innerHTML = `${this.buildChefButton(`Resuma ${cfg.label} para mim em linguagem simples, estratégica e elegante.`, 'Chef IA', 'chef-glass-btn')}${this.buildExportButtons(`data-analysis="${analysisKey}"`)}`;
    document.getElementById('analysis-data-select')?.addEventListener('change', (e) => this.openAnalysisDetailModal(e.target.value));
    document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
    this.updateDynamicChart();
    this.openModal('detail-modal');
  };

  app.populateRecipePicker = function() {
    const container = document.getElementById('recipe-picker-list-container');
    if (!container) return;
    const recipes = this.sortRecipesCollection ? this.sortRecipesCollection(Object.values(this.state.receitas || {})) : Object.values(this.state.receitas || {});
    const helper = this.pendingCustomMeal
      ? `<p class="detail-note" style="margin-bottom:1rem;">Selecione a receita para <strong>${this.escapeHtml(this.pendingCustomMeal.mealLabel)}</strong>${this.pendingCustomMeal.time ? ` às ${this.escapeHtml(this.pendingCustomMeal.time)}` : ''}.</p>`
      : '<p class="detail-note" style="margin-bottom:1rem;">Selecione uma receita da sua lista.</p>';
    if (!recipes.length) {
      container.innerHTML = `${helper}<div class="recipe-picker-item"><div class="recipe-picker-copy"><strong>Nenhuma receita ainda</strong><span>Crie uma receita nova para começar o seu planejamento com estilo.</span></div><button type="button" class="recipe-picker-create-btn" data-create-recipe="1"><i class="fa-solid fa-plus"></i><span>Criar nova receita</span></button></div>`;
      return;
    }
    container.innerHTML = `${helper}${recipes.map(recipe => `
      <div class="recipe-picker-item">
        <div class="recipe-picker-copy"><strong>${this.escapeHtml(recipe.name)}</strong><span>${this.escapeHtml(recipe.desc || 'Receita pronta para entrar no planejador.')}</span></div>
        <button type="button" class="btn btn-primary btn-add-recipe" data-recipe-id="${recipe.id}"><i class="fa-solid fa-plus"></i><span>Adicionar</span></button>
      </div>`).join('')}
      <button type="button" class="recipe-picker-create-btn" data-create-recipe="1"><i class="fa-solid fa-sparkles"></i><span>Criar nova receita</span></button>`;
    if (!this.boundHandleRecipePickerAdd) this.boundHandleRecipePickerAdd = this.handleRecipePickerAdd.bind(this);
    container.removeEventListener('click', this.boundHandleRecipePickerAdd);
    container.addEventListener('click', this.boundHandleRecipePickerAdd);
  };

  app.handleRecipePickerAdd = function(e) {
    const addBtn = e.target.closest('.btn-add-recipe');
    if (!addBtn || (!this.currentPlannerDayTarget && !this.pendingCustomMeal)) return;
    const target = this.pendingCustomMeal ? null : this.currentPlannerDayTarget;
    this.handleAddMealToPlanner(addBtn.dataset.recipeId, target);
    this.closeModal('recipe-picker-modal');
    const detailVisibleDay = document.querySelector('#detail-modal.is-visible .generate-list-btn')?.dataset.day || null;
    this.currentPlannerDayTarget = null;
    if (detailVisibleDay) setTimeout(() => this.openPlannerDayDetailModal(detailVisibleDay), 50);
  };

  app.bindAfFinalEvents = function() {
    if (afFinalPatchBound) return;
    afFinalPatchBound = true;
    document.addEventListener('click', (e) => {
      const closest = (sel) => e.target.closest(sel);

      if (closest('#saved-lists-container .delete-list-btn')) {
        const listId = closest('.saved-list-item,[data-list-id],.card--saved-list')?.dataset?.listId || closest('.saved-list-item,[data-id],.card--saved-list')?.dataset?.id;
        if (listId) { e.preventDefault(); e.stopImmediatePropagation(); app.handleDeleteListaAtiva(listId); }
        return;
      }
      if (closest('#lista-items-full .delete-btn') || closest('#list-view-modal-body .delete-btn')) {
        const itemEl = closest('.placeholder-item[data-id]');
        const listId = app.getListIdFromItemElement ? app.getListIdFromItemElement(itemEl) : (document.getElementById('active-list-id-input')?.value || app.activeListId);
        const itemName = itemEl?.dataset?.name || 'este item';
        if (itemEl && listId) {
          e.preventDefault(); e.stopImmediatePropagation();
          app.openConfirmModal('Excluir item', `Deseja excluir "${itemName}" da lista?`, () => app.deleteListItemById(listId, itemEl.dataset.id));
        }
        return;
      }
      if (closest('#main-recipe-grid .edit-recipe-btn') || closest('#recipe-detail-modal .edit-recipe-btn') || closest('#recipe-detail-desktop-footer .edit-recipe-btn')) {
        const recipeId = closest('[data-recipe-id]')?.dataset?.recipeId || closest('.recipe-list-item,.card--recipe')?.dataset?.recipeId || closest('.recipe-list-item,.card--recipe')?.dataset?.id;
        if (recipeId) { e.preventDefault(); e.stopImmediatePropagation(); app.handleOpenRecipeEditModal(recipeId); }
        return;
      }
      if (closest('#main-recipe-grid .delete-recipe-btn') || closest('#recipe-detail-modal .delete-recipe-btn') || closest('#recipe-detail-desktop-footer .delete-recipe-btn')) {
        const recipeId = closest('[data-recipe-id]')?.dataset?.recipeId || closest('.recipe-list-item,.card--recipe')?.dataset?.recipeId || closest('.recipe-list-item,.card--recipe')?.dataset?.id;
        if (recipeId) { e.preventDefault(); e.stopImmediatePropagation(); app.handleDeleteRecipe(recipeId); }
        return;
      }
      if (closest('#despensa-list-container .delete-btn') || closest('[data-pantry-delete-id]')) {
        const itemId = closest('[data-pantry-delete-id]')?.dataset?.pantryDeleteId || closest('.placeholder-item[data-id]')?.dataset?.id;
        const itemName = closest('.placeholder-item[data-name]')?.dataset?.name || 'este item';
        if (itemId) { e.preventDefault(); e.stopImmediatePropagation(); app.openConfirmModal('Excluir item', `Deseja excluir "${itemName}" da despensa?`, () => app.deletePantryItemById(itemId)); }
        return;
      }
      if (closest('.clear-plan-btn')) {
        e.preventDefault(); e.stopImmediatePropagation();
        app.openConfirmModal('Limpar semana', 'Deseja remover todas as refeições planejadas desta semana?', () => app.executeClearPlannerWeek());
        return;
      }
      if (closest('.day-clear-btn')) {
        const dayKey = closest('.day-clear-btn')?.dataset?.day;
        if (dayKey) {
          e.preventDefault(); e.stopImmediatePropagation();
          app.openConfirmModal('Limpar dia', `Deseja remover todas as refeições de ${app.getPlannerDaysMap()[dayKey] || dayKey}?`, () => app.executeClearPlannerDay({ day: dayKey }));
        }
        return;
      }
      if (closest('.planner-day-card') && !closest('.icon-button') && !closest('.chef-inline-btn')) {
        const dayKey = closest('.planner-day-card')?.dataset?.day;
        if (dayKey) { e.preventDefault(); e.stopImmediatePropagation(); app.openPlannerDayDetailModal(dayKey); }
        return;
      }
      if (closest('.add-meal-btn')) {
        const dayKey = closest('.add-meal-btn')?.dataset?.dayTarget;
        if (dayKey) {
          e.preventDefault(); e.stopImmediatePropagation();
          app.openPlannerDayDetailModal(dayKey);
        }
        return;
      }
      if (closest('.planner-slot-direct-btn')) {
        const btn = closest('.planner-slot-direct-btn');
        e.preventDefault(); e.stopImmediatePropagation();
        app.currentPlannerDayTarget = `planner-full-${btn.dataset.day}-${btn.dataset.meal}`;
        app.pendingCustomMeal = null;
        app.populateRecipePicker();
        app.openModal('recipe-picker-modal');
        return;
      }
      if (closest('.planner-custom-meal-launch')) {
        const btn = closest('.planner-custom-meal-launch');
        if (btn?.dataset?.day) { e.preventDefault(); e.stopImmediatePropagation(); app.openPlannerCustomMealModal(btn.dataset.day); }
        return;
      }
      if (closest('.planner-meal-item .meal-delete-btn')) {
        const mealItem = closest('.planner-meal-item');
        if (mealItem) { e.preventDefault(); e.stopImmediatePropagation(); app.handleDeleteMeal(mealItem.dataset.day, mealItem.dataset.meal); }
        return;
      }
      if (closest('.planner-meal-item .meal-view-btn')) {
        const mealItem = closest('.planner-meal-item');
        const recipeId = mealItem?.dataset?.recipeId;
        if (recipeId) { e.preventDefault(); e.stopImmediatePropagation(); app.showRecipeDetailModal(recipeId); }
        return;
      }
      if (closest('.planner-meal-item .meal-complete-btn')) {
        const mealItem = closest('.planner-meal-item');
        if (mealItem) { e.preventDefault(); e.stopImmediatePropagation(); app.handleToggleCompleteMeal(mealItem.dataset.day, mealItem.dataset.meal); }
        return;
      }
      if (closest('.generate-list-btn')) {
        const dayKey = closest('.generate-list-btn')?.dataset?.day || null;
        e.preventDefault(); e.stopImmediatePropagation();
        app.handleGenerateListFromPlanner(dayKey);
        return;
      }
      if (closest('.analysis-nav-item')) {
        const key = closest('.analysis-nav-item')?.dataset?.analysisKey;
        if (key && window.innerWidth <= 991) { e.preventDefault(); e.stopImmediatePropagation(); app.openAnalysisDetailModal(key); }
      }
    }, true);
  };

  app.bindAfFinalEvents();
  setTimeout(() => {
    try {
      if (app.isAppMode) app.activateModuleAndRender?.(app.activeModule || 'inicio');
    } catch (e) {
      console.error('Erro ao aplicar patch final V6.1', e);
    }
  }, 80);
})();

(() => {
  const app = window.app;
  if (!app) return;

  const normalize = (text = '') => String(text)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();

  const catalog = (typeof ALL_ITEMS_DATA !== 'undefined' && Array.isArray(ALL_ITEMS_DATA)) ? ALL_ITEMS_DATA : [];

  const findCatalogItem = (name) => {
    const n = normalize(name);
    if (!n) return null;
    return catalog.find(item => normalize(item.name) === n)
      || catalog.find(item => normalize(item.name).includes(n))
      || catalog.find(item => n.includes(normalize(item.name)));
  };

  const priceFor = (name, fallback = 6) => {
    const item = findCatalogItem(name);
    return Number(item?.price || fallback);
  };

  const escape = (text) => app.escapeHtml ? app.escapeHtml(String(text ?? '')) : String(text ?? '');

  const shortReply = (text) => ({
    intent: 'answer_question',
    data: {},
    response_text_html: escape(text)
  });

  const richReply = (html, data = {}) => ({
    intent: 'answer_question',
    data,
    response_text_html: html
  });

  const parseCount = (text, unitWords, fallback) => {
    const rx = new RegExp(`(\\d+)\\s*(?:${unitWords.join('|')})`, 'i');
    const m = String(text).match(rx);
    return m ? Math.max(1, parseInt(m[1], 10)) : fallback;
  };

  const parseMeals = (text) => {
    const t = normalize(text);
    const flags = {
      cafe: /cafe da manha|cafe/.test(t),
      almoco: /almoco/.test(t),
      jantar: /jantar/.test(t),
      lanche: /lanche/.test(t)
    };
    if (!flags.cafe && !flags.almoco && !flags.jantar && !flags.lanche) {
      flags.cafe = true; flags.almoco = true; flags.jantar = true;
    }
    return flags;
  };

  app.chefLimits = { perMinute: 999, perDay: 50000 };
  app.lastChefAction = app.lastChefAction || null;

  app.setupChatbotModal = function() {
    const modal = document.getElementById('ai-chat-modal');
    if (!modal || modal.dataset.chefBound === 'true') return;
    const sendBtn = modal.querySelector('#ai-chat-send-btn');
    const input = modal.querySelector('#ai-chat-input');
    const messages = modal.querySelector('#ai-chat-messages-container');
    const voiceBtn = modal.querySelector('#ai-voice-btn');

    const greetIfEmpty = () => {
      if (!messages.children.length) {
        const welcome = document.createElement('div');
        welcome.className = 'chat-message ia';
        welcome.innerHTML = '<div class="bubble">Olá! Como posso ajudar?</div>';
        messages.appendChild(welcome);
      }
    };

    const sendMessage = () => {
      const userText = String(input.value || '').trim();
      if (!userText || this.isIAProcessing) return;
      input.value = '';

      const userMessage = document.createElement('div');
      userMessage.className = 'chat-message user';
      userMessage.innerHTML = `<div class="bubble">${escape(userText)}</div>`;
      messages.appendChild(userMessage);
      messages.scrollTop = messages.scrollHeight;
      this.triggerChefIAAnalysis(userText);
    };

    if (voiceBtn) voiceBtn.onclick = () => this.startVoiceRecognition?.();
    if (sendBtn) sendBtn.onclick = sendMessage;
    if (input) {
      input.onkeyup = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      };
    }

    messages.onclick = (e) => {
      const button = e.target.closest('[data-action]');
      if (!button) return;
      const { action, listId, recipeId, module } = button.dataset;
      if (action === 'view-list' && listId) {
        this.closeAllModals();
        this.activeListId = listId;
        this.activateModuleAndRender('lista');
      } else if (action === 'view-recipe' && recipeId) {
        this.closeAllModals();
        this.activateModuleAndRender('receitas');
        setTimeout(() => {
          if (window.innerWidth < 992) this.showRecipeDetailModal(recipeId);
          else this.renderRecipeDetail(recipeId);
        }, 80);
      } else if (action === 'open-module' && module) {
        this.closeAllModals();
        this.activateModuleAndRender(module);
      }
    };

    greetIfEmpty();
    modal.dataset.chefBound = 'true';
  };

  app.triggerChefIAAnalysis = async function(prompt) {
    if (this.isIAProcessing) return;

    const now = Date.now();
    const today = new Date().toDateString();
    if (!this.state.aiUsage) this.state.aiUsage = { tokensThisMonth: 0, dailyMsgs: 0, lastMsgDate: null, minuteHistory: [] };
    if (this.state.aiUsage.lastMsgDate !== today) {
      this.state.aiUsage.lastMsgDate = today;
      this.state.aiUsage.dailyMsgs = 0;
      this.state.aiUsage.minuteHistory = [];
    }
    this.state.aiUsage.minuteHistory = (this.state.aiUsage.minuteHistory || []).filter(ts => ts > (now - 60000));

    const messages = document.getElementById('ai-chat-messages-container');
    const sendBtn = document.getElementById('ai-chat-send-btn');

    if (this.state.aiUsage.minuteHistory.length >= this.chefLimits.perMinute || this.state.aiUsage.dailyMsgs >= this.chefLimits.perDay) {
      const limitMessage = document.createElement('div');
      limitMessage.className = 'chat-message ia';
      limitMessage.innerHTML = '<div class="bubble">Modo de teste ativo. Aguarde alguns segundos e tente de novo.</div>';
      messages.appendChild(limitMessage);
      messages.scrollTop = messages.scrollHeight;
      return;
    }

    this.isIAProcessing = true;
    this.state.aiUsage.minuteHistory.push(now);
    this.state.aiUsage.dailyMsgs++;

    if (sendBtn) {
      sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      sendBtn.disabled = true;
    }

    const thinking = document.createElement('div');
    thinking.className = 'chat-message ia';
    thinking.innerHTML = '<div class="bubble typing-indicator"><span></span><span></span><span></span></div>';
    messages.appendChild(thinking);
    messages.scrollTop = messages.scrollHeight;

    try {
      const apiResponse = await this.callGeminiAPI(prompt);
      this.processIAResponse(apiResponse.json, apiResponse.html, thinking);
    } catch (error) {
      thinking.innerHTML = '<div class="bubble">Não consegui responder agora. Tente reformular em uma frase curta.</div>';
    } finally {
      this.isIAProcessing = false;
      if (sendBtn) {
        sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i>';
        sendBtn.disabled = false;
      }
      this.saveState?.();
    }
  };

  app.executeCreateList = function(listData) {
    const newListId = this.generateId();
    const items = (listData.items || []).map(item => ({
      id: this.generateId(),
      name: item.name || 'Item',
      qtd: Number(item.quantity || item.qtd || 1),
      unid: item.unit || item.unid || 'un',
      checked: false,
      valor: Number(item.price || item.valor || priceFor(item.name || 'item', 5)).toFixed ? Number(item.price || item.valor || priceFor(item.name || 'item', 5)) : 0
    }));
    this.state.listas[newListId] = {
      nome: listData.list_name || 'Lista automática',
      items
    };
    this.activeListId = newListId;
    this.lastChefAction = { type: 'list', id: newListId };
    this.saveState?.();
    return newListId;
  };

  app.executeUpdateList = function(data) {
    const listId = data.list_id || this.activeListId;
    const list = this.state.listas?.[listId];
    if (!list) return;
    if (data.changes?.add?.length) {
      data.changes.add.forEach(item => {
        list.items.unshift({
          id: this.generateId(),
          name: item.name,
          qtd: Number(item.quantity || 1),
          unid: item.unit || 'un',
          checked: false,
          valor: Number(item.price || priceFor(item.name, 5))
        });
      });
    }
    if (data.changes?.removeNames?.length) {
      const removals = data.changes.removeNames.map(normalize);
      list.items = (list.items || []).filter(item => !removals.includes(normalize(item.name)));
    }
    this.saveState?.();
  };

  app.executePantryUpdate = function(data) {
    this.state.despensa = this.state.despensa || [];
    if (data.add?.length) {
      data.add.forEach(item => {
        this.state.despensa.unshift({
          id: this.generateId(),
          name: item.name,
          stock: Number(item.stock || 100),
          qtd: Number(item.quantity || 1),
          unid: item.unit || 'un',
          valor: Number(item.price || priceFor(item.name, 5)),
          validade: item.validade || ''
        });
      });
    }
    if (data.removeNames?.length) {
      const removals = data.removeNames.map(normalize);
      this.state.despensa = this.state.despensa.filter(item => !removals.includes(normalize(item.name)));
    }
    this.saveState?.();
  };

  app.executePlannerPlan = function(data) {
    const daysMap = ['seg','ter','qua','qui','sex','sab','dom'];
    this.state.planejador = this.state.planejador || {};
    const recipes = Object.values(this.state.receitas || {});
    if (!recipes.length) return;
    daysMap.forEach((day, idx) => {
      const recipe = recipes[idx % recipes.length];
      this.state.planejador[day] = this.state.planejador[day] || {};
      this.state.planejador[day].almoco = { id: recipe.id, name: recipe.name };
    });
    this.saveState?.();
  };

  app.buildSmartShoppingList = function(promptText) {
    const text = normalize(promptText);
    const days = parseCount(text, ['dias','dia'], 7);
    const people = parseCount(text, ['pessoas','pessoa'], 1);
    const meals = parseMeals(text);
    const cheap = /barat|econom|baixo custo/.test(text);
    const vegan = /vegano|vegana|vegan/.test(text);
    const fit = /fitness|fit|proteic|proteina|hipertrof/.test(text);

    const items = [];
    const add = (name, quantity, unit) => {
      const q = Math.max(1, Number(quantity || 1));
      items.push({
        name,
        quantity: Number(q.toFixed ? q.toFixed(2) : q),
        unit,
        price: Number(priceFor(name, 5).toFixed(2))
      });
    };

    if (meals.cafe) {
      add('Café', Math.ceil(days * people / 10), 'pct');
      add('Pão', Math.ceil(days * people * 0.6), 'un');
      add('Banana', Math.ceil(days * people * 1.0), 'un');
      add('Aveia', Math.ceil(days * people / 7), 'pct');
      if (!vegan) {
        add('Leite', Math.ceil(days * people / 3), 'l');
        add('Ovos', Math.ceil(days * people * (fit ? 2 : 1.2)), 'un');
      }
    }

    if (meals.almoco || meals.jantar) {
      add('Arroz', Math.max(1, Math.ceil(days * people * 0.12)), 'kg');
      add('Feijão Preto', Math.max(1, Math.ceil(days * people * 0.07)), 'kg');
      add('Macarrão', Math.max(1, Math.ceil(days * people * 0.05)), 'pct');
      add('Tomate', Math.ceil(days * people * 0.7), 'un');
      add('Cebola', Math.ceil(days * people * 0.35), 'un');
      add('Alho', Math.max(1, Math.ceil(days * people * 0.15)), 'un');
      add('Alface', Math.ceil(days * people * 0.18), 'un');
      add('Batata', Math.ceil(days * people * 0.5), 'un');
      if (vegan) {
        add('Brócolis', Math.ceil(days * people * 0.22), 'un');
        add('Beterraba', Math.ceil(days * people * 0.18), 'un');
      } else if (fit) {
        add('Peito de Frango', Math.ceil(days * people * 0.22), 'kg');
        add('Batata Doce', Math.ceil(days * people * 0.4), 'un');
        add('Brócolis', Math.ceil(days * people * 0.2), 'un');
      } else {
        add(cheap ? 'Ovos' : 'Peito de Frango', cheap ? Math.ceil(days * people * 1.4) : Math.ceil(days * people * 0.18), cheap ? 'un' : 'kg');
        add('Carne Bovina', cheap ? Math.ceil(days * people * 0.08) : Math.ceil(days * people * 0.12), 'kg');
      }
    }

    if (meals.lanche) {
      add('Iogurte', Math.ceil(days * people * 0.5), 'un');
      add('Maçã', Math.ceil(days * people * 0.7), 'un');
    }

    const merged = {};
    items.forEach(item => {
      const key = normalize(item.name) + '|' + item.unit;
      if (!merged[key]) merged[key] = { ...item };
      else merged[key].quantity += item.quantity;
    });

    const finalItems = Object.values(merged).map(item => ({
      ...item,
      quantity: item.unit === 'kg' || item.unit === 'l'
        ? Number(item.quantity.toFixed(1))
        : Math.ceil(item.quantity)
    }));

    const total = finalItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price || 0)), 0);
    const mealLabel = meals.cafe && meals.almoco && meals.jantar ? 'completa' :
      meals.cafe ? 'café da manhã' : meals.almoco ? 'almoço' : meals.jantar ? 'jantar' : 'personalizada';

    return {
      list_name: `Lista ${mealLabel} • ${days} dia(s) • ${people} pessoa(s)`,
      items: finalItems,
      totalEstimate: Number(total.toFixed(2)),
      meta: { days, people, mealLabel, cheap, vegan, fit }
    };
  };

  app.buildRecipeFromPrompt = function(promptText) {
    const text = normalize(promptText);
    if (text.includes('doce de amendoim')) {
      return {
        recipe_name: 'Doce de amendoim cremoso',
        desc: 'Receita rápida, econômica e ótima para sobremesa simples.',
        ingredients: [
          { name: 'Amendoim', qty: '500', unit: 'g' },
          { name: 'Açúcar', qty: '1', unit: 'xícara' },
          { name: 'Leite', qty: '1', unit: 'xícara' }
        ],
        prepMode: 'Torre o amendoim, retire a pele, leve ao fogo com açúcar e leite, mexendo até engrossar. Desligue quando ficar cremoso e sirva morno ou frio.'
      };
    }
    const main = text.includes('frango') ? 'Peito de Frango' : text.includes('banana') ? 'Banana' : 'Tomate';
    return {
      recipe_name: `Receita • ${main}`,
      desc: 'Receita prática para o dia a dia, com preparo simples.',
      ingredients: [
        { name: main, qty: '2', unit: 'un' },
        { name: 'Cebola', qty: '1', unit: 'un' },
        { name: 'Alho', qty: '2', unit: 'dentes' }
      ],
      prepMode: 'Refogue cebola e alho. Acrescente o ingrediente principal, tempere e cozinhe até chegar ao ponto. Finalize e sirva.'
    };
  };

  app.runChefLocalIntent = function(userText) {
    const text = String(userText || '').trim();
    const n = normalize(text);

    if (!n) return shortReply('Digite sua mensagem.');

    if (/^(oi|ola|olá|bom dia|boa tarde|boa noite)$/.test(n)) {
      return shortReply('Olá! Como posso ajudar?');
    }

    if (n.includes('manda o botao') || n.includes('manda o botão')) {
      if (this.lastChefAction?.type === 'recipe') {
        return richReply(`<button class="af-option-btn" data-action="view-recipe" data-recipe-id="${this.lastChefAction.id}"><i class="fa-solid fa-utensils"></i> Abrir receita criada</button>`);
      }
      if (this.lastChefAction?.type === 'list') {
        return richReply(`<button class="af-option-btn" data-action="view-list" data-list-id="${this.lastChefAction.id}"><i class="fa-solid fa-list"></i> Abrir lista criada</button>`);
      }
      return shortReply('Ainda não criei nada nesta conversa.');
    }

    if (n.includes('abrir analise') || n.includes('abrir análise') || n.includes('analises') || n.includes('análises')) {
      return richReply(`Abri a área de análises para você.<br><button class="af-option-btn" data-action="open-module" data-module="analises"><i class="fa-solid fa-chart-line"></i> Abrir análises</button>`);
    }

    if ((n.includes('crie uma lista') || n.includes('criar uma lista') || n.includes('monte uma lista') || n.includes('lista ') || n.includes('compras')) && !n.includes('manda o bot')) {
      const list = this.buildSmartShoppingList(text);
      return {
        intent: 'create_shopping_list',
        data: list,
        response_text_html: `Criei uma lista mais completa para <strong>${list.meta.days} dia(s)</strong> e <strong>${list.meta.people} pessoa(s)</strong>, com ${list.items.length} itens e estimativa de <strong>R$ ${list.totalEstimate.toFixed(2)}</strong>.<br><small style="opacity:.82">Base: ${escape(list.meta.mealLabel)}${list.meta.cheap ? ' • foco em economia' : ''}${list.meta.vegan ? ' • versão vegana' : ''}${list.meta.fit ? ' • foco em proteína' : ''}</small><br><button class="af-option-btn" style="margin-top:10px;width:100%;" data-action="view-list" data-list-id="[NEW_LIST_ID]"><i class="fa-solid fa-eye"></i> Abrir lista criada</button>`
      };
    }

    if (n.includes('adicione') && n.includes('lista')) {
      const names = text.split(/adicione/i)[1]?.split(/na lista|à lista|a lista/i)[0] || '';
      const parts = names.split(/,| e /i).map(s => s.trim()).filter(Boolean);
      return {
        intent: 'update_shopping_list',
        data: { list_id: this.activeListId, changes: { add: parts.map(name => ({ name, quantity: 1, unit: 'un', price: priceFor(name, 5) })) } },
        response_text_html: `Adicionei ${parts.map(escape).join(', ')} na lista ativa.`
      };
    }

    if ((n.includes('remova') || n.includes('remove')) && n.includes('lista')) {
      const names = text.split(/remova|remove/i)[1]?.split(/da lista|da compras|da compra/i)[0] || '';
      const parts = names.split(/,| e /i).map(s => s.trim()).filter(Boolean);
      return {
        intent: 'update_shopping_list',
        data: { list_id: this.activeListId, changes: { removeNames: parts } },
        response_text_html: `Removi ${parts.map(escape).join(', ')} da lista ativa.`
      };
    }

    if ((n.includes('adicione') || n.includes('coloque')) && (n.includes('despensa') || n.includes('estoque'))) {
      const names = text.split(/adicione|coloque/i)[1]?.split(/na despensa|no estoque/i)[0] || '';
      const parts = names.split(/,| e /i).map(s => s.trim()).filter(Boolean);
      return {
        intent: 'update_pantry',
        data: { add: parts.map(name => ({ name, quantity: 1, unit: 'un', price: priceFor(name, 5), stock: 100 })) },
        response_text_html: `Adicionei ${parts.map(escape).join(', ')} na despensa.`
      };
    }

    if ((n.includes('remova') || n.includes('remove')) && (n.includes('despensa') || n.includes('estoque'))) {
      const names = text.split(/remova|remove/i)[1]?.split(/da despensa|do estoque/i)[0] || '';
      const parts = names.split(/,| e /i).map(s => s.trim()).filter(Boolean);
      return {
        intent: 'update_pantry',
        data: { removeNames: parts },
        response_text_html: `Removi ${parts.map(escape).join(', ')} da despensa.`
      };
    }

    if (n.includes('receita') || n.includes('doce de amendoim') || n.includes('jantar') || n.includes('almoco') || n.includes('almoço')) {
      const recipe = this.buildRecipeFromPrompt(text);
      return {
        intent: 'create_recipe',
        data: recipe,
        response_text_html: `Criei a receita <strong>${escape(recipe.recipe_name)}</strong>.<br><button class="af-option-btn" style="margin-top:10px;width:100%;" data-action="view-recipe" data-recipe-id="[NEW_RECIPE_ID]"><i class="fa-solid fa-utensils"></i> Abrir receita criada</button>`
      };
    }

    if (n.includes('planejador') || n.includes('monte minha semana') || n.includes('organize minha semana')) {
      return {
        intent: 'planner_week',
        data: {},
        response_text_html: `Organizei um rascunho de semana no planejador com base nas receitas já salvas.<br><button class="af-option-btn" data-action="open-module" data-module="planejador"><i class="fa-solid fa-calendar-days"></i> Abrir planejador</button>`
      };
    }

    if (n.includes('historico') || n.includes('histórico')) {
      const totalListas = Object.keys(this.state.listas || {}).length;
      const totalReceitas = Object.keys(this.state.receitas || {}).length;
      const totalDespensa = (this.state.despensa || []).length;
      return shortReply(`Hoje o app tem ${totalListas} lista(s), ${totalReceitas} receita(s) e ${totalDespensa} item(ns) na despensa.`);
    }

    if (n.includes('carne de boi')) {
      return shortReply('Serve como fonte de proteína, ferro e energia. É mais usada em almoço, jantar e receitas com maior saciedade.');
    }

    return null;
  };

  app.callGeminiAPI = async function(userText) {
    const local = this.runChefLocalIntent(userText);
    if (local) return { json: local, html: null };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const response = await fetch('/api/chef', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ message: userText })
      });
      clearTimeout(timer);
      const data = await response.json();
      const reply = data.reply || data.content || 'Não consegui responder agora.';
      return { json: shortReply(reply), html: null };
    } catch (e) {
      return { json: shortReply('Não consegui responder agora. Tente reformular em uma frase curta.'), html: null };
    }
  };

  app.processIAResponse = function(jsonResponse, htmlResponse, thinkingMessageElement) {
    let finalHtml = htmlResponse || jsonResponse?.response_text_html || 'Não consegui responder.';
    const intent = jsonResponse?.intent || 'answer_question';
    const data = jsonResponse?.data || {};

    try {
      if (intent === 'create_shopping_list') {
        const newListId = this.executeCreateList(data);
        finalHtml = finalHtml.replace('[NEW_LIST_ID]', newListId);
      } else if (intent === 'create_recipe') {
        const newRecipeId = this.executeCreateRecipe(data);
        this.lastChefAction = { type: 'recipe', id: newRecipeId };
        finalHtml = finalHtml.replace('[NEW_RECIPE_ID]', newRecipeId);
      } else if (intent === 'update_shopping_list') {
        this.executeUpdateList(data);
      } else if (intent === 'update_pantry') {
        this.executePantryUpdate(data);
      } else if (intent === 'planner_week') {
        this.executePlannerPlan(data);
      }
    } catch (e) {
      finalHtml += `<br><small style="color:#ff8f8f">Erro ao executar ação.</small>`;
    }

    if (thinkingMessageElement) thinkingMessageElement.innerHTML = `<div class="bubble">${finalHtml}</div>`;

    if (['create_shopping_list', 'update_shopping_list'].includes(intent)) {
      if (this.activeModule === 'lista') this.renderListas?.();
      this.renderListaWidget?.();
      this.renderListasSalvas?.();
    }
    if (['create_recipe'].includes(intent) && this.activeModule === 'receitas') this.renderReceitas?.();
    if (['update_pantry'].includes(intent) && this.activeModule === 'despensa') this.renderDespensa?.();
    if (['planner_week'].includes(intent) && this.activeModule === 'planejador') this.renderPlanejador?.();

    this.saveState?.();
  };

  app.renderAnalises = function(container) {
    if (!container) container = document.getElementById('module-analises');
    if (!container) return;

    const analysisOptions = this.getAnalysisOptions();
    const spend = Object.values(this.getCategoryDataFromLists()).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
    const pantryStats = this.getPantryValidityData();
    const plannerUsage = this.getPlannerMealCountData();
    const plannedCount = Object.values(plannerUsage).reduce((sum, value) => sum + (parseInt(value, 10) || 0), 0);

    const nav = Object.entries(analysisOptions).map(([key, cfg], index) => `
      <button type="button" class="module-nav-item analysis-nav-item ${index === 0 ? 'active' : ''}" data-analysis-key="${key}">
        <strong>${cfg.label}</strong>
        <span>${cfg.note}</span>
      </button>`).join('');

    container.innerHTML = `
      <div class="analysis-shell-2100">
        <div class="analysis-top-grid">
          <div class="dashboard-card analysis-stage-card" id="analises-detail-desktop"></div>
          <div class="analysis-side-stack">
            <div class="analysis-kpi-grid-compact">
              <div class="analysis-kpi-card"><strong>R$ ${spend.toFixed(2)}</strong><small>gasto mapeado nas listas</small></div>
              <div class="analysis-kpi-card"><strong>${(this.state.despensa || []).length}</strong><small>itens na despensa</small></div>
              <div class="analysis-kpi-card"><strong>${pantryStats.vencidos + pantryStats.vencendo}</strong><small>itens que pedem atenção</small></div>
              <div class="analysis-kpi-card"><strong>${plannedCount}</strong><small>usos de receitas no planejador</small></div>
            </div>
            <div class="dashboard-card analysis-picker-card">
              <div class="card-header analysis-premium-header">
                <h3><i class="fa-solid fa-chart-line"></i> Análises</h3>
                <div class="card-actions">${this.buildChefButton('Analise meus dados do app e me dê prioridades claras de economia, desperdício e organização.', 'Chef IA')}</div>
              </div>
              <div class="card-content">
                <div class="module-nav-list analysis-nav-grid">${nav}</div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    const firstKey = 'gastos_categoria';
    this.renderAnalysisDetailDesktop(firstKey);
  };

  app.renderAnalysisDetailDesktop = function(analysisKey = 'gastos_categoria') {
    const container = document.getElementById('analises-detail-desktop');
    if (!container) return;
    const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
    const defaultType = analysisKey === 'rotina_semana' ? 'bar' : analysisKey.includes('gastos') ? 'doughnut' : 'bar';

    container.innerHTML = `
      <div class="card-header analysis-premium-header">
        <h3><i class="${cfg.icon}"></i> ${cfg.label}</h3>
        <div class="card-actions">
          ${this.buildChefButton(`Analise ${cfg.label} e me diga oportunidades de economia, desperdício e organização.`, 'Chef IA')}
        </div>
      </div>
      <div class="card-content analysis-premium-content">
        <p class="detail-note analysis-premium-note">${cfg.note}</p>
        <div class="analysis-config-panel">
          <div class="form-group">
            <label for="analysis-data-select">Analisar</label>
            <select id="analysis-data-select">${this.getAnalysisSelectOptionsHTML(analysisKey)}</select>
          </div>
          <div class="form-group">
            <label for="analysis-type-select">Tipo de gráfico</label>
            <select id="analysis-type-select">${this.getChartTypeOptionsHTML(defaultType)}</select>
          </div>
        </div>
        <div class="chart-canvas-container analysis-premium-chart"><canvas id="dynamic-analysis-chart"></canvas></div>
        <div class="analysis-quick-summary">
          <div class="mini"><strong>Visão imediata</strong><span>gráfico aberto de cara</span></div>
          <div class="mini"><strong>Troca rápida</strong><span>altere análise e tipo</span></div>
          <div class="mini"><strong>Leitura limpa</strong><span>mobile e desktop</span></div>
        </div>
      </div>`;

    document.getElementById('analysis-data-select')?.addEventListener('change', (e) => {
      this.renderAnalysisDetailDesktop(e.target.value);
      document.querySelectorAll('.analysis-nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.analysisKey === e.target.value));
    });
    document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
    this.updateDynamicChart();
  };

  setTimeout(() => {
    try { app.setupChatbotModal?.(); } catch (e) {}
  }, 50);
})();

(() => {
  const app = window.app;
  if (!app) return;

  const normalize = (text = '') => String(text)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim();

  app.chefScopeKeywords = [
    'alimento','alimentacao','comida','refeicao','refeicoes','receita','receitas','ingrediente','ingredientes',
    'mercado','supermercado','compras','lista','listas','despensa','estoque','geladeira','cozinha','cardapio',
    'cardapio','planejador','planejamento','semana','almoco','jantar','cafe','lanche','economia','orcamento',
    'gasto','gastos','desperdicio','validade','vencer','vence','nutric','caloria','proteina','frango','arroz',
    'feijao','carne','legume','verdura','panela','preparo','prato','porcao','porcoes','organizar','organizacao',
    'casa','domestica','doméstica','rotina','compras','analise','analises','análise','análises','chef ia',
    'app','painel','sistema','modulo','módulo','planejar','planeje','planejado','mercadoria'
  ];

  app.isChefScopeQuery = function(userText = '') {
    const n = normalize(userText);
    if (!n) return true;
    return this.chefScopeKeywords.some(keyword => n.includes(normalize(keyword)));
  };

  app.getChefRedirectMessage = function() {
    return 'Posso te ajudar melhor com alimentação, compras, receitas, despensa, planejamento, economia doméstica e análises do app.';
  };

  app.getAnalysisDataBundle = function(dataType = 'gastos_categoria') {
    let labels = [];
    let values = [];
    let title = '';
    let datasetLabel = '';
    let onClick = null;

    if (dataType === 'gastos_categoria') {
      const data = this.getCategoryDataFromLists();
      labels = Object.keys(data); values = Object.values(data); title = 'Gastos por categoria'; datasetLabel = 'R$ por categoria';
      onClick = (label, value) => this.showChartDetail_Categorias?.(label, value);
    } else if (dataType === 'gastos_lista') {
      const data = this.getListTotalsData();
      labels = Object.keys(data); values = Object.values(data); title = 'Total por lista'; datasetLabel = 'R$ por lista';
      onClick = (label, value) => this.showInfoModal?.(`Lista: ${label}`, `<p>Total estimado: <strong>R$ ${Number(value || 0).toFixed(2)}</strong>.</p>`);
    } else if (dataType === 'validade_despensa') {
      const data = this.getPantryValidityData();
      labels = ['Vencidos', 'Vence em 7 dias', 'Itens OK']; values = [data.vencidos, data.vencendo, data.ok]; title = 'Validade da despensa'; datasetLabel = 'Itens por status';
      onClick = (label, value, index) => { const key = ['vencidos', 'vencendo', 'ok'][index]; this.showChartDetail_Validade?.(key, label, value); };
    } else if (dataType === 'estoque_despensa') {
      const data = this.getPantryStockBandsData();
      labels = Object.keys(data); values = Object.values(data); title = 'Nível de estoque'; datasetLabel = 'Itens por faixa';
      onClick = (label, value) => this.showInfoModal?.(`Estoque: ${label}`, `<p>Você tem <strong>${value}</strong> item(ns) na faixa <strong>${label}</strong>.</p>`);
    } else if (dataType === 'uso_receitas') {
      const data = this.getPlannerMealCountData();
      labels = Object.keys(data); values = Object.values(data); title = 'Uso de receitas'; datasetLabel = 'Nº de usos';
      onClick = (label, value) => this.showInfoModal?.(`Receita: ${label}`, `<p>A receita <strong>${label}</strong> apareceu <strong>${value}</strong> vez(es).</p>`);
    } else if (dataType === 'rotina_semana') {
      const data = this.getPlannerWeekLoadData();
      labels = Object.keys(data); values = Object.values(data); title = 'Carga da semana'; datasetLabel = 'Refeições planejadas';
      onClick = (label, value) => this.showInfoModal?.(label, `<p>Há <strong>${value}</strong> refeição(ões) planejada(s) em <strong>${label}</strong>.</p>`);
    }

    return { labels, values, title, datasetLabel, onClick };
  };

  app.getAnalysisSnapshot = function(dataType = 'gastos_categoria') {
    const bundle = this.getAnalysisDataBundle(dataType);
    const labels = bundle.labels || [];
    const values = bundle.values || [];
    const total = values.reduce((sum, value) => sum + (Number(value) || 0), 0);
    if (!labels.length || !values.length || total <= 0) {
      return {
        headline: 'Ainda não há dados suficientes nesta visão.',
        insight: 'Adicione listas, itens na despensa, receitas ou planejamentos para liberar uma leitura mais rica.',
        action: 'Comece por uma lista de compras ou pela despensa para alimentar as análises.'
      };
    }
    const pairs = labels.map((label, index) => ({ label, value: Number(values[index]) || 0 })).sort((a, b) => b.value - a.value);
    const top = pairs[0];
    const share = total > 0 ? ((top.value / total) * 100) : 0;
    const moneyView = dataType.includes('gastos');
    const fmt = moneyView ? `R$ ${top.value.toFixed(2)}` : `${top.value}`;
    const secondary = pairs[1];
    return {
      headline: `${top.label} lidera esta leitura com ${fmt}${moneyView ? '' : ' registro(s)'}.`,
      insight: secondary ? `${top.label} representa ${share.toFixed(0)}% da visão atual, acima de ${secondary.label}.` : `${top.label} concentra praticamente toda a leitura disponível agora.`,
      action: moneyView
        ? `Revise ${top.label.toLowerCase()} primeiro para cortar excesso sem bagunçar a rotina.`
        : `Priorize ${top.label.toLowerCase()} agora para reduzir risco, melhorar uso e organizar melhor a rotina.`
    };
  };

  app.callGeminiAPI = async function(userText) {
    const local = this.runChefLocalIntent(userText);
    if (local) return { json: local, html: null };

    if (!this.isChefScopeQuery(userText)) {
      return {
        json: {
          intent: 'answer_question',
          data: {},
          response_text_html: `${this.getChefRedirectMessage()}<br><br><small style="opacity:.82">Posso, por exemplo, montar uma lista, sugerir receitas, organizar a despensa, planejar a semana ou analisar seus gastos.</small>`
        },
        html: null
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const response = await fetch('/api/chef', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ message: userText })
      });
      clearTimeout(timer);
      const data = await response.json();
      const reply = data.reply || data.content || 'Não consegui responder agora.';
      return { json: { intent: 'answer_question', data: {}, response_text_html: this.escapeHtml ? this.escapeHtml(reply) : reply }, html: null };
    } catch (e) {
      return { json: { intent: 'answer_question', data: {}, response_text_html: 'Não consegui responder agora. Tente reformular em uma frase curta.' }, html: null };
    }
  };

  app.setupChatbotModal = function() {
    const modal = document.getElementById('ai-chat-modal');
    if (!modal || modal.dataset.chefBound4560 === 'true') return;
    const sendBtn = modal.querySelector('#ai-chat-send-btn');
    const input = modal.querySelector('#ai-chat-input');
    const messages = modal.querySelector('#ai-chat-messages-container');
    const voiceBtn = modal.querySelector('#ai-voice-btn');

    const greetIfEmpty = () => {
      if (!messages.children.length) {
        const welcome = document.createElement('div');
        welcome.className = 'chat-message ia';
        welcome.innerHTML = '<div class="bubble">Olá. Posso ajudar com compras, receitas, despensa, planejamento e análises.</div>';
        messages.appendChild(welcome);
      }
    };

    const sendMessage = () => {
      const userText = String(input?.value || '').trim();
      if (!userText || this.isIAProcessing) return;
      input.value = '';
      const userMessage = document.createElement('div');
      userMessage.className = 'chat-message user';
      userMessage.innerHTML = `<div class="bubble">${this.escapeHtml ? this.escapeHtml(userText) : userText}</div>`;
      messages.appendChild(userMessage);
      messages.scrollTop = messages.scrollHeight;
      this.triggerChefIAAnalysis(userText);
    };

    if (voiceBtn) voiceBtn.onclick = () => this.startVoiceRecognition?.();
    if (sendBtn) sendBtn.onclick = sendMessage;
    if (input) {
      input.onkeyup = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      };
    }

    messages.onclick = (e) => {
      const button = e.target.closest('[data-action]');
      if (!button) return;
      const { action, listId, recipeId, module } = button.dataset;
      if (action === 'view-list' && listId) {
        this.closeAllModals?.();
        this.activeListId = listId;
        this.activateModuleAndRender?.('lista');
      } else if (action === 'view-recipe' && recipeId) {
        this.closeAllModals?.();
        this.activateModuleAndRender?.('receitas');
        setTimeout(() => {
          if (window.innerWidth < 992) this.showRecipeDetailModal?.(recipeId);
          else this.renderRecipeDetail?.(recipeId);
        }, 80);
      } else if (action === 'open-module' && module) {
        this.closeAllModals?.();
        this.activateModuleAndRender?.(module);
      }
    };

    greetIfEmpty();
    modal.dataset.chefBound4560 = 'true';
  };

  app.renderAnalises = function(container) {
    if (!container) container = document.getElementById('module-analises');
    if (!container) return;

    const analysisOptions = this.getAnalysisOptions();
    const spend = Object.values(this.getCategoryDataFromLists()).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
    const pantryStats = this.getPantryValidityData();
    const plannerUsage = this.getPlannerMealCountData();
    const plannedCount = Object.values(plannerUsage).reduce((sum, value) => sum + (parseInt(value, 10) || 0), 0);
    const nav = Object.entries(analysisOptions).map(([key, cfg], index) => `
      <button type="button" class="module-nav-item analysis-nav-item ${index === 0 ? 'active' : ''}" data-analysis-key="${key}">
        <strong>${cfg.label}</strong>
        <span>${cfg.note}</span>
      </button>`).join('');

    container.innerHTML = `
      <div class="analysis-shell-2100">
        <div class="analysis-top-grid">
          <div class="dashboard-card analysis-stage-card" id="analises-detail-desktop"></div>
          <div class="analysis-side-stack">
            <div class="analysis-kpi-grid-compact">
              <div class="analysis-kpi-card"><strong>R$ ${spend.toFixed(2)}</strong><small>gasto mapeado nas listas</small></div>
              <div class="analysis-kpi-card"><strong>${(this.state.despensa || []).length}</strong><small>itens na despensa</small></div>
              <div class="analysis-kpi-card"><strong>${pantryStats.vencidos + pantryStats.vencendo}</strong><small>itens que pedem atenção imediata</small></div>
              <div class="analysis-kpi-card"><strong>${plannedCount}</strong><small>refeições associadas ao planejador</small></div>
            </div>
            <div class="dashboard-card analysis-picker-card">
              <div class="card-header analysis-premium-header">
                <h3><i class="fa-solid fa-chart-line"></i> Análises</h3>
                <div class="card-actions">${this.buildChefButton('Analise meus dados do app e me dê prioridades claras de economia, desperdício e organização.', 'Chef IA')}</div>
              </div>
              <div class="card-content">
                <p class="detail-note analysis-premium-note">O gráfico principal aparece primeiro. À direita, você troca a leitura sem perder clareza.</p>
                <div class="module-nav-list analysis-nav-grid">${nav}</div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    this.renderAnalysisDetailDesktop('gastos_categoria');
  };

  app.renderAnalysisDetailDesktop = function(analysisKey = 'gastos_categoria') {
    const container = document.getElementById('analises-detail-desktop');
    if (!container) return;
    const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
    const defaultType = analysisKey === 'rotina_semana' ? 'bar' : analysisKey.includes('gastos') ? 'doughnut' : analysisKey.includes('uso') ? 'bar' : 'bar';
    const snapshot = this.getAnalysisSnapshot(analysisKey);

    container.innerHTML = `
      <div class="card-header analysis-premium-header">
        <h3><i class="${cfg.icon}"></i> ${cfg.label}</h3>
        <div class="card-actions">${this.buildChefButton(`Analise ${cfg.label} e me diga oportunidades de economia, desperdício e organização.`, 'Chef IA')}</div>
      </div>
      <div class="card-content analysis-premium-content">
        <p class="detail-note analysis-premium-note">${cfg.note}</p>
        <div class="analysis-config-panel">
          <div class="form-group">
            <label for="analysis-data-select">Analisar</label>
            <select id="analysis-data-select">${this.getAnalysisSelectOptionsHTML(analysisKey)}</select>
          </div>
          <div class="form-group">
            <label for="analysis-type-select">Tipo de gráfico</label>
            <select id="analysis-type-select">${this.getChartTypeOptionsHTML(defaultType)}</select>
          </div>
        </div>
        <div class="chart-canvas-container analysis-premium-chart"><canvas id="dynamic-analysis-chart"></canvas></div>
        <div class="analysis-quick-summary">
          <div class="mini"><strong>Leitura imediata</strong><span>${snapshot.headline}</span></div>
          <div class="mini"><strong>O que isso diz</strong><span>${snapshot.insight}</span></div>
          <div class="mini"><strong>Próxima ação</strong><span>${snapshot.action}</span></div>
        </div>
      </div>
      <div class="card-footer module-actions-footer compact-export-row analysis-premium-actions">
        ${this.buildChefButton(`Resuma ${cfg.label} para mim com clareza, prioridade e ação.`, 'Chef IA', 'chef-glass-btn')}
        ${this.buildExportButtons(`data-analysis="${analysisKey}"`)}
      </div>`;

    document.getElementById('analysis-data-select')?.addEventListener('change', (e) => {
      this.renderAnalysisDetailDesktop(e.target.value);
      document.querySelectorAll('.analysis-nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.analysisKey === e.target.value));
    });
    document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
    this.updateDynamicChart();
  };

  app.openAnalysisDetailModal = function(analysisKey = 'gastos_categoria') {
    const cfg = this.getAnalysisOptions()[analysisKey] || this.getAnalysisOptions().gastos_categoria;
    const snapshot = this.getAnalysisSnapshot(analysisKey);
    const titleEl = document.getElementById('detail-modal-title');
    const bodyEl = document.getElementById('detail-modal-body');
    const footerEl = document.getElementById('detail-modal-footer');
    const headerActionsEl = document.getElementById('detail-modal-header-actions');
    titleEl.innerHTML = `<i class="${cfg.icon}"></i> ${cfg.label}`;
    headerActionsEl.innerHTML = this.buildChefButton(`Faça uma leitura 360 graus de ${cfg.label} no meu painel.`, 'Chef IA');
    bodyEl.innerHTML = `
      <div class="analysis-premium-modal">
        <p class="detail-note analysis-premium-note">${cfg.note}</p>
        <div class="analysis-config-panel">
          <div class="form-group"><label for="analysis-data-select">Analisar</label><select id="analysis-data-select">${this.getAnalysisSelectOptionsHTML(analysisKey)}</select></div>
          <div class="form-group"><label for="analysis-type-select">Tipo de gráfico</label><select id="analysis-type-select">${this.getChartTypeOptionsHTML(analysisKey.includes('gastos') ? 'doughnut' : 'bar')}</select></div>
        </div>
        <div class="chart-canvas-container analysis-premium-chart"><canvas id="dynamic-analysis-chart"></canvas></div>
        <div class="analysis-quick-summary">
          <div class="mini"><strong>Leitura imediata</strong><span>${snapshot.headline}</span></div>
          <div class="mini"><strong>O que isso diz</strong><span>${snapshot.insight}</span></div>
          <div class="mini"><strong>Próxima ação</strong><span>${snapshot.action}</span></div>
        </div>
      </div>`;
    footerEl.className = 'modal-footer detail-modal-footer compact-export-row';
    footerEl.innerHTML = `${this.buildChefButton(`Resuma ${cfg.label} para mim em linguagem simples, estratégica e elegante.`, 'Chef IA', 'chef-glass-btn')}${this.buildExportButtons(`data-analysis="${analysisKey}"`)}`;
    document.getElementById('analysis-data-select')?.addEventListener('change', (e) => {
      this.openAnalysisDetailModal(e.target.value);
      document.querySelectorAll('.analysis-nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.analysisKey === e.target.value));
    });
    document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
    this.updateDynamicChart();
    this.openModal('detail-modal');
  };

  app.updateDynamicChart = function() {
    const canvas = document.getElementById('dynamic-analysis-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const dataType = document.getElementById('analysis-data-select')?.value || 'gastos_categoria';
    const chartType = document.getElementById('analysis-type-select')?.value || 'doughnut';
    const bundle = this.getAnalysisDataBundle(dataType);
    const labels = bundle.labels || [];
    const values = (bundle.values || []).map(v => Number(v) || 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    const chartWrap = canvas.closest('.analysis-premium-chart');
    if (chartWrap) {
      const empty = chartWrap.querySelector('.analysis-empty-state');
      if (empty) empty.remove();
      canvas.style.display = '';
    }

    if (this.dynamicAnalysisChart?.destroy) this.dynamicAnalysisChart.destroy();

    if (!labels.length || total <= 0) {
      canvas.style.display = 'none';
      if (chartWrap) {
        const empty = document.createElement('div');
        empty.className = 'analysis-empty-state';
        empty.innerHTML = '<div><strong>Sem dados suficientes nesta visão.</strong><span>Adicione listas, itens na despensa, receitas ou planejamentos para liberar este gráfico.</span></div>';
        chartWrap.appendChild(empty);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    this.dynamicAnalysisChart = new Chart(ctx, {
      type: chartType,
      data: {
        labels,
        datasets: [{
          label: bundle.datasetLabel || bundle.title || 'Dados',
          data: values,
          borderWidth: 1.5,
          tension: 0.34,
          fill: chartType === 'line' || chartType === 'radar' ? false : true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: chartType !== 'bar', labels: { color: '#f3f6fb', boxWidth: 12, usePointStyle: true } },
          title: { display: true, text: bundle.title || 'Análise', color: '#ffffff', font: { size: 15, weight: '600' }, padding: { bottom: 14 } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = Number(ctx.parsed?.y ?? ctx.parsed ?? 0);
                return (dataType.includes('gastos')) ? `R$ ${value.toFixed(2)}` : `${value}`;
              }
            }
          }
        },
        scales: (chartType === 'bar' || chartType === 'line') ? {
          x: { ticks: { color: 'rgba(255,255,255,.78)' }, grid: { color: 'rgba(255,255,255,.07)' } },
          y: { beginAtZero: true, ticks: { color: 'rgba(255,255,255,.78)' }, grid: { color: 'rgba(255,255,255,.07)' } }
        } : {},
        onClick: (_evt, elements) => {
          if (!elements.length || typeof bundle.onClick !== 'function') return;
          const el = elements[0];
          bundle.onClick(labels[el.index], values[el.index], el.index);
        }
      }
    });
  };

  setTimeout(() => {
    try { app.setupChatbotModal?.(); } catch (e) {}
    try { if (app.isAppMode && app.activeModule === 'analises') app.renderAnalises?.(); } catch (e) {}
  }, 60);
})();

(() => {
  const app = window.app;
  if (!app) return;

  app.analysisPreferredDefaults = {
    overview_360: 'radar',
    validade_despensa: 'pie',
    estoque_despensa: 'doughnut',
    gastos_categoria: 'doughnut',
    gastos_lista: 'bar',
    uso_receitas: 'bar',
    rotina_semana: 'line'
  };

  app.getAnalysisOptions = function() {
    return {
      validade_despensa: { icon: 'fa-solid fa-hourglass-half', label: 'Validade da despensa', note: 'Veja rapidamente o que está vencido, vencendo ou seguro na sua despensa.' },
      overview_360: { icon: 'fa-solid fa-globe', label: 'Visão 360° do painel', note: 'Uma leitura ampla conectando listas, despensa, receitas e planejador.' },
      gastos_categoria: { icon: 'fa-solid fa-layer-group', label: 'Gastos por categoria', note: 'Entenda onde o orçamento está concentrado dentro das listas.' },
      gastos_lista: { icon: 'fa-solid fa-cart-shopping', label: 'Total por lista', note: 'Compare rapidamente o peso financeiro de cada lista salva.' },
      estoque_despensa: { icon: 'fa-solid fa-boxes-stacked', label: 'Nível de estoque', note: 'Identifique equilíbrio, excesso ou risco de falta na despensa.' },
      uso_receitas: { icon: 'fa-solid fa-utensils', label: 'Uso de receitas', note: 'Saiba quais receitas aparecem mais no seu planejamento.' },
      rotina_semana: { icon: 'fa-solid fa-calendar-days', label: 'Carga da semana', note: 'Descubra quais dias recebem mais refeições planejadas.' }
    };
  };

  app.getAnalysisSelectOptionsHTML = function(selectedKey = 'validade_despensa') {
    return Object.entries(this.getAnalysisOptions()).map(([key, cfg]) => `<option value="${key}" ${key === selectedKey ? 'selected' : ''}>${cfg.label}</option>`).join('');
  };

  app.getChartTypeOptionsHTML = function(selectedKey = 'pie') {
    const options = [
      ['pie', 'Pizza'],
      ['doughnut', 'Rosca'],
      ['bar', 'Barras'],
      ['line', 'Linha'],
      ['polarArea', 'Polar'],
      ['radar', 'Radar']
    ];
    return options.map(([key, label]) => `<option value="${key}" ${key === selectedKey ? 'selected' : ''}>${label}</option>`).join('');
  };

  app.getCategoryDataFromListsSafe = function() {
    try {
      if (typeof this.getCategoryDataFromLists === 'function') return this.getCategoryDataFromLists() || {};
    } catch (e) {}
    const map = {};
    Object.values(this.state?.listas || {}).forEach((lista, listIndex) => {
      (lista.items || []).forEach((item) => {
        const bucket = item.categoria || item.category || item.tipo || `Categoria ${listIndex + 1}`;
        map[bucket] = (map[bucket] || 0) + ((parseFloat(item.qtd) || 0) * (parseFloat(item.valor) || 0));
      });
    });
    return map;
  };

  app.getListTotalsData = function() {
    const data = {};
    Object.entries(this.state?.listas || {}).forEach(([id, lista], idx) => {
      const total = (lista.items || []).reduce((sum, item) => sum + ((parseFloat(item.qtd) || 0) * (parseFloat(item.valor) || 0)), 0);
      data[lista.nome || `Lista ${idx + 1}`] = Number(total.toFixed(2));
    });
    return data;
  };

  app.getPantryValidityData = function() {
    const today = new Date();
    const normalizeDate = (value) => {
      if (!value) return null;
      const d = new Date(value + 'T12:00:00');
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const result = { vencidos: 0, vencendo: 0, seguros: 0, sem_validade: 0 };
    (this.state?.despensa || []).forEach((item) => {
      const d = normalizeDate(item.validade);
      if (!d) {
        result.sem_validade += 1;
        return;
      }
      const diff = Math.ceil((d - today) / 86400000);
      if (diff < 0) result.vencidos += 1;
      else if (diff <= 7) result.vencendo += 1;
      else result.seguros += 1;
    });
    return result;
  };

  app.getPantryStockBandsData = function() {
    const bands = { 'Baixo estoque': 0, 'Estoque médio': 0, 'Estoque alto': 0 };
    (this.state?.despensa || []).forEach((item) => {
      const stock = parseInt(item.stock || 0, 10);
      if (stock <= 25) bands['Baixo estoque'] += 1;
      else if (stock <= 75) bands['Estoque médio'] += 1;
      else bands['Estoque alto'] += 1;
    });
    return bands;
  };

  app.getPlannerMealCountData = function() {
    const usage = {};
    Object.values(this.state?.planejador || {}).forEach((day) => {
      Object.values(day || {}).forEach((meal) => {
        if (!meal || !meal.id) return;
        const recipe = this.state?.receitas?.[meal.id];
        const name = recipe?.name || meal.nome || `Receita ${meal.id}`;
        usage[name] = (usage[name] || 0) + 1;
      });
    });
    return usage;
  };

  app.getPlannerWeekLoadData = function() {
    const mapping = [
      ['seg', 'Segunda'],
      ['ter', 'Terça'],
      ['qua', 'Quarta'],
      ['qui', 'Quinta'],
      ['sex', 'Sexta'],
      ['sab', 'Sábado'],
      ['dom', 'Domingo']
    ];
    const data = {};
    mapping.forEach(([key, label]) => {
      const day = this.state?.planejador?.[key] || {};
      data[label] = Object.values(day).filter(Boolean).length;
    });
    return data;
  };

  app.getAnalysisDataBundle = function(dataType = 'validade_despensa') {
    const money = (n) => `R$ ${Number(n || 0).toFixed(2)}`;
    const bundles = {
      validade_despensa: () => {
        const d = this.getPantryValidityData();
        return {
          title: 'Itens da despensa por validade',
          datasetLabel: 'Itens',
          labels: ['Vencidos', 'Vencendo', 'Seguros', 'Sem validade'],
          values: [d.vencidos, d.vencendo, d.seguros, d.sem_validade],
          valueFormatter: (v) => `${v} item(ns)`,
          insight: d.vencidos > 0 ? `Você já tem ${d.vencidos} item(ns) vencido(s).` : 'Sua despensa não tem itens vencidos agora.',
          action: d.vencendo > 0 ? `Priorize ${d.vencendo} item(ns) que vencem em até 7 dias.` : 'No momento, a urgência por validade está controlada.',
          headline: `${d.vencidos + d.vencendo} item(ns) pedem atenção imediata.`
        };
      },
      overview_360: () => {
        const validity = this.getPantryValidityData();
        const categories = this.getCategoryDataFromListsSafe();
        const planner = this.getPlannerMealCountData();
        const lists = this.getListTotalsData();
        const totalSpend = Object.values(categories).reduce((s, v) => s + (Number(v) || 0), 0);
        return {
          title: 'Visão 360° do sistema',
          datasetLabel: 'Painel',
          labels: ['Gasto mapeado', 'Itens despensa', 'Atenção validade', 'Receitas usadas', 'Listas ativas'],
          values: [
            Number(totalSpend.toFixed(2)),
            (this.state?.despensa || []).length,
            validity.vencidos + validity.vencendo,
            Object.values(planner).reduce((s, v) => s + v, 0),
            Object.keys(this.state?.listas || {}).length
          ],
          valueFormatter: (v, idx) => idx === 0 ? money(v) : `${v}`,
          insight: totalSpend > 0 ? `Seu painel já registra ${money(totalSpend)} em gastos estimados.` : 'Seu painel ainda tem poucos dados financeiros mapeados.',
          action: validity.vencidos + validity.vencendo > 0 ? 'Use a análise de validade para atacar desperdício primeiro.' : 'Agora vale explorar gastos e rotina para otimizar compras.',
          headline: `${Object.keys(lists).length} lista(s), ${(this.state?.despensa || []).length} item(ns) em estoque e ${Object.values(planner).reduce((s, v) => s + v, 0)} uso(s) no planejador.`
        };
      },
      gastos_categoria: () => {
        const data = this.getCategoryDataFromListsSafe();
        const labels = Object.keys(data);
        const values = labels.map((k) => Number(data[k] || 0));
        const topIndex = values.reduce((best, value, idx, arr) => value > (arr[best] || 0) ? idx : best, 0);
        return {
          title: 'Gastos por categoria',
          datasetLabel: 'Gasto estimado',
          labels,
          values,
          valueFormatter: (v) => money(v),
          insight: labels.length ? `${labels[topIndex]} concentra a maior parte do gasto atual.` : 'Ainda não há categorias suficientes para leitura.',
          action: labels.length ? 'Compare a categoria líder com a segunda maior para cortar excessos.' : 'Cadastre preços e itens nas listas para liberar essa visão.',
          headline: labels.length ? `${labels.length} categoria(s) com gasto rastreado.` : 'Sem categorias para analisar.'
        };
      },
      gastos_lista: () => {
        const data = this.getListTotalsData();
        const labels = Object.keys(data);
        const values = labels.map((k) => Number(data[k] || 0));
        const max = Math.max(0, ...values);
        const top = labels[values.indexOf(max)] || 'Nenhuma';
        return {
          title: 'Total estimado por lista',
          datasetLabel: 'Total',
          labels,
          values,
          valueFormatter: (v) => money(v),
          insight: labels.length ? `${top} é a lista financeiramente mais pesada agora.` : 'Você ainda não tem listas suficientes para comparação.',
          action: labels.length ? 'Revise os itens da lista mais cara e veja o que pode ser redistribuído.' : 'Crie mais de uma lista para comparar prioridades.',
          headline: labels.length ? `${labels.length} lista(s) com custo estimado calculado.` : 'Sem listas comparáveis.'
        };
      },
      estoque_despensa: () => {
        const data = this.getPantryStockBandsData();
        return {
          title: 'Faixas de estoque da despensa',
          datasetLabel: 'Itens',
          labels: Object.keys(data),
          values: Object.values(data),
          valueFormatter: (v) => `${v} item(ns)`,
          insight: data['Baixo estoque'] > 0 ? `${data['Baixo estoque']} item(ns) estão com estoque baixo.` : 'Seu nível de estoque baixo está sob controle.',
          action: data['Baixo estoque'] > data['Estoque alto'] ? 'Priorize reposição dos itens essenciais antes de ampliar variedade.' : 'Mantenha equilíbrio para evitar excesso parado.',
          headline: `${(this.state?.despensa || []).length} item(ns) distribuídos por nível de estoque.`
        };
      },
      uso_receitas: () => {
        const data = this.getPlannerMealCountData();
        const labels = Object.keys(data);
        const values = labels.map((k) => Number(data[k] || 0));
        return {
          title: 'Uso de receitas no planejador',
          datasetLabel: 'Usos',
          labels,
          values,
          valueFormatter: (v) => `${v} uso(s)`,
          insight: labels.length ? `${labels[0]} aparece dentro do seu histórico planejado.` : 'Ainda não há receitas usadas no planejador.',
          action: labels.length ? 'Use as receitas mais repetidas para montar listas mais inteligentes.' : 'Adicione receitas no planejador para gerar inteligência aqui.',
          headline: labels.length ? `${values.reduce((s, v) => s + v, 0)} uso(s) de receita detectados.` : 'Sem receitas planejadas.'
        };
      },
      rotina_semana: () => {
        const data = this.getPlannerWeekLoadData();
        const labels = Object.keys(data);
        const values = Object.values(data).map((v) => Number(v || 0));
        const max = Math.max(0, ...values);
        const top = labels[values.indexOf(max)] || 'Nenhum dia';
        return {
          title: 'Carga de refeições por dia',
          datasetLabel: 'Refeições',
          labels,
          values,
          valueFormatter: (v) => `${v} refeição(ões)`,
          insight: max > 0 ? `${top} é o dia com maior carga planejada.` : 'Sua semana ainda não tem refeições distribuídas.',
          action: max > 0 ? 'Espalhe melhor os preparos para reduzir correria e desperdício.' : 'Planeje a semana para revelar padrão e gargalos.',
          headline: `${values.reduce((s, v) => s + v, 0)} refeição(ões) planejadas na semana.`
        };
      }
    };

    const fallback = bundles.validade_despensa;
    return (bundles[dataType] || fallback).call(this);
  };

  app.getAnalysisColorPalette = function(count = 6) {
    const base = [
      'rgba(0,242,234,0.92)',
      'rgba(252,235,154,0.92)',
      'rgba(175,82,222,0.92)',
      'rgba(52,199,89,0.92)',
      'rgba(255,59,48,0.92)',
      'rgba(255,204,0,0.92)',
      'rgba(90,200,250,0.92)',
      'rgba(255,149,0,0.92)'
    ];
    return Array.from({ length: count }, (_, i) => base[i % base.length]);
  };

  app.getAnalysisSnapshot = function(key = 'validade_despensa') {
    const bundle = this.getAnalysisDataBundle(key);
    return {
      headline: bundle.headline || bundle.title || 'Painel pronto',
      insight: bundle.insight || 'Leitura gerada com base nos dados atuais.',
      action: bundle.action || 'Use os filtros acima para aprofundar a análise.'
    };
  };

  app.analysisState = { key: 'validade_despensa', type: 'pie' };

  app.renderAnalises = function(container) {
    if (!container) container = document.getElementById('module-analises');
    if (!container) return;

    const analysisOptions = this.getAnalysisOptions();
    const activeKey = this.analysisState?.key && analysisOptions[this.analysisState.key] ? this.analysisState.key : 'validade_despensa';
    const defaultType = this.analysisState?.type || this.analysisPreferredDefaults[activeKey] || 'pie';
    this.analysisState = { key: activeKey, type: defaultType };

    const validity = this.getPantryValidityData();
    const spend = Object.values(this.getCategoryDataFromListsSafe()).reduce((s, v) => s + (Number(v) || 0), 0);
    const plannerUsage = this.getPlannerMealCountData();
    const plannerCount = Object.values(plannerUsage).reduce((s, v) => s + (Number(v) || 0), 0);
    const totalLists = Object.keys(this.state?.listas || {}).length;
    const snap = this.getAnalysisSnapshot(activeKey);

    const pills = Object.entries(analysisOptions).map(([key, cfg]) => `
      <button type="button" class="analysis-360-pill ${key === activeKey ? 'active' : ''}" data-analysis-pill="${key}">
        <i class="${cfg.icon}"></i> ${cfg.label}
      </button>`).join('');

    container.innerHTML = `
      <section class="analysis-360-shell">
        <div class="analysis-360-topbar">
          <article class="analysis-360-hero">
            <div>
              <div class="analysis-360-eyebrow"><i class="fa-solid fa-chart-pie"></i> inteligência visual premium</div>
              <h2 class="analysis-360-title">Clicou em Análises, já vê gráfico de cara.</h2>
              <p class="analysis-360-subtitle">A primeira visão abre imediatamente com os itens da despensa por validade. Depois, com uma seta elegante, o cliente pode trocar tanto a análise quanto o tipo de gráfico e navegar pelo painel inteiro.</p>
            </div>
            <div class="analysis-360-chip-row">
              <div class="analysis-360-chip"><i class="fa-solid fa-hourglass-half"></i> padrão inicial: validade da despensa</div>
              <div class="analysis-360-chip"><i class="fa-solid fa-arrows-rotate"></i> troca rápida de análise e gráfico</div>
              <div class="analysis-360-chip"><i class="fa-solid fa-mobile-screen-button"></i> pronto para mobile e desktop</div>
            </div>
          </article>

          <aside class="analysis-360-summary">
            <h3><i class="fa-solid fa-sparkles"></i> Leitura imediata</h3>
            <div class="analysis-360-summary-list">
              <div class="analysis-360-summary-item"><strong>${snap.headline}</strong><span>${snap.insight}</span></div>
              <div class="analysis-360-summary-item"><strong>Próxima ação</strong><span>${snap.action}</span></div>
            </div>
          </aside>
        </div>

        <div class="analysis-360-kpi-grid">
          <article class="analysis-360-kpi"><small>Gasto mapeado nas listas</small><strong>R$ ${spend.toFixed(2)}</strong></article>
          <article class="analysis-360-kpi"><small>Itens na despensa</small><strong>${(this.state?.despensa || []).length}</strong></article>
          <article class="analysis-360-kpi"><small>Itens que pedem atenção</small><strong>${validity.vencidos + validity.vencendo}</strong></article>
          <article class="analysis-360-kpi"><small>Usos de receitas no planejador</small><strong>${plannerCount}</strong></article>
        </div>

        <div class="analysis-360-main">
          <article class="analysis-360-chart-card">
            <div class="analysis-360-chart-head">
              <h3><i class="fa-solid fa-chart-simple"></i> Painel principal</h3>
              <div class="analysis-360-current-badge" id="analysis-current-badge"><i class="${analysisOptions[activeKey].icon}"></i> ${analysisOptions[activeKey].label}</div>
            </div>

            <div class="analysis-360-controls">
              <div class="analysis-360-control">
                <label for="analysis-data-select">O que analisar</label>
                <div class="analysis-360-select-wrap">
                  <select id="analysis-data-select" class="analysis-360-select">${this.getAnalysisSelectOptionsHTML(activeKey)}</select>
                </div>
              </div>
              <div class="analysis-360-control">
                <label for="analysis-type-select">Tipo de gráfico</label>
                <div class="analysis-360-select-wrap">
                  <select id="analysis-type-select" class="analysis-360-select">${this.getChartTypeOptionsHTML(defaultType)}</select>
                </div>
              </div>
              <div class="analysis-360-arrow-group">
                <button type="button" class="analysis-360-ghost-btn" id="analysis-prev-btn" aria-label="Análise anterior" title="Análise anterior"><i class="fa-solid fa-arrow-left"></i></button>
                <button type="button" class="analysis-360-ghost-btn" id="analysis-next-btn" aria-label="Próxima análise" title="Próxima análise"><i class="fa-solid fa-arrow-right"></i></button>
              </div>
            </div>

            <div class="analysis-360-canvas-wrap">
              <canvas id="dynamic-analysis-chart"></canvas>
            </div>

            <div class="analysis-360-meta-grid">
              <div class="analysis-360-meta-card"><strong>Visão imediata</strong><span id="analysis-meta-headline">${snap.headline}</span></div>
              <div class="analysis-360-meta-card"><strong>O que isso diz</strong><span id="analysis-meta-insight">${snap.insight}</span></div>
              <div class="analysis-360-meta-card"><strong>O que fazer agora</strong><span id="analysis-meta-action">${snap.action}</span></div>
            </div>
          </article>

          <aside class="analysis-360-explorer">
            <div class="analysis-360-explorer-head">
              <h3><i class="fa-solid fa-compass-drafting"></i> Explorador 360°</h3>
            </div>
            <div class="analysis-360-pills">${pills}</div>
            <div class="analysis-360-mini-list" id="analysis-mini-list">
              <div class="analysis-360-mini-item"><i class="fa-solid fa-wallet"></i><div><strong>${totalLists} lista(s)</strong><span>base ativa para leitura financeira</span></div><em>listas</em></div>
              <div class="analysis-360-mini-item"><i class="fa-solid fa-box-archive"></i><div><strong>${(this.state?.despensa || []).length} item(ns)</strong><span>estoque pronto para cruzar com validade</span></div><em>despensa</em></div>
              <div class="analysis-360-mini-item"><i class="fa-solid fa-utensils"></i><div><strong>${Object.keys(this.state?.receitas || {}).length} receita(s)</strong><span>catálogo disponível para o planejador</span></div><em>receitas</em></div>
              <div class="analysis-360-mini-item"><i class="fa-solid fa-calendar-week"></i><div><strong>${plannerCount} uso(s)</strong><span>atividade detectada no planejador</span></div><em>planejador</em></div>
            </div>
          </aside>
        </div>
      </section>`;

    const dataSelect = document.getElementById('analysis-data-select');
    const typeSelect = document.getElementById('analysis-type-select');
    const keys = Object.keys(analysisOptions);

    const syncPills = () => {
      document.querySelectorAll('[data-analysis-pill]').forEach((btn) => btn.classList.toggle('active', btn.dataset.analysisPill === this.analysisState.key));
    };

    const applyAnalysisKey = (key) => {
      const nextKey = analysisOptions[key] ? key : 'validade_despensa';
      this.analysisState.key = nextKey;
      const preferredType = this.analysisPreferredDefaults[nextKey] || this.analysisState.type || 'pie';
      this.analysisState.type = preferredType;
      if (dataSelect) dataSelect.value = nextKey;
      if (typeSelect) typeSelect.innerHTML = this.getChartTypeOptionsHTML(preferredType), typeSelect.value = preferredType;
      syncPills();
      this.updateDynamicChart();
    };

    dataSelect?.addEventListener('change', (e) => {
      this.analysisState.key = e.target.value;
      if (typeSelect) {
        const preferredType = this.analysisPreferredDefaults[e.target.value] || 'pie';
        typeSelect.value = preferredType;
        this.analysisState.type = preferredType;
      }
      syncPills();
      this.updateDynamicChart();
    });

    typeSelect?.addEventListener('change', (e) => {
      this.analysisState.type = e.target.value;
      this.updateDynamicChart();
    });

    document.getElementById('analysis-prev-btn')?.addEventListener('click', () => {
      const index = keys.indexOf(this.analysisState.key);
      applyAnalysisKey(keys[(index - 1 + keys.length) % keys.length]);
    });

    document.getElementById('analysis-next-btn')?.addEventListener('click', () => {
      const index = keys.indexOf(this.analysisState.key);
      applyAnalysisKey(keys[(index + 1) % keys.length]);
    });

    document.querySelectorAll('[data-analysis-pill]').forEach((btn) => {
      btn.addEventListener('click', () => applyAnalysisKey(btn.dataset.analysisPill));
    });

    this.updateDynamicChart();
  };

  app.updateDynamicChart = function() {
    const canvas = document.getElementById('dynamic-analysis-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const dataType = document.getElementById('analysis-data-select')?.value || this.analysisState?.key || 'validade_despensa';
    const chartType = document.getElementById('analysis-type-select')?.value || this.analysisState?.type || this.analysisPreferredDefaults[dataType] || 'pie';
    this.analysisState = { key: dataType, type: chartType };

    const bundle = this.getAnalysisDataBundle(dataType);
    const labels = bundle.labels || [];
    const values = (bundle.values || []).map((v) => Number(v) || 0);
    const total = values.reduce((s, v) => s + v, 0);
    const wrap = canvas.closest('.analysis-360-canvas-wrap');
    if (!wrap) return;

    wrap.querySelector('.analysis-360-empty')?.remove();
    canvas.style.display = '';

    if (this.dynamicAnalysisChart?.destroy) this.dynamicAnalysisChart.destroy();

    const currentBadge = document.getElementById('analysis-current-badge');
    const cfg = this.getAnalysisOptions()[dataType] || this.getAnalysisOptions().validade_despensa;
    if (currentBadge) currentBadge.innerHTML = `<i class="${cfg.icon}"></i> ${cfg.label}`;
    const snapshot = this.getAnalysisSnapshot(dataType);
    const m1 = document.getElementById('analysis-meta-headline');
    const m2 = document.getElementById('analysis-meta-insight');
    const m3 = document.getElementById('analysis-meta-action');
    if (m1) m1.textContent = snapshot.headline;
    if (m2) m2.textContent = snapshot.insight;
    if (m3) m3.textContent = snapshot.action;

    if (!labels.length || total <= 0) {
      canvas.style.display = 'none';
      const empty = document.createElement('div');
      empty.className = 'analysis-360-empty';
      empty.innerHTML = '<div><strong>Sem dados suficientes nesta visão.</strong><span>Cadastre itens, preços, receitas ou planejamentos para liberar este gráfico.</span></div>';
      wrap.appendChild(empty);
      return;
    }

    const ctx = canvas.getContext('2d');
    const colors = this.getAnalysisColorPalette(labels.length);

    this.dynamicAnalysisChart = new Chart(ctx, {
      type: chartType,
      data: {
        labels,
        datasets: [{
          label: bundle.datasetLabel || 'Dados',
          data: values,
          backgroundColor: colors,
          borderColor: colors.map((c) => c.replace('0.92', '1')),
          borderWidth: 1.5,
          fill: chartType === 'line' || chartType === 'radar' ? false : true,
          tension: 0.35,
          pointRadius: chartType === 'line' ? 4 : 3,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 8 },
        plugins: {
          legend: {
            display: true,
            position: chartType === 'bar' ? 'bottom' : 'right',
            labels: {
              color: '#f4f7fb',
              usePointStyle: true,
              boxWidth: 10,
              padding: 14,
              font: { size: 12 }
            }
          },
          title: {
            display: true,
            text: bundle.title || cfg.label,
            color: '#ffffff',
            font: { size: 16, weight: '700' },
            padding: { bottom: 18 }
          },
          tooltip: {
            backgroundColor: 'rgba(8,10,14,.95)',
            borderColor: 'rgba(255,255,255,.10)',
            borderWidth: 1,
            titleColor: '#fff',
            bodyColor: '#fff',
            callbacks: {
              label: (context) => {
                const raw = Number(context.parsed?.y ?? context.parsed?.r ?? context.raw ?? 0);
                const idx = context.dataIndex ?? 0;
                return bundle.valueFormatter ? bundle.valueFormatter(raw, idx, context.label) : `${raw}`;
              }
            }
          }
        },
        scales: ['bar','line','radar'].includes(chartType) ? {
          x: { ticks: { color: 'rgba(255,255,255,.78)' }, grid: { color: 'rgba(255,255,255,.06)' } },
          y: { beginAtZero: true, ticks: { color: 'rgba(255,255,255,.78)' }, grid: { color: 'rgba(255,255,255,.06)' } },
          r: chartType === 'radar' ? { angleLines: { color: 'rgba(255,255,255,.08)' }, grid: { color: 'rgba(255,255,255,.08)' }, pointLabels: { color: 'rgba(255,255,255,.78)' }, ticks: { color: 'rgba(255,255,255,.58)', backdropColor: 'transparent' }, suggestedMin: 0 } : undefined
        } : {},
        animation: { duration: 650, easing: 'easeOutQuart' }
      }
    });
  };

  setTimeout(() => {
    try {
      if (app.isAppMode && app.activeModule === 'analises') app.renderAnalises();
    } catch (e) {}
  }, 60);
})();
(() => {
  const app = window.app;
  if (!app) return;

  const UNIT_OPTIONS = ['un','kg','g','L','ml','pct','cx','xícara','colher','pitada','dentes','a gosto','fio','filés'];
  const COMMON_INGREDIENTS = [
    { name: 'Arroz', unit_desc: 'kg' },
    { name: 'Feijão', unit_desc: 'kg' },
    { name: 'Tomate', unit_desc: 'un' },
    { name: 'Cebola', unit_desc: 'un' },
    { name: 'Alho', unit_desc: 'dentes' },
    { name: 'Banana', unit_desc: 'un' },
    { name: 'Batata', unit_desc: 'kg' },
    { name: 'Cenoura', unit_desc: 'un' },
    { name: 'Peito de Frango', unit_desc: 'filés' },
    { name: 'Carne Moída', unit_desc: 'kg' },
    { name: 'Macarrão', unit_desc: 'pct' },
    { name: 'Queijo', unit_desc: 'g' },
    { name: 'Leite', unit_desc: 'L' },
    { name: 'Ovo', unit_desc: 'un' },
    { name: 'Farinha de Trigo', unit_desc: 'kg' },
    { name: 'Óleo', unit_desc: 'L' },
    { name: 'Sal', unit_desc: 'a gosto' },
    { name: 'Pimenta', unit_desc: 'a gosto' },
    { name: 'Limão', unit_desc: 'un' },
    { name: 'Pastel', unit_desc: 'un' }
  ];

  app.normalizeSearchText = function(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  app.getAllIngredientSuggestions = function() {
    const catalog = (typeof ALL_ITEMS_DATA !== 'undefined' && Array.isArray(ALL_ITEMS_DATA))
      ? ALL_ITEMS_DATA
      : (Array.isArray(globalThis.ALL_ITEMS_DATA) ? globalThis.ALL_ITEMS_DATA : []);

    const merged = [
      ...catalog,
      ...(this.state?.despensa || []).map(item => ({ name: item.name, unit_desc: item.unid || 'un', price: Number(item.valor || 0) })),
      ...(this.state?.essenciais || []).map(item => ({ name: item.name, unit_desc: item.unid || 'un', price: Number(item.preco || 0) })),
      ...Object.values(this.state?.receitas || {}).flatMap(recipe => (recipe?.ingredients || []).map(ing => ({ name: ing.name, unit_desc: ing.unit || 'un', price: 0 }))),
      ...COMMON_INGREDIENTS
    ];

    const dedup = new Map();
    merged.forEach(item => {
      const name = String(item?.name || '').trim();
      if (!name) return;
      const key = this.normalizeSearchText(name);
      if (!key) return;
      if (!dedup.has(key)) dedup.set(key, { ...item, name });
    });
    return Array.from(dedup.values());
  };

  app._legacy_showAutocomplete_v2 = function(suggestions, query, inputElement) {
    const suggestionsEl = this.elements?.autocompleteSuggestions;
    if (!suggestionsEl || !inputElement) return;

    const q = this.normalizeSearchText(query || '');
    const renderLabel = (item) => {
      const original = String(item?.name || '');
      const isManual = original.startsWith('Insira manual:');
      if (!q || isManual) return this.escapeHtml(original);
      const originalWords = original.split(/(\s+)/);
      return originalWords.map(part => {
        if (!part.trim()) return part;
        return this.normalizeSearchText(part).includes(q)
          ? `<strong>${this.escapeHtml(part)}</strong>`
          : this.escapeHtml(part);
      }).join('');
    };

    suggestionsEl.innerHTML = suggestions.map(item => {
      const name = String(item?.name || '');
      const safeName = this.escapeHtml(name);
      const isManual = name.startsWith('Insira manual:');
      return `<button type="button" class="autocomplete-item" data-name="${safeName}" data-manual="${isManual ? '1' : '0'}">${renderLabel(item)}</button>`;
    }).join('');

    const rect = inputElement.getBoundingClientRect();
    suggestionsEl.style.position = 'fixed';
    suggestionsEl.style.left = `${Math.max(12, rect.left)}px`;
    suggestionsEl.style.top = `${Math.min(window.innerHeight - 16, rect.bottom + 6)}px`;
    suggestionsEl.style.width = `${Math.max(220, rect.width)}px`;
    suggestionsEl.style.maxWidth = 'calc(100vw - 24px)';
    suggestionsEl.style.display = 'block';
    this.activeAutocompleteInput = inputElement;
  };

  app._legacy_hideAutocomplete_v2 = function() {
    if (this.autocompleteTimeout) clearTimeout(this.autocompleteTimeout);
    const suggestionsEl = this.elements?.autocompleteSuggestions;
    if (suggestionsEl) {
      suggestionsEl.style.display = 'none';
      suggestionsEl.innerHTML = '';
    }
    this.activeAutocompleteInput = null;
  };

  app._legacy_handleAutocomplete_v2 = function(inputElement) {
    if (!inputElement) return;
    const rawQuery = String(inputElement.value || '').trim();
    const query = this.normalizeSearchText(rawQuery);
    this.activeAutocompleteInput = inputElement;

    if (this.autocompleteTimeout) clearTimeout(this.autocompleteTimeout);
    if (!query) {
      this.hideAutocomplete();
      return;
    }

    const source = this.getAllIngredientSuggestions();
    this.autocompleteTimeout = setTimeout(() => {
      const words = query.split(' ').filter(Boolean);
      const suggestions = source
        .map(item => {
          const normalizedName = this.normalizeSearchText(item.name);
          const starts = normalizedName.startsWith(query) ? 0 : 1;
          const includesAll = words.every(word => normalizedName.includes(word));
          if (!includesAll) return null;
          return { ...item, __score: starts, __normalizedName: normalizedName };
        })
        .filter(Boolean)
        .sort((a, b) => (a.__score - b.__score) || a.__normalizedName.localeCompare(b.__normalizedName, 'pt-BR'))
        .slice(0, 8)
        .map(({ __score, __normalizedName, ...item }) => item);

      if (!suggestions.length) {
        this.showAutocomplete([{ name: `Insira manual: ${rawQuery}` }], rawQuery, inputElement);
        return;
      }
      this.showAutocomplete(suggestions, rawQuery, inputElement);
    }, 40);
  };

  app._legacy_selectAutocompleteItem_v2 = function(itemName) {
    const input = this.activeAutocompleteInput;
    if (!input) {
      this.hideAutocomplete();
      return;
    }

    if (String(itemName).startsWith('Insira manual:')) {
      input.value = String(itemName).replace('Insira manual:', '').trim();
      this.hideAutocomplete();
      input.focus();
      return;
    }

    const normalizedTarget = this.normalizeSearchText(itemName);
    const itemData = this.getAllIngredientSuggestions().find(item => this.normalizeSearchText(item.name) === normalizedTarget) || { name: itemName, unit_desc: 'un' };
    input.value = itemData.name;

    if (input.id === 'recipe-ing-name') {
      const modal = input.closest('#custom-confirm-modal, .modal-box, form') || document;
      const qtdInput = modal.querySelector('#recipe-ing-qtd');
      const unitSelect = modal.querySelector('#recipe-ing-unid');
      const unitSource = String(itemData.unit_desc || itemData.unid || itemData.unit || 'un');
      const matchedUnit = UNIT_OPTIONS.find(unit => unitSource.toLowerCase().includes(String(unit).toLowerCase())) || 'un';
      if (qtdInput && !String(qtdInput.value || '').trim()) qtdInput.value = '1';
      if (unitSelect) unitSelect.value = matchedUnit;
    }

    this.hideAutocomplete();
    input.focus();
  };

  app.createListFromIngredients = function(listName, ingredients) {
    const validIngredients = Array.isArray(ingredients) ? ingredients.filter(ing => String(ing?.name || '').trim()) : [];
    if (!validIngredients.length) {
      this.showNotification('Não há ingredientes suficientes para gerar a lista.', 'info');
      return null;
    }

    const ingredientMap = new Map();
    validIngredients.forEach(ing => {
      const name = String(ing.name || '').trim();
      if (!name) return;
      const unit = String(ing.unit || ing.unid || 'un').trim() || 'un';
      const key = `${this.normalizeSearchText(name)}|${unit.toLowerCase()}`;
      const qty = parseFloat(ing.qty || ing.quantity || 1);
      const current = ingredientMap.get(key) || { id: this.generateId(), name, qtd: 0, unid: unit, valor: 0, checked: false };
      current.qtd = Number((current.qtd + (Number.isFinite(qty) ? qty : 1)).toFixed(2));
      ingredientMap.set(key, current);
    });

    if (!ingredientMap.size) {
      this.showNotification('Não há ingredientes suficientes para gerar a lista.', 'info');
      return null;
    }

    const listId = this.generateId();
    this.state.listas[listId] = {
      nome: listName,
      createdAt: new Date().toISOString(),
      items: Array.from(ingredientMap.values())
    };
    this.activeListId = listId;
    this.saveState();
    this.renderListasSalvas?.();
    this.renderListaWidget?.();
    this.renderOrcamento?.();
    return { listId, count: ingredientMap.size, listName };
  };

  app.generateListFromRecipe = function(recipeId) {
    const recipe = this.state?.receitas?.[recipeId];
    if (!recipe) {
      this.showNotification('Receita não encontrada.', 'error');
      return;
    }
    const result = this.createListFromIngredients(`Receita de ${recipe.name}`, recipe.ingredients || []);
    if (!result) return;
    this.showNotification(`Lista "${result.listName}" criada com ${result.count} ingrediente(s).`, 'success');
    this.activateModuleAndRender?.('lista');
    setTimeout(() => {
      document.getElementById('list-manager')?.classList.add('view-active-list');
      this.renderListaAtiva?.(result.listId);
    }, 40);
  };

  app.getPlannerMealLabel = function(mealKey) {
    const key = String(mealKey || '');
    if (key === 'cafe') return 'Café da manhã';
    if (key === 'almoco') return 'Almoço';
    if (key === 'jantar') return 'Janta';
    if (key.startsWith('extra:')) return 'Refeição extra';
    return 'Refeição';
  };

  app.getPlannerMealRecord = function(dayKey, mealKey) {
    const dayState = this.state?.planejador?.[dayKey] || {};
    const isExtra = String(mealKey || '').startsWith('extra:');
    const normalizedMealKey = isExtra ? String(mealKey).replace('extra:', '') : String(mealKey || '');
    const mealData = isExtra
      ? (Array.isArray(dayState.extras) ? dayState.extras.find(extra => String(extra.key) === normalizedMealKey) : null)
      : dayState[normalizedMealKey];
    const recipeId = mealData ? (mealData.recipeId || mealData.id || null) : null;
    const recipe = recipeId ? this.state?.receitas?.[recipeId] : null;
    return { dayState, mealData, recipe, isExtra, normalizedMealKey };
  };

  app.handleGenerateListFromPlanner = function(dayKey = null, mealKey = null) {
    if (dayKey && mealKey) {
      const { mealData, recipe } = this.getPlannerMealRecord(dayKey, mealKey);
      if (!mealData || !recipe) {
        this.showNotification('Essa refeição ainda não tem uma receita com ingredientes.', 'info');
        return;
      }
      const dayLabel = this.getPlannerDaysMap?.()[dayKey] || dayKey;
      const mealLabel = mealData.mealLabel || this.getPlannerMealLabel(mealKey);
      const result = this.createListFromIngredients(`${mealLabel} de ${dayLabel}`, recipe.ingredients || []);
      if (!result) return;
      this.showNotification(`Lista "${result.listName}" criada com ${result.count} ingrediente(s).`, 'success');
      this.activateModuleAndRender?.('lista');
      setTimeout(() => {
        document.getElementById('list-manager')?.classList.add('view-active-list');
        this.renderListaAtiva?.(result.listId);
      }, 40);
      return;
    }

    if (dayKey) {
      const dayState = this.state?.planejador?.[dayKey] || {};
      const ingredients = [];
      ['cafe','almoco','jantar'].forEach(slot => {
        const ref = dayState[slot];
        const recipe = ref ? this.state?.receitas?.[ref.recipeId || ref.id] : null;
        if (recipe?.ingredients) ingredients.push(...recipe.ingredients);
      });
      (Array.isArray(dayState.extras) ? dayState.extras : []).forEach(extra => {
        const recipe = this.state?.receitas?.[extra.recipeId || extra.id];
        if (recipe?.ingredients) ingredients.push(...recipe.ingredients);
      });
      const dayLabel = this.getPlannerDaysMap?.()[dayKey] || dayKey;
      const result = this.createListFromIngredients(`Dia ${dayLabel}`, ingredients);
      if (!result) {
        this.showNotification('Esse dia ainda não tem receitas com ingredientes.', 'info');
        return;
      }
      this.showNotification(`Lista "${result.listName}" criada com ${result.count} ingrediente(s).`, 'success');
      this.activateModuleAndRender?.('lista');
      setTimeout(() => {
        document.getElementById('list-manager')?.classList.add('view-active-list');
        this.renderListaAtiva?.(result.listId);
      }, 40);
      return;
    }

    const ingredients = [];
    Object.keys(this.state?.planejador || {}).forEach(key => {
      const dayState = this.state.planejador[key] || {};
      ['cafe','almoco','jantar'].forEach(slot => {
        const ref = dayState[slot];
        const recipe = ref ? this.state?.receitas?.[ref.recipeId || ref.id] : null;
        if (recipe?.ingredients) ingredients.push(...recipe.ingredients);
      });
      (Array.isArray(dayState.extras) ? dayState.extras : []).forEach(extra => {
        const recipe = this.state?.receitas?.[extra.recipeId || extra.id];
        if (recipe?.ingredients) ingredients.push(...recipe.ingredients);
      });
    });
    const result = this.createListFromIngredients('Lista do Planejamento', ingredients);
    if (!result) {
      this.showNotification('Seu planejador ainda não tem receitas com ingredientes.', 'info');
      return;
    }
    this.showNotification(`Lista "${result.listName}" criada com ${result.count} ingrediente(s).`, 'success');
    this.activateModuleAndRender?.('lista');
    setTimeout(() => {
      document.getElementById('list-manager')?.classList.add('view-active-list');
      this.renderListaAtiva?.(result.listId);
    }, 40);
  };

  app.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (!this.__modalStackSeed) this.__modalStackSeed = 30000;
    this.__modalStackSeed += 10;
    let z = this.__modalStackSeed;
    if (modalId === 'custom-confirm-modal') z = 61000;
    else if (modalId === 'recipe-detail-modal') z = Math.max(z, 56000);
    else if (modalId === 'detail-modal') z = Math.max(z, 52000);
    else if (modalId === 'recipe-picker-modal') z = Math.max(z, 50000);
    else if (modalId === 'ai-chat-modal') z = Math.max(z, 50500);
    else z = Math.max(z, 48000);
    modal.style.zIndex = String(z);
    const box = modal.querySelector('.modal-box');
    if (box) box.style.zIndex = String(z + 1);
    modal.classList.add('is-visible');
    document.body.classList.add('modal-open');
  };

  app.openConfirmModal = function(title, message, onConfirm) {
    const confirmModal = document.getElementById('custom-confirm-modal');
    if (!confirmModal) return;
    confirmModal.classList.remove('recipe-editor-modal');
    const titleEl = confirmModal.querySelector('#confirm-title');
    const msgEl = confirmModal.querySelector('#confirm-message');
    const okBtn = confirmModal.querySelector('#confirm-ok-btn');
    const cancelBtn = confirmModal.querySelector('#confirm-cancel-btn');
    if (!titleEl || !msgEl || !okBtn || !cancelBtn) return;

    titleEl.textContent = title;
    msgEl.innerHTML = message;
    cancelBtn.style.display = 'inline-flex';
    okBtn.textContent = 'Confirmar';
    okBtn.classList.remove('primary');
    okBtn.classList.add('danger');

    const freshOk = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(freshOk, okBtn);
    const freshCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(freshCancel, cancelBtn);

    freshCancel.addEventListener('click', () => this.closeModal('custom-confirm-modal'), { once: true });
    freshOk.addEventListener('click', () => {
      this.closeModal('custom-confirm-modal');
      setTimeout(() => {
        if (typeof onConfirm === 'function') onConfirm();
      }, 20);
    }, { once: true });

    this.openModal('custom-confirm-modal');
  };

  app.renderRecipeDetail = function(recipeId, targetElementId = 'recipe-detail-desktop-body', footerElementId = 'recipe-detail-desktop-footer') {
    const recipe = this.state?.receitas?.[recipeId];
    const bodyEl = document.getElementById(targetElementId);
    const footerEl = document.getElementById(footerElementId);
    if (!recipe || !bodyEl || !footerEl) return;
    const ingredients = recipe.ingredients || [];
    const prepText = String(recipe.content || '')
      .replace(/<h4>Ingredientes<\/h4>/gi, '')
      .replace(/<ul>[\s\S]*?<\/ul>/i, '')
      .replace(/<h4>Preparo<\/h4>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    const ingredientChips = ingredients.length
      ? ingredients.map(ing => `<li class="recipe-chip"><span>${this.escapeHtml(ing.qty || '1')} ${this.escapeHtml(ing.unit || 'un')}</span><strong>${this.escapeHtml(ing.name || '')}</strong></li>`).join('')
      : '<li class="recipe-chip recipe-chip--empty"><strong>Sem ingredientes cadastrados</strong></li>';

    bodyEl.innerHTML = `
      <div class="recipe-rich-content recipe-luxury-view">
        <div class="recipe-hero-head">
          <div class="recipe-title-block">
            <span class="recipe-eyebrow">Receita</span>
            <h4>${this.escapeHtml(recipe.name)}</h4>
            <p class="detail-note">${this.escapeHtml(recipe.desc || 'Receita salva no seu painel.')}</p>
          </div>
          <div class="recipe-meta-grid">
            <div class="detail-kpi"><strong>${ingredients.length}</strong><span>ingredientes</span></div>
            <div class="detail-kpi"><strong>${prepText ? prepText.split('\n').filter(Boolean).length || 1 : 1}</strong><span>etapas</span></div>
          </div>
        </div>
        <div class="recipe-section-card"><h5>Ingredientes</h5><ul class="recipe-ingredient-chips">${ingredientChips}</ul></div>
        <div class="recipe-section-card"><h5>Modo de preparo</h5><div class="recipe-prep-copy">${prepText ? prepText.split('\n').filter(Boolean).map(step => `<p>${this.escapeHtml(step)}</p>`).join('') : '<p>Adicione o modo de preparo para deixar a receita completa.</p>'}</div></div>
      </div>`;

    footerEl.className = 'card-footer module-actions-footer compact-export-row';
    footerEl.innerHTML = `
      <button type="button" class="icon-button generate-recipe-list-btn" data-recipe-id="${recipeId}" title="Gerar lista desta receita"><i class="fa-solid fa-list"></i><span>Gerar lista</span></button>
      <button type="button" class="icon-button minimal-export-btn share-btn" data-recipe-id="${recipeId}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
      <button type="button" class="icon-button minimal-export-btn print-btn" data-recipe-id="${recipeId}" title="Imprimir"><i class="fa-solid fa-print"></i></button>
      <button type="button" class="icon-button minimal-export-btn pdf-btn" data-recipe-id="${recipeId}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
      <button type="button" class="icon-button edit-recipe-btn" data-recipe-id="${recipeId}" title="Editar"><i class="fa-solid fa-pen"></i></button>
      <button type="button" class="icon-button delete-recipe-btn danger" data-recipe-id="${recipeId}" title="Excluir"><i class="fa-solid fa-trash"></i></button>`;
    footerEl.style.display = 'flex';
  };

  app.showRecipeDetailModal = function(recipeId) {
    const recipe = this.state?.receitas?.[recipeId];
    if (!recipe) return;
    const titleEl = document.getElementById('recipe-detail-modal-title');
    const bodyEl = document.getElementById('recipe-detail-modal-body');
    const footerEl = document.getElementById('recipe-detail-modal-footer');
    if (!titleEl || !bodyEl || !footerEl) return;
    const ingredients = recipe.ingredients || [];
    const prepText = String(recipe.content || '')
      .replace(/<h4>Ingredientes<\/h4>/gi, '')
      .replace(/<ul>[\s\S]*?<\/ul>/i, '')
      .replace(/<h4>Preparo<\/h4>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    const ingredientChips = ingredients.length
      ? ingredients.map(ing => `<li class="recipe-chip"><span>${this.escapeHtml(ing.qty || '1')} ${this.escapeHtml(ing.unit || 'un')}</span><strong>${this.escapeHtml(ing.name || '')}</strong></li>`).join('')
      : '<li class="recipe-chip recipe-chip--empty"><strong>Sem ingredientes cadastrados</strong></li>';
    titleEl.textContent = recipe.name;
    bodyEl.innerHTML = `
      <div class="recipe-rich-content recipe-luxury-view">
        <div class="recipe-hero-head">
          <div class="recipe-title-block">
            <span class="recipe-eyebrow">Receita</span>
            <h4>${this.escapeHtml(recipe.name)}</h4>
            <p class="detail-note">${this.escapeHtml(recipe.desc || 'Receita salva no seu painel.')}</p>
          </div>
          <div class="recipe-meta-grid">
            <div class="detail-kpi"><strong>${ingredients.length}</strong><span>ingredientes</span></div>
            <div class="detail-kpi"><strong>${prepText ? prepText.split('\n').filter(Boolean).length || 1 : 1}</strong><span>etapas</span></div>
          </div>
        </div>
        <div class="recipe-section-card"><h5>Ingredientes</h5><ul class="recipe-ingredient-chips">${ingredientChips}</ul></div>
        <div class="recipe-section-card"><h5>Modo de preparo</h5><div class="recipe-prep-copy">${prepText ? prepText.split('\n').filter(Boolean).map(step => `<p>${this.escapeHtml(step)}</p>`).join('') : '<p>Adicione o modo de preparo para deixar a receita completa.</p>'}</div></div>
      </div>`;
    footerEl.innerHTML = `
      <button type="button" class="icon-button generate-recipe-list-btn" data-recipe-id="${recipeId}" title="Gerar lista desta receita"><i class="fa-solid fa-list"></i><span>Gerar lista</span></button>
      <button type="button" class="icon-button minimal-export-btn share-btn" data-recipe-id="${recipeId}" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
      <button type="button" class="icon-button minimal-export-btn print-btn" data-recipe-id="${recipeId}" title="Imprimir"><i class="fa-solid fa-print"></i></button>
      <button type="button" class="icon-button minimal-export-btn pdf-btn" data-recipe-id="${recipeId}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
      <button type="button" class="icon-button edit-recipe-btn" data-recipe-id="${recipeId}" title="Editar"><i class="fa-solid fa-pen"></i></button>
      <button type="button" class="icon-button delete-recipe-btn danger" data-recipe-id="${recipeId}" title="Excluir"><i class="fa-solid fa-trash"></i></button>`;
    this.openModal('recipe-detail-modal');
  };

  app.renderReceitas = function(container) {
    if (!container) container = document.getElementById('module-receitas');
    if (!container) return;
    const sortMeta = this.getSortMeta('recipe', this.recipeSortMode || 'name_asc');
    container.innerHTML = `
      <div class="master-detail-layout">
        <div class="md-list-column dashboard-card">
          <div class="card-header"><h3><i class="fa-solid fa-utensils"></i> Receitas</h3></div>
          <div class="card-content">
            <div class="module-toolbar module-toolbar--ultra">
              <button class="btn btn-secondary add-recipe-btn luxury-create-btn"><i class="fa-solid fa-plus"></i><span>Nova Receita</span></button>
              <button class="icon-button luxury-sort-btn recipe-cycle-sort-btn" title="Organizar receitas: ${sortMeta.label}" aria-label="Organizar receitas: ${sortMeta.label}">
                <i class="fa-solid fa-arrow-up-short-wide"></i>
              </button>
            </div>
            <div id="main-recipe-grid"></div>
          </div>
        </div>
        <div class="md-detail-column dashboard-card recipe-detail-shell">
          <div class="card-header"><h3 id="recipe-detail-title-desktop"><i class="fa-solid fa-book-open"></i> Detalhes</h3></div>
          <div class="card-content" id="recipe-detail-desktop-body"><div class="empty-state-placeholder"><i class="fa-solid fa-utensils" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.45;"></i><p>Selecione uma receita para ver ingredientes e preparo.</p></div></div>
          <div class="card-footer module-actions-footer" id="recipe-detail-desktop-footer" style="display:none;"></div>
        </div>
      </div>`;
    const listContainer = document.getElementById('main-recipe-grid');
    const recipes = this.sortRecipesCollection(Object.values(this.state.receitas || {}));
    listContainer.innerHTML = recipes.map(recipe => this.renderUniversalCard({
      type: 'recipe',
      data: { id: recipe.id, name: recipe.name, ingredients: recipe.ingredients || [] },
      actions: [
        { type: 'secondary', class: 'generate-recipe-list-btn', icon: 'fa-solid fa-list', label: 'Gerar lista' },
        { type: 'edit', class: 'edit-recipe-btn', icon: 'fa-solid fa-pencil', label: 'Editar' },
        { type: 'danger', class: 'delete-recipe-btn', icon: 'fa-solid fa-trash', label: 'Excluir' }
      ],
      isClickable: true
    })).join('') || '<p class="empty-list-message">Nenhuma receita criada.</p>';
  };

  app.openPlannerDayDetailModal = function(dayKey) {
    const titleEl = document.getElementById('detail-modal-title');
    const bodyEl = document.getElementById('detail-modal-body');
    const footerEl = document.getElementById('detail-modal-footer');
    const headerActionsEl = document.getElementById('detail-modal-header-actions');
    if (!titleEl || !bodyEl || !footerEl || !headerActionsEl) return;
    const dayLabel = this.getPlannerDaysMap()[dayKey] || 'Dia';
    const dayMeals = this.state.planejador[dayKey] || {};
    const standardSlots = [
      { key: 'cafe', label: 'Café da Manhã', icon: 'fa-solid fa-mug-saucer' },
      { key: 'almoco', label: 'Almoço', icon: 'fa-solid fa-bowl-food' },
      { key: 'jantar', label: 'Jantar', icon: 'fa-solid fa-utensils' }
    ];

    const slotCards = standardSlots.map(slot => {
      const meal = dayMeals[slot.key];
      if (!meal) {
        return `
          <article class="planner-slot-card planner-slot-empty" data-day="${dayKey}" data-meal="${slot.key}">
            <div class="planner-slot-head"><div class="planner-slot-title"><small>${slot.label}</small><strong>Sem receita definida</strong></div><i class="${slot.icon}" style="opacity:.72"></i></div>
            <div class="planner-slot-body"><p>Escolha uma receita para organizar melhor este horário.</p></div>
            <div class="planner-slot-actions"><button type="button" class="icon-button planner-slot-direct-btn" data-day="${dayKey}" data-meal="${slot.key}" title="Escolher receita"><i class="fa-solid fa-plus"></i></button></div>
          </article>`;
      }
      const recipeId = meal.recipeId || meal.id || '';
      return `
        <article class="planner-slot-card planner-meal-item ${meal.completed ? 'completed' : ''}" data-day="${dayKey}" data-meal="${slot.key}" data-recipe-id="${recipeId}">
          <div class="planner-slot-head">
            <div class="planner-slot-title"><small>${slot.label}</small><strong>${this.escapeHtml(meal.name || 'Refeição')}</strong>${meal.time ? `<span class="planner-slot-time">${this.escapeHtml(meal.time)}</span>` : ''}</div>
            <i class="${slot.icon}" style="opacity:.78"></i>
          </div>
          <div class="planner-slot-body"><p>${meal.completed ? 'Marcada como usada. Ótimo para acompanhar sua rotina.' : 'Use os botões abaixo para visualizar, concluir, remover ou gerar a lista.'}</p></div>
          <div class="planner-slot-actions meal-item-actions">
            <button type="button" class="icon-button generate-meal-list-btn" data-day="${dayKey}" data-meal="${slot.key}" title="Gerar lista desta refeição"><i class="fa-solid fa-list"></i></button>
            <button type="button" class="icon-button meal-view-btn" title="Ver receita"><i class="fa-solid fa-eye"></i></button>
            <button type="button" class="icon-button meal-complete-btn ${meal.completed ? 'is-complete' : ''}" title="Marcar como usado"><i class="fa-solid fa-check"></i></button>
            <button type="button" class="icon-button meal-delete-btn" title="Remover"><i class="fa-solid fa-trash"></i></button>
          </div>
        </article>`;
    }).join('');

    const extras = (Array.isArray(dayMeals.extras) ? dayMeals.extras : []).map(extra => {
      const recipeId = extra.recipeId || extra.id || '';
      return `
        <article class="planner-slot-card planner-meal-item ${extra.completed ? 'completed' : ''}" data-day="${dayKey}" data-meal="extra:${extra.key}" data-recipe-id="${recipeId}">
          <div class="planner-slot-head"><div class="planner-slot-title"><small>${this.escapeHtml(extra.mealLabel || 'Refeição extra')}</small><strong>${this.escapeHtml(extra.name || 'Receita')}</strong>${extra.time ? `<span class="planner-slot-time">${this.escapeHtml(extra.time)}</span>` : ''}</div><i class="fa-solid fa-star" style="opacity:.78"></i></div>
          <div class="planner-slot-body"><p>Refeição personalizada adicionada ao seu dia.</p></div>
          <div class="planner-slot-actions meal-item-actions">
            <button type="button" class="icon-button generate-meal-list-btn" data-day="${dayKey}" data-meal="extra:${extra.key}" title="Gerar lista desta refeição"><i class="fa-solid fa-list"></i></button>
            <button type="button" class="icon-button meal-view-btn" title="Ver receita"><i class="fa-solid fa-eye"></i></button>
            <button type="button" class="icon-button meal-complete-btn ${extra.completed ? 'is-complete' : ''}" title="Marcar como usado"><i class="fa-solid fa-check"></i></button>
            <button type="button" class="icon-button meal-delete-btn" title="Remover"><i class="fa-solid fa-trash"></i></button>
          </div>
        </article>`;
    }).join('');

    titleEl.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ${dayLabel}`;
    headerActionsEl.innerHTML = `<button class="icon-button add-meal-btn" data-day-target="${dayKey}" title="Inserir refeição"><i class="fa-solid fa-plus"></i></button>`;
    bodyEl.innerHTML = `
      <div class="planner-day-detail-shell">
        <div class="detail-kpi-grid">
          <div class="detail-kpi"><strong>${this.getPlannerMealsForDay(dayKey).length}</strong><span>refeições no dia</span></div>
          <div class="detail-kpi"><strong>${this.getPlannerMealsForDay(dayKey).filter(meal => meal.completed).length}</strong><span>marcadas como usadas</span></div>
        </div>
        <div class="planner-slot-grid">${slotCards}${extras}
          <article class="planner-slot-card planner-slot-add-card">
            <div class="planner-slot-head"><div class="planner-slot-title"><small>Personalizado</small><strong>Adicionar refeição</strong></div><i class="fa-solid fa-sparkles" style="opacity:.78"></i></div>
            <div class="planner-slot-body"><p>Crie uma refeição com nome e horário personalizados e escolha a receita depois.</p></div>
            <div class="planner-slot-actions"><button type="button" class="icon-button planner-custom-meal-launch" data-day="${dayKey}" title="Criar refeição"><i class="fa-solid fa-plus"></i></button></div>
          </article>
        </div>
      </div>`;
    footerEl.className = 'modal-footer detail-modal-footer compact-export-row';
    footerEl.innerHTML = `${this.buildExportButtons(`data-day="${dayKey}"`)}`;
    this.openModal('detail-modal');
  };

  const bindRecipeIngredientField = (scope = document) => {
    const input = scope.querySelector?.('#recipe-ing-name');
    if (!input || input.dataset.afBindAutocomplete === '1') return;
    input.dataset.afBindAutocomplete = '1';
    input.setAttribute('autocomplete', 'off');
    input.addEventListener('input', () => app.handleAutocomplete(input));
    input.addEventListener('focus', () => {
      if (String(input.value || '').trim()) app.handleAutocomplete(input);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') app.hideAutocomplete();
    });
  };

  const originalHandleOpenRecipeEditModal = app.handleOpenRecipeEditModal?.bind(app);
  if (originalHandleOpenRecipeEditModal) {
    app.handleOpenRecipeEditModal = function(...args) {
      const result = originalHandleOpenRecipeEditModal(...args);
      setTimeout(() => bindRecipeIngredientField(document.getElementById('custom-confirm-modal') || document), 10);
      return result;
    };
  }

  document.addEventListener('focusin', (e) => {
    if (e.target?.id === 'recipe-ing-name') bindRecipeIngredientField(document.getElementById('custom-confirm-modal') || document);
  });

  document.addEventListener('click', (e) => {
    const closest = (sel) => e.target.closest(sel);

    if (closest('.generate-recipe-list-btn')) {
      const recipeId = closest('[data-recipe-id]')?.dataset?.recipeId || closest('.card--recipe,[data-id]')?.dataset?.id;
      if (recipeId) {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.generateListFromRecipe(recipeId);
      }
      return;
    }

    if (closest('.generate-meal-list-btn')) {
      const btn = closest('.generate-meal-list-btn');
      if (btn?.dataset?.day && btn?.dataset?.meal) {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.handleGenerateListFromPlanner(btn.dataset.day, btn.dataset.meal);
      }
      return;
    }

    if (closest('.planner-meal-item .meal-delete-btn')) {
      const mealItem = closest('.planner-meal-item');
      if (mealItem) {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.handleDeleteMeal(mealItem.dataset.day, mealItem.dataset.meal);
      }
      return;
    }
  }, true);
})();

(() => {
  const app = window.app;
  if (!app) return;

  const AUTH_TOKEN_KEY = 'alimenteFacilAuthToken';
  const AUTH_USER_KEY = 'alimenteFacilAuthUser';
  const PREMIUM_PLAN = 'premium';
  const BASIC_PLAN = 'basic';

app.apiFetchJson = async function(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  const response = await fetch(fullUrl, Object.assign({}, options, { headers }));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || 'Erro na comunicação com o servidor.');
    error.payload = data;
    error.status = response.status;
    throw error;
  }
  return data;
};

  app.getStoredAuthToken = function() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
  };

  app.setStoredAuthSession = function(token, user) {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  };

  app.clearStoredAuthSession = function() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  app.getCheckoutUrl = function(sessionData = {}) {
    return sessionData?.subscription?.checkoutUrl || sessionData?.checkoutUrl || this.checkoutLinks?.premium || '';
  };

  app.showAuthInlineError = function(message) {
    ['login-form','signup-form'].forEach((formId) => {
      const form = document.getElementById(formId);
      if (!form) return;
      form.querySelectorAll('.auth-feedback-message').forEach((node) => node.remove());
      const box = document.createElement('div');
      box.className = 'auth-feedback-message';
      box.textContent = message;
      form.appendChild(box);
    });
  };

  app.clearAuthInlineError = function() {
    document.querySelectorAll('.auth-feedback-message').forEach((node) => node.remove());
  };

  app.isPremiumSession = function(sessionData = {}) {
    const plan = String(sessionData?.subscription?.plan || '').toLowerCase();
    const status = String(sessionData?.subscription?.status || '').toLowerCase();
    return plan === PREMIUM_PLAN && (status === 'active' || status === 'trialing');
  };

  app.applyAuthenticatedUser = function(sessionData = {}) {
    const user = sessionData.user || {};
    this.isLoggedIn = true;
    this.userPlan = this.isPremiumSession(sessionData) ? PREMIUM_PLAN : BASIC_PLAN;
    this.state = this.state || JSON.parse(JSON.stringify(this.defaultState || {}));
    this.state.user = this.state.user || {};
    this.state.user.nome = user.name || user.nome || 'Usuário';
    this.state.user.email = user.email || '';
    this.state.user.id = user.id || '';
    this.updateStartButton?.();
    this.saveState?.();
  };

  app.forceLoggedOutLanding = function() {
    this.clearStoredAuthSession?.();
    this.isLoggedIn = false;
    this.userPlan = 'free';
    this.state = JSON.parse(JSON.stringify(this.defaultState || {}));
    this.state.user = { nome: null, email: '', id: '' };
    this.activeModule = 'inicio';
    this.activeListId = 'listaDaSemana';
    this.updateStartButton?.();
    if (this.isAppMode) this.exitAppMode?.();
    this.saveState?.();
  };

  app.syncRealUserInfoInDOM = function() {
    const email = this.state?.user?.email || '';
    const name = this.state?.user?.nome || '';
    const replaceValue = (selector, value) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (value) el.value = value;
      });
    };
    replaceValue('#config-email, #config-email-modal', email);
    replaceValue('#config-name, #config-name-modal', name);

    document.querySelectorAll('*').forEach((el) => {
      if (email && el.childNodes.length === 1 && el.textContent.trim() === 'user@email.com') el.textContent = email;
      if (name && el.childNodes.length === 1 && ['Antonio','Usuário'].includes(el.textContent.trim())) el.textContent = name;
    });
  };

  app.closePaymentGateModal = function() {
    document.getElementById('payment-gate-modal')?.remove();
  };

  app.showPaymentGateModal = function(payload = {}) {
    this.closePaymentGateModal?.();
    const checkoutUrl = payload.checkoutUrl || this.getCheckoutUrl(payload) || '';
    const overlay = document.createElement('div');
    overlay.id = 'payment-gate-modal';
    overlay.className = 'modal-overlay is-visible';
    overlay.style.zIndex = '7000';

    overlay.innerHTML = `
      <div class="modal-box" style="max-width:520px; width:min(92vw,520px);">
        <button type="button" class="close-modal-btn" data-action="close-payment-gate" aria-label="Fechar">×</button>
        <div class="modal-header"><h3 style="margin:0;">${payload.title || 'Ative o Premium'}</h3></div>
        <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
          <p style="margin:0; color:var(--glass-text-primary); line-height:1.55;">${payload.message || 'Ative agora seu Premium com 7 dias grátis. Depois, R$ 9,90 por mês. Cancele quando quiser.'}</p>
          <div style="display:grid; gap:8px; padding:12px; border:1px solid rgba(255,255,255,.12); border-radius:16px; background:rgba(255,255,255,.04);">
            <div style="font-weight:700; color:#fff;">7 dias grátis</div>
            <div style="color:#fff; opacity:.92;">Depois, R$ 9,90/mês</div>
            <div style="color:#fff; opacity:.92;">Cancele quando quiser</div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button type="button" class="btn btn-primary" data-action="go-checkout" style="flex:1; min-width:180px;">Começar teste grátis</button>
            <button type="button" class="btn btn-secondary" data-action="close-payment-gate" style="flex:1; min-width:140px;">Agora não</button>
          </div>
        </div>
      </div>`;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('[data-action="close-payment-gate"]')) {
        overlay.remove();
        return;
      }
      if (e.target.closest('[data-action="go-checkout"]')) {
        if (!checkoutUrl) {
          this.showNotification?.('Link do Mercado Pago não encontrado.', 'error');
          return;
        }
        window.location.href = checkoutUrl;
      }
    });

    document.body.appendChild(overlay);
  };

  app.handleForgotPassword = async function() {
    const email = String(document.getElementById('forgot-email')?.value || '').trim();
    this.clearAuthInlineError?.();
    if (!email) {
      this.showNotification?.('Informe seu e-mail para redefinir a senha.', 'error');
      return;
    }
    try {
      const data = await this.apiFetchJson('/api/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      this.showNotification?.(data?.message || 'Se o e-mail existir, você receberá um link para redefinir sua senha.', 'success');
      const form = document.getElementById('forgot-password-form');
      form?.reset();
    } catch (error) {
      const msg = error?.payload?.message || error.message || 'Não foi possível enviar o e-mail de redefinição.';
      this.showNotification?.(msg, 'error');
    }
  };

  app.openForgotPasswordFromSettings = function() {
    const email = String(this.state?.user?.email || '').trim();
    this.showAuthModal?.();
    document.querySelectorAll('#auth-modal .auth-form-container').forEach((node) => node.classList.remove('active'));
    document.getElementById('forgot-view')?.classList.add('active');
    const forgotEmailInput = document.getElementById('forgot-email');
    if (forgotEmailInput) {
      forgotEmailInput.value = email;
      forgotEmailInput.focus();
      forgotEmailInput.select?.();
    }
    this.showNotification?.('Confira seu e-mail cadastrado e clique em "Enviar link de redefinição".', 'info');
  };

  app.bindProfileSettingsSecurityFields = function(scope) {
    const root = scope || document;
    const nameInput = root.querySelector('#config-name, #config-name-modal');
    const emailInput = root.querySelector('#config-email, #config-email-modal');
    const passwordWrap = root.querySelector('#config-profile-security-fields, #config-profile-security-fields-modal');
    const passwordInput = root.querySelector('#config-password, #config-password-modal');
    const confirmInput = root.querySelector('#config-password-confirm-modal');
    if (!nameInput || !emailInput || !passwordWrap) return;

    const originalName = String(this.state?.user?.nome || '').trim();
    const originalEmail = String(this.state?.user?.email || '').trim().toLowerCase();

    const syncVisibility = () => {
      const changed = String(nameInput.value || '').trim() !== originalName || String(emailInput.value || '').trim().toLowerCase() !== originalEmail;
      passwordWrap.style.display = changed ? 'grid' : 'none';
      if (!changed) {
        if (passwordInput) passwordInput.value = '';
        if (confirmInput) confirmInput.value = '';
      }
    };

    nameInput.addEventListener('input', syncVisibility);
    emailInput.addEventListener('input', syncVisibility);
    syncVisibility();
  };

app.saveProfileSettings = async function(scope) {
    const root = scope || document;
    const nameInput = root.querySelector('#config-name, #config-name-modal');
    const emailInput = root.querySelector('#config-email, #config-email-modal');
    const passwordInput = root.querySelector('#config-password, #config-password-modal');
    const saveBtn = root.querySelector('#config-save-profile-btn') || document.querySelector('#config-save-profile-btn');

    const newName = (nameInput?.value || '').trim();
    const newEmail = (emailInput?.value || '').trim().toLowerCase();
    const currentName = (this.state?.user?.nome || '').trim();
    const currentEmail = (this.state?.user?.email || '').trim().toLowerCase();
    const password = (passwordInput?.value || '').trim();

    const nameChanged = newName !== currentName;
    const emailChanged = newEmail !== currentEmail;

    if (!nameChanged && !emailChanged) {
        this.showNotification('Nenhuma alteração foi feita.', 'info');
        return false;
    }

    if (!password) {
        this.showNotification('Digite sua senha atual para alterar nome ou e-mail.', 'error');
        passwordInput?.focus();
        return false;
    }

    const token = this.getStoredAuthToken?.();
    if (!token) {
        this.showNotification('Sessão expirada. Faça login novamente.', 'error');
        return false;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Salvando...';
    }

    try {
        const response = await this.apiFetchJson('/api/auth/profile', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name: newName, email: newEmail, password })
        });

        const refreshedToken = response?.token || token;
        if (response?.user) this.setStoredAuthSession?.(refreshedToken, response.user);
        this.applyAuthenticatedUser?.(response);
        this.syncRealUserInfoInDOM?.();
        this.saveState?.();

        if (passwordInput) passwordInput.value = '';
        this.showNotification(response?.message || 'Perfil atualizado com sucesso!', 'success');
        return true;
    } catch (error) {
        const msg = error?.payload?.message || error.message || 'Erro ao atualizar perfil.';
        this.showNotification(msg, 'error');
        return false;
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Salvar alterações';
        }
    }
};
  document.addEventListener('click', async (event) => {
    const saveDesktopBtn = event.target.closest?.('#config-save-profile-btn');
    if (saveDesktopBtn) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      const desktopScope = document.getElementById('config-detail-desktop') || document;
      await app.saveProfileSettings(desktopScope);
      return;
    }

    const forgotDesktopBtn = event.target.closest?.('#config-open-forgot-password-btn');
    if (forgotDesktopBtn) {
      event.preventDefault();
      event.stopPropagation();
      app.openForgotPasswordFromSettings?.();
    }
  });

app.handleSignup = async function() {
console.log('handleSignup chamada');
  const name = String(document.getElementById('signup-name')?.value || '').trim();
  const email = String(document.getElementById('signup-email')?.value || '').trim();
  const password = String(document.getElementById('signup-password')?.value || '');
  const acceptedTerms = Boolean(document.getElementById('signup-terms')?.checked);
  this.clearAuthInlineError?.();

  if (!name || !email || !password) {
    this.showAuthInlineError?.('Preencha nome, e-mail e senha.');
    this.showNotification?.('Preencha nome, e-mail e senha.', 'error');
    return;
  }

  if (!acceptedTerms) {
    this.showAuthInlineError?.('Você precisa aceitar os Termos de Uso e a Política de Privacidade.');
    this.showNotification?.('Você precisa aceitar os Termos de Uso e a Política de Privacidade.', 'error');
    return;
  }

  try {
    const data = await this.apiFetchJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, acceptedTerms })
    });

    this.setStoredAuthSession?.(data.token, data.user);
    this.applyAuthenticatedUser?.(data);
    this.closeAllModals?.();
    this.exitAppMode?.();
    this.showPaymentGateModal?.({
      title: 'Cadastro concluído',
      message: 'Sua conta foi criada com sucesso. Para liberar o painel completo, ative agora seu Premium com 7 dias grátis. Depois, R$ 9,90 por mês. Cancele quando quiser.',
      checkoutUrl: this.getCheckoutUrl(data)
    });
    this.showNotification?.('Cadastro concluído com sucesso.', 'success');
    setTimeout(() => this.syncRealUserInfoInDOM?.(), 80);
  } catch (error) {
    const msg = error?.payload?.message || error.message || 'Não foi possível concluir o cadastro.';
    this.showAuthInlineError?.(msg);
    this.showNotification?.(msg, 'error');
    console.error('Erro no cadastro:', error);
  }
};

  app.handleLogin = async function() {
  console.log('handleLogin chamada');
    const email = String(document.getElementById('login-email')?.value || '').trim();
    const password = String(document.getElementById('login-password')?.value || '');
    this.clearAuthInlineError?.();

    if (!email || !password) {
      this.showAuthInlineError?.('Informe e-mail e senha.');
      this.showNotification?.('Informe e-mail e senha.', 'error');
      return;
    }

    try {
      const data = await this.apiFetchJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      this.setStoredAuthSession?.(data.token, data.user);
      this.applyAuthenticatedUser?.(data);
      this.closeAllModals?.();
      setTimeout(() => this.syncRealUserInfoInDOM?.(), 80);

      if (this.isPremiumSession(data)) {
        this.enterAppMode?.();
        this.showNotification?.('Login premium realizado com sucesso.', 'success');
      } else {
        this.exitAppMode?.();
        this.showPaymentGateModal?.({
          title: 'Ative seu Premium',
          message: 'Sua conta está ativa, mas o painel completo só é liberado após a assinatura premium. Ative agora 7 dias grátis e depois pague R$ 9,90 por mês. Cancele quando quiser.',
          checkoutUrl: this.getCheckoutUrl(data)
        });
        this.showNotification?.('Sua conta foi encontrada, mas o acesso completo exige Premium.', 'info');
      }
    } catch (error) {
      const msg = error?.payload?.message || error.message || 'E-mail ou senha inválidos.';
      this.showAuthInlineError?.(msg);
      this.showNotification?.(msg, 'error');
    }
  };

  app.handleLogout = function() {
    this.forceLoggedOutLanding?.();
    this.showNotification?.('Você saiu da sua conta.', 'info');
  };

  app.handleStartButtonClick = async function() {
    const token = this.getStoredAuthToken?.();
    if (!token) {
      this.showAuthModal?.();
      return;
    }

    try {
      const me = await this.apiFetchJson('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      this.applyAuthenticatedUser?.(me);
      if (this.isPremiumSession(me)) {
        this.enterAppMode?.();
      } else {
        this.exitAppMode?.();
        this.showPaymentGateModal?.({
          title: 'Ative seu Premium',
          message: 'O painel completo do Alimente Fácil é liberado somente no Premium. Ative agora 7 dias grátis e depois pague R$ 9,90 por mês. Cancele quando quiser.',
          checkoutUrl: this.getCheckoutUrl(me)
        });
      }
      setTimeout(() => this.syncRealUserInfoInDOM?.(), 80);
    } catch (_error) {
      this.forceLoggedOutLanding?.();
      this.showAuthModal?.();
    }
  };

  app.handleRealSubscription = function(planId) {
    if (planId !== 'premium') return;
    const token = this.getStoredAuthToken?.();
    if (!token) {
      this.showAuthModal?.();
      return;
    }
    this.showPaymentGateModal?.({ checkoutUrl: this.checkoutLinks?.premium || '' });
  };

  app.restoreBackendSession = async function() {
    const token = this.getStoredAuthToken?.();
    if (!token) {
      this.forceLoggedOutLanding?.();
      return;
    }

    try {
      const me = await this.apiFetchJson('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      this.applyAuthenticatedUser?.(me);
      if (this.isPremiumSession(me)) {
        if (this.isAppMode) this.enterAppMode?.();
      } else {
        this.exitAppMode?.();
      }
      setTimeout(() => this.syncRealUserInfoInDOM?.(), 80);
    } catch (_error) {
      this.forceLoggedOutLanding?.();
    }
  };

  app.handleMercadoPagoReturn = async function() {
    const url = new URL(window.location.href);
    const preapprovalId = url.searchParams.get('preapproval_id') || url.searchParams.get('preapprovalId') || url.searchParams.get('subscription_id') || url.searchParams.get('id') || '';
    const token = this.getStoredAuthToken?.();
    if (!preapprovalId || !token) return;

    try {
      const data = await this.apiFetchJson('/api/billing/confirm-premium', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preapprovalId })
      });

      this.setStoredAuthSession?.(data.token || token, data.user);
      this.applyAuthenticatedUser?.(data);
      if (this.isPremiumSession(data)) {
        this.enterAppMode?.();
        this.showNotification?.('Premium ativado com sucesso! ✨', 'success');
      } else {
        this.showNotification?.(data?.message || 'Assinatura registrada. Aguarde a confirmação final do Mercado Pago.', 'info');
      }
    } catch (error) {
      this.showNotification?.(error?.payload?.message || error.message || 'Ainda não foi possível confirmar seu pagamento.', 'error');
    } finally {
      ['preapproval_id','preapprovalId','subscription_id','id','status','collection_id','collection_status','payment_id','external_reference','merchant_order_id','preference_id'].forEach((key) => url.searchParams.delete(key));
      window.history.replaceState({}, document.title, url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '') + url.hash);
    }
  };

  const blockIfNotPremium = (event) => {
    const appRef = window.app;
    if (!appRef || !appRef.isLoggedIn) return;
    if (appRef.userPlan === PREMIUM_PLAN) return;
    const target = event.target;
    if (!target) return;

    const allowAccountSettings = Boolean(
      target.closest('#module-configuracoes') ||
      target.closest('#config-save-profile-btn, #config-open-forgot-password-btn, #config-open-forgot-password-btn-modal, #config-delete-account-btn, #config-delete-account-btn-modal') ||
      (
        target.closest('#detail-modal') &&
        document.querySelector('#detail-modal-body #config-name-modal, #detail-modal-body #config-email-modal')
      )
    );
    if (allowAccountSettings) return;

    if (!target.closest('.app-panel-container-standalone')) return;
    if (target.closest('#logout-btn, #home-btn-panel, #theme-toggle-btn-panel, #menu-toggle-btn, .sidebar-overlay, .close-modal-btn, [data-action="close-payment-gate"]')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    appRef.showPaymentGateModal?.({
      title: 'Ative seu Premium',
      message: 'Para usar o painel do Alimente Fácil, ative agora seu Premium com 7 dias grátis. Depois, R$ 9,90 por mês. Cancele quando quiser.',
      checkoutUrl: appRef.checkoutLinks?.premium || ''
    });
  };

  document.addEventListener('click', blockIfNotPremium, true);
  document.addEventListener('submit', (event) => {
    const appRef = window.app;
    if (!appRef || !appRef.isLoggedIn || appRef.userPlan === PREMIUM_PLAN) return;
    if (!event.target?.closest('.app-panel-container-standalone')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    appRef.showPaymentGateModal?.({ checkoutUrl: appRef.checkoutLinks?.premium || '' });
  }, true);

  const token = app.getStoredAuthToken?.();
  if (!token) {
    app.forceLoggedOutLanding?.();
  }

  app.handleMercadoPagoReturn?.();
  app.restoreBackendSession?.();
})();

(() => {
  const app = window.app;
  if (!app) return;

  const AUTH_TOKEN_KEY = 'alimenteFacilAuthToken';
  const LEGACY_STATE_KEY = 'alimenteFacilState_vFinal';
  const PREMIUM_PLAN = 'premium';

  const originalEnterAppMode = typeof app.enterAppMode === 'function' ? app.enterAppMode.bind(app) : null;
  const originalActivateModuleAndRender = typeof app.activateModuleAndRender === 'function'
    ? app.activateModuleAndRender.bind(app)
    : null;
  const originalExitAppMode = typeof app.exitAppMode === 'function' ? app.exitAppMode.bind(app) : null;

  const clearLegacyPanelState = () => {
    try {
      const raw = localStorage.getItem(LEGACY_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      parsed.isAppMode = false;
      parsed.isLoggedIn = Boolean(app.isLoggedIn);
      parsed.userPlan = app.userPlan || 'free';
      localStorage.setItem(LEGACY_STATE_KEY, JSON.stringify(parsed));
    } catch (_error) {
      localStorage.removeItem(LEGACY_STATE_KEY);
    }
  };

  app.isPremiumSession = function(sessionData = {}) {
    const plan = String(sessionData?.subscription?.plan || '').toLowerCase();
    const status = String(sessionData?.subscription?.status || '').toLowerCase();
    return plan === PREMIUM_PLAN && (status === 'active' || status === 'trialing');
  };

  app.hasStrictPremiumAccess = function() {
    return Boolean(this.isLoggedIn && this.userPlan === PREMIUM_PLAN);
  };

  app.showPremiumRequiredCard = function(message) {
    this.showPaymentGateModal?.({
      title: 'Ative seu Premium',
      message: message || 'Para acessar o painel do Alimente Fácil, ative agora seu Premium com 7 dias grátis. Depois, R$ 9,90 por mês. Cancele quando quiser.',
      checkoutUrl: this.checkoutLinks?.premium || ''
    });
  };

  app.applyAuthenticatedUser = function(sessionData = {}) {
    const user = sessionData.user || {};
    this.isLoggedIn = true;
    this.userPlan = this.isPremiumSession(sessionData) ? PREMIUM_PLAN : 'basic';
    this.state = this.state || JSON.parse(JSON.stringify(this.defaultState || {}));
    this.state.user = this.state.user || {};
    this.state.user.nome = user.name || user.nome || 'Usuário';
    this.state.user.email = user.email || '';
    this.state.user.id = user.id || '';
    if (this.userPlan !== PREMIUM_PLAN) {
      this.isAppMode = false;
      clearLegacyPanelState();
    }
    this.updateStartButton?.();
    this.saveState?.();
  };

  app.forceLoggedOutLanding = function() {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem('alimenteFacilAuthUser');
    } catch (_error) {}
    this.isLoggedIn = false;
    this.userPlan = 'free';
    this.isAppMode = false;
    this.state = JSON.parse(JSON.stringify(this.defaultState || {}));
    this.state.user = { nome: null, email: '', id: '' };
    this.activeModule = 'inicio';
    this.activeListId = 'listaDaSemana';
    clearLegacyPanelState();
    if (originalExitAppMode) originalExitAppMode();
    this.updateStartButton?.();
    this.saveState?.();
  };

  app.enterAppMode = function(...args) {
    if (!this.hasStrictPremiumAccess?.()) {
      this.isAppMode = false;
      clearLegacyPanelState();
      this.showPremiumRequiredCard?.();
      return;
    }
    return originalEnterAppMode ? originalEnterAppMode(...args) : undefined;
  };

  app.activateModuleAndRender = function(moduleKey, ...args) {
    if (!this.hasStrictPremiumAccess?.()) {
      this.isAppMode = false;
      clearLegacyPanelState();
      this.showPremiumRequiredCard?.();
      return;
    }
    return originalActivateModuleAndRender ? originalActivateModuleAndRender(moduleKey, ...args) : undefined;
  };

  app.handleStartButtonClick = async function() {
    const token = this.getStoredAuthToken?.();
    if (!token) {
      this.showAuthModal?.();
      return;
    }

    try {
      const me = await this.apiFetchJson('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      this.applyAuthenticatedUser?.(me);
      if (this.isPremiumSession(me)) {
        this.enterAppMode?.();
      } else {
        this.isAppMode = false;
        clearLegacyPanelState();
        this.showPremiumRequiredCard?.();
      }
      setTimeout(() => this.syncRealUserInfoInDOM?.(), 80);
    } catch (_error) {
      this.forceLoggedOutLanding?.();
      this.showAuthModal?.();
    }
  };

  app.restoreBackendSession = async function() {
    const token = this.getStoredAuthToken?.();
    if (!token) {
      this.forceLoggedOutLanding?.();
      return;
    }

    try {
      const me = await this.apiFetchJson('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      this.applyAuthenticatedUser?.(me);
      if (this.isPremiumSession(me)) {
        if (this.isAppMode) this.enterAppMode?.();
      } else {
        this.isAppMode = false;
        clearLegacyPanelState();
        if (originalExitAppMode) originalExitAppMode();
      }
      setTimeout(() => this.syncRealUserInfoInDOM?.(), 80);
    } catch (_error) {
      this.forceLoggedOutLanding?.();
    }
  };

  app.handleMercadoPagoReturn = async function() {
    const url = new URL(window.location.href);
    const preapprovalId = url.searchParams.get('preapproval_id') || url.searchParams.get('preapprovalId') || url.searchParams.get('subscription_id') || url.searchParams.get('id') || '';
    const token = this.getStoredAuthToken?.();

    if (!token) return;

    if (!preapprovalId) {
      const status = String(url.searchParams.get('status') || '').toLowerCase();
      if (status && status !== 'approved' && status !== 'authorized') {
        this.applyAuthenticatedUser?.({ user: this.state?.user || {}, subscription: { plan: 'basic', status: 'basic' } });
        this.isAppMode = false;
        clearLegacyPanelState();
        if (originalExitAppMode) originalExitAppMode();
        this.showNotification?.('Pagamento ainda não confirmado. O painel continua bloqueado até a ativação no Mercado Pago.', 'info');
      }
      return;
    }

    try {
      const data = await this.apiFetchJson('/api/billing/confirm-premium', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preapprovalId })
      });
      this.setStoredAuthSession?.(data.token || token, data.user);
      this.applyAuthenticatedUser?.(data);
      if (this.isPremiumSession(data)) {
        this.enterAppMode?.();
        this.showNotification?.('Premium ativado com sucesso! ✨', 'success');
      } else {
        this.isAppMode = false;
        clearLegacyPanelState();
        if (originalExitAppMode) originalExitAppMode();
        this.showNotification?.(data?.message || 'O Mercado Pago ainda não confirmou sua assinatura.', 'info');
      }
    } catch (error) {
      this.isAppMode = false;
      clearLegacyPanelState();
      if (originalExitAppMode) originalExitAppMode();
      this.showNotification?.(error?.payload?.message || error.message || 'Ainda não foi possível confirmar seu pagamento.', 'error');
    } finally {
      ['preapproval_id','preapprovalId','subscription_id','id','status','collection_id','collection_status','payment_id','external_reference','merchant_order_id','preference_id'].forEach((key) => url.searchParams.delete(key));
      window.history.replaceState({}, document.title, url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '') + url.hash);
    }
  };

  const strictPanelGate = (event) => {
    const appRef = window.app;
    if (!appRef || !appRef.isLoggedIn || appRef.userPlan === PREMIUM_PLAN) return;
    const target = event.target;
    if (!target) return;

    const allowAccountSettings = Boolean(
      target.closest('#module-configuracoes') ||
      target.closest('#config-save-profile-btn, #config-open-forgot-password-btn, #config-open-forgot-password-btn-modal, #config-delete-account-btn, #config-delete-account-btn-modal') ||
      (
        target.closest('#detail-modal') &&
        document.querySelector('#detail-modal-body #config-name-modal, #detail-modal-body #config-email-modal')
      )
    );
    if (allowAccountSettings) return;

    if (!target.closest('.app-panel-container-standalone, .app-sidebar, .modules-area, .module-container, .nav-item, #menu-toggle-btn')) return;
    if (target.closest('#logout-btn, #home-btn-panel, #theme-toggle-btn-panel, .sidebar-overlay, .close-modal-btn, [data-action="close-payment-gate"]')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    appRef.isAppMode = false;
    clearLegacyPanelState();
    appRef.showPremiumRequiredCard?.();
  };

  document.addEventListener('click', strictPanelGate, true);
  document.addEventListener('submit', (event) => {
    const appRef = window.app;
    if (!appRef || !appRef.isLoggedIn || appRef.userPlan === PREMIUM_PLAN) return;
    if (!event.target?.closest('.app-panel-container-standalone, .app-sidebar')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    appRef.isAppMode = false;
    clearLegacyPanelState();
    appRef.showPremiumRequiredCard?.();
  }, true);

  const token = app.getStoredAuthToken?.();
  if (!token) {
    app.forceLoggedOutLanding?.();
  } else {
    clearLegacyPanelState();

  }

  const afRebindKnownFields = () => {
    ['lista-form-nome-full','lista-form-nome-dash','edit-item-name','pantry-edit-name','recipe-ing-name','essential-name'].forEach((id) => {
      const input = document.getElementById(id);
      if (!input) return;
      app.decorateIngredientAutocompleteInput(input);
      input.setAttribute('autocomplete', 'off');
    });
  };

  afRebindKnownFields();
  const afObserver = new MutationObserver(() => afRebindKnownFields());
  afObserver.observe(document.body, { childList: true, subtree: true });


})();

(() => {
  const app = window.app;
  if (!app) return;

  const FIELD_IDS = new Set([
    'lista-form-nome-full',
    'lista-form-nome-dash',
    'edit-item-name',
    'edit-item-name-dt',
    'pantry-edit-name',
    'recipe-ing-name',
    'inline-edit-name',
    'item-name',
    'essential-name',
    'planner-custom-name',
    'recipe-edit-name',
    'calc-item-name'
  ]);

  const UNIT_OPTIONS = ['un','kg','g','L','ml','pct','cx','xícara','colher','pitada','dentes','a gosto','fio','filés'];
  const COMMON_ITEMS = [
    { name: 'Arroz', unit_desc: 'kg' },
    { name: 'Feijão', unit_desc: 'kg' },
    { name: 'Açúcar', unit_desc: 'kg' },
    { name: 'Café', unit_desc: 'pct' },
    { name: 'Sal', unit_desc: 'a gosto' },
    { name: 'Óleo de soja', unit_desc: 'L' },
    { name: 'Leite', unit_desc: 'L' },
    { name: 'Ovos', unit_desc: 'un' },
    { name: 'Tomate', unit_desc: 'un' },
    { name: 'Cebola', unit_desc: 'un' },
    { name: 'Alho', unit_desc: 'dentes' },
    { name: 'Macarrão', unit_desc: 'pct' },
    { name: 'Farinha de trigo', unit_desc: 'kg' },
    { name: 'Manteiga', unit_desc: 'g' },
    { name: 'Pão', unit_desc: 'un' },
    { name: 'Banana', unit_desc: 'un' },
    { name: 'Maçã', unit_desc: 'un' },
    { name: 'Batata', unit_desc: 'kg' },
    { name: 'Cenoura', unit_desc: 'kg' },
    { name: 'Abóbora', unit_desc: 'kg' },
    { name: 'Frango', unit_desc: 'kg' },
    { name: 'Carne moída', unit_desc: 'kg' },
    { name: 'Queijo', unit_desc: 'g' },
    { name: 'Presunto', unit_desc: 'g' },
    { name: 'Milho', unit_desc: 'pct' }
  ];

  const escapeAttr = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const normalize = app.normalizeSearchText || function(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  app.normalizeSearchText = normalize;

  app.__afAutocomplete = app.__afAutocomplete || {
    input: null,
    query: '',
    suggestions: [],
    selected: new Map(),
    context: null,
    recognition: null,
    listening: false
  };

  app.ensureAutocompleteContainer = function() {
    if (!this.elements) this.elements = {};
    let el = this.elements.autocompleteSuggestions || document.getElementById('autocomplete-suggestions');
    if (!el) {
      el = document.createElement('div');
      el.id = 'autocomplete-suggestions';
      document.body.appendChild(el);
    }
    this.elements.autocompleteSuggestions = el;
    return el;
  };

  app.isIngredientAutocompleteInput = function(input) {
    if (!input || input.tagName !== 'INPUT' || input.type === 'hidden' || input.disabled || input.readOnly) return false;
    const id = String(input.id || '').trim();
    if (FIELD_IDS.has(id)) return true;

    const nameAttr = String(input.getAttribute('name') || '').toLowerCase();
    const placeholder = String(input.getAttribute('placeholder') || '').toLowerCase();
    const aria = String(input.getAttribute('aria-label') || '').toLowerCase();
    const nearbyLabel = String(input.closest('.form-group, .input-group, .modal-content, .modal-box, .card-content, form')?.querySelector('label')?.textContent || '').toLowerCase();
    const haystack = [id.toLowerCase(), nameAttr, placeholder, aria, nearbyLabel].join(' ');

    const looksLikeItemField = /(ingred|item|produto|despensa|lista|receita|essencial|planej|calc)/.test(haystack) && /(nome|name|digite|buscar|adicionar|insira)/.test(haystack);
    return looksLikeItemField;
  };

  app.getIngredientAutocompleteContext = function(input) {
    const id = String(input?.id || '').trim();
    const formRoot = input?.closest('#recipe-ing-form, #item-edit-modal, #pantry-edit-form-fullscreen, #lista-detail-desktop, #module-listas, #module-despensa, #module-receitas, #module-planejador, #calculadora, .modal-box, form') || document;
    const rootText = String(formRoot?.id || '') + ' ' + String(formRoot?.className || '');
    const lowerRoot = rootText.toLowerCase();
    const isBulkList = id === 'lista-form-nome-full' || id === 'lista-form-nome-dash' || (lowerRoot.includes('module-listas') && (id === 'item-name' || id === 'inline-edit-name'));
    const isRecipe = id === 'recipe-ing-name' || id === 'recipe-edit-name' || lowerRoot.includes('module-receitas');
    const isPantry = id === 'pantry-edit-name' || id === 'edit-item-name' || id === 'essential-name' || lowerRoot.includes('module-despensa') || lowerRoot.includes('item-edit-modal') || lowerRoot.includes('pantry-edit-form-fullscreen');
    const isPlanner = id === 'planner-custom-name' || lowerRoot.includes('module-planejador');
    const isCalc = id === 'calc-item-name' || lowerRoot.includes('calculadora');
    const editItemId = document.getElementById('edit-item-id')?.value?.trim();
    const editItemType = document.getElementById('edit-item-type')?.value?.trim();
    const pantryEditId = document.getElementById('pantry-edit-id')?.value?.trim();
    const isPantryBulk = id === 'pantry-edit-name' ? !pantryEditId : (!editItemId && editItemType === 'despensa');

    if (isBulkList) return { entity: 'lista', mode: 'bulk', label: 'Adicionar itens na lista' };
    if (isRecipe) return { entity: 'receita', mode: 'bulk', label: 'Adicionar ingredientes' };
    if (isPantry && isPantryBulk) return { entity: 'despensa', mode: 'bulk', label: 'Adicionar itens na despensa' };
    if (isPantry) return { entity: 'despensa', mode: 'single', label: 'Selecionar item da despensa' };
    if (isPlanner) return { entity: 'receita', mode: 'single', label: 'Selecionar refeição' };
    if (isCalc) return { entity: 'geral', mode: 'single', label: 'Selecionar item' };
    return { entity: 'geral', mode: 'single', label: 'Selecionar item' };
  };

  app.decorateIngredientAutocompleteInput = function(input) {
    if (!this.isIngredientAutocompleteInput(input) || input.dataset.afAutocompleteDecorated === '1') return;
    const parent = input.parentElement;
    if (!parent) return;

    let wrap = input.closest('.af-autocomplete-input-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'af-autocomplete-input-wrap';
      parent.insertBefore(wrap, input);
      wrap.appendChild(input);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'af-voice-trigger';
    button.setAttribute('aria-label', 'Pesquisar por voz');
    button.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    wrap.appendChild(button);
    input.dataset.afAutocompleteDecorated = '1';
    input.setAttribute('autocomplete', 'off');
  };

  app.getIngredientUsageMap = function() {
    const usage = new Map();
    const bump = (name, amount = 1) => {
      const key = normalize(name);
      if (!key) return;
      usage.set(key, (usage.get(key) || 0) + amount);
    };
    Object.values(this.state?.listas || {}).forEach((lista) => {
      (lista?.items || []).forEach((item) => bump(item?.name, 3));
    });
    (this.state?.despensa || []).forEach((item) => bump(item?.name, 2));
    Object.values(this.state?.receitas || {}).forEach((recipe) => {
      (recipe?.ingredients || []).forEach((ing) => bump(ing?.name, 2));
    });
    return usage;
  };

  app.getAutocompleteCatalog = function() {
    const usage = this.getIngredientUsageMap();
    const catalog = [];
    const globalItems = Array.isArray(window.ALL_ITEMS_DATA) ? window.ALL_ITEMS_DATA : [];
    catalog.push(...globalItems);
    catalog.push(...(this.state?.despensa || []).map((item) => ({ name: item.name, unit_desc: item.unid || 'un', price: Number(item.valor || 0) })));
    catalog.push(...Object.values(this.state?.listas || {}).flatMap((lista) => (lista?.items || []).map((item) => ({ name: item.name, unit_desc: item.unid || 'un', price: Number(item.valor || 0) }))));
    catalog.push(...Object.values(this.state?.receitas || {}).flatMap((recipe) => (recipe?.ingredients || []).map((ing) => ({ name: ing.name, unit_desc: ing.unit || 'un', price: 0 }))));
    catalog.push(...COMMON_ITEMS.map((item) => ({ ...item, isCommon: true })));

    const dedup = new Map();
    catalog.forEach((item) => {
      const name = String(item?.name || '').trim();
      const key = normalize(name);
      if (!name || !key) return;
      const unitDesc = String(item?.unit_desc || item?.unid || item?.unit || 'un').trim() || 'un';
      const base = dedup.get(key) || {
        name,
        unit_desc: unitDesc,
        price: Number(item?.price || item?.valor || item?.preco || 0) || 0,
        usageCount: usage.get(key) || 0,
        commonBoost: item?.isCommon ? 4 : 0
      };
      if (!base.name || base.name.length > name.length) base.name = name;
      if (item?.isCommon) base.commonBoost = Math.max(base.commonBoost, 4);
      if ((!base.unit_desc || base.unit_desc === 'un') && unitDesc) base.unit_desc = unitDesc;
      if ((!base.price || base.price === 0) && Number(item?.price || item?.valor || item?.preco || 0) > 0) base.price = Number(item?.price || item?.valor || item?.preco || 0);
      base.usageCount = Math.max(base.usageCount || 0, usage.get(key) || 0);
      dedup.set(key, base);
    });
    return Array.from(dedup.values());
  };

  app.highlightAutocompleteLabel = function(label, rawQuery) {
    const safeLabel = this.escapeHtml ? this.escapeHtml(label) : escapeAttr(label);
    const q = normalize(rawQuery);
    if (!q) return safeLabel;
    const normalizedLabel = normalize(label);
    const idx = normalizedLabel.indexOf(q);
    if (idx < 0) return safeLabel;
    return `${safeLabel.slice(0, idx)}<mark>${safeLabel.slice(idx, idx + String(rawQuery).trim().length)}</mark>${safeLabel.slice(idx + String(rawQuery).trim().length)}`;
  };

  app.searchAutocompleteSuggestions = function(rawQuery) {
    const source = this.getAutocompleteCatalog();
    const query = normalize(rawQuery);
    if (!query) {
      return source
        .sort((a, b) => ((b.usageCount + b.commonBoost) - (a.usageCount + a.commonBoost)) || a.name.localeCompare(b.name, 'pt-BR'))
        .slice(0, 14);
    }

    const words = query.split(' ').filter(Boolean);
    const exactThreshold = words.join(' ');
    const ranked = source
      .map((item) => {
        const normalizedName = normalize(item.name);
        if (!normalizedName) return null;
        const includesAll = words.every((word) => normalizedName.includes(word));
        if (!includesAll) return null;
        let score = 0;
        if (normalizedName === exactThreshold) score += 90;
        if (normalizedName.startsWith(query)) score += 60;
        if (normalizedName.includes(` ${query}`)) score += 30;
        score += Math.max(0, 12 - normalizedName.length / 3);
        score += (item.usageCount || 0) * 5;
        score += item.commonBoost || 0;
        return { ...item, __score: score };
      })
      .filter(Boolean)
      .sort((a, b) => (b.__score - a.__score) || a.name.localeCompare(b.name, 'pt-BR'))
      .slice(0, 14)
      .map(({ __score, ...item }) => item);

    return ranked;
  };

  app.positionAutocompleteCard = function(input) {
    const container = this.ensureAutocompleteContainer();
    if (!container || !input) return;
    const rect = input.getBoundingClientRect();
    const width = Math.max(290, rect.width);
    const estimatedHeight = Math.min(420, window.innerHeight * 0.55);
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < 260 && rect.top > estimatedHeight;
    container.style.position = 'fixed';
    container.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
    container.style.top = showAbove ? `${Math.max(12, rect.top - estimatedHeight - 10)}px` : `${Math.min(window.innerHeight - 12, rect.bottom + 8)}px`;
    container.style.width = `${Math.min(width, window.innerWidth - 24)}px`;
    container.style.maxWidth = 'calc(100vw - 24px)';
  };

  app.renderIngredientAutocomplete = function(input, rawQuery = null) {
    if (!this.isIngredientAutocompleteInput(input)) return;
    this.decorateIngredientAutocompleteInput(input);
    const state = this.__afAutocomplete;
    const container = this.ensureAutocompleteContainer();
    const query = rawQuery === null ? String(input.value || '') : String(rawQuery || '');
    const context = this.getIngredientAutocompleteContext(input);
    const suggestions = this.searchAutocompleteSuggestions(query);
    const queryNorm = normalize(query);

    state.input = input;
    state.query = query;
    state.context = context;
    state.suggestions = suggestions;
    this.activeAutocompleteInput = input;

    const selectedNames = Array.from(state.selected.values());
    const selectedChips = selectedNames.length
      ? `<div class="af-autocomplete-selected">${selectedNames.map((name) => `<button type="button" class="af-selected-chip" data-af-chip-remove="${escapeAttr(name)}"><span>${this.escapeHtml ? this.escapeHtml(name) : escapeAttr(name)}</span><i class="fa-solid fa-xmark"></i></button>`).join('')}</div>`
      : '';

    const rows = suggestions.length
      ? suggestions.map((item) => {
          const key = normalize(item.name);
          const checked = state.selected.has(key);
          const meta = [];
          if (item.unit_desc) meta.push(item.unit_desc);
          if (item.usageCount) meta.push(`${item.usageCount}x usado`);
          return `
            <button type="button" class="af-autocomplete-option ${checked ? 'is-checked' : ''}" data-af-name="${escapeAttr(item.name)}" data-af-option="1">
              ${context.mode === 'bulk' ? `<span class="af-autocomplete-box"><i class="fa-solid fa-check"></i></span>` : `<span class="af-autocomplete-box af-single-box"><i class="fa-solid fa-arrow-turn-down-left"></i></span>`}
              <span class="af-autocomplete-copy">
                <strong>${this.highlightAutocompleteLabel(item.name, query)}</strong>
                <small>${this.escapeHtml ? this.escapeHtml(meta.join(' • ')) : escapeAttr(meta.join(' • '))}</small>
              </span>
            </button>`;
        }).join('')
      : `<div class="af-autocomplete-empty">Nenhum item encontrado. Você pode inserir manualmente ou usar áudio.</div>`;

    const footerCount = selectedNames.length;
    const exactExists = suggestions.some((item) => normalize(item.name) === queryNorm);
    const manualText = query.trim();
    const canUseManual = !!manualText && !exactExists;
    const footerPrimary = context.mode === 'bulk'
      ? `Adicionar ${footerCount || (canUseManual ? 1 : 0)} item${footerCount + (canUseManual && footerCount === 0 ? 1 : 0) > 1 ? 's' : ''}`
      : 'Usar item';

    container.innerHTML = `
      <div class="af-autocomplete-card ${context.mode === 'bulk' ? 'is-bulk' : 'is-single'} ${state.listening ? 'is-listening' : ''}">
        <div class="af-autocomplete-head">
          <div class="af-autocomplete-title-wrap">
            <span class="af-autocomplete-eyebrow">${this.escapeHtml ? this.escapeHtml(context.label) : escapeAttr(context.label)}</span>
            <strong>${context.mode === 'bulk' ? 'Selecione um ou vários itens' : 'Escolha um item'}</strong>
          </div>
          <button type="button" class="af-autocomplete-audio ${state.listening ? 'is-active' : ''}" data-af-voice="1">
            <i class="fa-solid fa-microphone"></i>
            <span>${state.listening ? 'Ouvindo...' : 'Áudio'}</span>
          </button>
        </div>
        ${selectedChips}
        <div class="af-autocomplete-list">${rows}</div>
        <div class="af-autocomplete-footer">
          <button type="button" class="af-autocomplete-action secondary" data-af-action="clear">Limpar</button>
          ${canUseManual ? `<button type="button" class="af-autocomplete-action secondary" data-af-action="manual">Usar "${this.escapeHtml ? this.escapeHtml(manualText) : escapeAttr(manualText)}"</button>` : ''}
          <button type="button" class="af-autocomplete-action primary" data-af-action="apply">${footerPrimary}</button>
        </div>
      </div>`;

    this.positionAutocompleteCard(input);
    container.style.display = 'block';
  };

  app.hideAutocomplete = function(forceClearSelection = false) {
    const state = this.__afAutocomplete;
    if (state?.recognition && state.listening) {
      try { state.recognition.stop(); } catch (_) {}
    }
    if (forceClearSelection && state?.selected) state.selected.clear();
    const container = this.ensureAutocompleteContainer();
    if (container) {
      container.style.display = 'none';
      container.innerHTML = '';
    }
    if (state) {
      state.input = null;
      state.query = '';
      state.suggestions = [];
      state.context = null;
      state.listening = false;
    }
    this.activeAutocompleteInput = null;
    document.querySelectorAll('.af-voice-trigger, .af-autocomplete-audio').forEach((btn) => btn.classList.remove('is-active'));
  };

  app.clearAutocompleteSelection = function() {
    const state = this.__afAutocomplete;
    state.selected.clear();
    if (state.input) this.renderIngredientAutocomplete(state.input, state.input.value || '');
  };

  app.resolveAutocompleteMeta = function(name) {
    const key = normalize(name);
    return this.getAutocompleteCatalog().find((item) => normalize(item.name) === key) || { name, unit_desc: 'un', price: 0 };
  };

  app.applyUnitToSelect = function(select, sourceUnit) {
    if (!select) return;
    const unitSource = String(sourceUnit || 'un').toLowerCase();
    const option = Array.from(select.options || []).find((opt) => unitSource.includes(String(opt.value || '').toLowerCase()));
    select.value = option ? option.value : (select.value || 'un');
  };

  app.applySuggestionMetadataToInput = function(input, itemData) {
    if (!input || !itemData) return;
    const id = String(input.id || '');
    const unit = String(itemData.unit_desc || itemData.unid || itemData.unit || 'un');
    const price = Number(itemData.price || itemData.valor || itemData.preco || 0);

    if (id === 'recipe-ing-name') {
      const wrap = input.closest('#recipe-ing-form, #custom-confirm-modal, form') || document;
      const qtyInput = wrap.querySelector('#recipe-ing-qtd');
      const unitSelect = wrap.querySelector('#recipe-ing-unid');
      if (qtyInput && !String(qtyInput.value || '').trim()) qtyInput.value = '1';
      this.applyUnitToSelect(unitSelect, unit);
      return;
    }

    if (id === 'lista-form-nome-full' || id === 'lista-form-nome-dash') {
      const qtyInput = document.getElementById('lista-form-qtd-full') || document.getElementById('lista-form-qtd-dash');
      const unitSelect = document.getElementById('lista-form-unid-full') || document.getElementById('lista-form-unid-dash');
      const priceInput = document.getElementById('lista-form-valor-full') || document.getElementById('lista-form-valor-dash');
      if (qtyInput && !String(qtyInput.value || '').trim()) qtyInput.value = '1';
      this.applyUnitToSelect(unitSelect, unit);
      if (priceInput && !String(priceInput.value || '').trim() && price > 0) priceInput.value = price.toFixed(2);
      return;
    }

    const root = input.closest('#item-edit-modal, #pantry-edit-form-fullscreen, #lista-detail-desktop, .modal-box, form, .card-content') || document;
    const qtyInput = root.querySelector('#edit-item-qtd, #pantry-edit-qtd') || document.getElementById('edit-item-qtd') || document.getElementById('pantry-edit-qtd');
    const unitSelect = root.querySelector('#edit-item-unid, #pantry-edit-unid') || document.getElementById('edit-item-unid') || document.getElementById('pantry-edit-unid');
    const priceInput = root.querySelector('#edit-item-valor') || document.getElementById('edit-item-valor');
    if (qtyInput && !String(qtyInput.value || '').trim()) qtyInput.value = '1';
    this.applyUnitToSelect(unitSelect, unit);
    if (priceInput && !String(priceInput.value || '').trim() && price > 0) priceInput.value = price.toFixed(2);
  };

  app.setBulkSelectionByNames = function(names) {
    const state = this.__afAutocomplete;
    state.selected.clear();
    (Array.isArray(names) ? names : []).forEach((name) => {
      const clean = String(name || '').trim();
      if (!clean) return;
      const key = normalize(clean);
      const meta = this.resolveAutocompleteMeta(clean);
      state.selected.set(key, meta.name || clean);
    });
  };

  app.parseVoiceIngredientTokens = function(transcript) {
    const text = String(transcript || '').trim();
    if (!text) return [];
    const cleaned = text.replace(/^adicionar\s+/i, '').replace(/^inserir\s+/i, '').trim();
    if (/[;,\n]/.test(cleaned)) {
      return cleaned.split(/[;,\n]+/).map((part) => part.trim()).filter(Boolean);
    }
    return [cleaned];
  };

  app.startIngredientVoiceSearch = function(input) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.showNotification?.('Seu navegador não liberou pesquisa por áudio neste campo.', 'info');
      return;
    }

    this.decorateIngredientAutocompleteInput(input);
    const state = this.__afAutocomplete;
    if (state.recognition && state.listening) {
      try { state.recognition.stop(); } catch (_) {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    state.recognition = recognition;
    state.listening = true;
    state.input = input;
    document.querySelectorAll('.af-voice-trigger, .af-autocomplete-audio').forEach((btn) => btn.classList.add('is-active'));
    this.renderIngredientAutocomplete(input, input.value || '');

    recognition.onresult = (event) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript || '').trim();
      input.value = transcript;
      const tokens = this.parseVoiceIngredientTokens(transcript);
      const context = this.getIngredientAutocompleteContext(input);
      if (context.mode === 'bulk' && tokens.length > 1) {
        this.setBulkSelectionByNames(tokens);
        this.renderIngredientAutocomplete(input, '');
        this.showNotification?.(`${tokens.length} item(ns) captado(s) por voz.`, 'success');
        return;
      }
      this.renderIngredientAutocomplete(input, transcript);
    };

    recognition.onerror = () => {
      state.listening = false;
      document.querySelectorAll('.af-voice-trigger, .af-autocomplete-audio').forEach((btn) => btn.classList.remove('is-active'));
      this.showNotification?.('Não consegui entender o áudio. Tente novamente.', 'error');
      if (state.input) this.renderIngredientAutocomplete(state.input, state.input.value || '');
    };

    recognition.onend = () => {
      state.listening = false;
      document.querySelectorAll('.af-voice-trigger, .af-autocomplete-audio').forEach((btn) => btn.classList.remove('is-active'));
      if (state.input) this.renderIngredientAutocomplete(state.input, state.input.value || '');
    };

    try {
      recognition.start();
    } catch (_) {
      state.listening = false;
      document.querySelectorAll('.af-voice-trigger, .af-autocomplete-audio').forEach((btn) => btn.classList.remove('is-active'));
    }
  };

  app.applySingleAutocompleteItem = function(name) {
    const state = this.__afAutocomplete;
    const input = state.input;
    if (!input) return;
    const itemData = this.resolveAutocompleteMeta(name);
    input.value = itemData.name || name;
    this.applySuggestionMetadataToInput(input, itemData);
    this.hideAutocomplete(true);
    input.focus();
  };

  app.getBulkNamesToApply = function() {
    const state = this.__afAutocomplete;
    const selected = Array.from(state.selected.values()).map((name) => String(name || '').trim()).filter(Boolean);
    if (selected.length) return selected;
    const manual = String(state.query || state.input?.value || '').trim();
    return manual ? this.parseVoiceIngredientTokens(manual) : [];
  };

  app.addManyItemsToActiveList = function(names) {
    const cleanNames = Array.from(new Map((Array.isArray(names) ? names : []).map((name) => [normalize(name), String(name || '').trim()]).filter(([, name]) => !!name))).map(([, name]) => name);
    if (!cleanNames.length) {
      this.showNotification?.('Selecione pelo menos um item para adicionar na lista.', 'info');
      return false;
    }

    let targetListId = document.getElementById('active-list-id-input')?.value || this.activeListId;
    if (!this.state?.listas?.[targetListId]) {
      const typedListName = document.getElementById('active-list-name-input')?.value?.trim() || document.getElementById('widget-list-name-input')?.value?.trim();
      if (!typedListName) {
        this.showNotification?.('Dê um nome para sua lista antes de adicionar itens.', 'error');
        return false;
      }
      const newListId = this.generateId();
      this.state.listas[newListId] = { nome: typedListName, items: [] };
      this.activeListId = newListId;
      targetListId = newListId;
    }

    const currentItems = this.state.listas[targetListId].items || [];
    if (this.userPlan === 'free' && currentItems.length + cleanNames.length > 10) {
      this.showPlansModal?.('Limite de 10 itens por lista no plano Gratuito atingido. Faça upgrade para listas ilimitadas!');
      return false;
    }

    const newItems = cleanNames.map((name) => {
      const item = this.resolveAutocompleteMeta(name);
      return {
        id: this.generateId(),
        name: item.name,
        qtd: 1,
        unid: String(item.unit_desc || 'un'),
        valor: Number(item.price || 0).toFixed(2),
        checked: false
      };
    });

    this.state.listas[targetListId].items.unshift(...newItems.reverse());
    this.activeListId = targetListId;
    this.renderListaAtiva?.(targetListId);
    this.renderListaWidget?.();
    this.renderListasSalvas?.();
    this.renderOrcamento?.();
    this.saveState?.();
    return newItems.length;
  };

  app.addManyItemsToPantry = function(names) {
    const cleanNames = Array.from(new Map((Array.isArray(names) ? names : []).map((name) => [normalize(name), String(name || '').trim()]).filter(([, name]) => !!name))).map(([, name]) => name);
    if (!cleanNames.length) {
      this.showNotification?.('Selecione pelo menos um item para adicionar na despensa.', 'info');
      return false;
    }

    const newItems = cleanNames.map((name) => {
      const item = this.resolveAutocompleteMeta(name);
      return {
        id: this.generateId(),
        name: item.name,
        qtd: 1,
        unid: String(item.unit_desc || 'un'),
        valor: Number(item.price || 0).toFixed(2),
        validade: '',
        stock: 100
      };
    });

    this.state.despensa.unshift(...newItems.reverse());
    this.renderDespensaWidget?.();
    if (this.activeModule === 'despensa') this.renderDespensa?.();
    this.saveState?.();
    return newItems.length;
  };

  app.addManyIngredientsToRecipeEditor = function(names) {
    const cleanNames = Array.from(new Map((Array.isArray(names) ? names : []).map((name) => [normalize(name), String(name || '').trim()]).filter(([, name]) => !!name))).map(([, name]) => name);
    if (!cleanNames.length) {
      this.showNotification?.('Selecione pelo menos um ingrediente.', 'info');
      return false;
    }

    this.tempRecipeIngredients = Array.isArray(this.tempRecipeIngredients) ? this.tempRecipeIngredients : [];
    cleanNames.forEach((name) => {
      const item = this.resolveAutocompleteMeta(name);
      this.tempRecipeIngredients.push({ name: item.name, qty: '1', unit: String(item.unit_desc || 'un') });
    });
    this.renderModalIngredientList?.();
    return cleanNames.length;
  };

  app.applyBulkAutocompleteSelection = function() {
    const state = this.__afAutocomplete;
    const context = state.context || this.getIngredientAutocompleteContext(state.input);
    const names = this.getBulkNamesToApply();
    if (!names.length) {
      this.showNotification?.('Selecione um ou mais itens antes de adicionar.', 'info');
      return;
    }

    let added = 0;
    if (context.entity === 'lista') added = this.addManyItemsToActiveList(names) || 0;
    if (context.entity === 'despensa') added = this.addManyItemsToPantry(names) || 0;
    if (context.entity === 'receita') added = this.addManyIngredientsToRecipeEditor(names) || 0;
    if (!added) return;

    if (state.input) state.input.value = '';
    state.selected.clear();
    if (context.entity === 'receita') {
      const qtyInput = document.getElementById('recipe-ing-qtd');
      const unitSelect = document.getElementById('recipe-ing-unid');
      if (qtyInput) qtyInput.value = '1';
      if (unitSelect) unitSelect.value = 'un';
      this.renderIngredientAutocomplete(state.input, '');
    } else {
      this.hideAutocomplete(true);
    }

    const labels = {
      lista: 'adicionado(s) à lista',
      despensa: 'adicionado(s) à despensa',
      receita: 'adicionado(s) à receita'
    };
    this.showNotification?.(`${added} item(ns) ${labels[context.entity] || 'adicionado(s)'}.`, 'success');
  };

  app.handleAutocomplete = function(input) {
    if (!this.isIngredientAutocompleteInput(input)) return;
    this.renderIngredientAutocomplete(input, input.value || '');
  };

  const previousHandleSaveEditModal = app.handleSaveEditModal?.bind(app);
  app.handleSaveEditModal = function() {
    const id = document.getElementById('edit-item-id')?.value?.trim();
    const type = document.getElementById('edit-item-type')?.value?.trim();
    if (!id && type === 'despensa') {
      const name = document.getElementById('edit-item-name')?.value?.trim();
      if (!name) {
        this.showNotification?.('Informe o nome do item da despensa.', 'error');
        document.getElementById('edit-item-name')?.focus();
        return;
      }
      this.state.despensa.unshift({
        id: this.generateId(),
        name,
        qtd: parseFloat(document.getElementById('edit-item-qtd')?.value) || 1,
        unid: document.getElementById('edit-item-unid')?.value || 'un',
        valor: (parseFloat(document.getElementById('edit-item-valor')?.value) || 0).toFixed(2),
        validade: document.getElementById('edit-item-validade')?.value || '',
        stock: parseInt(document.getElementById('edit-item-stock')?.value || '100', 10)
      });
      this.saveState?.();
      this.renderDespensaWidget?.();
      if (this.activeModule === 'despensa') this.renderDespensa?.();
      this.closeModal?.('item-edit-modal');
      this.showNotification?.('Item adicionado à despensa!', 'success');
      return;
    }
    return previousHandleSaveEditModal ? previousHandleSaveEditModal() : undefined;
  };

  document.addEventListener('focusin', (event) => {
    const input = event.target;
    if (!app.isIngredientAutocompleteInput(input)) return;
    app.decorateIngredientAutocompleteInput(input);
    setTimeout(() => app.renderIngredientAutocomplete(input, input.value || ''), 10);
  });

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (!app.isIngredientAutocompleteInput(input)) return;
    app.renderIngredientAutocomplete(input, input.value || '');
  }, true);

  document.addEventListener('keydown', (event) => {
    const input = event.target;
    if (!app.isIngredientAutocompleteInput(input)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      app.hideAutocomplete(true);
      return;
    }
    if (event.key === 'Enter' && app.__afAutocomplete?.input === input) {
      const context = app.getIngredientAutocompleteContext(input);
      if (context.mode === 'bulk') {
        event.preventDefault();
        app.applyBulkAutocompleteSelection();
      } else {
        const first = app.__afAutocomplete?.suggestions?.[0];
        if (first) {
          event.preventDefault();
          app.applySingleAutocompleteItem(first.name);
        }
      }
    }
  }, true);

  document.addEventListener('pointerdown', (event) => {
    const targetEl = event.target instanceof Element ? event.target : null;
    const option = targetEl ? targetEl.closest('.af-autocomplete-option') : null;
    if (option) {
      event.preventDefault();
      event.stopPropagation();
      const name = option.getAttribute('data-af-name') || '';
      const state = app.__afAutocomplete;
      const context = state.context || app.getIngredientAutocompleteContext(state.input);
      if (context.mode === 'bulk') {
        const key = normalize(name);
        if (state.selected.has(key)) state.selected.delete(key);
        else state.selected.set(key, name);
        app.renderIngredientAutocomplete(state.input, state.input?.value || '');
      } else {
        app.applySingleAutocompleteItem(name);
      }
      return;
    }
    const chip = event.target.closest?.('[data-af-chip-remove]');
    if (chip) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      const name = chip.getAttribute('data-af-chip-remove') || '';
      app.__afAutocomplete.selected.delete(normalize(name));
      if (app.__afAutocomplete.input) app.renderIngredientAutocomplete(app.__afAutocomplete.input, app.__afAutocomplete.input.value || '');
      return;
    }
    const action = event.target.closest?.('[data-af-action]');
    if (action) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      const act = action.getAttribute('data-af-action');
      if (act === 'clear') {
        app.clearAutocompleteSelection();
      } else if (act === 'manual') {
        const input = app.__afAutocomplete?.input;
        const context = app.__afAutocomplete?.context || app.getIngredientAutocompleteContext(input);
        if (context.mode === 'bulk') app.applyBulkAutocompleteSelection();
        else if (input) app.applySingleAutocompleteItem(input.value || '');
      } else if (act === 'apply') {
        const input = app.__afAutocomplete?.input;
        const context = app.__afAutocomplete?.context || app.getIngredientAutocompleteContext(input);
        if (context.mode === 'bulk') app.applyBulkAutocompleteSelection();
        else if (app.__afAutocomplete?.suggestions?.[0]) app.applySingleAutocompleteItem(app.__afAutocomplete.suggestions[0].name);
        else if (input?.value?.trim()) app.applySingleAutocompleteItem(input.value.trim());
      }
      return;
    }
    const voice = event.target.closest?.('[data-af-voice]');
    const voiceBtn = event.target.closest?.('.af-voice-trigger');
    if (voice || voiceBtn) {
      event.preventDefault();
    }
  }, true);

  document.addEventListener('click', (event) => {
    const targetEl = event.target instanceof Element ? event.target : null;
    const voiceBtn = targetEl ? targetEl.closest('.af-voice-trigger') : null;
    if (voiceBtn) {
      const input = voiceBtn.parentElement?.querySelector('input');
      if (input) app.startIngredientVoiceSearch(input);
      return;
    }

    const panelVoiceBtn = targetEl ? targetEl.closest('[data-af-voice]') : null;
    if (panelVoiceBtn) {
      const input = app.__afAutocomplete?.input;
      if (input) app.startIngredientVoiceSearch(input);
      return;
    }

    const input = targetEl ? targetEl.closest('input') : null;
    if (app.isIngredientAutocompleteInput(input)) {
      app.decorateIngredientAutocompleteInput(input);
      app.renderIngredientAutocomplete(input, input.value || '');
      return;
    }

    if (!(targetEl && targetEl.closest('#autocomplete-suggestions'))) {
      app.hideAutocomplete(true);
    }
  }, true);

  window.addEventListener('resize', () => {
    const input = app.__afAutocomplete?.input;
    if (input && app.ensureAutocompleteContainer().style.display === 'block') {
      app.positionAutocompleteCard(input);
    }
  });

  window.addEventListener('scroll', () => {
    const input = app.__afAutocomplete?.input;
    if (input && app.ensureAutocompleteContainer().style.display === 'block') {
      app.positionAutocompleteCard(input);
    }
  }, true);


})();


document.addEventListener('DOMContentLoaded', () => {
  const tiltCards = document.querySelectorAll('.tilt-card');

  tiltCards.forEach((card) => {
    const resetCard = () => {
      card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0)';
    };

    card.addEventListener('mousemove', (event) => {
      if (window.innerWidth <= 980) return;
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 10;
      const rotateX = (0.5 - py) * 10;
      card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
    });

    card.addEventListener('mouseleave', resetCard);
    card.addEventListener('blur', resetCard);
  });

  const storyVideo = document.querySelector('.story-video');
  if (storyVideo) {
    storyVideo.addEventListener('error', () => {
      const shell = storyVideo.closest('.story-video-shell');
      if (shell) {
        shell.classList.add('asset-missing');
      }
    });
  }
});

(function(){
  const showcaseShots = [
    { src:'landing-showcase/shot-03.png', kicker:'Lista', title:'Listas inteligentes sem bagunça', desc:'Monte compras com clareza, preço visível e fluxo direto para o mercado.' },
    { src:'landing-showcase/shot-04.png', kicker:'Painel', title:'Visual premium e leitura imediata', desc:'Cada área do painel foi pensada para ser rápida, bonita e funcional no celular.' },
    { src:'landing-showcase/shot-05.png', kicker:'Planejamento', title:'Semana organizada com mais lógica', desc:'Distribua refeições, acompanhe a rotina e mantenha tudo conectado.' },
    { src:'landing-showcase/shot-06.png', kicker:'Controle', title:'Despensa viva e sempre visível', desc:'Acompanhe estoque, validade e o que realmente faz falta em casa.' },
    { src:'landing-showcase/shot-07.png', kicker:'Receitas', title:'Receitas dentro do seu fluxo real', desc:'Use o que você já tem e transforme organização em praticidade diária.' },
    { src:'landing-showcase/shot-08.png', kicker:'Análises', title:'Decisões melhores com dados visuais', desc:'Entenda hábitos, desperdícios e economia com uma interface clara.' },
    { src:'landing-showcase/shot-09.png', kicker:'Experiência', title:'Produto com presença e acabamento', desc:'Uma apresentação limpa, moderna e pensada para passar valor.' },
    { src:'landing-showcase/shot-10.png', kicker:'Rotina', title:'Tudo conectado em uma única experiência', desc:'Lista, despensa, receitas e planejamento conversando entre si.' }
  ];

  function initLandingPremium(){
    const stageImg = document.getElementById('af-showcase-image');
    const prevBtn = document.getElementById('af-showcase-prev');
    const nextBtn = document.getElementById('af-showcase-next');
    const kicker = document.getElementById('af-showcase-kicker');
    const title = document.getElementById('af-showcase-title');
    const desc = document.getElementById('af-showcase-desc');
    const stage = document.getElementById('af-showcase-stage');
    if (!stageImg || !prevBtn || !nextBtn || !kicker || !title || !desc || !stage || stage.dataset.bound) return;
    stage.dataset.bound = '1';
    let index = 0;
    let startX = 0;
    function render(nextIndex){
      index = (nextIndex + showcaseShots.length) % showcaseShots.length;
      const item = showcaseShots[index];
      stageImg.classList.add('is-switching');
      setTimeout(() => {
        stageImg.src = item.src;
        stageImg.alt = item.title;
        kicker.textContent = item.kicker;
        title.textContent = item.title;
        desc.textContent = item.desc;
        stageImg.classList.remove('is-switching');
      }, 160);
    }
    prevBtn.addEventListener('click', () => render(index - 1));
    nextBtn.addEventListener('click', () => render(index + 1));
    stage.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].clientX; }, { passive:true });
    stage.addEventListener('touchend', (e) => {
      const delta = e.changedTouches[0].clientX - startX;
      if (Math.abs(delta) < 40) return;
      render(index + (delta < 0 ? 1 : -1));
    }, { passive:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLandingPremium, { once:true });
  else initLandingPremium();
})();
