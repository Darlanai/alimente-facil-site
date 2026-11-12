/* Alimente Fácil — Command Center
   A fast, keyboard-first way to reach the product's real features.
   No data access, no network calls, no simulated AI. */
(() => {
  const boot = () => {
    const panel = document.querySelector('.app-panel-container-standalone');
    const header = panel?.querySelector('.main-header .header-left');
    if (!panel || !header || document.getElementById('af-command-trigger')) return;

    const commands = [
      { title: 'Início', detail: 'Visão geral', keywords: 'home painel dashboard', module: 'inicio', icon: 'fa-house' },
      { title: 'Minhas listas', detail: 'Organize suas compras', keywords: 'lista compras mercado carrinho', module: 'lista', icon: 'fa-cart-shopping' },
      { title: 'Minhas notas', detail: 'Consulte notas fiscais', keywords: 'nota fiscal cupom nfce recibo', module: 'notas', icon: 'fa-receipt' },
      { title: 'Despensa', detail: 'Veja o que já tem em casa', keywords: 'estoque alimentos validade produtos', module: 'despensa', icon: 'fa-box-archive' },
      { title: 'Receitas', detail: 'Encontre ideias para cozinhar', keywords: 'comida cozinhar pratos ingredientes', module: 'receitas', icon: 'fa-utensils' },
      { title: 'Planejador', detail: 'Organize as refeições da semana', keywords: 'semana refeições cardápio calendário', module: 'planejador', icon: 'fa-calendar-week' },
      { title: 'Análises', detail: 'Entenda seus gastos', keywords: 'relatórios gráficos economia orçamento', module: 'analises', icon: 'fa-chart-line' },
      { title: 'Configurações', detail: 'Preferências da sua conta', keywords: 'ajustes conta perfil', module: 'configuracoes', icon: 'fa-sliders' },
      { title: 'Ler nota fiscal', detail: 'Abrir leitor de QR Code', keywords: 'escanear qr code chave 44 números', action: () => document.querySelector('[data-nfce-open]')?.click(), icon: 'fa-qrcode' },
      { title: 'Conversar com a CozIA', detail: 'Abrir assistente de cozinha', keywords: 'ajuda assistente inteligência artificial ia', action: () => document.getElementById('af-chatbot-toggle')?.click(), icon: 'fa-wand-magic-sparkles' }
    ];

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'af-command-trigger';
    trigger.className = 'af-command-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-label', 'Busca rápida. Atalho Control K');
    trigger.innerHTML = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span>Ir para...</span><kbd>Ctrl K</kbd>';
    header.append(trigger);

    const overlay = document.createElement('div');
    overlay.className = 'af-command-overlay';
    overlay.hidden = true;
    overlay.innerHTML = '<section class="af-command-dialog" role="dialog" aria-modal="true" aria-labelledby="af-command-title"><div class="af-command-top"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input id="af-command-input" type="search" autocomplete="off" placeholder="O que você quer fazer?" aria-label="Buscar uma função"/><kbd>ESC</kbd></div><h2 id="af-command-title">Acesso rápido</h2><div class="af-command-results" id="af-command-results" role="listbox" aria-label="Ações disponíveis"></div><footer><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>↵</kbd> abrir</span></footer></section>';
    panel.append(overlay);

    const input = overlay.querySelector('#af-command-input');
    const results = overlay.querySelector('#af-command-results');
    let filtered = commands;
    let active = 0;

    const close = () => {
      overlay.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      input.value = '';
      trigger.focus();
    };
    const run = (item) => {
      close();
      if (item.module) panel.querySelector('.nav-item[data-module="' + item.module + '"]')?.click();
      else item.action?.();
    };
    const render = () => {
      const q = input.value.trim().toLocaleLowerCase('pt-BR');
      filtered = commands.filter(item => (item.title + ' ' + item.detail + ' ' + item.keywords).toLocaleLowerCase('pt-BR').includes(q));
      active = Math.min(active, Math.max(0, filtered.length - 1));
      results.replaceChildren();
      if (!filtered.length) {
        const empty = document.createElement('p');
        empty.className = 'af-command-empty';
        empty.textContent = 'Nenhuma ação encontrada. Tente outro termo.';
        results.append(empty);
        return;
      }
      filtered.forEach((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'af-command-result' + (index === active ? ' is-active' : '');
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(index === active));
        button.innerHTML = '<span class="af-command-icon"><i class="fa-solid ' + item.icon + '" aria-hidden="true"></i></span><span class="af-command-copy"><strong></strong><small></small></span><i class="fa-solid fa-arrow-up-right-from-square af-command-go" aria-hidden="true"></i>';
        button.querySelector('strong').textContent = item.title;
        button.querySelector('small').textContent = item.detail;
        button.addEventListener('mouseenter', () => { active = index; results.querySelectorAll('.af-command-result').forEach((node, i) => { node.classList.toggle('is-active', i === active); node.setAttribute('aria-selected', String(i === active)); }); });
        button.addEventListener('click', () => run(item));
        results.append(button);
      });
    };
    const open = () => {
      if (!document.body.classList.contains('app-mode')) return;
      overlay.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      active = 0;
      render();
      requestAnimationFrame(() => input.focus());
    };

    trigger.addEventListener('click', open);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        active = (active + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length;
        render();
      } else if (event.key === 'Enter' && filtered[active]) {
        event.preventDefault();
        run(filtered[active]);
      } else if (event.key === 'Escape') close();
    });
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        if (!document.body.classList.contains('app-mode')) return;
        event.preventDefault();
        overlay.hidden ? open() : close();
      } else if (event.key === 'Escape' && !overlay.hidden) close();
    });
    document.addEventListener('af:panel-open', () => { trigger.hidden = false; });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
