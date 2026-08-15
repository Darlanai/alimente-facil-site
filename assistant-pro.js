(function(){
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const norm = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s,;]/g,' ').replace(/\s+/g,' ').trim();
  const id = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
  const pending = new Map();
  const memory = { turns:[], lastTopic:'', lastIngredients:[], lastProposal:null };

  const DB = {
    groups: {
      graos:['Arroz','Arroz integral','Feijão carioca','Feijão preto','Lentilha','Grão-de-bico','Aveia','Quinoa','Macarrão','Farinha de trigo'],
      hortifruti:['Alface','Tomate','Cebola','Alho','Cenoura','Batata','Batata-doce','Abobrinha','Brócolis','Couve','Pepino','Pimentão','Limão'],
      frutas:['Banana','Maçã','Laranja','Mamão','Abacate','Manga','Melancia','Morango','Pera','Uva','Abacaxi'],
      proteinas:['Ovos','Peito de frango','Carne moída','Peixe','Atum','Sardinha','Tofu','Queijo Minas','Iogurte natural'],
      laticinios:['Leite','Queijo Minas','Iogurte natural','Manteiga','Requeijão'],
      temperos:['Sal','Pimenta-do-reino','Páprica','Cominho','Orégano','Açafrão','Azeite','Vinagre','Cheiro-verde'],
      limpeza:['Detergente','Esponja','Sabão em pó','Desinfetante','Álcool','Saco de lixo','Papel-toalha'],
      higiene:['Papel higiênico','Sabonete','Creme dental','Shampoo','Desodorante']
    },
    units:{arroz:'kg',feijao:'kg',leite:'L',ovos:'dz',banana:'kg',maca:'kg',tomate:'kg',cebola:'kg',alho:'un',frango:'kg',peixe:'kg',queijo:'g',iogurte:'un',azeite:'un',macarrao:'pct'},
    templates:{
      semana:{name:'Compra da Semana',groups:['graos','hortifruti','frutas','proteinas','laticinios','temperos'],take:[4,8,5,5,3,5]},
      mes:{name:'Compra do Mês',groups:['graos','proteinas','laticinios','temperos','limpeza','higiene'],take:[8,7,5,8,7,5]},
      economica:{name:'Compra Econômica',items:['Arroz','Feijão carioca','Ovos','Peito de frango','Sardinha','Aveia','Banana','Cenoura','Batata','Cebola','Alho','Couve','Leite'],note:'Prioriza ingredientes versáteis e de bom aproveitamento.'},
      churrasco:{name:'Churrasco',items:['Carne bovina','Linguiça','Frango','Pão de alho','Carvão','Sal grosso','Farofa','Vinagrete','Refrigerante','Água','Gelo']},
      cafe:{name:'Café da Manhã',items:['Café','Leite','Pão integral','Ovos','Queijo Minas','Aveia','Banana','Mamão','Iogurte natural']},
      vegetariana:{name:'Compra Vegetariana',items:['Arroz integral','Feijão','Lentilha','Grão-de-bico','Tofu','Ovos','Aveia','Quinoa','Brócolis','Couve','Cenoura','Tomate','Abacate']},
      limpeza:{name:'Limpeza e Higiene',groups:['limpeza','higiene'],take:[7,5]}
    },
    recipes:[
      {name:'Arroz com legumes',tags:['economica','almoco','jantar','vegetariana'],ingredients:[['Arroz','1','xícara'],['Cenoura','1','un'],['Abobrinha','1','un'],['Cebola','1/2','un'],['Alho','2','dentes']],prep:'Refogue cebola e alho. Junte os legumes picados, acrescente o arroz e cozinhe com água até ficar macio.'},
      {name:'Frango com batata',tags:['almoco','jantar','proteina'],ingredients:[['Peito de frango','500','g'],['Batata','3','un'],['Cebola','1','un'],['Alho','2','dentes'],['Páprica','1','colher']],prep:'Tempere o frango, doure em uma panela, junte cebola e batata e cozinhe até tudo ficar macio.'},
      {name:'Omelete de legumes',tags:['rapida','cafe','jantar','economica'],ingredients:[['Ovos','2','un'],['Tomate','1','un'],['Cebola','1/4','un'],['Queijo Minas','40','g']],prep:'Bata os ovos, misture os ingredientes picados e cozinhe em frigideira antiaderente até firmar.'},
      {name:'Sopa de legumes',tags:['jantar','leve','economica'],ingredients:[['Batata','2','un'],['Cenoura','1','un'],['Abobrinha','1','un'],['Cebola','1','un'],['Alho','2','dentes']],prep:'Pique os legumes, refogue os temperos, cubra com água e cozinhe até amaciar. Ajuste a textura e os temperos.'},
      {name:'Salada de grão-de-bico',tags:['leve','vegetariana','almoco'],ingredients:[['Grão-de-bico','2','xícaras'],['Tomate','2','un'],['Pepino','1','un'],['Cebola','1/2','un'],['Limão','1','un']],prep:'Misture o grão-de-bico cozido com os vegetais picados. Tempere com limão, azeite e ervas.'},
      {name:'Peixe assado com legumes',tags:['almoco','jantar','leve'],ingredients:[['Peixe','500','g'],['Batata','2','un'],['Tomate','2','un'],['Cebola','1','un'],['Limão','1','un']],prep:'Tempere o peixe, distribua com os legumes em uma assadeira e asse até o peixe estar cozido e os legumes macios.'},
      {name:'Mingau de aveia e banana',tags:['cafe','lanche','rapida'],ingredients:[['Aveia','3','colheres'],['Leite','250','ml'],['Banana','1','un'],['Canela','1','pitada']],prep:'Cozinhe aveia e leite em fogo baixo, mexendo. Finalize com banana amassada e canela.'},
      {name:'Macarrão ao molho de tomate',tags:['almoco','jantar','economica'],ingredients:[['Macarrão','250','g'],['Tomate','4','un'],['Cebola','1/2','un'],['Alho','2','dentes'],['Azeite','1','fio']],prep:'Cozinhe o macarrão. Refogue alho e cebola, junte tomates picados e cozinhe o molho. Misture e sirva.'}
    ],
    substitutions:{ovo:['linhaça hidratada em preparos específicos','banana amassada em bolos'],leite:['bebida vegetal','água em algumas massas'],manteiga:['azeite','óleo vegetal'],acucar:['banana madura','frutas secas em receitas'],farinha:['aveia triturada','farinha de arroz'],carne:['lentilha','grão-de-bico','tofu'],creme:['iogurte natural','creme vegetal']},
    storage:{
      arroz:'Mantenha seco, fechado e protegido de calor e umidade.',feijao:'Guarde seco em recipiente fechado; depois de cozido, refrigere rapidamente.',ovos:'Mantenha refrigerados e evite lavar antes de guardar.',frango:'Refrigere ou congele rapidamente e evite contato com alimentos prontos.',peixe:'Use o quanto antes, sempre refrigerado; congele se não for preparar logo.',folhas:'Lave apenas antes do uso ou seque muito bem; guarde refrigeradas em recipiente protegido.',frutas:'Separe frutas maduras das demais e refrigere quando apropriado.'
    },
    knowledge:{
      nutrition:'Uma organização equilibrada costuma combinar vegetais, fonte de proteína, carboidrato e água, respeitando preferências, cultura, orçamento e orientação profissional quando necessária.',
      economy:'Planeje refeições, confira a despensa, compare preço por unidade, priorize alimentos da estação, aproveite integralmente quando seguro e evite comprar com fome.',
      agriculture:'Sazonalidade, distância de transporte, clima, oferta e forma de produção influenciam preço, aparência e disponibilidade dos alimentos.',
      safety:'Separe alimentos crus dos prontos, higienize mãos e superfícies, refrigere perecíveis rapidamente e descarte o alimento quando houver dúvida sobre sua segurança.',
      health:'Posso oferecer educação alimentar geral e ajudar na organização. Sintomas, doenças, alergias, uso de medicamentos e dietas terapêuticas exigem avaliação de médico ou nutricionista.'
    }
  };

  function action(label, type, payload){ const key=id('act'); pending.set(key,{type,payload}); return [label,`pro:${key}`]; }
  function unitFor(name){ const n=norm(name); const key=Object.keys(DB.units).find(k=>n.includes(k)); return key?DB.units[key]:'un'; }
  function item(name,qty=1,unit){ return {name:String(name).trim(),qtd:Number(qty)||1,unid:unit||unitFor(name),valor:0,checked:false}; }
  function templateItems(key){
    const t=DB.templates[key]||DB.templates.semana;
    if(t.items) return t.items.map(x=>item(x));
    return t.groups.flatMap((g,i)=>DB.groups[g].slice(0,t.take?.[i]||DB.groups[g].length).map(x=>item(x)));
  }
  function listCard(name,items,note=''){
    return `<section class="af-ai-result-card"><header><span>🛒</span><div><strong>${esc(name)}</strong><small>${items.length} itens sugeridos</small></div></header>${note?`<p>${esc(note)}</p>`:''}<ul>${items.slice(0,14).map(x=>`<li><span>${esc(x.name)}</span><b>${esc(x.qtd)} ${esc(x.unid)}</b></li>`).join('')}</ul>${items.length>14?`<small>+ ${items.length-14} itens na lista completa</small>`:''}</section>`;
  }
  function recipeCard(r){ return `<section class="af-ai-result-card af-ai-recipe-card"><header><span>🍳</span><div><strong>${esc(r.name)}</strong><small>${r.ingredients.length} ingredientes</small></div></header><h5>Ingredientes</h5><ul>${r.ingredients.map(x=>`<li><span>${esc(x[0])}</span><b>${esc(x[1])} ${esc(x[2])}</b></li>`).join('')}</ul><h5>Preparo</h5><p>${esc(r.prep)}</p></section>`; }
  function plannerCard(plan){ return `<section class="af-ai-result-card"><header><span>📅</span><div><strong>Planejamento semanal</strong><small>Uma sugestão prática e editável</small></div></header><ul>${Object.entries(plan).map(([d,m])=>`<li><span>${esc(d)}</span><b>${esc(m.name)}</b></li>`).join('')}</ul></section>`; }
  function chartCard(ctx){
    const lists=Object.values(ctx.state?.listas||{}), pantry=ctx.state?.despensa||[], recipes=Object.values(ctx.state?.receitas||{});
    const values=[lists.length,pantry.length,recipes.length,Object.keys(ctx.state?.planejador||{}).length],max=Math.max(1,...values);
    return `<section class="af-ai-result-card"><header><span>📊</span><div><strong>Resumo da sua cozinha</strong><small>Leitura atual do painel</small></div></header><div class="af-ai-mini-chart">${[['Listas',values[0]],['Despensa',values[1]],['Receitas',values[2]],['Dias planejados',values[3]]].map(([l,v])=>`<div><span>${l}</span><i><b style="width:${Math.max(5,v/max*100)}%"></b></i><strong>${v}</strong></div>`).join('')}</div></section>`;
  }
  function parseNamedItems(raw){
    const q=String(raw).replace(/\b(?:na|para a|à)\s+despensa\b/gi,'').replace(/.*?(?:com|contendo|adicione|adicionar|adiciona|inclua|incluir|inclui|coloque|colocar|cadastre|cadastrar|itens?)\s+/i,'');
    return q.split(/,|;|\be\b/i).map(x=>x.replace(/\b(uma?|dois|duas|tres|quatro|cinco|kg|quilo|litro|pacote)\b/gi,'').trim()).filter(x=>x.length>1&&x.length<45).slice(0,30).map(x=>item(x));
  }
  function chooseRecipe(question,ctx){
    const q=norm(question); const pantry=(ctx.state?.despensa||[]).map(x=>norm(x.name));
    const scored=DB.recipes.map(r=>({r,score:r.tags.filter(t=>q.includes(norm(t))).length*3+r.ingredients.filter(x=>q.includes(norm(x[0]))||pantry.some(p=>p.includes(norm(x[0]))||norm(x[0]).includes(p))).length*2})).sort((a,b)=>b.score-a.score);
    return scored[0]?.r||DB.recipes[0];
  }
  function makePlan(question){
    const q=norm(question), pool=DB.recipes.filter(r=>!q.includes('vegetar')||r.tags.includes('vegetariana'));
    const days=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']; const plan={};
    days.forEach((d,i)=>plan[d]=pool[i%pool.length]); return plan;
  }
  function personalizedSummary(q,ctx){
    if(!ctx.loggedIn) return null;
    const state=ctx.state||{};
    if(/faltando|acabando|estoque baixo/.test(q)){
      const low=(state.despensa||[]).filter(x=>Number(x.stock||100)<=25);
      return {html:low.length?`📦 Encontrei <strong>${low.length} item(ns) com estoque baixo</strong>: ${low.slice(0,8).map(x=>esc(x.name)).join(', ')}.`:'✅ Não encontrei itens marcados com estoque baixo.',actions:low.length?[action('Criar lista com eles','save_list',{name:'Reposição da Despensa',items:low.map(x=>item(x.name))}),['Abrir despensa','nav_despensa']]:[['Abrir despensa','nav_despensa']]};
    }
    if(/venc|validade/.test(q)){
      const today=new Date().toISOString().slice(0,10), soon=new Date(Date.now()+7*864e5).toISOString().slice(0,10);
      const due=(state.despensa||[]).filter(x=>x.validade&&x.validade<=soon).sort((a,b)=>String(a.validade).localeCompare(String(b.validade)));
      return {html:due.length?`⏰ Há <strong>${due.length} item(ns) vencido(s) ou próximos do vencimento</strong>: ${due.slice(0,8).map(x=>`${esc(x.name)} (${x.validade<today?'vencido':x.validade.split('-').reverse().join('/')})`).join(', ')}.`:'✅ Não encontrei itens vencidos ou vencendo nos próximos 7 dias.',actions:[['Abrir despensa','nav_despensa'],['Sugerir receita','meal_ideas']]};
    }
    return null;
  }

  function resolve(raw,ctx={}){
    const question=String(raw||'').trim(),q=norm(question); memory.turns.push({role:'user',text:question}); if(memory.turns.length>12)memory.turns.shift();
    const personal=personalizedSummary(q,ctx); if(personal)return personal;
    if(/^(sim|pode|confirmo|salva|salvar|pode salvar|quero)$/i.test(q)&&memory.lastProposal){
      if(memory.lastTopic==='list')return {html:'Ótimo! É só confirmar abaixo. 😊',actions:[action('Salvar lista','save_list',memory.lastProposal)]};
      if(memory.lastTopic==='recipe')return {html:'Perfeito! Vou preparar o salvamento dessa receita.',actions:[action('Salvar receita','save_recipe',memory.lastProposal)]};
      if(memory.lastTopic==='planner')return {html:'Perfeito! O planejamento está pronto para entrar no painel.',actions:[action('Salvar planejador','save_planner',memory.lastProposal)]};
    }
    if(/^(oi|ola|bom dia|boa tarde|boa noite)\b/.test(q)) return {html:'Olá! 😊 O que vamos organizar hoje: compras, despensa, receitas ou refeições da semana?',actions:[['🛒 Montar uma lista','suggest_list'],['🍳 Sugerir receita','meal_ideas'],['📅 Planejar a semana','build_planner']]};
    if(/grafico|analise|resumo.*painel|como esta minha cozinha/.test(q)) return {html:ctx.loggedIn?chartCard(ctx):'<strong>📊 Posso mostrar gráficos dos seus dados reais depois que você entrar.</strong><br>Na demonstração, você pode conhecer como Listas, Despensa, Receitas e Planejador trabalham juntos.',actions:ctx.loggedIn?[['Abrir análises completas','nav_analises']]:[['Entrar','login'],['Criar conta','signup']]};
    if(/lembrete|avisar|notifica/.test(q)) return {html:'🔔 Posso acompanhar validades, estoque baixo e itens essenciais neste dispositivo. Você escolhe se deseja permitir as notificações.',actions:[action('Ativar lembretes','enable_reminders',{}),['Revisar despensa','nav_despensa']]};
    if(/(?:adicion|coloc|cadastr|inclu).*(?:despensa)|(?:despensa).*(?:adicion|coloc|cadastr|inclu)/.test(q)){
      let items=parseNamedItems(question); if(!items.length)items=[item('Arroz'),item('Feijão')];
      return {html:`Separei ${items.length} item(ns) para a despensa.${listCard('Itens para a despensa',items)}`,actions:[action('Adicionar à despensa','save_pantry',{items}),['Abrir despensa','nav_despensa']]};
    }
    if(/cria|criar|monta|monte|montar|fazer|sugestao|sugira/.test(q)&&/lista|compras|mercado/.test(q)){
      let key=/churrasco/.test(q)?'churrasco':/mes|mensal/.test(q)?'mes':/econom/.test(q)?'economica':/vegetar|vegana/.test(q)?'vegetariana':/cafe/.test(q)?'cafe':/limpeza|higiene/.test(q)?'limpeza':'semana';
      let items=/\bcom\b|contendo|inclui|adiciona/.test(q)?parseNamedItems(question):templateItems(key); if(items.length<2)items=templateItems(key);
      const name=DB.templates[key]?.name||'Minha Lista'; memory.lastTopic='list'; memory.lastProposal={name,items};
      return {html:`Perfeito! Preparei esta sugestão para você. 😊${listCard(name,items,DB.templates[key]?.note)}`,actions:[action('Salvar esta lista','save_list',{name,items}),action('Adicionar à lista atual','append_list',{items}),['Criar outra versão','suggest_list']]};
    }
    if(/receita|cozinhar|almoco|jantar|lanche|cafe da manha/.test(q)){
      const r=chooseRecipe(question,ctx); memory.lastTopic='recipe'; memory.lastIngredients=r.ingredients.map(x=>x[0]); memory.lastProposal=r;
      return {html:`Tenho uma ideia prática para você: 😋${recipeCard(r)}`,actions:[action('Salvar receita','save_recipe',r),action('Criar lista dos ingredientes','save_list',{name:`Ingredientes — ${r.name}`,items:r.ingredients.map(x=>item(x[0],x[1],x[2]))}),['Outra sugestão','meal_ideas']]};
    }
    if(/planeja|planeje|planejar|planejamento|cardapio|semana.*refeicao|organizacao alimentar/.test(q)){
      const plan=makePlan(question); memory.lastTopic='planner'; memory.lastProposal=plan;
      return {html:`Montei uma base semanal variada. Você poderá editar tudo no painel.${plannerCard(plan)}`,actions:[action('Salvar no planejador','save_planner',plan),action('Gerar lista da semana','planner_list',plan),['Abrir planejador','nav_planejador']]};
    }
    if(/substitu|trocar ingrediente|nao tenho/.test(q)){
      const key=Object.keys(DB.substitutions).find(k=>q.includes(k)); const opts=key?DB.substitutions[key]:[];
      return {html:opts.length?`🔄 Para <strong>${esc(key)}</strong>, algumas alternativas culinárias possíveis são: ${opts.map(esc).join(' ou ')}. A melhor escolha depende da função na receita.`:'Diga qual ingrediente você quer substituir e, se puder, qual receita está preparando. Assim verifico a função dele no preparo.',actions:[['Sugerir receita','meal_ideas']]};
    }
    if(/guardar|armazenar|conservar|geladeira|freezer/.test(q)){
      const key=Object.keys(DB.storage).find(k=>q.includes(k)); return {html:`🧊 ${esc(key?DB.storage[key]:DB.knowledge.safety)}<br><small>Sempre confira também as instruções da embalagem.</small>`,actions:[['Ver validades','nav_despensa']]};
    }
    if(/nutri|saude|diabetes|colesterol|figado|pressao|doenca|dieta|emagrecer|medicina|alerg/.test(q)) return {html:`🥗 ${esc(DB.knowledge.nutrition)}<br><br>⚕️ ${esc(DB.knowledge.health)}`,actions:[['Montar organização geral','build_planner'],['Ver minhas refeições','nav_planejador']]};
    if(/econom|barato|preco|gasto|orcamento|supermercado|promocao/.test(q)) return {html:`💰 ${esc(DB.knowledge.economy)}<br><br>Posso montar uma lista econômica ou analisar seus dados registrados.`,actions:[['Montar lista econômica','list_economica'],['Abrir análises','nav_analises']]};
    if(/agricultura|plantio|safra|estacao|sazon/.test(q)) return {html:`🌱 ${esc(DB.knowledge.agriculture)} Escolher produtos sazonais costuma ampliar variedade e pode melhorar o custo-benefício.`,actions:[['Montar lista da semana','suggest_list']]};
    if(/despensa/.test(q)) return {html:'📦 Posso consultar estoque baixo, validades, sugerir reposição, aproveitar ingredientes em receitas ou cadastrar itens. O que deseja fazer?',actions:[['O que está faltando?','check_low_stock'],['Ver validades','check_expiry'],['Receita com a despensa','meal_ideas'],['Abrir despensa','nav_despensa']]};
    if(/como funciona|o que voce faz|ajuda|recursos/.test(q)) return {html:'Eu ajudo você a transformar uma conversa em organização prática. 😊 Posso montar e salvar listas, sugerir e cadastrar receitas, organizar a semana, consultar sua despensa, apontar validades e estoque baixo, criar lembretes e mostrar análises.',actions:[['🛒 Criar lista','suggest_list'],['🍳 Sugerir receita','meal_ideas'],['📅 Montar semana','build_planner'],['📊 Ver resumo','show_summary']]};
    return {html:'Quero entender direitinho. Você deseja <strong>criar algo</strong>, <strong>consultar seus dados</strong> ou receber uma <strong>sugestão</strong>? Pode falar naturalmente ou usar o microfone. 🎙️',actions:[['Criar lista','suggest_list'],['Sugerir receita','meal_ideas'],['Planejar semana','build_planner'],['Consultar despensa','check_low_stock']]};
  }

  function perform(actionCode,app){
    if(!String(actionCode).startsWith('pro:'))return null; const job=pending.get(String(actionCode).slice(4)); if(!job)return {html:'Essa sugestão expirou. Peça para eu montar novamente. 🙂'};
    if(!app?.isLoggedIn && !['enable_reminders'].includes(job.type)) return {html:'Para salvar nos seus dados reais, entre ou crie sua conta. A sugestão continuará disponível nesta conversa.',actions:[['Entrar','login'],['Criar conta','signup']]};
    const save=()=>{app.saveState?.();app.updateLandingKitchenSummary?.();};
    if(job.type==='save_list'){
      const listId=id('lista'); app.state.listas[listId]={nome:job.payload.name,items:job.payload.items.map(x=>({...x,id:app.generateId()}))}; app.activeListId=listId;save();app.renderListaWidget?.();if(app.activeModule==='lista')app.renderListas?.();
      return {html:`✅ Lista <strong>${esc(job.payload.name)}</strong> salva com ${job.payload.items.length} itens.`,actions:[['Abrir Listas','nav_lista'],['Ver análises','nav_analises']]};
    }
    if(job.type==='append_list'){
      const target=app.state.listas[app.activeListId]||Object.values(app.state.listas)[0]; if(!target)return {html:'Crie uma lista primeiro para adicionar os itens.'};
      job.payload.items.forEach(x=>target.items.push({...x,id:app.generateId()}));save();app.renderListaWidget?.();if(app.activeModule==='lista')app.renderListas?.(); return {html:`✅ Adicionei ${job.payload.items.length} itens à lista atual.`,actions:[['Abrir lista','nav_lista']]};
    }
    if(job.type==='save_recipe'){
      const r=job.payload,rid=app.generateId();app.state.receitas[rid]={id:rid,name:r.name,desc:'Sugestão criada pelo Assistente Alimente Fácil.',ingredients:r.ingredients.map(x=>({name:x[0],qty:x[1],unit:x[2]})),content:`<h4>Ingredientes</h4><ul>${r.ingredients.map(x=>`<li>${esc(x[1])} ${esc(x[2])} ${esc(x[0])}</li>`).join('')}</ul><h4>Preparo</h4><p>${esc(r.prep)}</p>`};save();if(app.activeModule==='receitas')app.renderReceitas?.();return {html:`✅ Receita <strong>${esc(r.name)}</strong> salva no seu catálogo.`,actions:[['Abrir Receitas','nav_receitas']]};
    }
    if(job.type==='save_pantry'){
      app.state.despensa=Array.isArray(app.state.despensa)?app.state.despensa:[];
      job.payload.items.forEach(x=>app.state.despensa.push({id:app.generateId(),name:x.name,qtd:x.qtd||1,unid:x.unid||'un',stock:100,validade:''}));
      save();app.renderDespensaWidget?.();if(app.activeModule==='despensa')app.renderDespensa?.();
      return {html:`✅ Adicionei ${job.payload.items.length} item(ns) à sua despensa. Você pode completar quantidade e validade no painel.`,actions:[['Abrir Despensa','nav_despensa']]};
    }
    if(job.type==='save_planner'){
      const dayKeys=['seg','ter','qua','qui','sex','sab','dom'];Object.values(job.payload).forEach((r,i)=>{let rid=Object.keys(app.state.receitas||{}).find(key=>norm(app.state.receitas[key]?.name)===norm(r.name));if(!rid){rid=app.generateId();app.state.receitas[rid]={id:rid,name:r.name,desc:'Receita do planejamento criado pelo Assistente.',ingredients:r.ingredients.map(x=>({name:x[0],qty:x[1],unit:x[2]})),content:`<h4>Ingredientes</h4><ul>${r.ingredients.map(x=>`<li>${esc(x[1])} ${esc(x[2])} ${esc(x[0])}</li>`).join('')}</ul><h4>Preparo</h4><p>${esc(r.prep)}</p>`}}app.state.planejador[dayKeys[i]]={...(app.state.planejador[dayKeys[i]]||{}),jantar:{name:r.name,id:rid,recipeId:rid,completed:false}}});save();app.renderPlannerWidget?.();if(app.activeModule==='planejador')app.renderPlanejador?.();return {html:'✅ Planejamento e receitas salvos. Coloquei uma sugestão no jantar de cada dia; você pode editar horários e refeições no painel.',actions:[['Abrir Planejador','nav_planejador']]};
    }
    if(job.type==='planner_list'){
      const names=new Map();Object.values(job.payload).forEach(r=>r.ingredients.forEach(x=>{const k=norm(x[0]);if(!names.has(k))names.set(k,item(x[0],x[1],x[2]))}));const items=[...names.values()],listId=id('lista');app.state.listas[listId]={nome:'Lista do Planejamento',items:items.map(x=>({...x,id:app.generateId()}))};app.activeListId=listId;save();return {html:`✅ Criei a lista do planejamento com ${items.length} ingredientes sem duplicações.`,actions:[['Abrir Listas','nav_lista']]};
    }
    if(job.type==='enable_reminders'){
      localStorage.setItem('afAssistantReminders','enabled'); if('Notification'in window&&Notification.permission==='default')Notification.requestPermission().catch(()=>{});return {html:'🔔 Lembretes ativados neste dispositivo. Vou observar validades próximas, itens vencidos e estoque baixo quando você usar o Alimente Fácil.'};
    }
    return null;
  }

  function initReminders(){
    if(localStorage.getItem('afAssistantReminders')!=='enabled')return; const app=window.app;if(!app?.isLoggedIn)return;
    const today=new Date().toISOString().slice(0,10),soon=new Date(Date.now()+3*864e5).toISOString().slice(0,10),due=(app.state?.despensa||[]).filter(x=>x.validade&&x.validade<=soon),low=(app.state?.despensa||[]).filter(x=>Number(x.stock||100)<=25);
    const signature=`${today}:${due.length}:${low.length}`;if(localStorage.getItem('afReminderSignature')===signature)return;localStorage.setItem('afReminderSignature',signature);
    if(due.length||low.length){const msg=`${due.length?`${due.length} item(ns) perto da validade. `:''}${low.length?`${low.length} com estoque baixo.`:''}`;app.showNotification?.(`🔔 ${msg}`,'info');if(Notification.permission==='granted')new Notification('Alimente Fácil',{body:msg,icon:'/icons/icon-192x192.png'});}
  }
  window.AF_ASSISTANT_ENGINE={resolve,perform,normalize:norm,database:DB,memory};
  window.addEventListener('load',()=>setTimeout(initReminders,1800));
})();
