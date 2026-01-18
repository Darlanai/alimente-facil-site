document.addEventListener('DOMContentLoaded', () => {

    const app = {
        isAppMode: false,
        isLoggedIn: false,
        userPlan: 'free',
        activeModule: 'inicio',
        activeListId: 'listaDaSemana',
        intervals: [],
        
        // --- SEUS LINKS REAIS DO MERCADO PAGO ---
        checkoutLinks: {
            'premium_ai': 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=889c1cf8a1c040babbe3d5aeee84f125', 
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
            this.applySavedTheme();
            this.updateBodyClasses();
            this.updateStartButton(); // Atualiza também o botão de login da Home
            this.setupSpeechRecognition();
            this.initDockMenu(); 
            this.initDraggableDock();
            this.initRoboAssistant();

            if (this.isAppMode) {
                 this.activateModuleUI(this.activeModule);
                 this.renderAllPanelContent();
            } else {
                this.initLandingPage();
            }
        },

        // --- FUNÇÕES REAIS ---

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
                // Abre o checkout em nova aba
                setTimeout(() => {
                    window.open(link, '_blank');
                }, 1000);
                
                // Simula liberação local para UX imediata (opcional, já que o usuário vai pagar lá)
                this.userPlan = planId;
                this.saveState();
                this.updatePlanButtonsState();
                
            } else {
                this.showNotification("Erro: Plano não configurado.", "error");
            }
        },

initDockMenu() {
            // Remove a barra antiga se existir
            const oldDock = document.querySelector('.glass-dock-container');
            if (oldDock) oldDock.remove();

            // Cria a nova ABINHA LATERAL
            let toggleBtn = document.getElementById('side-panel-toggle');
            if (!toggleBtn) {
                toggleBtn = document.createElement('div');
                toggleBtn.id = 'side-panel-toggle';
                // Ícone inicial e texto
                toggleBtn.innerHTML = '<i class="fa-solid fa-rocket"></i> PAINEL'; 
                document.body.appendChild(toggleBtn);
            }

            // Função para atualizar o visual da aba
            const updateTabState = () => {
                if (this.isAppMode) {
                    toggleBtn.classList.add('active');
                    toggleBtn.innerHTML = '<i class="fa-solid fa-house"></i> INÍCIO';
                    toggleBtn.title = "Voltar para Home";
                } else {
                    toggleBtn.classList.remove('active');
                    toggleBtn.innerHTML = '<i class="fa-solid fa-rocket"></i> PAINEL';
                    toggleBtn.title = "Abrir Painel";
                }
            };

            // Evento de Clique
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Impede cliques fantasmas

                if (this.isAppMode) {
                    this.exitAppMode();
                } else {
                    if (!this.isLoggedIn) {
                        this.showAuthModal();
                    } else {
                        this.enterAppMode();
                    }
                }
                updateTabState();
            });

            // Atualiza estado inicial
            setTimeout(updateTabState, 100);
            
            // Garante que o estado atualize se mudarmos de modo por outros botões
            const originalEnter = this.enterAppMode.bind(this);
            this.enterAppMode = () => { originalEnter(); updateTabState(); };
            
            const originalExit = this.exitAppMode.bind(this);
            this.exitAppMode = () => { originalExit(); updateTabState(); };
        },

        initDraggableDock() {
            const dockContainer = document.querySelector('.glass-dock-container');
            if (!dockContainer) return;
            let isDraggingDock = false; let startX, startY, initialLeft, initialTop;
            const startDrag = (e) => {
                if (e.target.closest('.dock-item')) return;
                isDraggingDock = true;
                const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
                const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
                const rect = dockContainer.getBoundingClientRect();
                startX = clientX; startY = clientY; initialLeft = rect.left; initialTop = rect.top;
                dockContainer.style.cursor = 'grabbing'; dockContainer.style.bottom = 'auto'; dockContainer.style.transform = 'none';
                document.addEventListener('mousemove', moveDrag); document.addEventListener('touchmove', moveDrag, {passive: false});
                document.addEventListener('mouseup', stopDrag); document.addEventListener('touchend', stopDrag);
            };
            const moveDrag = (e) => {
                if (!isDraggingDock) return;
                e.preventDefault();
                const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
                const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
                const deltaX = clientX - startX; const deltaY = clientY - startY;
                dockContainer.style.left = `${initialLeft + deltaX}px`; dockContainer.style.top = `${initialTop + deltaY}px`;
            };
            const stopDrag = () => {
                isDraggingDock = false; dockContainer.style.cursor = 'grab';
                document.removeEventListener('mousemove', moveDrag); document.removeEventListener('touchmove', moveDrag);
                document.removeEventListener('mouseup', stopDrag); document.removeEventListener('touchend', stopDrag);
            };
            dockContainer.addEventListener('mousedown', startDrag); dockContainer.addEventListener('touchstart', startDrag, {passive: false});
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
                    this.isAppMode = false; this.isLoggedIn = false; this.userPlan = 'free';
                    this.activeModule = 'inicio'; this.activeListId = 'listaDaSemana'; this.state.user = { nome: null }; 
                }
            } catch (e) {
                this.state = JSON.parse(JSON.stringify(this.defaultState));
                this.isAppMode = false; this.isLoggedIn = false; this.userPlan = 'free';
                this.activeModule = 'inicio'; this.activeListId = 'listaDaSemana'; this.state.user = { nome: null }; 
            }
        },

        generateId: () => Date.now().toString(36) + Math.random().toString(36).substring(2),

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
            // Evento para o botão de Login/Logout da Home
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
            });
            
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

            this.elements.contactForm?.addEventListener('submit', (e) => { e.preventDefault(); this.showNotification('Sua mensagem foi enviada! Obrigado pelo contato. 🚀'); this.elements.contactForm.reset(); });
            this.elements.menuToggleBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.elements.appSidebar?.classList.toggle('is-open'); this.elements.sidebarOverlay?.classList.toggle('is-visible'); });
            this.elements.sidebarOverlay?.addEventListener('click', () => this.closeSidebar());
            this.elements.navItems.forEach(item => { item.addEventListener('click', () => this.activateModuleAndRender(item.dataset.module)); });
            this.elements.homeButtonPanel?.addEventListener('click', () => this.exitAppMode());
            this.elements.logoutBtnPanel?.addEventListener('click', () => this.handleLogout());
            this.elements.themeToggleBtnPanel?.addEventListener('click', () => this.toggleTheme());
            this.elements.chefIaFab?.addEventListener('click', () => this.showChatbot());

            this.elements.body.addEventListener('keydown', e => {
                const savedListEl = e.target.closest('.saved-list-name');
                if (savedListEl && e.key === 'Enter') {
                    e.preventDefault();
                    const listId = savedListEl.closest('.saved-list-item').dataset.listId;
                    this.activeListId = listId; this.saveState(); this.renderListasSalvas(); this.renderListaAtiva(listId); this.renderOrcamento(); 
                    if (window.innerWidth <= 991) { document.getElementById('list-manager')?.classList.add('view-active-list'); }
                }
            });

            // === EVENTOS GERAIS (ATUALIZADO COM OS NOVOS BOTÕES) ===
            this.elements.body.addEventListener('click', e => {
                 const target = e.target;
                 const closest = (selector) => target.closest(selector);

                 // --- 1. Lógica do Stepper (+ / -) ---
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

                 // --- 2. Botão Salvar Despensa (Footer Fixo) ---
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
                      else if (modalId === 'ai-chat-modal') { this.setupChatbotModal(); }
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

                 const itemEl = closest('.placeholder-item');
                 if (itemEl) {
                    const id = itemEl.dataset.id;
                    const itemName = itemEl.dataset.name || 'este item';
                    const isDespensa = closest('[id*="despensa-items"]') ? true : false;
                    const isLista = closest('[id*="lista-items"]') || closest('#list-view-modal-body') ? true : false;
                    const isEssential = closest('#essentials-list-container') ? true : false;

                    if (isDespensa && !closest('.icon-button') && !closest('.item-stock-level') && !closest('.drag-handle')) {
                        this.handleOpenPantryView(itemEl); return;
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

                 else if (closest('.btn-create-list')) { this.activeListId = null; this.renderListaAtiva(null); this.renderListaWidget(); if (window.innerWidth <= 991) { document.getElementById('list-manager')?.classList.add('view-active-list'); } }
                 else if (closest('#list-back-btn')) { document.getElementById('list-manager')?.classList.remove('view-active-list'); }
                 else if (closest('#lista-save-changes-btn')) { this.handleSaveListaAtiva(); }
                 else if (closest('#lista-delete-btn')) { const listIdToDelete = document.getElementById('active-list-id-input')?.value; if(listIdToDelete) this.handleDeleteListaAtiva(listIdToDelete); }
                 
                 const savedListEl = closest('.saved-list-item');
                 if(savedListEl) {
                    const listId = savedListEl.dataset.listId;
                    if (closest('.delete-list-btn')) { this.handleDeleteListaAtiva(listId); }
                    else if (closest('.select-list-btn')) { 
                        this.activeListId = listId; this.saveState(); this.renderListasSalvas(); this.renderListaAtiva(listId); this.renderOrcamento(); 
                        if (window.innerWidth <= 991) { document.getElementById('list-manager')?.classList.add('view-active-list'); } 
                    }
                    else { this.handleOpenListViewModal(listId); }
                 }

                 else if (closest('.add-recipe-btn')) { this.handleOpenRecipeEditModal(null); }
                 
                 const recipeActionBtn = closest('.edit-recipe-btn, .delete-recipe-btn, .pdf-btn, .share-btn');
                 if (recipeActionBtn) {
                    const rId = recipeActionBtn.dataset.recipeId;
                    if (rId) {
                        if (recipeActionBtn.classList.contains('delete-recipe-btn')) { this.handleDeleteRecipe(rId); return; }
                        if (recipeActionBtn.classList.contains('edit-recipe-btn')) { this.handleOpenRecipeEditModal(rId); return; }
                        if (recipeActionBtn.classList.contains('pdf-btn')) { this.handleRealPDF(); return; }
                        if (recipeActionBtn.classList.contains('share-btn')) { 
                            const recipeName = this.state.receitas[rId]?.name || "Receita";
                            this.handleRealShare("Alimente Fácil", `Veja esta receita: ${recipeName}`);
                            return; 
                        }
                    }
                 }

                 const recipeItemEl = closest('.recipe-list-item');
                 if(recipeItemEl) {
                      const recipeId = recipeItemEl.dataset.recipeId;
                      if (closest('.delete-recipe-btn')) { this.handleDeleteRecipe(recipeId); } 
                      else if (closest('.edit-recipe-btn')) { this.handleOpenRecipeEditModal(recipeId); } 
                      else if (!closest('.icon-button')) { 
                        if (window.innerWidth < 992) { this.showRecipeDetailModal(recipeId); } 
                        else { this.renderRecipeDetail(recipeId); document.querySelectorAll('.recipe-list-item.active').forEach(el => el.classList.remove('active')); recipeItemEl.classList.add('active'); document.getElementById('module-receitas')?.classList.add('detail-is-visible'); } 
                    }
                 }
                 else if (closest('#recipe-detail-close-btn')) { document.getElementById('module-receitas')?.classList.remove('detail-is-visible'); document.querySelectorAll('.recipe-list-item.active').forEach(el => el.classList.remove('active')); }
                 
                 else if (closest('.add-meal-btn')) { const button = closest('.add-meal-btn'); this.currentPlannerDayTarget = button.dataset.dayTarget; this.populateRecipePicker(); this.openModal('recipe-picker-modal'); }
                 else if (closest('.add-meal-slot-btn')) { const button = closest('.add-meal-slot-btn'); this.currentPlannerDayTarget = button.dataset.dayTarget; this.populateRecipePicker(); this.openModal('recipe-picker-modal'); }
                 else if (closest('.clear-plan-btn')) { this.openConfirmModal("Limpar Semana", "Deseja remover todas as refeições planejadas para esta semana?", this.executeClearPlannerWeek.bind(this)); }
                 else if (closest('.day-clear-btn')) { const dayKey = closest('.day-clear-btn').dataset.day; this.openConfirmModal("Limpar Dia", `Deseja remover todas as refeições de ${dayKey}?`, () => this.executeClearPlannerDay({day: dayKey})); }
                 
                 const mealItem = closest('.planner-meal-item');
                 if (mealItem) {
                      const recipeId = mealItem.dataset.recipeId;
                      const day = mealItem.dataset.day;
                      const meal = mealItem.dataset.meal;
                      if (closest('.meal-view-btn') || closest('.meal-item-name')) { if (window.innerWidth < 992) { this.showRecipeDetailModal(recipeId); } else { if (this.activeModule === 'receitas') { this.renderRecipeDetail(recipeId); document.querySelectorAll('.recipe-list-item.active').forEach(el => el.classList.remove('active')); document.querySelector(`.recipe-list-item[data-recipe-id="${recipeId}"]`)?.classList.add('active'); document.getElementById('module-receitas')?.classList.add('detail-is-visible'); } else { this.showRecipeDetailModal(recipeId); } } } 
                      else if (closest('.meal-complete-btn')) { this.handleToggleCompleteMeal(day, meal); } 
                      else if (closest('.meal-delete-btn')) { this.handleDeleteMeal(day, meal); }
                 }

                 else if(closest('.save-btn, .save-plan-btn')) { this.showNotification("Dados salvos com sucesso!", "success"); }
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
                 if (e.target.closest('#module-lista-widget .add-item-form')) { this.handleAddItem('lista', e.target); }
                 else if (e.target.closest('#module-lista .active-list-column .add-item-form')) { this.handleAddItem('lista', e.target, document.getElementById('active-list-id-input')?.value || this.activeListId); }
                 else if (e.target.closest('#login-form')) { this.handleLogin(); }
                 else if (e.target.closest('#signup-form')) { this.handleSignup(); }
             });

             document.getElementById('item-edit-save-btn')?.addEventListener('click', () => this.handleSaveEditModal());
             document.getElementById('budget-save-btn')?.addEventListener('click', () => this.handleSaveOrcamento());
             document.getElementById('essentials-add-btn')?.addEventListener('click', () => this.handleAddEssential());

            this.elements.body.addEventListener('input', e => {
                const targetId = e.target.id;
                if (targetId === 'lista-form-nome-dash' || targetId === 'lista-form-nome-full' || targetId === 'edit-item-name' || targetId === 'essential-name' || targetId === 'recipe-ing-name' || targetId === 'pantry-edit-name') { this.handleAutocomplete(e.target); }
            });
            this.elements.body.addEventListener('focusout', e => {
                 const targetId = e.target.id;
                 if (targetId === 'lista-form-nome-dash' || targetId === 'lista-form-nome-full' || targetId === 'edit-item-name' || targetId === 'essential-name' || targetId === 'recipe-ing-name' || targetId === 'pantry-edit-name') { 
                    setTimeout(() => { if (document.activeElement !== this.elements.autocompleteSuggestions) { this.hideAutocomplete(); } }, 150); 
                 }
            });
            this.elements.autocompleteSuggestions?.addEventListener('mousedown', e => {
                 const itemEl = e.target.closest('.autocomplete-item');
                 if (itemEl) { this.selectAutocompleteItem(itemEl.dataset.name); e.preventDefault(); }
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

            // ATUALIZAÇÃO DO BOTÃO DA HOME (CORRIGIDO PARA POWER)
            const landingAuthBtn = document.getElementById('landing-auth-btn');
            if (landingAuthBtn) {
                // Força sempre o ícone de Power
                landingAuthBtn.innerHTML = '<i class="fa-solid fa-power-off"></i>';
                
                if (this.isLoggedIn) {
                    // Estado: LOGADO (Botão fica vermelho para indicar "Desligar/Sair")
                    landingAuthBtn.classList.add('power-on');
                    landingAuthBtn.title = "Desconectar / Sair";
                } else {
                    // Estado: DESLOGADO (Botão fica padrão/neon para indicar "Ligar/Entrar")
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
            this.isLoggedIn = true; 
            this.userPlan = 'premium_ai'; 
            this.state.user.nome = "Antonio"; 
            this.showNotification("Bem-vindo(a) de volta! ✨", "success"); 
            this.closeAllModals(); 
            this.updateStartButton(); 
            this.enterAppMode(); 
            this.saveState(); 
        },
        
        handleSignup() { 
            const nome = document.getElementById('signup-name').value.trim(); 
            this.isLoggedIn = true; 
            this.userPlan = 'free'; 
            this.state.user.nome = nome || "Visitante"; 
            this.showNotification("Conta criada! Bem-vindo(a)! 🚀", "success"); 
            this.closeAllModals(); 
            this.updateStartButton(); 
            this.enterAppMode(); 
            this.saveState(); 
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
            
            // Ícone do Painel Interno (mantém sólido se preferir, ou muda para regular)
            const panelIcon = this.elements.themeToggleBtnPanel?.querySelector('i');
            if (panelIcon) {
                panelIcon.className = isLuaMode ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
            }

            // Ícone da Landing Page (Botão Dourado - usa Regular/Fino)
            const landingIcon = document.querySelector('#landing-theme-toggle i');
            if (landingIcon) {
                landingIcon.className = isLuaMode ? 'fa-regular fa-moon' : 'fa-regular fa-sun';
            }
        },

        clearIntervals() {
            this.intervals.forEach(clearInterval);
            this.intervals = [];
        },

initLandingPage() {
            this.clearIntervals();
            this.initVideoRotator();
            
            // Chama a nova função da tarja
            this.initNewHeaderLogic();
            
            // Mantém as outras inicializações
            this.setupDynamicInfo();
            this.initDicas();
            this.initHomePageCalculator(); 
            this.initLandingRecipes();
            this.updateStartButton(); 

            // Listener dos botões da IA (Dicas e Receitas)
            const handleAiCtaClick = () => {
                if (this.isLoggedIn && this.userPlan === 'premium_ai') { this.showChatbot(); } 
                else if (this.isLoggedIn) { this.showPlansModal("O Chef IA é um recurso exclusivo do plano Premium IA."); } 
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
        },

initNewHeaderLogic() {
            // 1. Data, Hora e Saudação
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

            // 2. Rotação de Versículos
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

            // 3. Botão Contraste
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

            // 4. Botão Power
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
            
            // 5. Menu Hambúrguer Premium (Dropdown Vertical - Lógica Segura)
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
                 if(subtitleEl) { subtitleEl.innerHTML = customMessage || 'Escolha o plano que transforma sua cozinha.'; }
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
                 <div class="list-management-layout" id="list-manager">
                     <div class="saved-lists-column">
                         <button class="btn btn-secondary btn-create-list"><i class="fa-solid fa-plus" aria-hidden="true"></i> Criar Nova Lista</button>
                         <div class="dashboard-card">
                             <div class="card-header" style="cursor: default;">
                                 <h3><i class="fa-solid fa-list-ul" aria-hidden="true"></i> Minhas Listas</h3>
                             </div>
                             <div class="card-content" id="saved-lists-container"></div>
                         </div>
                     </div>
                     <div class="active-list-column">
                         <div class="dashboard-card">
                             <div class="card-header" style="cursor: default;">
                                 <button class="icon-button mobile-back-btn" id="list-back-btn" title="Voltar" aria-label="Voltar para Minhas Listas"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
                                 <h3 id="active-list-title"><i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> Carregando...</h3>
                             </div>
                             <div class="add-item-form-container">
                                 <form class="add-item-form">
                                     <input type="hidden" id="active-list-id-input" value="">
                                     <div class="form-group form-group-flex"> <label for="lista-form-nome-full">Nome</label> <input type="text" id="lista-form-nome-full" placeholder="Ex: Arroz"> </div>
                                     <div class="form-group form-group-small"> <label for="lista-form-qtd-full">Qtd</label> <input type="number" id="lista-form-qtd-full" value="1" min="0.1" step="any"> </div>
                                     <div class="form-group form-group-small"> <label for="lista-form-unid-full">Unid</label> <select id="lista-form-unid-full" aria-label="Unidade do item">${['un','kg','g','L','ml','pct','cx'].map(u => `<option value="${u}">${u}</option>`).join('')}</select> </div>
                                     <div class="form-group form-group-medium"> <label for="lista-form-valor-full">Valor</label> <input type="text" id="lista-form-valor-full" placeholder="0.00"> </div>
                                     <button type="submit" class="btn btn-primary btn-add-item" id="lista-add-item-btn-full" title="Adicionar Item" aria-label="Adicionar Item"> <i class="fa-solid fa-plus" aria-hidden="true"></i> </button>
                                 </form>
                             </div>
                             <div class="card-content no-padding-top" id="lista-items-full" data-group="shared-items" data-list-type="lista"></div>
                             <div class="card-footer" id="active-list-actions"></div>
                         </div>
                     </div>
                 </div>
             `;
             this.renderListasSalvas();
             this.renderListaAtiva(this.activeListId);
             this.initSortableItems('lista-items-full');
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
             let actionsHTML = `<button class="btn btn-primary" id="lista-save-changes-btn"><i class="fa-solid fa-save"></i> Salvar</button>`;
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
                           <button class="btn btn-secondary share-btn" title="Compartilhar"><i class="fa-solid fa-share-alt"></i></button>
                           <button class="btn btn-secondary pdf-btn" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
                           <button class="btn btn-danger" id="lista-delete-btn" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                           <button class="btn btn-primary" id="lista-save-changes-btn"><i class="fa-solid fa-save"></i> Salvar</button>
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
                    <button class="icon-button pdf-btn" data-list-id="${listId}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
                    <button class="icon-button delete-list-btn" data-list-id="${listId}" title="Excluir"><i class="fa-solid fa-trash" style="color: var(--red);"></i></button>
                `;
            }

            if (idInput) idInput.value = listId;

            if (modalBody) {
                modalBody.setAttribute('data-list-id', listId);
                modalBody.innerHTML = lista.items.map(item => this.createListaItemHTML(item)).join('');
                if (lista.items.length === 0) {
                    modalBody.innerHTML = '<p class="empty-list-message">Lista vazia. Adicione itens acima.</p>';
                }
                this.initSortableItems('list-view-modal-body');
            }

            this.openModal('list-view-modal');
        },

handleOpenPantryView(itemEl) {
            const id = itemEl.dataset.id;
            const item = this.state.despensa.find(i => i.id.toString() === id);
            if (!item) return;

            // Injetar botão de deletar no footer (lado esquerdo)
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

            // Lógica do Slider de Estoque (com cores)
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
             // 1. Feedback Visual (Loading)
             const btn = document.getElementById('pantry-save-btn');
             const originalText = btn ? btn.innerHTML : 'Salvar';
             if(btn) { 
                 btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...'; 
                 btn.disabled = true; 
             }

             // 2. Delay Simulado para sensação de processamento (600ms)
             setTimeout(() => {
                 const id = document.getElementById('pantry-edit-id').value;
                 if (!id) { if(btn){btn.innerHTML = originalText; btn.disabled = false;} return; }
                 
                 const updatedData = { 
                     name: document.getElementById('pantry-edit-name').value.trim() || "Item sem nome", 
                     qtd: parseFloat(document.getElementById('pantry-edit-qtd').value) || 1, 
                     unid: document.getElementById('pantry-edit-unid').value, 
                     stock: parseInt(document.getElementById('pantry-edit-stock').value) || 100,
                     validade: document.getElementById('pantry-edit-validade').value || null
                 };

                 const itemIndex = this.state.despensa.findIndex(i => i.id.toString() === id);
                 if (itemIndex > -1) { 
                     const originalItem = this.state.despensa[itemIndex];
                     this.state.despensa[itemIndex] = { ...originalItem, ...updatedData }; 
                     this.renderDespensaWidget(); 
                     if(this.activeModule === 'despensa') this.renderDespensa(); 
                     this.showNotification("Item atualizado com sucesso!", "success");
                 }
                 
                 this.saveState(); 
                 this.closeModal('pantry-view-modal');

                 // 3. Restaura o botão
                 if(btn) { 
                     btn.innerHTML = originalText; 
                     btn.disabled = false; 
                 }
             }, 600);
        },

        renderListasSalvas() {
            const container = document.getElementById('saved-lists-container'); 
            if(!container) return;
            const listIds = Object.keys(this.state.listas);
            container.innerHTML = listIds.map(listId => { 
                const lista = this.state.listas[listId]; 
                const isActive = listId === this.activeListId; 
                const itemCount = lista.items.length;
                const totalValue = lista.items.reduce((acc, item) => acc + (parseFloat(item.valor || 0) * parseFloat(item.qtd || 0)), 0);
                return `
                <div class="saved-list-item ${isActive ? 'active' : ''}" data-list-id="${listId}">
                    <div class="saved-list-info">
                        <span class="saved-list-name">${this.escapeHtml(lista.nome)}</span>
                        <span class="saved-list-meta">
                            ${itemCount} item(s) • R$ ${totalValue.toFixed(2)}
                        </span>
                    </div>
                    <div class="saved-list-actions">
                        <button class="icon-button select-list-btn" title="Editar Nome"><i class="fa-solid fa-pencil"></i></button>
                        <button class="icon-button delete-list-btn" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`; 
            }).join('');
            if(listIds.length === 0) { container.innerHTML = '<p class="empty-list-message">Nenhuma lista salva. Crie uma nova acima!</p>'; }
        },

renderDespensa(container) {
             if (!container) container = document.getElementById('module-despensa');
             if (!container) return;
             container.innerHTML = `
                  <div class="dashboard-card">
                      <div class="card-header" style="cursor: default;">
                          <h3><i class="fa-solid fa-box-archive" aria-hidden="true"></i> Despensa</h3>
                      </div>
                      <div class="card-content" id="despensa-items-full" data-group="shared-items" data-list-type="despensa">
                          <button class="btn btn-secondary btn-create-list add-item-despensa-btn" style="margin-bottom: 1rem;">
                              <i class="fa-solid fa-plus" aria-hidden="true"></i> Adicionar Item
                          </button>
                      </div>
                      <div class="card-footer">
                          <button class="btn btn-secondary pdf-btn" title="Gerar PDF Inventário"><i class="fa-solid fa-file-pdf"></i> Gerar Relatório</button>
                      </div>
                 </div>
             `;
             const despensaContainerFull = document.getElementById('despensa-items-full');
             if (!despensaContainerFull) return;
             
             let listContainer = document.createElement('div');
             listContainer.id = 'despensa-list-container';
             despensaContainerFull.appendChild(listContainer);

             const sortedDespensa = [...this.state.despensa].sort((a, b) => { const dateA = a.validade ? new Date(a.validade + "T00:00:00-03:00").getTime() : Infinity; const dateB = b.validade ? new Date(b.validade + "T00:00:00-03:00").getTime() : Infinity; if (dateA !== dateB) return dateA - dateB; return a.name.localeCompare(b.name); });
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
                 <div class="recipe-layout">
                     <div class="recipe-list-column" style="padding: 1rem; display: flex; flex-direction: column; gap: 1rem;">
                         <button class="btn btn-secondary btn-create-list add-recipe-btn">
                             <i class="fa-solid fa-plus" aria-hidden="true"></i> Criar Nova Receita
                         </button>
                         <div class="dashboard-card">
                             <div class="card-header" style="cursor: default;">
                                 <h3><i class="fa-solid fa-utensils" aria-hidden="true"></i> Minhas Receitas</h3>
                             </div>
                             <div class="card-content" style="padding: 0 1rem 1rem 1rem;">
                                 <div class="recipe-list" id="main-recipe-grid"></div>
                             </div>
                         </div>
                     </div>
                     <div class="recipe-detail-column">
                         <div class="recipe-detail-header">
                             <h3 id="recipe-detail-desktop-title">Detalhes da Receita</h3>
                             <button class="icon-button" id="recipe-detail-close-btn" title="Fechar" aria-label="Fechar detalhes da receita"><i class="fa-solid fa-times" aria-hidden="true"></i></button>
                         </div>
                         <div class="recipe-detail-content" id="recipe-detail-desktop-body">
                             <div class="recipe-detail-placeholder">
                                 <i class="fa-solid fa-utensils" aria-hidden="true"></i>
                                 <p>Selecione uma receita da lista<br>para ver os detalhes aqui.</p>
                             </div>
                         </div>
                         <div class="recipe-detail-footer" id="recipe-detail-desktop-footer" style="display: none;"></div>
                     </div>
                 </div>
             `;
             const recipeListContainer = document.getElementById('main-recipe-grid');
             if (!recipeListContainer) return;
             const recipes = Object.values(this.state.receitas);
             recipeListContainer.innerHTML = recipes.map(recipe => `
                  <div class="recipe-list-item" data-recipe-id="${recipe.id}" data-recipe-name="${this.escapeHtml(recipe.name)}" role="button" tabindex="0">
                        <div class="recipe-list-info">
                            <h4>${this.escapeHtml(recipe.name)}</h4>
                            <p>${this.escapeHtml(recipe.desc || 'Sem descrição')}</p>
                       </div>
                       <div class="recipe-list-actions">
                            <button class="icon-button" data-module-target="planejador" title="Ir para o Planejador" aria-label="Adicionar ${this.escapeHtml(recipe.name)} ao Planejador"><i class="fa-solid fa-calendar-plus" aria-hidden="true"></i></button>
                            <button class="icon-button share-btn" title="Compartilhar" aria-label="Compartilhar ${this.escapeHtml(recipe.name)}"><i class="fa-solid fa-share-alt" aria-hidden="true"></i></button>
                            <button class="icon-button view-recipe-btn desktop-only" title="Ver" aria-label="Ver ${this.escapeHtml(recipe.name)}"><i class="fa-solid fa-eye" aria-hidden="true"></i></button>
                            <button class="icon-button edit-recipe-btn" title="Editar" aria-label="Editar ${this.escapeHtml(recipe.name)}"><i class="fa-solid fa-pencil" aria-hidden="true"></i></button>
                            <button class="icon-button delete-recipe-btn" title="Excluir" aria-label="Excluir ${this.escapeHtml(recipe.name)}"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
                       </div>
                  </div>
             `).join('');
              if(recipes.length === 0){ recipeListContainer.innerHTML = '<p class="empty-list-message">Nenhuma receita criada.</p>'; }
        },

        renderRecipeDetail(recipeId, targetElementId = 'recipe-detail-desktop-body', footerElementId = 'recipe-detail-desktop-footer') {
             const recipe = this.state.receitas[recipeId]; const bodyEl = document.getElementById(targetElementId); const footerEl = document.getElementById(footerElementId);
             if (!recipe || !bodyEl || !footerEl) { if (bodyEl) bodyEl.innerHTML = '<div class="recipe-detail-placeholder"><i class="fa-solid fa-question-circle"></i><p>Receita não encontrada.</p></div>'; if (footerEl) footerEl.style.display = 'none'; return; }
             bodyEl.innerHTML = recipe.content;
            footerEl.innerHTML = `
                <button class="btn btn-primary edit-recipe-btn" data-recipe-id="${recipeId}"><i class="fa-solid fa-pencil"></i> Editar</button> 
                <button class="btn btn-secondary pdf-btn" data-recipe-id="${recipeId}"><i class="fa-solid fa-file-pdf"></i> PDF</button> 
                <button class="btn btn-secondary share-btn" data-recipe-id="${recipeId}"><i class="fa-solid fa-share-alt"></i></button> 
                <button class="btn btn-danger delete-recipe-btn" data-recipe-id="${recipeId}"><i class="fa-solid fa-trash"></i> Excluir</button>
            `;
             footerEl.style.display = 'flex';
        },

        showRecipeDetailModal(recipeId) {
             const recipe = this.state.receitas[recipeId]; if (!recipe) return;
             const modalTitle = document.getElementById('recipe-detail-modal-title'); const modalBody = document.getElementById('recipe-detail-modal-body'); const modalFooter = document.querySelector('#recipe-detail-modal .modal-footer');
             if (!modalTitle || !modalBody || !modalFooter) return;
             modalTitle.innerHTML = `<i class="fa-solid fa-utensils" aria-hidden="true"></i> ${this.escapeHtml(recipe.name)}`;
             modalBody.innerHTML = recipe.content;
             modalFooter.innerHTML = `
                <button class="btn btn-primary edit-recipe-btn" data-recipe-id="${recipeId}"><i class="fa-solid fa-pencil"></i> Editar</button>
                <button class="btn btn-secondary pdf-btn" data-recipe-id="${recipeId}"><i class="fa-solid fa-file-pdf"></i> PDF</button>
                <button class="btn btn-danger delete-recipe-btn" data-recipe-id="${recipeId}"><i class="fa-solid fa-trash"></i> Excluir</button>
             `;
             this.openModal('recipe-detail-modal');
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
             const mealIcons = {
                 cafe: '<i class="fa-solid fa-mug-hot" style="margin-right:8px; color: var(--accent-yellow);"></i>',
                 almoco: '<i class="fa-solid fa-utensils" style="margin-right:8px; color: var(--green);"></i>',
                 jantar: '<i class="fa-solid fa-bowl-rice" style="margin-right:8px; color: var(--accent-purple);"></i>' 
             };
             container.innerHTML = `
                  <div class="dashboard-card">
                       <div class="card-header" style="cursor: default;">
                           <h3><i class="fa-solid fa-calendar-week" aria-hidden="true"></i> Planejador Semanal</h3>
                       </div>
                       <div class="card-content">
                            <div class="planner-grid" id="planner-grid-full"></div>
                       </div>
                       <div class="card-footer" style="justify-content: space-between;">
                           <div style="display:flex; gap: 10px;">
                                <button class="btn btn-secondary pdf-btn" title="Baixar PDF do Planejamento"><i class="fa-solid fa-file-pdf"></i> Exportar</button>
                                <button class="btn btn-secondary share-btn" title="Compartilhar Planejamento"><i class="fa-solid fa-share-alt"></i> Compartilhar</button>
                           </div>
                           <button class="btn btn-danger clear-plan-btn"><i class="fa-solid fa-eraser"></i> Limpar Tudo</button>
                       </div>
                  </div>
             `;
             const plannerGrid = document.getElementById('planner-grid-full');
             if (!plannerGrid) return;
             const days = { seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta", sex: "Sexta", sab: "Sábado", dom: "Domingo" };
             const meals = { cafe: "Café da Manhã", almoco: "Almoço", jantar: "Jantar" };
             let gridHTML = '';
             for (const dayKey in days) {
                  gridHTML += `
                       <div class="planner-day-card">
                            <div class="planner-day-header">
                                <span>${days[dayKey]}</span>
                                <div class="card-actions">
                                    <button class="icon-button day-clear-btn" data-day="${dayKey}" title="Limpar Dia" aria-label="Limpar ${days[dayKey]}"><i class="fa-solid fa-eraser" aria-hidden="true"></i></button>
                                </div>
                            </div>
                            <div class="planner-meal-slots">`;
                  for (const mealKey in meals) {
                       const iconHTML = mealIcons[mealKey] || '';
                       gridHTML += `
                            <div class="planner-meal-slot">
                                <strong>${iconHTML} ${meals[mealKey]}</strong>
                                <div class="planner-meal-items" id="planner-full-${dayKey}-${mealKey}">`;
                       const mealData = this.state.planejador[dayKey]?.[mealKey];
                       if (mealData) { 
                           const isCompleted = mealData.completed || false;
                           const completedClass = isCompleted ? 'completed' : '';
                           const checkBtnColor = isCompleted ? 'color: var(--green);' : 'color: var(--glass-text-secondary);';
                           const mealName = this.escapeHtml(mealData.name);
                           gridHTML += `
                           <div class="planner-meal-item ${completedClass}" data-recipe-id="${mealData.id}" data-day="${dayKey}" data-meal="${mealKey}">
                               <span class="meal-item-name" style="color: #fff; font-weight: 700;">${mealName}</span>
                               <div class="meal-item-actions">
                                   <button class="icon-button meal-view-btn" title="Ver Receita"><i class="fa-solid fa-eye" aria-hidden="true"></i></button>
                                   <button class="icon-button meal-complete-btn" title="Marcar como Concluído" style="${checkBtnColor}"><i class="fa-solid fa-check" aria-hidden="true"></i></button>
                                   <button class="icon-button meal-delete-btn" title="Remover Refeição"><i class="fa-solid fa-times" aria-hidden="true"></i></button>
                               </div>
                           </div>`;
                       }
                       gridHTML += `</div>
                                <button class="add-meal-slot-btn" data-modal-open="recipe-picker-modal" data-day-target="planner-full-${dayKey}-${mealKey}"><i class="fa-solid fa-plus" aria-hidden="true"></i> Adicionar</button>
                            </div>`;
                  }
                  gridHTML += `</div></div>`;
             }
             plannerGrid.innerHTML = gridHTML;
        },

        renderInicio(container) {
            if (!container) container = document.getElementById('module-inicio');
            if (!container) return;
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
            const userName = this.state.user.nome || 'Chef';
            container.innerHTML = `
                <div class="welcome-section">
                    <div class="welcome-header">
                        <h2>${greeting}, <strong>${this.escapeHtml(userName)}</strong>.</h2>
                        <p class="welcome-subtitle">Painel de Controle</p>
                    </div>
                </div>
                <div class="quick-actions-grid">
                    <div class="action-card ai" onclick="document.getElementById('chef-ia-fab-placeholder').click()">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                        <span>Chef IA</span>
                        <small>Assistente</small>
                    </div>
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
                    <div class="action-card tips" onclick="document.querySelector('a[href=\\'#dicas-valiosas\\']').click()">
                        <i class="fa-solid fa-leaf"></i>
                        <span>Dicas & Eco</span>
                        <small>Sustentável</small>
                    </div>
                </div>
            `;
            this.renderOrcamento();
        },

renderOrcamento() {
            const totalOrcamento = this.state.orcamento.total || 0;
            
            // NOVA LÓGICA: Soma o valor financeiro de todos os itens atualmente na Despensa
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
                // Cores dinâmicas: Verde (OK), Amarelo (Atenção), Vermelho (Estoque caro/acima do teto)
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
             container.innerHTML = `
                  <div class="dashboard-card">
                      <div class="card-header" style="cursor: default;">
                          <h3><i class="fa-solid fa-chart-line" aria-hidden="true"></i> Análises Configuráveis</h3>
                      </div>
                      <div class="card-content">
                         <div class="analysis-config-panel">
                             <div class="form-group">
                                 <label for="analysis-data-select">Analisar:</label>
                                 <select id="analysis-data-select">
                                     <option value="gastos_categoria">Gastos por Categoria (Listas)</option>
                                     <option value="validade_despensa">Itens por Validade (Despensa)</option>
                                     <option value="uso_receitas">Receitas Usadas (Planejador)</option>
                                 </select>
                             </div>
                             <div class="form-group">
                                 <label for="analysis-type-select">Tipo de Gráfico:</label>
                                 <select id="analysis-type-select">
                                     <option value="pie">Pizza</option>
                                     <option value="doughnut">Rosca</option>
                                     <option value="bar">Barras</option>
                                     <option value="line">Linha</option>
                                 </select>
                             </div>
                         </div>
                         <div class="chart-canvas-container">
                             <canvas id="dynamic-analysis-chart"></canvas>
                         </div>
                      </div>
                      <div class="card-footer">
                           <button class="btn btn-secondary pdf-btn" title="Exportar Relatório"><i class="fa-solid fa-file-pdf"></i> Exportar</button>
                      </div>
                  </div>
             `;
             document.getElementById('analysis-data-select')?.addEventListener('change', () => this.updateDynamicChart());
             document.getElementById('analysis-type-select')?.addEventListener('change', () => this.updateDynamicChart());
             this.updateDynamicChart();
        },

        renderConfiguracoes(container) {
             if (!container) container = document.getElementById('module-configuracoes');
             if (!container) return;
             container.innerHTML = `
                  <div class="dashboard-card">
                      <div class="card-header" style="cursor: default;"><h3><i class="fa-solid fa-sliders" aria-hidden="true"></i> Configurações</h3></div>
                      <div class="card-content">
                           <div class="config-section">
                               <h4><i class="fa-solid fa-user" aria-hidden="true"></i> Perfil</h4>
                               <div class="form-group"> <label for="config-name">Nome</label> <input type="text" id="config-name" value="${this.escapeHtml(this.state.user.nome || 'User')}"> </div>
                               <div class="form-group"> <label for="config-email">Email</label> <input type="text" id="config-email" value="user@email.com" disabled> </div>
                               <button class="btn btn-primary">Salvar Alterações</button>
                           </div>
                           <div class="config-section">
                               <h4><i class="fa-solid fa-bell" aria-hidden="true"></i> Notificações</h4>
                               <div class="form-group inline"> <label for="notif-validade">Notificar sobre validade</label> <label class="toggle-switch"> <input type="checkbox" id="notif-validade" checked> <span class="toggle-slider"></span> </label> </div>
                               <div class="form-group inline"> <label for="notif-ia">Sugestões da IA</label> <label class="toggle-switch"> <input type="checkbox" id="notif-ia" checked> <span class="toggle-slider"></span> </label> </div>
                               <div class="form-group inline"> <label for="notif-email">Notificações por Email</label> <label class="toggle-switch"> <input type="checkbox" id="notif-email"> <span class="toggle-slider"></span> </label> </div>
                           </div>
                           <div class="config-section">
                               <h4><i class="fa-solid fa-database" aria-hidden="true"></i> Gerenciamento de Dados</h4>
                               <div class="form-group"> <label>Exportar meus dados (JSON)</label> <button class="btn btn-secondary">Exportar</button> </div>
                               <div class="form-group"> <label>Apagar todos os dados</label> <button class="btn btn-danger" id="config-delete-account-btn">Apagar Conta</button> </div>
                           </div>
                      </div>
                  </div>
              `;
             const deleteBtn = container.querySelector('#config-delete-account-btn');
             deleteBtn?.addEventListener('click', () => { this.openConfirmModal('Apagar Conta', 'Tem certeza que deseja apagar todos os seus dados? Esta ação é irreversível.', () => { this.showInfoModal('Conta Apagada', 'Seus dados foram apagados.'); this.handleLogout(); }); });
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
            if (this.tempRecipeIngredients.length === 0) { container.innerHTML = '<p class="empty-list-message" style="padding: 1rem 0;">Nenhum ingrediente adicionado.</p>'; return; }
            container.innerHTML = this.tempRecipeIngredients.map((ing, index) => {
                const ingName = this.escapeHtml(ing.name);
                let qtyDisplay = ing.unit === 'a gosto' ? 'a gosto' : `${this.escapeHtml(ing.qty || '')} ${this.escapeHtml(ing.unit || '')}`;
                return `
                <div class="recipe-ing-item" data-index="${index}">
                    <span><strong>${qtyDisplay}</strong> - ${ingName}</span>
                    <div class="recipe-ing-actions">
                        <button type="button" class="icon-button edit-ing-btn" title="Editar" aria-label="Editar ${ingName}"><i class="fa-solid fa-pencil" aria-hidden="true"></i></button>
                        <button type="button" class="icon-button delete-ing-btn" title="Excluir" aria-label="Excluir ${ingName}"><i class="fa-solid fa-times" aria-hidden="true"></i></button>
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
                 // Correção: Garante que 'new' ou null force a criação imediata da lista
                 let targetListId = (listId === 'new' || !listId) ? null : listId;
                 
                 // Se não tem ID, é uma lista nova. Cria sincronicamente para evitar o erro "Lista não encontrada".
                 if (!targetListId) {
                    // Tenta usar a lista ativa atual se ela existir
                    if (this.activeListId && this.state.listas[this.activeListId] && listId !== 'new') {
                        targetListId = this.activeListId;
                    } else {
                        // Criação IMEDIATA da nova lista
                        const widgetInput = document.getElementById('widget-list-name-input');
                        const mainInput = document.getElementById('active-list-name-input');
                        const newName = widgetInput?.value.trim() || mainInput?.value.trim() || "Nova Lista";
                        
                        const newListId = this.generateId();
                        this.state.listas[newListId] = { nome: newName, items: [] };
                        this.activeListId = newListId;
                        targetListId = newListId;
                        this.renderListasSalvas(); // Atualiza sidebar na hora
                    }
                 }

                 if (!this.state.listas[targetListId]) { this.showNotification("Erro crítico: Lista não encontrada.", "error"); return; }
                 
                 if (this.userPlan === 'free' && this.state.listas[targetListId].items.length >= 10) { this.showPlansModal("Limite de 10 itens por lista no plano Gratuito atingido. Faça upgrade para listas ilimitadas!"); return; }
                 
                 this.state.listas[targetListId].items.unshift(itemData);
                 this.renderListaAtiva(targetListId); 
                 this.renderListaWidget(); 
                 this.renderOrcamento();

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
                 // Se deletar de dentro do modal, fecha o modal também
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
             
             // Só mostra animação se for clique manual (não automático)
             if(btn && !forceCreate) { 
                 btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...'; 
                 btn.disabled = true; 
             }

             // Delay apenas se for manual
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
             }, forceCreate ? 0 : 600); // 0ms se for automático, 600ms se for manual
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
            const typeInput = document.getElementById('edit-item-type');
            document.getElementById('edit-item-id').value = item.id;
            typeInput.value = isDespensa ? 'despensa' : 'lista';
            document.getElementById('item-edit-title').innerHTML = `<i class="fa-solid fa-pencil" aria-hidden="true"></i> Editar ${item.name}`;
            document.getElementById('edit-item-name').value = item.name;
            document.getElementById('edit-item-qtd').value = item.qtd;
            document.getElementById('edit-item-unid').value = item.unid;
            document.getElementById('edit-item-valor').value = parseFloat(item.valor || 0).toFixed(2);
            if (isLista) { typeInput.dataset.listId = targetListId; }
            const despensaFields = document.getElementById('edit-item-despensa-fields');
            if (isDespensa) {
                 document.getElementById('edit-item-validade').value = item.validade || '';
                 document.getElementById('edit-item-stock').value = item.stock !== undefined ? item.stock : 100;
                 despensaFields.style.display = 'block';
            } else { despensaFields.style.display = 'none'; }
            this.openModal('item-edit-modal');
        },

        handleSaveEditModal() {
             const id = document.getElementById('edit-item-id').value;
             const typeInput = document.getElementById('edit-item-type');
             const type = typeInput.value;
             if (!id || !type) {
                this.handleAddItem('despensa', document.getElementById('item-edit-modal'));
                this.closeModal('item-edit-modal'); return;
             }
             const updatedData = { name: document.getElementById('edit-item-name').value.trim() || "Item sem nome", qtd: parseFloat(document.getElementById('edit-item-qtd').value) || 1, unid: document.getElementById('edit-item-unid').value, valor: this.parseCurrency(document.getElementById('edit-item-valor').value).toFixed(2) };
             if (type === 'despensa') {
                  updatedData.validade = document.getElementById('edit-item-validade').value || null;
                  updatedData.stock = parseInt(document.getElementById('edit-item-stock').value);
                  if (isNaN(updatedData.stock) || updatedData.stock < 0 || updatedData.stock > 100) { updatedData.stock = 100; }
                  const itemIndex = this.state.despensa.findIndex(i => i.id.toString() === id);
                  if (itemIndex > -1) { this.state.despensa[itemIndex] = { ...this.state.despensa[itemIndex], ...updatedData }; this.renderDespensaWidget(); if(this.activeModule === 'despensa') this.renderDespensa(); }
             } else {
                  const targetListId = typeInput.dataset.listId;
                  if (!targetListId) return;
                  if (this.state.listas[targetListId]) {
                       const itemIndex = this.state.listas[targetListId].items.findIndex(i => i.id.toString() === id);
                       if (itemIndex > -1) { 
                           this.state.listas[targetListId].items[itemIndex] = { ...this.state.listas[targetListId].items[itemIndex], ...updatedData }; 
                           const modalBody = document.querySelector(`#list-view-modal-body[data-list-id="${targetListId}"]`);
                           if (modalBody && document.getElementById('list-view-modal').classList.contains('is-visible')) { const lista = this.state.listas[targetListId]; modalBody.innerHTML = lista.items.map(item => this.createListaItemHTML(item)).join(''); } 
                           else { this.renderListaAtiva(targetListId); }
                           this.renderListaWidget(); this.renderOrcamento(); 
                       }
                  }
             }
             this.saveState(); this.closeModal('item-edit-modal');
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
              // CORREÇÃO: Fecha o modal de detalhes para evitar sobreposição no mobile
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
              this.renderModalIngredientList();
              const modal = document.getElementById('custom-confirm-modal');
              if (!modal) return;
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
             // Pega o botão do modal de confirmação
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
                 
                 // Atualiza detalhe se estiver aberto no desktop
                 if (window.innerWidth >= 992 && document.getElementById('module-receitas')?.classList.contains('detail-is-visible')) { 
                    const currentDetailId = document.querySelector('.recipe-list-item.active')?.dataset.recipeId; 
                    if (currentDetailId === id || (!id && currentDetailId)) { 
                        this.renderRecipeDetail(id || Object.keys(this.state.receitas).find(key => this.state.receitas[key].name === name)); 
                    } 
                 }
                 
                 // Força o fechamento do modal
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

        handleAddMealToPlanner(recipeName, targetContainerId) {
             const targetContainer = document.getElementById(targetContainerId); if (!targetContainer) return;
             const match = targetContainerId.match(/planner-(?:full|day)-(\w+)(?:-(\w+))?/); if (!match) return;
             const dayKey = match[1]; const mealKey = match[2];
             const recipe = Object.values(this.state.receitas).find(r => r.name === recipeName);
             if (!recipe) { this.showNotification(`Receita "${recipeName}" não encontrada.`, "error"); return; }
             if (!this.state.planejador[dayKey]) { this.state.planejador[dayKey] = {}; }
             if(mealKey) { this.state.planejador[dayKey][mealKey] = { id: recipe.id, name: recipe.name }; }
             else { this.state.planejador[dayKey] = { cafe: { id: recipe.id, name: recipe.name }, almoco: { id: recipe.id, name: recipe.name }, jantar: { id: recipe.id, name: recipe.name } }; }
             this.saveState();
             if (this.activeModule === 'planejador') { this.renderPlanejador(); } else { this.renderPlannerWidget(); }
        },

        populateRecipePicker() {
             const container = document.getElementById('recipe-picker-list-container'); if (!container) return;
             const recipes = Object.values(this.state.receitas);
             container.innerHTML = recipes.map(recipe => {
                const recipeName = this.escapeHtml(recipe.name);
                return `<div class="recipe-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--glass-border);"> <span>${recipeName}</span> <button class="btn btn-primary btn-add-recipe" data-recipe-name="${recipeName}" aria-label="Adicionar ${recipeName}"><i class="fa-solid fa-plus" aria-hidden="true"></i></button> </div>`
             }).join('');
             if (recipes.length === 0) { container.innerHTML = '<p class="empty-list-message">Nenhuma receita cadastrada.</p>'; }
             container.removeEventListener('click', this.handleRecipePickerAdd);
             container.addEventListener('click', this.handleRecipePickerAdd.bind(this));
        },

         handleRecipePickerAdd(e) {
              const addBtn = e.target.closest('.btn-add-recipe');
              if (addBtn && this.currentPlannerDayTarget) {
                   const recipeName = addBtn.dataset.recipeName;
                   this.handleAddMealToPlanner(recipeName, this.currentPlannerDayTarget);
                   this.closeModal('recipe-picker-modal'); this.currentPlannerDayTarget = null;
              }
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

        createAutocompleteElement() {
            const el = document.createElement('div'); el.id = 'autocomplete-suggestions'; document.body.appendChild(el); this.elements.autocompleteSuggestions = el; this.activeAutocompleteInput = null;
        },

        handleAutocomplete(inputElement) {
            const query = inputElement.value.trim().toLowerCase();
            this.activeAutocompleteInput = inputElement; 
            if (query.length < 2) { this.hideAutocomplete(); return; }
            const suggestions = ALL_ITEMS_DATA.filter(item => item.name.toLowerCase().includes(query)).slice(0, 10);
            if (suggestions.length === 0) { this.hideAutocomplete(); return; }
            this.showAutocomplete(suggestions, query, inputElement);
        },
        showAutocomplete(suggestions, query, inputElement) {
            const suggestionsEl = this.elements.autocompleteSuggestions;
            if (!suggestionsEl) return;
            suggestionsEl.innerHTML = suggestions.map(item => { const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi'); const nameHtml = this.escapeHtml(item.name).replace(regex, '<strong>$1</strong>'); return ` <div class="autocomplete-item" data-name="${this.escapeHtml(item.name)}"> ${nameHtml} </div> `; }).join('');
            const rect = inputElement.getBoundingClientRect();
            suggestionsEl.style.left = `${rect.left}px`; suggestionsEl.style.top = `${rect.bottom + 5}px`; suggestionsEl.style.width = `${rect.width}px`; suggestionsEl.style.display = 'block';
        },
        hideAutocomplete() { if (this.elements.autocompleteSuggestions) { this.elements.autocompleteSuggestions.style.display = 'none'; } this.activeAutocompleteInput = null; },
        selectAutocompleteItem(itemName) {
            if (!this.activeAutocompleteInput) { this.hideAutocomplete(); return; }
            const itemData = ALL_ITEMS_DATA.find(item => item.name === itemName);
            if (!itemData) { this.hideAutocomplete(); return; }
            const inputId = this.activeAutocompleteInput.id;
            this.activeAutocompleteInput.value = itemData.name;
            const form = this.activeAutocompleteInput.closest('form, .modal-box, .dashboard-card');
            if (!form) { this.hideAutocomplete(); return; }
            const unitMatch = itemData.unit_desc.match(/^(un|kg|g|L|ml|pct|cx)/);
            const itemUnit = unitMatch ? unitMatch[1] : 'un';
            
            // Lógica para preencher os campos dependendo de onde o autocomplete foi chamado
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
             if(this.userPlan !== 'premium_ai') { this.showPlansModal("O Chef IA é um recurso exclusivo do plano <strong>Premium IA</strong>. Faça o upgrade!"); return; }
             this.setupChatbotModal(); this.openModal('ai-chat-modal'); document.getElementById('ai-chat-input')?.focus();
        },

        setupChatbotModal() {
             const chatbotModal = document.getElementById('ai-chat-modal'); if (!chatbotModal || chatbotModal.dataset.initialized === 'true') return;
             const sendBtn = chatbotModal.querySelector('#ai-chat-send-btn'); const input = chatbotModal.querySelector('#ai-chat-input'); const messagesContainer = chatbotModal.querySelector('#ai-chat-messages-container');
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

        async triggerChefIAAnalysis(prompt) { 
            if (this.isIAProcessing) return; 
            this.isIAProcessing = true; 
            const messagesContainer = document.getElementById('ai-chat-messages-container'); 
            const thinkingMessage = document.createElement('div'); 
            thinkingMessage.className = 'chat-message ia'; 
            thinkingMessage.innerHTML = '<div class="bubble">Analisando... <i class="fa-solid fa-spinner fa-spin"></i></div>'; 
            messagesContainer.appendChild(thinkingMessage); 
            messagesContainer.scrollTop = messagesContainer.scrollHeight; 
            try { 
                const apiResponse = await this.callGeminiAPI(prompt); 
                this.processIAResponse(apiResponse.json, apiResponse.html, thinkingMessage); 
            } catch (error) { 
                console.error("Erro no Chef IA:", error); 
                thinkingMessage.innerHTML = `<div class="bubble" style="color:var(--red)">Ocorreu um erro de conexão. Tente novamente.</div>`;
            } finally { this.isIAProcessing = false; } 
        },

        async callGeminiAPI(userText) {
            const context = {
                listaAtiva: this.state.listas[this.activeListId] || {},
                itensNaDespensa: this.state.despensa.map(i => `${i.qtd} ${i.unid} de ${i.name} (Vence: ${i.validade || 'N/A'})`),
                listasExistentes: Object.values(this.state.listas).map(l => ({id: l.id, nome: l.nome})),
                receitasSalvas: Object.values(this.state.receitas).map(r => ({id: r.id, name: r.name})),
                planejador: this.state.planejador
            };
            const systemPersona = `
            VOCÊ É O "CHEF IA" DO ALIMENTE FÁCIL.
            SUA ESPECIALIDADE: Gastronomia, Nutrição, Economia Doméstica.
            SEU PODER NO SISTEMA: Você não apenas fala, você AGE (criar listas, receitas).
            REGRA DE RESPOSTA (JSON OBRIGATÓRIO): Responda APENAS um objeto JSON cru.
            Formato: { "intent": "NOME_DA_ACAO", "data": { ... }, "response_text_html": "HTML da resposta falada." }
            CONTEXTO: ${JSON.stringify(context)}
            `;
            const fullPrompt = `${systemPersona}\n\nPERGUNTA DO USUÁRIO: "${userText}"`;
            try {
                const response = await fetch('/api/chef-ia', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: fullPrompt })
                });
                if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || `Erro Servidor: ${response.status}`); }
                const data = await response.json();
                let textResponse = data.candidates[0].content.parts[0].text;
                textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                try {
                    let parsed = JSON.parse(textResponse);
                    if (parsed.intent === 'create_shopping_list') { parsed.response_text_html += `<br><button class='af-option-btn' style='margin-top:10px; width:100%;' data-action='view-list' data-list-id='[NEW_LIST_ID]'><i class="fa-solid fa-eye"></i> Ver Lista</button>`; }
                    if (parsed.intent === 'create_recipe') { parsed.response_text_html += `<br><button class='af-option-btn' style='margin-top:10px; width:100%;' data-action='view-recipe' data-recipe-id='[NEW_RECIPE_ID]'><i class="fa-solid fa-utensils"></i> Ver Receita</button>`; }
                    return { json: parsed, html: null };
                } catch (e) {
                    const cleanJson = textResponse.substring(textResponse.indexOf('{'), textResponse.lastIndexOf('}') + 1);
                    const parsed = JSON.parse(cleanJson);
                    return { json: parsed, html: null };
                }
            } catch (e) {
                console.error("Erro Chef IA:", e);
                return { json: { intent: "answer_question", data: {} }, html: `<span style="color:var(--red)"><i class="fa-solid fa-triangle-exclamation"></i> Ocorreu um erro: ${e.message}. Tente novamente.</span>` };
            }
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
            this.state.receitas[newId] = { id: newId, name: recipeData.recipe_name || "Receita da IA", desc: recipeData.desc || "Criada pelo Chef IA", content: `<h4>Ingredientes</h4><ul>${ingredients.map(ing => `<li>${ing.qty || ''} ${ing.unit || ''} ${ing.name || '?'}` ).join('')}</ul><h4>Preparo</h4><p>${prepMode.replace(/\n/g, '<br>')}</p>`, ingredients: ingredients.map(ing => ({ name: ing.name || "?", qty: ing.qty || "1", unit: ing.unit || "un" })) }; 
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
                    guide_plans: { text: "Temos planos flexíveis! O Premium IA é o mais completo.", options: [ { label: "Ver Tabela de Planos", action: "open_plans_modal", icon: "fa-table" }, { label: "Voltar ao Início", next: "start", icon: "fa-arrow-left" } ] },
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

window.app = app; 
    
    app.init();

});