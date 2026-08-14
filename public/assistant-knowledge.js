(function(){
  'use strict';

  const normalize = (value='') => String(value)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  const stop = new Set('a o as os um uma de da do das dos e em no na nos nas para por com sem que qual quais como onde quando porque pq voce vc eu meu minha seus suas isso isto site app aplicativo alimente facil'.split(' '));
  const aliases = {
    'objetivo':'finalidade proposito serve', 'lista':'listas compras mercado', 'despensa':'estoque alimentos validade',
    'receita':'receitas cozinhar preparo ingredientes', 'planejador':'cardapio semana refeicoes', 'analise':'analises gastos economia',
    'preco':'valor custa mensalidade plano', 'cadastro':'registrar conta comecar', 'login':'entrar acessar',
    'vencimento':'validade vencer vencido', 'ia':'assistente inteligencia artificial ajuda especialista', 'comprar':'compra compras mercado supermercado', 'organizar':'organizacao controle rotina planejar', 'produto':'item alimento ingrediente', 'gasto':'gastos valor preco orcamento economia'
  };
  const tokens = value => normalize(value).split(' ').filter(w=>w.length>1 && !stop.has(w));
  const expand = words => {
    const out = new Set(words);
    words.forEach(w => Object.entries(aliases).forEach(([key, vals]) => {
      const group = [key, ...vals.split(' ')];
      if(group.includes(w)) group.forEach(x=>out.add(x));
    }));
    return [...out];
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const brl = value => Number(value || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2});

  const intents = [
    {
      id:'objective', phrases:['qual o objetivo do site','qual objetivo do aplicativo','para que serve o alimente facil','qual a finalidade','o que esse site faz'],
      keywords:['objetivo','finalidade','proposito','serve','site','aplicativo'],
      answer:'<strong>O objetivo do Alimente Fácil é transformar a organização da cozinha em uma rotina simples.</strong><br>Ele reúne lista de compras, despensa, validades, receitas, planejamento semanal e análises para reduzir desperdícios, evitar compras repetidas e ajudar você a decidir melhor o que comprar e cozinhar.',
      actions:[['Ver os recursos','features'],['Começar grátis','signup']]
    },
    {
      id:'overview', phrases:['como funciona','o que o alimente facil faz','quais sao os recursos','me explica o aplicativo'],
      keywords:['funciona','recursos','funcionalidades','explica','aplicativo'],
      answer:'<strong>O Alimente Fácil conecta toda a rotina da cozinha.</strong><br>Você monta listas de compras, registra o que já tem na despensa, acompanha validades, salva receitas, planeja refeições e consulta análises de gastos. Os módulos trabalham juntos para evitar retrabalho e desperdício.',
      actions:[['Lista de compras','lists'],['Despensa','pantry'],['Receitas e planejador','recipes_planner']]
    },
    {
      id:'audience', phrases:['para quem e','quem deve usar','esse app e para mim'], keywords:['quem','publico','familia','sozinho','casal'],
      answer:'O Alimente Fácil é útil para quem compra alimentos e quer mais controle: pessoas que moram sozinhas, casais, famílias, quem prepara marmitas, organiza compras mensais ou precisa acompanhar estoque e validade.'
    },
    {
      id:'price', phrases:['quanto custa','qual o preco','qual o valor','mensalidade','plano'], keywords:['preco','valor','custa','mensalidade','plano'],
      answer:'<strong>O plano custa R$ 9,90 por mês.</strong><br>Antes de pagar, você pode explorar todos os recursos por 7 dias grátis, sem informar cartão. Depois, só continua se decidir assinar.',
      actions:[['Começar 7 dias grátis','signup'],['Ver planos','plans']]
    },
    {
      id:'trial', phrases:['como funciona o teste gratis','precisa de cartao','sao quantos dias gratis','quando comeca a cobrar'], keywords:['teste','gratis','cartao','cobranca','7','dias'],
      answer:'O teste começa quando a conta é criada e dura <strong>7 dias completos</strong>. Não é solicitado cartão no cadastro e não existe cobrança automática. A opção de assinatura por R$ 9,90/mês só é apresentada a partir do <strong>8º dia</strong>, e você continua apenas se decidir assinar.',
      actions:[['Criar conta grátis','signup'],['Ver o plano','plans']]
    },
    {
      id:'signup', phrases:['como criar conta','como cadastrar','quero comecar','fazer cadastro'], keywords:['cadastro','criar','registrar','conta','comecar'],
      answer:'Clique em <strong>Começar agora</strong>, informe nome, e-mail e senha e confirme o cadastro. A conta já entra no período gratuito de 7 dias, sem cartão.',
      actions:[['Abrir cadastro','signup'],['Já tenho conta','login']]
    },
    {
      id:'login', phrases:['como entrar','onde fazer login','acessar minha conta'], keywords:['login','entrar','acessar','senha'],
      answer:'Use o botão de energia no topo da página. Ele abre a área de login. Depois de entrar, o painel carrega seus dados reais.',
      actions:[['Entrar agora','login'],['Esqueci a senha','forgot_password']]
    },
    {
      id:'lists', phrases:['como funciona as listas de compras','como funciona a lista','lista de mercado'], keywords:['lista','listas','compras','mercado'],
      answer:'<strong>A Lista de Compras organiza o que você precisa comprar e acompanha o total.</strong><br>Você adiciona produto, quantidade, unidade e valor, marca o que já comprou e pode mover os itens comprados para a despensa. Também é possível criar listas diferentes, como “Semana”, “Compra do mês” ou “Churrasco”.',
      actions:[['Abrir Listas','nav_lista'],['Como enviar à despensa?','list_to_pantry']]
    },
    {
      id:'list_to_pantry', phrases:['como mandar item para despensa','enviar compra para despensa','mover lista para despensa'], keywords:['mover','enviar','comprado','despensa','lista'],
      answer:'Ao marcar um produto como comprado, informe a validade quando necessário e confirme a movimentação. O item sai da lista e entra na despensa com quantidade, unidade e valor registrados.',
      actions:[['Abrir Listas','nav_lista'],['Abrir Despensa','nav_despensa']]
    },
    {
      id:'pantry', phrases:['como funciona a despensa','como gerenciar a despensa','controle de estoque'], keywords:['despensa','estoque','quantidade','alimentos'],
      answer:'<strong>A Despensa mostra o que você já tem em casa.</strong><br>Cada item pode ter quantidade, unidade, preço, nível de estoque e validade. Isso ajuda a consultar antes de ir ao mercado, evitar compras repetidas e usar primeiro o que está próximo de vencer.',
      actions:[['Abrir Despensa','nav_despensa'],['Entender validades','expiry']]
    },
    {
      id:'expiry', phrases:['como funciona validade','produto perto de vencer','controle de vencimento'], keywords:['validade','vencimento','vencer','vencido','alerta'],
      answer:'O controle de validade destaca itens conforme a proximidade do vencimento. A ideia é ajudar você a priorizar esses alimentos em receitas e compras, reduzindo perdas. A data deve ser conferida na embalagem e atualizada quando o item for reposto.',
      actions:[['Ver Despensa','nav_despensa'],['Ideias para usar alimentos','meal_ideas']]
    },
    {
      id:'recipes', phrases:['como funciona as receitas','salvar receita','receitas do app'], keywords:['receita','receitas','ingredientes','preparo','cozinhar'],
      answer:'Em <strong>Receitas</strong>, você cadastra nome, descrição, ingredientes e modo de preparo. As receitas podem ser usadas no planejador e seus ingredientes podem ajudar a montar a lista de compras.',
      actions:[['Abrir Receitas','nav_receitas'],['Planejar a semana','planner']]
    },
    {
      id:'planner', phrases:['como funciona o planejador','planejar refeicoes','montar cardapio semanal'], keywords:['planejador','cardapio','semana','refeicoes','refeicao'],
      answer:'O <strong>Planejador</strong> distribui refeições ao longo da semana. Você escolhe uma receita para cada dia e pode transformar os ingredientes planejados em itens da lista de compras.',
      actions:[['Abrir Planejador','nav_planejador'],['Gerar lista do planejador','planner_to_list']]
    },
    {
      id:'planner_to_list', phrases:['gerar lista do planejador','transformar cardapio em lista','ingredientes para lista'], keywords:['gerar','lista','planejador','ingredientes'],
      answer:'Depois de preencher o planejador com receitas, use a opção de gerar lista. O sistema percorre os ingredientes das refeições planejadas e adiciona os itens à lista selecionada.',
      actions:[['Abrir Planejador','nav_planejador'],['Abrir Listas','nav_lista']]
    },
    {
      id:'analysis', phrases:['como funcionam as analises','analise de gastos','quanto estou gastando'], keywords:['analise','analises','gastos','economia','orcamento','total'],
      answer:'As <strong>Análises</strong> ajudam a acompanhar gastos, orçamento e comportamento de compra. O objetivo é tornar mais fácil perceber quanto você está gastando, onde pode economizar e como o planejamento influencia a rotina.',
      actions:[['Abrir Análises','nav_analises']]
    },
    {
      id:'budget', phrases:['como definir orcamento','limite de gastos','orcamento mensal'], keywords:['orcamento','limite','gasto','mensal'],
      answer:'Você pode definir um orçamento para comparar o total das compras com o limite planejado. Atualize os valores dos itens para que a estimativa fique mais próxima da realidade.'
    },
    {
      id:'savings', phrases:['como economizar no mercado','reduzir desperdicio','evitar compras repetidas'], keywords:['economizar','economia','desperdicio','repetidas','mercado'],
      answer:'Uma rotina simples costuma funcionar bem: consulte a despensa antes de comprar, planeje refeições, gere a lista, defina um orçamento e priorize itens próximos do vencimento. O Alimente Fácil reúne essas etapas para você não depender de memória ou anotações espalhadas.',
      actions:[['Começar pela despensa','nav_despensa'],['Montar lista','nav_lista']]
    },
    {
      id:'meal_ideas', phrases:['o que posso cozinhar','ideia para jantar','ideia de almoco','receita com o que tenho'], keywords:['ideia','jantar','almoco','cozinhar','tenho','ingredientes'],
      answer:'Para sugerir algo útil, diga quais ingredientes você tem e se procura café da manhã, almoço, jantar ou lanche. Eu posso combinar opções simples dentro desse contexto. Para recomendações personalizadas de saúde ou dieta, procure orientação profissional.',
      actions:[['Ver minhas receitas','nav_receitas'],['Ver despensa','nav_despensa']]
    },
    {
      id:'storage', phrases:['como guardar alimentos','organizar geladeira','organizar despensa fisica'], keywords:['guardar','armazenar','geladeira','organizar','conservar'],
      answer:'Como regra geral, mantenha alimentos secos em recipientes fechados, identifique datas, deixe os itens mais antigos na frente e respeite as instruções da embalagem. Perecíveis devem ser refrigerados rapidamente. Em caso de dúvida sobre segurança de um alimento, descarte-o.'
    },
    {
      id:'substitution', phrases:['substituir ingrediente','nao tenho ingrediente','troca de ingrediente'], keywords:['substituir','trocar','ingrediente','alternativa'],
      answer:'Diga qual ingrediente falta e qual receita você está preparando. A substituição depende da função do ingrediente: sabor, textura, gordura, líquido ou estrutura. Eu posso sugerir alternativas culinárias, mas alergias e restrições médicas exigem cuidado profissional.'
    },
    {
      id:'install', phrases:['como instalar o aplicativo','adicionar na tela inicial','tem app'], keywords:['instalar','app','celular','pwa','tela','inicial'],
      answer:'O Alimente Fácil pode ser instalado como aplicativo pelo navegador. No celular, abra o menu do navegador e escolha “Adicionar à tela inicial” ou use o aviso de instalação quando ele aparecer.',
      actions:[['Como usar no celular','mobile']]
    },
    {
      id:'mobile', phrases:['funciona no celular','funciona no computador','quais dispositivos'], keywords:['celular','computador','tablet','dispositivo'],
      answer:'Sim. O Alimente Fácil funciona no navegador de celular, tablet e computador. A interface se adapta ao tamanho da tela e pode ser instalada como aplicativo no dispositivo.'
    },
    {
      id:'privacy', phrases:['meus dados estao seguros','privacidade','o que fazem com meus dados'], keywords:['privacidade','dados','seguranca','seguro'],
      answer:'Os detalhes jurídicos e técnicos estão na Política de Privacidade e nos Termos de Uso disponíveis no rodapé. Nunca compartilhe sua senha e sempre encerre a sessão em dispositivos públicos.',
      actions:[['Ver Privacidade','privacy'],['Ver Termos','terms']]
    },
    {
      id:'cancel', phrases:['como cancelar','posso cancelar quando quiser','cancelamento'], keywords:['cancelar','cancelamento','assinatura'],
      answer:'A proposta do plano é permitir cancelamento quando quiser. Consulte a área da assinatura ou o suporte para confirmar o procedimento aplicado à forma de pagamento utilizada.',
      actions:[['Falar com suporte','contact']]
    },
    {
      id:'contact', phrases:['como falar com voces','contato','suporte','email'], keywords:['contato','suporte','email','mensagem'],
      answer:'Use o botão de e-mail no topo ou o link <strong>Contato</strong> no rodapé. A mensagem é enviada para a equipe do Alimente Fácil.',
      actions:[['Abrir contato','contact']]
    },
    {
      id:'ai_scope', phrases:['voce e uma ia','o que voce sabe responder','como funciona essa ia'], keywords:['ia','assistente','responder','inteligencia'],
      answer:'Sou o assistente especializado do Alimente Fácil. Respondo sobre o sistema e sobre organização prática de compras, despensa, validades, receitas e planejamento. Não substituo nutricionista, médico nem orientações de segurança alimentar oficiais.'
    },
    {
      id:'first_steps', phrases:['por onde eu comeco','como comecar a usar','primeiros passos','o que faco primeiro','acabei de cadastrar e agora'],
      keywords:['comecar','primeiro','inicio','passos','usar'],
      answer:'<strong>Para começar sem complicação:</strong><br>1. Confira ou cadastre o que você já tem na despensa.<br>2. Crie uma lista com o que está faltando.<br>3. Salve suas receitas mais usadas.<br>4. Monte o planejador da semana.<br>5. Acompanhe gastos e itens próximos do vencimento.<br><br>Você não precisa preencher tudo de uma vez; comece pela área que resolve sua necessidade de hoje.',
      actions:[['Abrir Despensa','nav_despensa'],['Criar uma lista','nav_lista']]
    },
    {
      id:'integrated_flow', phrases:['como os modulos se conectam','como tudo funciona junto','lista despensa receita planejador juntos','qual o fluxo do aplicativo'],
      keywords:['modulos','conectam','fluxo','juntos','integrado'],
      answer:'<strong>Os módulos foram pensados como uma sequência.</strong><br>O planejador define as refeições; as receitas informam os ingredientes; esses ingredientes podem virar uma lista; os itens comprados entram na despensa; e as análises ajudam a acompanhar valores e orçamento. Assim, a mesma informação pode continuar pela rotina sem você ter que anotar tudo novamente.',
      actions:[['Ver Planejador','nav_planejador'],['Ver Listas','nav_lista'],['Ver Despensa','nav_despensa']]
    },
    {
      id:'avoid_duplicates', phrases:['como evitar comprar repetido','comprei produto repetido','evitar compras duplicadas','nao quero comprar o que ja tenho'],
      keywords:['repetido','duplicado','evitar','consultar','tenho'],
      answer:'Antes de fechar a compra, consulte a despensa e compare com a lista. Mantenha quantidades e níveis de estoque atualizados e dê baixa quando consumir um item. Essa rotina reduz a chance de comprar algo que ainda está em casa.',
      actions:[['Consultar Despensa','nav_despensa'],['Revisar Lista','nav_lista']]
    },
    {
      id:'list_types', phrases:['posso criar mais de uma lista','lista semanal ou mensal','tipos de lista','separar listas'],
      keywords:['mais','uma','lista','semanal','mensal','separar'],
      answer:'Sim. Você pode manter listas diferentes para cada contexto, como compra semanal, compra do mês, feira, festa ou itens de limpeza. Isso evita misturar objetivos e facilita acompanhar o total de cada compra.',
      actions:[['Abrir Listas','nav_lista']]
    },
    {
      id:'list_totals', phrases:['como calcular total da lista','valor total das compras','quanto vai dar a compra','preco dos produtos da lista'],
      keywords:['total','valor','preco','compra','somar'],
      answer:'Informe o valor, a quantidade e a unidade dos itens para acompanhar melhor a estimativa da compra. Quanto mais atualizados estiverem os preços, mais útil será a comparação com o orçamento definido.',
      actions:[['Abrir Listas','nav_lista'],['Ver Análises','nav_analises']]
    },
    {
      id:'stock_update', phrases:['como atualizar estoque','como dar baixa na despensa','produto acabou','como alterar quantidade'],
      keywords:['atualizar','baixa','acabou','quantidade','estoque'],
      answer:'Na despensa, edite o item para ajustar quantidade ou nível de estoque conforme ele for sendo consumido. Quando acabar, você pode remover o item ou incluí-lo novamente em uma lista de compras.',
      actions:[['Abrir Despensa','nav_despensa'],['Criar Lista','nav_lista']]
    },
    {
      id:'expired_safety', phrases:['posso comer produto vencido','alimento venceu o que fazer','comida estragada','produto fora da validade'],
      keywords:['vencido','venceu','estragado','comer','seguranca'],
      answer:'O aplicativo ajuda a acompanhar datas, mas não consegue confirmar se um alimento está seguro para consumo. Respeite as instruções do fabricante, observe conservação, embalagem, odor e aparência e, diante de dúvida, descarte o produto. Para orientações específicas, consulte fontes oficiais de segurança alimentar.',
      actions:[['Revisar Validades','nav_despensa']]
    },
    {
      id:'recipe_from_pantry', phrases:['receita com o que tenho na despensa','o que fazer com meus ingredientes','usar alimentos da despensa','cozinhar sem ir ao mercado'],
      keywords:['receita','tenho','despensa','ingredientes','usar'],
      answer:'Você pode consultar os itens disponíveis e compará-los com as receitas salvas. Priorize ingredientes próximos do vencimento e escolha preparos que aproveitem vários itens da despensa. Diga quais ingredientes você tem para eu sugerir combinações culinárias simples.',
      actions:[['Ver Despensa','nav_despensa'],['Ver Receitas','nav_receitas']]
    },
    {
      id:'weekly_planning', phrases:['como organizar alimentacao da semana','como montar semana de refeicoes','planejar almoco e jantar','cardapio para semana'],
      keywords:['organizar','semana','almoco','jantar','cardapio'],
      answer:'Comece escolhendo refeições para os dias em que você realmente cozinha. Reaproveite ingredientes entre pratos, considere sobras e deixe opções rápidas para dias corridos. Depois, gere ou revise a lista de compras com base nesse planejamento.',
      actions:[['Abrir Planejador','nav_planejador'],['Abrir Receitas','nav_receitas']]
    },
    {
      id:'family_use', phrases:['serve para familia','serve para quem mora sozinho','como usar em casal','organizar cozinha da familia'],
      keywords:['familia','sozinho','casal','casa','pessoas'],
      answer:'O método se adapta ao tamanho da casa. Quem mora sozinho pode controlar porções e evitar vencimentos; casais podem planejar refeições e compras; famílias podem separar listas, acompanhar estoque e organizar um cardápio mais previsível.',
      actions:[['Conhecer recursos','overview'],['Começar grátis','signup']]
    },
    {
      id:'difference_notes', phrases:['qual a diferenca para bloco de notas','porque nao usar papel','diferenca de uma lista comum','vale a pena usar o aplicativo'],
      keywords:['diferenca','papel','notas','comum','vantagem'],
      answer:'Uma anotação comum registra apenas itens. O Alimente Fácil conecta lista, despensa, receitas, planejador, validades, orçamento e análises. O ganho principal é evitar informações espalhadas e reutilizar os dados entre as etapas da rotina.',
      actions:[['Ver recursos','overview'],['Testar gratuitamente','signup']]
    },
    {
      id:'data_sync', phrases:['meus dados ficam salvos','perco meus dados','posso acessar depois','dados da minha conta'],
      keywords:['salvos','perco','acessar','dados','conta'],
      answer:'Ao usar uma conta autenticada, seus dados ficam associados ao acesso do Alimente Fácil conforme a infraestrutura do serviço. Use sempre o mesmo e-mail e senha e não compartilhe suas credenciais. Consulte a Política de Privacidade para os detalhes oficiais.',
      actions:[['Ver Privacidade','privacy'],['Entrar','login']]
    },
    {
      id:'greeting', phrases:['oi','ola','bom dia','boa tarde','boa noite','tudo bem'], keywords:['oi','ola','dia','tarde','noite'],
      answer:'Olá! 😊 Posso explicar o Alimente Fácil ou ajudar com listas, despensa, validades, receitas, planejamento e economia. O que você quer organizar primeiro?',
      actions:[['Conhecer o app','overview'],['Ver preço','price']]
    }
  ];

  function scoreIntent(question, intent){
    const q = normalize(question);
    const qWords = expand(tokens(q));
    let score = 0;
    intent.phrases.forEach(p => { const n=normalize(p); if(q===n) score+=18; else if(q.includes(n) || n.includes(q)) score+=10; });
    const keys = expand(intent.keywords || []);
    keys.forEach(k => {
      if(qWords.includes(k)) score += k.length > 5 ? 3 : 2;
      else if(k.length >= 5 && qWords.some(w => w.startsWith(k.slice(0,5)) || k.startsWith(w.slice(0,5)))) score += 1.35;
    });
    const phraseWords = expand(tokens((intent.phrases || []).join(' ')));
    const overlap = qWords.filter(w => phraseWords.includes(w)).length;
    if(overlap >= 2) score += overlap * 1.25;
    if(intent.id==='objective' && /objetiv|finalidad|serve|proposit/.test(q)) score += 8;
    if(intent.id==='lists' && /lista.*compra|compra.*lista/.test(q)) score += 8;
    return score;
  }

  function personalized(question, ctx){
    const q=normalize(question), state=ctx.state||{};
    if(!ctx.loggedIn) return null;
    if(/quantas? listas|minhas listas/.test(q)){
      const lists=Object.values(state.listas||{}); return {html:`Você tem <strong>${lists.length} ${lists.length===1?'lista':'listas'}</strong> cadastrada(s).`,actions:[['Abrir Listas','nav_lista']]};
    }
    if(/quantos? itens.*despensa|minha despensa/.test(q)){
      const items=Array.isArray(state.despensa)?state.despensa:[]; return {html:`Sua despensa possui <strong>${items.length} ${items.length===1?'item':'itens'}</strong> registrado(s).`,actions:[['Abrir Despensa','nav_despensa']]};
    }
    if(/minhas receitas|quantas? receitas/.test(q)){
      const recipes=Object.values(state.receitas||{}); return {html:`Você tem <strong>${recipes.length} ${recipes.length===1?'receita':'receitas'}</strong> salva(s).${recipes.length?`<br>Algumas delas: ${recipes.slice(0,4).map(r=>esc(r.name)).join(', ')}.`:''}`,actions:[['Abrir Receitas','nav_receitas']]};
    }
    if(/meu orcamento|qual.*orcamento/.test(q)){
      return {html:`Seu orçamento configurado é <strong>${brl(state.orcamento?.total||0)}</strong>.`,actions:[['Abrir Análises','nav_analises']]};
    }
    return null;
  }

  function resolve(question, context={}){
    const personal=personalized(question,context); if(personal) return personal;
    const ranked=intents.map(i=>({intent:i,score:scoreIntent(question,i)})).sort((a,b)=>b.score-a.score);
    if(ranked[0] && ranked[0].score>=4.5){
      const i=ranked[0].intent; return {html:i.answer,actions:i.actions||[],intent:i.id,confidence:ranked[0].score};
    }
    const q=normalize(question);
    if(/comida|cozinha|mercado|alimento|refeicao|ingrediente/.test(q)){
      return {html:'Posso ajudar dentro desse tema. Conte um pouco mais do que você quer fazer — organizar compras, usar ingredientes, planejar refeições, controlar validades ou economizar — para eu responder de forma prática.',actions:[['Organizar compras','lists'],['Planejar refeições','planner'],['Reduzir desperdício','savings']]};
    }
    return {html:'Ainda não reconheci exatamente essa dúvida. Eu sou especialista no Alimente Fácil e em organização prática da cozinha. Você pode reformular com mais detalhes ou escolher um dos caminhos abaixo.',actions:[['O que o app faz?','overview'],['Como funcionam as listas?','lists'],['Preço e teste grátis','price'],['Falar com suporte','contact']]};
  }

  window.AF_ASSISTANT_ENGINE={resolve,normalize,intents};
})();
