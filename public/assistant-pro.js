(function(){
  'use strict';
  const legacyEngine=window.AF_ASSISTANT_ENGINE;
  const DB=window.AF_AI_DATABASE||{};
  const pending=new Map();
  const memory={turns:[],lastTopic:'',lastList:null,lastRecipe:null,lastPlan:null,awaiting:'',preferences:{people:2,days:7,diet:'omnivore',health:[]}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const norm=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s,.;$-]/g,' ').replace(/\s+/g,' ').trim();
  const makeId=prefix=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const register=(label,type,payload={})=>{const key=makeId('act');pending.set(key,{type,payload});return [label,`pro:${key}`]};
  const item=(name,qtd=1,unid='un',category='Outros')=>({name:String(name).trim(),qtd:Number(qtd)||1,unid,category,valor:0,checked:false});
  const brl=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

  function findCatalog(name){
    const key=norm(name),synonym=DB.synonyms?.[key]||Object.entries(DB.synonyms||{}).find(([alias])=>norm(alias)===key)?.[1];
    return (DB.catalog||[]).find(entry=>norm(entry.name)===norm(synonym||name))||(DB.catalog||[]).find(entry=>norm(entry.name).includes(key)||key.includes(norm(entry.name)));
  }
  function numberFrom(q,pattern,fallback){const match=q.match(pattern);return match?Math.max(1,Number(match[1])||fallback):fallback}
  function readPreferences(raw){
    const q=norm(raw);
    const adults=q.match(/(\d+)\s*adultos?/),children=q.match(/(\d+)\s*criancas?/),family=q.match(/familia\s*(?:de|com)?\s*(\d+)/);
    if(adults&&children)memory.preferences.people=Number(adults[1])+Number(children[1]);
    else if(family)memory.preferences.people=Number(family[1]);
    else if(/sozinh[oa]|so para mim/.test(q))memory.preferences.people=1;
    else if(/casal/.test(q))memory.preferences.people=2;
    else memory.preferences.people=numberFrom(q,/(\d+)\s*(?:pessoas?|adultos?|moradores?)/,memory.preferences.people||2);
    memory.preferences.days=numberFrom(q,/(\d+)\s*dias?/,/mes|mensal/.test(q)?30:/quinzena|quinzenal/.test(q)?15:/semana|semanal/.test(q)?7:memory.preferences.days||7);
    const budget=q.match(/(?:r\$|reais|orcamento(?: de)?|ate|tenho)\s*(\d+(?:[.,]\d+)?)/)||q.match(/(\d+(?:[.,]\d+)?)\s*reais/);
    if(budget)memory.preferences.budget=Number(String(budget[1]).replace(',','.'));
    if(/\bvegano?s?\b|sem nada animal|sem produtos? de origem animal/.test(q))memory.preferences.diet='vegan';
    else if(/\bpescetarian|\bpescatarian/.test(q))memory.preferences.diet='pescatarian';
    else if(/\bvegetarian|sem carne/.test(q))memory.preferences.diet='vegetarian';
    else if(/\bonivor|como de tudo|come de tudo|alimentacao comum/.test(q))memory.preferences.diet='omnivore';
    memory.preferences.vegetarian=memory.preferences.diet==='vegetarian';
    memory.preferences.vegan=memory.preferences.diet==='vegan';
    const health=new Set(memory.preferences.health||[]);
    if(/intoleran.*lactose|sem lactose|nao (?:posso|consigo) (?:tomar|consumir).*leite/.test(q))health.add('lactoseFree');
    if(/celiac|sem gluten|intoleran.*gluten/.test(q))health.add('glutenFree');
    if(/diabet|glicemi|controle de acucar|sem acucar/.test(q))health.add('lowSugar');
    if(/hipertens|pressao alta|pouco sodio|sem sodio/.test(q))health.add('lowSodium');
    if(/colesterol|triglicer|cardiovascular|coracao/.test(q))health.add('heartFriendly');
    if(/figado|esteatose|gordura no figado/.test(q))health.add('liverFriendly');
    if(/alerg.*(?:amendoim|castanha|nozes|oleaginos)|sem (?:amendoim|castanha|nozes|oleaginos)/.test(q))health.add('nutFree');
    memory.preferences.health=[...health];
    return memory.preferences;
  }
  function includesFoodTerm(value,term){
    const source=` ${norm(value)} `,needle=norm(term);return source.includes(` ${needle} `)||source.includes(` ${needle}s `)||(needle.length>4&&source.includes(needle));
  }
  function activeAvoidTerms(prefs){
    const profile=DB.dietProfiles?.[prefs.diet||'omnivore'],terms=[...(profile?.avoid||[])];
    (prefs.health||[]).forEach(key=>terms.push(...(DB.healthProfiles?.[key]?.avoid||[])));
    return [...new Set(terms.map(norm).filter(Boolean))];
  }
  function profileEntry(name,people,days){
    const found=findCatalog(name)||{name,category:'Outros'},spec=purchaseSpec(found,people,days);return item(found.name,spec.qtd,spec.unid,found.category);
  }
  function applyProfiles(items,prefs,people,days,addRecommendations=true){
    const blocked=activeAvoidTerms(prefs);let result=(items||[]).filter(entry=>!blocked.some(term=>includesFoodTerm(entry.name,term)));
    const additions={
      vegan:['Tofu','Proteína de soja','Lentilha','Grão-de-bico','Bebida vegetal'],
      vegetarian:['Ovos','Tofu','Proteína de soja','Lentilha'],
      pescatarian:['Ovos','Filé de tilápia','Sardinha','Tofu']
    }[prefs.diet]||[];
    if(addRecommendations)additions.forEach(name=>result.push(profileEntry(name,people,days)));
    if(addRecommendations&&(prefs.health||[]).includes('lactoseFree'))result.push(profileEntry(prefs.diet==='vegan'?'Bebida vegetal':'Leite sem lactose',people,days));
    if(addRecommendations&&(prefs.health||[]).includes('glutenFree'))['Tapioca','Quinoa'].forEach(name=>result.push(profileEntry(name,people,days)));
    return unique(result).filter(entry=>!blocked.some(term=>includesFoodTerm(entry.name,term)));
  }
  function purchaseSpec(entry,people,days){
    const name=norm(entry.name),scale=Math.max(.5,(people/2)*(days/7));
    if(name.includes('arroz'))return {qtd:Math.max(1,Math.ceil(people*days*.09)),unid:'kg'};
    if(name.includes('feijao'))return {qtd:Math.max(1,Math.ceil(people*days*.055)),unid:'kg'};
    if(/lentilha|grao-de-bico|quinoa|aveia|farinha|tapioca|cuscuz/.test(name))return {qtd:Math.max(1,Math.ceil(scale/2)),unid:'pct'};
    if(/macarrao/.test(name))return {qtd:Math.max(1,Math.ceil(scale/2)),unid:'pct'};
    if(/pao/.test(name))return {qtd:Math.max(1,Math.ceil(scale/2)),unid:'pct'};
    if(name==='alho')return {qtd:Math.max(200,Math.ceil(Math.sqrt(scale))*200),unid:'g'};
    if(name==='cebola')return {qtd:Math.max(1,Math.ceil(scale/2)),unid:'kg'};
    if(name.includes('ovos'))return {qtd:Math.max(1,Math.ceil(scale)),unid:'dz'};
    if(entry.category==='Proteínas')return {qtd:Math.max(.5,Math.round(scale*.6*2)/2),unid:'kg'};
    if(/leite integral|leite semi|leite desnatado|leite sem lactose|bebida vegetal/.test(name))return {qtd:Math.max(1,Math.ceil(people*days/7)),unid:'L'};
    if(/queijo|mucarela|ricota/.test(name))return {qtd:Math.max(200,Math.round(scale*300)),unid:'g'};
    if(/iogurte/.test(name))return {qtd:Math.max(2,Math.ceil(people*2*days/7)),unid:'un'};
    if(entry.category==='Frutas')return {qtd:Math.max(1,Math.ceil(scale/2)),unid:'kg'};
    if(entry.category==='Hortaliças')return /alface|rucula|agriao|couve|espinafre|brocolis|couve-flor/.test(name)?{qtd:Math.max(1,Math.ceil(scale/2)),unid:'un'}:{qtd:Math.max(1,Math.ceil(scale/2)),unid:'kg'};
    return {qtd:Math.max(1,Math.ceil(scale)),unid:'un'};
  }
  function categoryItems(category,count,people,days){
    const practical={
      'Grãos e cereais':['Arroz branco','Feijão carioca','Aveia em flocos','Macarrão espaguete','Farinha de trigo','Cuscuz de milho','Grão-de-bico','Lentilha'],
      'Hortaliças':['Alface','Tomate','Cebola','Alho','Cenoura','Batata','Abobrinha','Brócolis','Couve','Chuchu','Abóbora','Pepino'],
      'Frutas':['Banana prata','Maçã','Laranja','Mamão','Manga','Abacaxi','Abacate','Melancia'],
      'Proteínas':['Ovos','Peito de frango','Carne moída','Filé de tilápia','Sardinha','Tofu','Proteína de soja','Lombo suíno'],
      'Leites e derivados':['Leite integral','Iogurte natural','Queijo Minas','Manteiga','Requeijão'],
      'Temperos':['Sal','Pimenta-do-reino','Páprica doce','Azeite','Vinagre','Molho de tomate','Orégano'],
      'Lanches':['Castanha-do-pará','Amendoim','Pasta de amendoim','Chocolate amargo'],
      'Limpeza':['Detergente','Esponja','Sabão em pó','Desinfetante','Água sanitária','Saco de lixo','Papel-toalha'],
      'Higiene':['Papel higiênico','Sabonete','Creme dental','Shampoo','Desodorante']
    };
    const entries=(practical[category]||[]).map(name=>findCatalog(name)).filter(Boolean).slice(0,count);
    return entries.map(entry=>{const spec=purchaseSpec(entry,people,days);return item(entry.name,spec.qtd,spec.unid,entry.category)});
  }
  function estimateItem(entry){
    const reference=Number(DB.priceBook?.[entry.name]||DB.categoryPrices?.[entry.category]||8),factor=entry.unid==='g'?entry.qtd/1000:entry.qtd,total=Math.max(.5,reference*factor);
    entry.estimatedValue=Math.round(total*100)/100;entry.valor=Math.round((total/Math.max(.001,entry.qtd))*1000)/1000;return entry;
  }
  function parseNumber(value){
    const source=String(value||'').replace(',','.');if(source.includes('/')){const [a,b]=source.split('/').map(Number);return b?Math.round(a/b*100)/100:1}return Number(source)||1;
  }
  function quantityNear(source,start,end,defaultUnit){
    const units='kg|quilo(?:s)?|g|grama(?:s)?|l|litro(?:s)?|ml|pacote(?:s)?|pct|caixa(?:s)?|cx|unidade(?:s)?|un|duzia|dz|lata(?:s)?|garrafa(?:s)?|bandeja(?:s)?|maco(?:s)?';
    const before=source.slice(Math.max(0,start-32),start).match(new RegExp(`(\\d+(?:[.,]\\d+)?(?:/\\d+)?)\\s*(${units})?\\s*(?:de\\s*)?$`));
    const after=source.slice(end,end+44).match(new RegExp(`^\\s*(?:-|:)?\\s*(?:[a-z-]+\\s+){0,3}(\\d+(?:[.,]\\d+)?(?:/\\d+)?)\\s*(${units})?`));
    const match=before||after,unitKey=norm(match?.[2]||defaultUnit||'un');
    return {qtd:match?parseNumber(match[1]):1,unid:DB.units?.[unitKey]||({ml:'ml',pct:'pct',cx:'cx',un:'un',dz:'dz',lata:'lata',latas:'lata',garrafa:'un',garrafas:'un',bandeja:'un',bandejas:'un',maco:'un',macos:'un'}[unitKey])||defaultUnit||'un'};
  }
  function extractKnownIngredients(raw){
    const source=norm(raw),candidates=[];
    (DB.catalog||[]).forEach(entry=>candidates.push({alias:norm(entry.name),entry}));
    Object.entries(DB.synonyms||{}).forEach(([alias,name])=>{const entry=findCatalog(name);if(entry)candidates.push({alias:norm(alias),entry})});
    candidates.sort((a,b)=>b.alias.length-a.alias.length);
    const spans=[],found=[];
    candidates.forEach(candidate=>{
      if(!candidate.alias||candidate.alias.length<3)return;
      let from=0,index=-1;
      while((index=source.indexOf(candidate.alias,from))>=0){
        const end=index+candidate.alias.length,before=source[index-1]||' ',after=source[end]||' ';
        from=end;if(/[a-z0-9]/.test(before)||/[a-z0-9]/.test(after)||spans.some(span=>index<span.end&&end>span.start))continue;
        const spec=quantityNear(source,index,end,candidate.entry.unit);spans.push({start:index,end});found.push({...item(candidate.entry.name,spec.qtd,spec.unid,candidate.entry.category),position:index});break;
      }
    });
    return found.sort((a,b)=>a.position-b.position).map(({position,...entry})=>entry);
  }
  function parseExplicitItems(raw){
    const recognized=extractKnownIngredients(raw);
    let value=String(raw).replace(/\b(?:na|para a|à)\s+(?:minha\s+)?(?:lista|despensa)\b/gi,'');
    value=value.replace(/.*?(?:com|contendo|adicione|adicionar|adiciona|inclua|incluir|inclui|coloque|colocar|cadastre|cadastrar|comprar|anote)\s*:?[\s-]*/i,'');
    const extras=value.split(/\n|,|;|\||\s+e\s+/i).map(part=>part.replace(/^[-•*\d.)\s]+/,'').trim()).filter(part=>part.length>1&&part.length<50&&!/^(?:uma?|minha|lista|compras?|automatic[oa]|para|pessoas?|dias?)$/i.test(part)).filter(part=>!extractKnownIngredients(part).length).slice(0,60).map(part=>{
      const quantity=part.match(/(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*(kg|quilo|quilos|g|gramas?|l|litros?|ml|pacotes?|caixas?|unidades?|duzia|dúzia|latas?)?/i);
      const clean=part.replace(/\b\d+(?:[.,]\d+)?(?:\/\d+)?\s*(?:kg|quilo|quilos|g|gramas?|l|litros?|ml|pacotes?|caixas?|unidades?|duzia|dúzia|latas?)?\b/gi,'').replace(/^de\s+/i,'').trim();
      const found=findCatalog(clean||part),unit=quantity?.[2]?(DB.units?.[norm(quantity[2])]||found?.unit||'un'):(found?.unit||'un');
      return item(found?.name||clean||part,quantity?parseNumber(quantity[1]):1,unit,found?.category||'Outros');
    });
    return unique([...recognized,...extras]);
  }
  function unique(items){const seen=new Set();return items.filter(entry=>{const key=norm(entry.name);if(!key||seen.has(key))return false;seen.add(key);return true})}
  function refreshProposal(proposal){proposal.items=unique(proposal.items||[]).map(estimateItem);proposal.estimatedTotal=Math.round(proposal.items.reduce((sum,entry)=>sum+entry.estimatedValue,0)*100)/100;proposal.priceNotice=proposal.priceNotice||DB.priceNotice;return proposal}
  function buildList(raw){
    const q=norm(raw),prefs=readPreferences(raw),people=prefs.people||2,days=prefs.days||7;
    let name='Lista da Semana',items=[];
    const recognized=extractKnownIngredients(raw),parsedInput=parseExplicitItems(raw),automatic=/lista automatica|lista completa|sugestao de lista|nao sei o que comprar/.test(q),explicitCue=/(?:lista|compras?)\s*(?:de compras)?\s*(?:com|contendo|:)|(?:comprar|anote|adicione|inclua|coloque)\b/.test(q);
    const hasExplicit=!automatic&&parsedInput.length>0&&(explicitCue||recognized.length>=2||(recognized.length>=1&&parsedInput.length>=2));
    if(hasExplicit){items=parsedInput;name='Minha Lista de Ingredientes'}
    else if(/churrasco/.test(q)){
      name=`Churrasco para ${people} pessoas`;items='Carne bovina|Linguiça|Coxa de frango|Pão de alho|Farofa|Tomate|Cebola|Pimentão verde|Carvão|Sal|Água mineral|Refrigerante|Gelo'.split('|').map(value=>{const found=findCatalog(value)||{name:value,category:'Outros'},spec=purchaseSpec(found,people,1);return item(value,spec.qtd,spec.unid,found.category)});
    }else if(/limpeza|higiene/.test(q)){
      name='Limpeza e Higiene';items=[...categoryItems('Limpeza',12,people,days),...categoryItems('Higiene',10,people,days)];
    }else{
      const economy=/econom|barat|orcamento/.test(q);name=economy?'Lista Econômica':days>=25?'Compra do Mês':'Lista da Semana';
      const counts=economy?{'Grãos e cereais':5,'Hortaliças':8,'Frutas':5,'Proteínas':5,'Leites e derivados':3,'Temperos':4}:{'Grãos e cereais':5,'Hortaliças':8,'Frutas':5,'Proteínas':5,'Leites e derivados':3,'Temperos':4,'Lanches':2,'Limpeza':3,'Higiene':3};
      Object.entries(counts).forEach(([category,count])=>items.push(...categoryItems(category,count,people,days)));
    }
    items=applyProfiles(items,prefs,people,days,!hasExplicit).map(estimateItem);
    if(prefs.budget){
      const order=['Grãos e cereais','Proteínas','Hortaliças','Frutas','Leites e derivados','Temperos','Lanches','Limpeza','Higiene','Outros'],groups=Object.fromEntries(order.map(category=>[category,items.filter(entry=>entry.category===category)])),selected=[];let running=0;
      const rounds=Math.max(...order.map(category=>groups[category].length),0);for(let round=0;round<rounds;round++){for(const category of order){const entry=groups[category][round];if(!entry)continue;if(selected.length>=6&&running+entry.estimatedValue>prefs.budget*1.03)continue;selected.push(entry);running+=entry.estimatedValue}}items=selected;
    }
    const estimatedTotal=Math.round(items.reduce((sum,entry)=>sum+entry.estimatedValue,0)*100)/100;
    const dietProfile=DB.dietProfiles?.[prefs.diet||'omnivore'],healthProfiles=(prefs.health||[]).map(key=>DB.healthProfiles?.[key]).filter(Boolean);
    name=`${name} • ${people} pessoa(s), ${days} dias`;const proposal={name,items,people,days,budget:prefs.budget||null,estimatedTotal,priceNotice:DB.priceNotice,diet:prefs.diet||'omnivore',profileLabel:dietProfile?.label||'Onívoro',profileEmoji:dietProfile?.emoji||'🍽️',healthLabels:healthProfiles.map(profile=>`${profile.emoji} ${profile.label}`),healthNotice:healthProfiles.length?`${DB.medicalNutrition?.boundaries||''} ${healthProfiles[0].note||''}`.trim():'',sourceMode:hasExplicit?'ingredients':'automatic',createdAt:new Date().toISOString()};memory.lastTopic='list';memory.lastList=proposal;
    try{sessionStorage.setItem('afAssistantDraftList',JSON.stringify(proposal))}catch(error){}
    return proposal;
  }
  function listCard(proposal,loggedIn){
    const visible=loggedIn?proposal.items:proposal.items.slice(0,5),hiddenCount=Math.max(0,proposal.items.length-visible.length);
    return `<section class="af-ai-result-card af-ai-list-card ${loggedIn?'':'is-guest'}"><header><span>🛒</span><div><strong>${esc(proposal.name)}</strong><small>${proposal.items.length} itens • estimativa ${brl(proposal.estimatedTotal)}</small></div></header><div class="af-ai-profile-strip"><span>${esc(proposal.profileEmoji||'🍽️')} ${esc(proposal.profileLabel||'Onívoro')}</span>${(proposal.healthLabels||[]).map(label=>`<span>${esc(label)}</span>`).join('')}</div>${proposal.healthNotice?`<div class="af-ai-health-note">🩺 ${esc(proposal.healthNotice)}</div>`:''}${proposal.budget?`<div class="af-ai-budget-line"><span>Orçamento informado</span><b>${brl(proposal.budget)}</b></div>`:''}<ul>${visible.map(entry=>`<li><span>${esc(entry.name)}</span><b>${esc(entry.qtd)} ${esc(entry.unid)} <em>~${brl(entry.estimatedValue)}</em></b></li>`).join('')}${!loggedIn&&hiddenCount?Array.from({length:Math.min(5,hiddenCount)},(_,index)=>`<li class="af-ai-locked-row"><span>${esc(proposal.items[index+5]?.name||'Item reservado')}</span><b>•••</b></li>`).join(''):''}</ul><small class="af-ai-price-note">${esc(proposal.priceNotice||'Valores aproximados e editáveis.')}</small>${!loggedIn?`<div class="af-ai-guest-gate"><i class="fa-solid fa-lock"></i><strong>Sua lista completa está pronta</strong><span>Crie sua conta grátis para liberar os outros ${hiddenCount} itens e enviar tudo ao painel.</span></div>`:''}</section>`;
  }
  function listActions(proposal,loggedIn){const type=loggedIn?'':'auth_';return [register('🛒 Enviar ao painel',`${type}save_list`,proposal),register('📦 Enviar à despensa',`${type}send_pantry`,proposal),register('🖨️ Imprimir',`${type}print_list`,proposal),register('📄 Baixar PDF',`${type}pdf_list`,proposal),['✏️ Personalizar','customize_list']]}
  function recipeScore(recipe,q,pantry){
    const stop=new Set(['quero','uma','receita','fazer','como','para','com','sem','hoje','facil','rapida','de','do','da']),tokens=q.split(' ').filter(token=>token.length>2&&!stop.has(token)),name=norm(recipe.name),tags=norm(recipe.tags);
    const titleHits=tokens.filter(token=>name.includes(token)).length*8,tagHits=tokens.filter(token=>tags.includes(token)).length*5,ingredientHits=recipe.ingredients.filter(ing=>q.includes(norm(ing[0]))||pantry.some(pantryName=>pantryName.includes(norm(ing[0]))||norm(ing[0]).includes(pantryName))).length*3;
    const genericPenalty=name==='arroz com feijao e legumes'&&!/arroz|feijao/.test(q)?-7:0;
    return titleHits+tagHits+ingredientHits+(q.includes(name)?25:0)+genericPenalty;
  }
  function recipeAllowed(recipe,prefs){
    const haystack=[recipe.name,...recipe.ingredients.map(ingredient=>ingredient[0])].join(' | '),blocked=activeAvoidTerms(prefs);
    return !blocked.some(term=>includesFoodTerm(haystack,term));
  }
  function recipeIngredientSpec(entry){
    if(entry.category==='Proteínas')return [entry.name,400,'g'];
    if(entry.category==='Grãos e cereais')return [entry.name,1,'xícara'];
    if(entry.category==='Leites e derivados')return [entry.name,1,'xícara'];
    if(entry.category==='Temperos')return [entry.name,'a gosto',''];
    if(entry.category==='Frutas')return [entry.name,2,'un'];
    if(entry.unit==='kg')return [entry.name,300,'g'];
    return [entry.name,1,'un'];
  }
  function composeRecipe(raw,ctx,prefs){
    const q=norm(raw),blocked=activeAvoidTerms(prefs),fromPrompt=/(?:com|tenho|usando|ingredientes)/.test(q)?parseExplicitItems(raw):extractKnownIngredients(raw),fromPantry=(ctx.state?.despensa||[]).map(entry=>findCatalog(entry.name)||{name:entry.name,category:'Outros',unit:entry.unid||'un'});
    let selected=fromPrompt.map(entry=>findCatalog(entry.name)||entry);
    if((/despensa|o que tenho|tenho em casa|geladeira/.test(q)||!selected.length)&&fromPantry.length)selected.push(...fromPantry);
    selected=unique(selected).filter(entry=>!blocked.some(term=>includesFoodTerm(entry.name,term))).slice(0,8);
    if(!selected.length)return null;
    const techniques=DB.coziaBrain?.techniques||[],technique=techniques.find(method=>method.words.some(word=>q.includes(norm(word))))||techniques.find(method=>method.key==='refogado')||{key:'preparo',verb:'Cozinhe os ingredientes até ficarem no ponto desejado.'};
    const flavors=DB.coziaBrain?.flavorProfiles||[],flavor=flavors.find(profile=>profile.words.some(word=>q.includes(norm(word))))||flavors[0];
    (flavor?.seasonings||[]).forEach(name=>{const entry=findCatalog(name);if(entry&&!selected.some(item=>norm(item.name)===norm(entry.name))&&!blocked.some(term=>includesFoodTerm(entry.name,term))&&selected.length<10)selected.push(entry)});
    const primary=selected[0]?.name||'ingredientes',secondary=selected[1]?.name;
    const titles={assado:'Assado',airfryer:'Preparo na airfryer',grelhado:'Grelhado',refogado:'Refogado',cozido:'Cozido caseiro',pressao:'Cozido na pressão',sopa:'Sopa',salada:'Salada',massa:'Massa',omelete:'Omelete',ensopado:'Ensopado',rapido:'Preparo rápido'};
    const recipe={name:`${titles[technique.key]||'Receita'} de ${primary}${secondary?` com ${secondary}`:''}`,tags:`cozia personalizada ${technique.key} ${flavor?.name||''} ${prefs.diet||'omnivore'}`,ingredients:selected.map(recipeIngredientSpec),prep:`Separe, higienize e corte os ingredientes. ${technique.verb} Tempere aos poucos, prove e ajuste no final. Se algum alimento exigir cocção completa, confirme o ponto seguro antes de servir.`,generated:true,sourceIngredients:fromPrompt.map(entry=>entry.name)};
    return recipeAllowed(recipe,prefs)?recipe:null;
  }
  function chooseRecipe(raw,ctx){
    const q=norm(raw),prefs=readPreferences(raw),pantry=(ctx.state?.despensa||[]).map(entry=>norm(entry.name)),complete=[...(DB.recipeBases||[])],allowed=complete.filter(recipe=>recipeAllowed(recipe,prefs)),all=allowed.length?allowed:complete,mentioned=/(?:com|tenho|usando|ingredientes)/.test(q)?parseExplicitItems(raw):extractKnownIngredients(raw);
    const exact=all.find(recipe=>q.includes(norm(recipe.name)));
    const composed=(!exact&&mentioned.length>=2)||(/despensa|o que tenho|tenho em casa|geladeira/.test(q)&&pantry.length)?composeRecipe(raw,ctx,prefs):null;
    if(composed){memory.lastRecipe=composed;memory.lastTopic='recipe';return composed}
    const families=['bolo','sobremesa','doce','sopa','caldo','salada','massa','macarrao','lasanha','risoto','pao','lanche','cafe','vegetariana','vegana','frango','carne','peixe','camarao'];
    const family=families.find(value=>q.includes(value));let pool=family?all.filter(recipe=>`${norm(recipe.name)} ${norm(recipe.tags)}`.includes(family)):all;if(!pool.length)pool=all;
    const ranked=pool.map(recipe=>({recipe,score:recipeScore(recipe,q,pantry)})).sort((a,b)=>b.score-a.score);let candidates=exact?[exact]:ranked.filter(entry=>entry.score===ranked[0]?.score).map(entry=>entry.recipe);
    if(/outra|diferente|mais uma/.test(q)&&memory.lastRecipe)candidates=candidates.filter(recipe=>recipe.name!==memory.lastRecipe.name);
    const recipe=candidates[memory.turns.length%Math.max(1,candidates.length)]||ranked[0]?.recipe||all[0];memory.lastRecipe=recipe;memory.lastTopic='recipe';return recipe;
  }
  function recipeCard(recipe){return `<section class="af-ai-result-card"><header><span>🍳</span><div><strong>${esc(recipe.name)}</strong><small>${recipe.generated?'✨ Combinação criada para seu pedido • ':''}${recipe.ingredients.length} ingredientes</small></div></header><h5>🥕 Ingredientes</h5><ul>${recipe.ingredients.map(ing=>`<li><span>${esc(ing[0])}</span><b>${esc(ing[1])} ${esc(ing[2])}</b></li>`).join('')}</ul><h5>👩‍🍳 Preparo</h5><p>${esc(recipe.prep)}</p></section>`}
  function buildPlan(){const complete=DB.recipeBases||[],filtered=complete.filter(recipe=>recipeAllowed(recipe,memory.preferences)),recipes=filtered.length?filtered:complete,days=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'],offset=Math.floor(Math.random()*Math.max(1,recipes.length-7)),plan={};days.forEach((day,index)=>plan[day]=recipes[(offset+index)%recipes.length]);memory.lastPlan=plan;memory.lastTopic='planner';return plan}
  function plannerCard(plan){return `<section class="af-ai-result-card"><header><span>📅</span><div><strong>Semana organizada</strong><small>7 refeições editáveis</small></div></header><ul>${Object.entries(plan).map(([day,recipe])=>`<li><span>${esc(day)}</span><b>${esc(recipe.name)}</b></li>`).join('')}</ul></section>`}
  function chartCard(ctx){const values=[Object.keys(ctx.state?.listas||{}).length,(ctx.state?.despensa||[]).length,Object.keys(ctx.state?.receitas||{}).length,Object.keys(ctx.state?.planejador||{}).length],max=Math.max(1,...values),labels=['Listas','Despensa','Receitas','Dias planejados'];return `<section class="af-ai-result-card"><header><span>📊</span><div><strong>Resumo da sua cozinha</strong><small>Dados atuais do painel</small></div></header><div class="af-ai-mini-chart">${labels.map((label,index)=>`<div><span>${label}</span><i><b style="width:${Math.max(4,values[index]/max*100)}%"></b></i><strong>${values[index]}</strong></div>`).join('')}</div></section>`}
  function gatedActions(loggedIn,actions){return actions.map(([label,type,payload])=>register(label,loggedIn?type:`auth_${type}`,payload))}
  function moduleAction(module,loggedIn,label){const meta=DB.coziaBrain?.panelModules?.[module]||{label:module,emoji:'➡️'};return register(label||`${meta.emoji} Abrir ${meta.label}`,loggedIn?'nav_module':'auth_nav_module',{module})}
  function panelActions(loggedIn,modules=['inicio','lista','despensa','receitas','planejador','analises']){return modules.map(module=>moduleAction(module,loggedIn))}
  function detectPanelNavigation(q){
    if(!(/\b(?:abrir|abra|acessar|acesse|entrar|ir|leva|leve|mostrar|mostre|ver)\b/.test(q)||/\bquero (?:meu|minha|meus|minhas)\b/.test(q)))return null;
    if(/(?:crie|criar|monte|montar|faca|gerar).*(?:lista|receita|planej)/.test(q)||/receita\s+(?:de|com|para)|lista\s+(?:com|para|automatica)|\b(?:quero|preciso|gostaria)\s+(?:de\s+)?(?:uma\s+)?receita\b/.test(q))return null;
    if(/\bpainel\b|\binicio\b|\bhome\b/.test(q))return 'inicio';
    const modules=DB.coziaBrain?.panelModules||{};
    return Object.entries(modules).find(([module,meta])=>module!=='inicio'&&(meta.keywords||[]).some(word=>q.includes(norm(word))))?.[0]||null;
  }

  function resolve(raw,ctx={}){
    const question=String(raw||'').trim(),q=norm(question),loggedIn=!!ctx.loggedIn;memory.turns.push({role:'user',text:question});if(memory.turns.length>18)memory.turns.shift();
    if(!question)return {html:'Oi! 😊 O que vamos organizar?',actions:[['🛒 Montar lista','suggest_list'],['🍳 Criar receita','meal_ideas'],['📦 Abrir despensa','open_pantry'],['📊 Ver painel','open_dashboard']]};
    const awaited=memory.awaiting;memory.awaiting='';const prefs=readPreferences(question),dietProfile=DB.dietProfiles?.[prefs.diet||'omnivore'];
    if(/^(oi|ola|bom dia|boa tarde|boa noite|e ai)\b/.test(q))return {html:'Oi! Eu sou a <strong>CozIA</strong> 💚🍲 Vamos fazer isso juntos. Você pode <strong>digitar os ingredientes</strong>, pedir uma <strong>lista automática</strong>, solicitar uma receita ou abrir qualquer área do painel. Por onde começamos?',actions:[['🛒 Digitar ingredientes','list_with_items'],['✨ Lista automática','suggest_list'],['🍳 Criar receita','meal_ideas'],['🧭 Abrir painel','open_dashboard']]};
    if(/^(?:eu\s+)?(?:sou|sigo|tenho uma alimentacao|minha alimentacao e|prefiro ser)\s+(?:vegano|vegetariano|pescetariano|pescatariano|onivoro)|^(?:vegano|vegetariano|pescetariano|pescatariano|onivoro)$/.test(q)){
      return {html:`Perfeito! ${dietProfile?.emoji||'🍽️'} Vou lembrar que seu perfil é <strong>${esc(dietProfile?.label||'Onívoro')}</strong> e adaptar listas, receitas e planejamentos. ${esc(dietProfile?.note||'')}`,actions:[['🛒 Criar lista para meu perfil','profile_list'],['🍳 Sugerir receita adequada','profile_recipe'],['💰 Economizar no mercado','supermarket_savings']]};
    }
    const personalHealth=/(?:tenho|sou|fui diagnosticad|preciso controlar|meu|minha|para mim|nao posso|intoleran|alerg)/.test(q)&&/(?:lactose|gluten|celiac|diabet|glicemi|hipertens|pressao alta|colesterol|triglicer|figado|esteatose|amendoim|castanha|nozes)/.test(q)&&!/(?:lista|receita|planej|cardapio)/.test(q);
    if(personalHealth){
      const active=(prefs.health||[]).map(key=>DB.healthProfiles?.[key]).filter(Boolean);
      return {html:`Entendi. ${active.map(profile=>profile.emoji).join(' ')||'🩺'} Posso adaptar listas e receitas com cuidado geral para <strong>${active.map(profile=>esc(profile.label)).join(', ')||'seu perfil'}</strong>.<br><br><small>⚕️ ${esc(DB.medicalNutrition?.boundaries||'Minhas sugestões não substituem avaliação médica ou nutricional.')}</small>`,actions:[['🛒 Montar lista adaptada','profile_list'],['🍳 Ver receita adaptada','profile_recipe']]};
    }
    const requestedModule=detectPanelNavigation(q);
    if(requestedModule){const meta=DB.coziaBrain?.panelModules?.[requestedModule]||{label:'painel',emoji:'🧭'};return {html:`${meta.emoji} Certo! Vou levar você diretamente para <strong>${esc(meta.label)}</strong>.`,actions:[moduleAction(requestedModule,loggedIn,`${meta.emoji} Abrir agora`)]}}
    if(memory.lastList&&/personalizar|ajustar.*lista/.test(q))return {html:'Vamos deixar do seu jeito. 😊 Diga, por exemplo: <strong>“4 pessoas, 15 dias e orçamento de R$ 500”</strong>. Você também pode pedir “sem carne”, “retire leite” ou “adicione café”.',actions:[['Mais econômica','list_economica'],['Compra da semana','suggest_list']]};
    if(memory.lastList&&/(?:\d+\s*(?:pessoas?|adultos?|criancas?|dias?)|orcamento|r\$|reais|casal|sozinh|quinzena)/.test(q)&&!/receita|despensa/.test(q)){
      const prior=/econom/.test(norm(memory.lastList.name))?' econômica ':'';const proposal=buildList(`monte uma lista${prior}${question}`);return {html:`Recalculei quantidades e valores com as novas informações. ✅${listCard(proposal,loggedIn)}`,actions:listActions(proposal,loggedIn)};
    }
    if(memory.lastList&&/(?:tire|retire|remova|remove|sem)\s+/.test(q)){
      const target=q.replace(/.*?(?:tire|retire|remova|remove|sem)\s+/,'').split(/,|;|\be\b/)[0].trim();memory.lastList.items=memory.lastList.items.filter(entry=>!norm(entry.name).includes(target));refreshProposal(memory.lastList);
      return {html:`Pronto, retirei <strong>${esc(target)}</strong>. A lista ficou com ${memory.lastList.items.length} itens.${listCard(memory.lastList,loggedIn)}`,actions:listActions(memory.lastList,loggedIn)};
    }
    if(memory.lastList&&/(?:adicione|inclua|coloque)\s+/.test(q)&&!/despensa|nova lista|crie.*lista|monte.*lista/.test(q)){
      const additions=parseExplicitItems(question);memory.lastList.items=unique([...memory.lastList.items,...additions]);refreshProposal(memory.lastList);return {html:`Adicionei ${additions.length} item(ns). Veja como ficou:${listCard(memory.lastList,loggedIn)}`,actions:listActions(memory.lastList,loggedIn)};
    }
    if(/(?:adicione|coloque|cadastre|inclua).*(?:despensa)|(?:despensa).*(?:adicione|coloque|cadastre|inclua)/.test(q)){
      const items=parseExplicitItems(question),proposal=refreshProposal({name:'Itens para a despensa',items:items.length?items:[item('Arroz'),item('Feijão carioca')],people:1,days:1});return {html:`📦 Separei ${proposal.items.length} item(ns) para sua despensa.${listCard(proposal,loggedIn)}`,actions:[register('📦 Confirmar na despensa',loggedIn?'send_pantry':'auth_send_pantry',proposal)]};
    }
    if(memory.lastRecipe&&/(?:lista).*(?:ingredientes)|(?:ingredientes).*(?:lista)/.test(q)){
      const proposal=recipeProposal(memory.lastRecipe);memory.lastList=proposal;return {html:`🛒 Transformei os ingredientes de <strong>${esc(memory.lastRecipe.name)}</strong> em uma lista.${listCard(proposal,loggedIn)}`,actions:listActions(proposal,loggedIn)};
    }
    const mentionedIngredients=extractKnownIngredients(question),ingredientParts=question.split(/\n|,|;|\||\s+e\s+/i).map(value=>value.trim()).filter(Boolean),terseIngredientSequence=!question.includes('?')&&mentionedIngredients.length>=1&&ingredientParts.length>=2,recipeIntent=awaited==='recipe_items'||/receita|cozinhar|o que fazer|como preparar|almoco|jantar|lanche|cafe da manha|bolo|sobremesa|doce|sopa|caldo|salada|massa|macarrao|lasanha|risoto|moqueca|pao/.test(q);
    const listIntent=awaited==='list_items'||(!recipeIntent&&((/(?:lista|compras|mercado|churrasco)/.test(q)&&/(?:quero|cria|crie|criar|monta|monte|montar|faca|fazer|sugest|preciso|econom|barat|mensal|semana|churrasco|limpeza|automatic|adicione|inclua)/.test(q))||mentionedIngredients.length>=2||terseIngredientSequence));
    if(listIntent){
      const proposal=buildList(awaited==='list_items'?`crie uma lista com ${question}`:question),mode=proposal.sourceMode==='ingredients'?'os ingredientes que você informou':'uma sugestão automática';return {html:`🛒 Perfeito! Organizei ${mode}. Você pode acrescentar, retirar ou mudar quantidades. ✨${listCard(proposal,loggedIn)}`,actions:listActions(proposal,loggedIn)};
    }
    if(memory.lastList&&/(?:imprimir|imprima)/.test(q))return {html:'Sua lista está pronta para impressão.',actions:[register('Imprimir agora',loggedIn?'print_list':'auth_print_list',memory.lastList)]};
    if(memory.lastList&&/(?:pdf|baixar|download)/.test(q))return {html:'Preparei a versão em PDF da sua lista.',actions:[register('Baixar PDF',loggedIn?'pdf_list':'auth_pdf_list',memory.lastList)]};
    if(memory.lastList&&/(?:mande|envie|passar|jogar).*(?:despensa)/.test(q))return {html:'Posso enviar todos os itens dessa lista para a despensa.',actions:[register('Enviar à despensa',loggedIn?'send_pantry':'auth_send_pantry',memory.lastList)]};
    if(recipeIntent){
      const meaningful=q.split(' ').filter(token=>token.length>2&&!['quero','uma','receita','sugestao','para','hoje','fazer','como','cozinhar'].includes(token));
      if(!meaningful.length)return {html:'Claro! 😋 Para eu acertar no seu gosto, diga o prato desejado ou os ingredientes disponíveis.',actions:[['🥕 Informar ingredientes','recipe_with_items'],['⚡ Algo rápido','recipe_quick'],['🍽️ Almoço ou jantar','recipe_meal'],['🍰 Bolo','recipe_cake'],['🍮 Sobremesa','recipe_dessert']]};
      const recipe=chooseRecipe(awaited==='recipe_items'?`quero uma receita com ${question}`:question,ctx);return {html:`🍳 Entendi o que você quer e combinei a melhor opção para o perfil ${dietProfile?.emoji||'🍽️'} <strong>${esc(dietProfile?.label||'Onívoro')}</strong>. 😋${recipeCard(recipe)}`,actions:gatedActions(loggedIn,[['💾 Salvar receita','save_recipe',recipe],['🛒 Criar lista dos ingredientes','recipe_list',recipe],['📦 Enviar ingredientes à despensa','recipe_pantry',recipe]])};
    }
    if(/planej|cardapio|organiza.*semana|refeicoes.*semana/.test(q)){
      const plan=buildPlan();return {html:`📅 Organizei uma semana completa. Você poderá mudar qualquer refeição no painel.${plannerCard(plan)}`,actions:gatedActions(loggedIn,[['📅 Salvar no planejador','save_planner',plan],['🛒 Criar lista da semana','planner_list',plan]])};
    }
    if(/grafico|analise|resumo.*painel|como esta minha cozinha|o que tenho salvo|meus dados/.test(q))return {html:loggedIn?chartCard(ctx):'<strong>📊 Seus dados personalizados ficam no painel.</strong><br>Entre ou crie sua conta para acompanhar listas, despensa, receitas, gastos, validades e planejamento.',actions:panelActions(loggedIn,['inicio','lista','despensa','receitas','planejador','analises'])};
    if(/faltando|acabando|estoque baixo/.test(q)){
      if(!loggedIn)return {html:'Eu consigo verificar automaticamente o que está acabando assim que sua despensa estiver salva no painel.',actions:[['Criar conta grátis','signup']]};
      const low=(ctx.state?.despensa||[]).filter(entry=>Number(entry.stock??100)<=25);return {html:low.length?`📦 Encontrei ${low.length} item(ns) com estoque baixo: <strong>${low.slice(0,10).map(entry=>esc(entry.name)).join(', ')}</strong>.`:'✅ Nenhum item está marcado com estoque baixo.',actions:low.length?[register('Criar lista de reposição','save_list',{name:'Reposição da Despensa',items:low.map(entry=>item(entry.name,1,entry.unid||'un'))}),['Abrir despensa','nav_despensa']]:[['Abrir despensa','nav_despensa']]};
    }
    if(/venc|validade/.test(q)){
      if(!loggedIn)return {html:'Posso avisar sobre itens próximos da validade depois que você cadastrar sua despensa.',actions:[['Criar conta grátis','signup']]};
      const soon=new Date(Date.now()+7*864e5).toISOString().slice(0,10),due=(ctx.state?.despensa||[]).filter(entry=>entry.validade&&entry.validade<=soon);return {html:due.length?`⏰ ${due.length} item(ns) precisam de atenção: <strong>${due.map(entry=>esc(entry.name)).join(', ')}</strong>.`:'✅ Não encontrei itens vencidos ou próximos da validade.',actions:[['Abrir despensa','nav_despensa']]};
    }
    if(/substitu|trocar ingrediente|nao tenho/.test(q)){
      const key=Object.keys(DB.substitutions||{}).find(name=>q.includes(norm(name))),options=key?DB.substitutions[key]:[];return {html:options.length?`🔄 Para <strong>${esc(key)}</strong>, você pode avaliar: ${options.map(esc).join(' ou ')}. A melhor troca depende da função na receita.`:'Qual ingrediente você quer substituir? Diga também a receita para eu sugerir uma troca mais adequada.',actions:[['Ver uma receita','meal_ideas']]};
    }
    if(/guardar|armazenar|conservar|geladeira|freezer/.test(q)){
      const key=Object.keys(DB.knowledge?.storage||{}).find(name=>q.includes(norm(name))),answer=key?DB.knowledge.storage[key]:DB.knowledge?.safety?.[0];return {html:`🧊 ${esc(answer)} <small>Siga também a embalagem e descarte quando houver dúvida sobre a segurança.</small>`,actions:[['Ver minha despensa','nav_despensa']]};
    }
    if(/nutri|saude|diabetes|colesterol|figado|pressao|doenca|dieta|emagrecer|medicina|alerg/.test(q))return {html:`🥗 ${esc(DB.knowledge?.nutrition?.[0])}<br><br>⚕️ ${esc(DB.medicalNutrition?.boundaries||DB.knowledge?.health)} Posso ajudar com organização alimentar geral e respeitar restrições informadas.`,actions:[['🥗 Informar meu perfil','profile_vegetarian'],['📅 Organizar refeições gerais','build_planner']]};
    if(/econom|preco|gasto|orcamento|promocao|supermercado/.test(q))return {html:`💰 Vamos economizar de verdade: ${esc(DB.supermarketKnowledge?.savings?.[0]||DB.knowledge?.economy?.[0])} ${esc(DB.supermarketKnowledge?.compare?.[0]||'Compare preços equivalentes.')}<br><br>Me diga <strong>quantas pessoas, quantos dias e seu orçamento</strong>. Exemplo: “3 pessoas, 7 dias, até R$ 250”.`,actions:[['🛒 Montar lista econômica','list_economica']]};
    if(/agricultura|plantio|safra|estacao|sazon/.test(q))return {html:`🌱 ${esc(DB.knowledge?.agriculture?.[0])}`,actions:[['Montar lista da semana','suggest_list']]};
    if(/quanto custa|preco do app|teste gratis|cartao/.test(q))return {html:`💚 ${esc(DB.knowledge?.product?.price)} ${esc(DB.knowledge?.product?.trial)}`,actions:[['Começar grátis','signup'],['Conhecer recursos','features']]};
    if(/o que voce faz|como funciona|ajuda|recursos/.test(q))return {html:`Eu sou a <strong>CozIA</strong> 💚🍲 Entendo ingredientes digitados ou falados, monto listas automáticas, combino receitas, respeito perfis alimentares, organizo despensa e planejador, consulto o painel e abro cada módulo diretamente. Minha base local possui <strong>${(DB.catalog||[]).length} ingredientes</strong> e mais de <strong>${Number(DB.coziaBrain?.combinationCapacity||0).toLocaleString('pt-BR')} combinações possíveis</strong>, sem cobrança por mensagem. 🎙️`,actions:[['🛒 Montar lista','suggest_list'],['🍳 Criar receita','meal_ideas'],['🧭 Explorar painel','open_dashboard']]};
    if(/^(sim|pode|quero|confirmo|salva|salvar)$/.test(q)&&memory.lastList)return {html:`Perfeito. Escolha o que deseja fazer com a lista:${listCard(memory.lastList,loggedIn)}`,actions:listActions(memory.lastList,loggedIn)};
    const legacy=legacyEngine?.resolve?.(question,ctx);if(legacy&&legacy.html&&!/não encontrei/i.test(legacy.html))return legacy;
    return {html:'Ainda não consegui identificar exatamente a ação, mas vamos resolver juntos 😊 Você pode digitar <strong>“lista: arroz 2 kg, feijão 1 kg e ovos 1 dúzia”</strong>, pedir <strong>“receita com frango, batata e cenoura”</strong> ou mandar eu abrir uma área do painel.',actions:[['🛒 Digitar ingredientes','list_with_items'],['✨ Lista automática','suggest_list'],['🍳 Criar receita','meal_ideas'],['🧭 Abrir painel','open_dashboard']]};
  }

  function saveState(app){app.saveState?.();app.updateLandingKitchenSummary?.()}
  function addList(app,proposal){const listId=makeId('lista');app.state.listas=app.state.listas||{};app.state.listas[listId]={nome:proposal.name||'Lista da CozIA',createdAt:new Date().toISOString(),items:(proposal.items||[]).map(entry=>({...entry,id:app.generateId()}))};app.activeListId=listId;app.activeModule='lista';saveState(app);app.renderListaWidget?.();app.renderListasSalvas?.();app.renderListaAtiva?.(listId);app.renderListas?.();return listId}
  function addPantry(app,proposal){app.state.despensa=Array.isArray(app.state.despensa)?app.state.despensa:[];(proposal.items||[]).forEach(entry=>app.state.despensa.unshift({id:app.generateId(),name:entry.name,qtd:entry.qtd||1,unid:entry.unid||'un',valor:entry.valor||0,validade:'',stock:100}));app.activeModule='despensa';saveState(app);app.renderDespensaWidget?.();app.renderDespensa?.()}
  function printableHtml(proposal){return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(proposal.name)}</title><style>body{font:15px Arial;color:#17221a;max-width:720px;margin:35px auto;padding:0 20px}h1{font-size:25px}small{color:#657066}li{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ddd}footer{margin-top:28px;font-size:11px;color:#777}.total{margin:18px 0;padding:14px;background:#edf5e9;border-radius:12px;font-weight:bold}@media print{button{display:none}}</style></head><body><h1>Alimente Fácil</h1><h2>${esc(proposal.name)}</h2><small>${proposal.items.length} itens</small><ol>${proposal.items.map(entry=>`<li><span>${esc(entry.name)}</span><b>${esc(entry.qtd)} ${esc(entry.unid)} • ~${brl(entry.estimatedValue)}</b></li>`).join('')}</ol><div class="total">Total aproximado: ${brl(proposal.estimatedTotal)}</div><small>${esc(proposal.priceNotice||DB.priceNotice)}</small><footer>Lista criada no Alimente Fácil</footer><script>setTimeout(()=>window.print(),250)<\/script></body></html>`}
  function printList(proposal){const popup=window.open('','_blank','noopener,noreferrer,width=820,height=700');if(!popup)return false;popup.document.open();popup.document.write(printableHtml(proposal));popup.document.close();return true}
  function ascii(value){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'?')}
  function pdfEscape(value){return ascii(value).replace(/([\\()])/g,'\\$1')}
  function downloadPdf(proposal){
    const lines=['ALIMENTE FACIL',proposal.name,`${proposal.items.length} itens - Total aproximado: ${brl(proposal.estimatedTotal)}`,'',...proposal.items.map((entry,index)=>`${index+1}. ${entry.name} - ${entry.qtd} ${entry.unid} - aprox. ${brl(entry.estimatedValue)}`),'',proposal.priceNotice||DB.priceNotice,'Lista criada no Alimente Facil'];
    const content=lines.slice(0,43).map((line,index)=>`BT /F1 ${index<2?14:10} Tf 48 ${800-index*17} Td (${pdfEscape(line)}) Tj ET`).join('\n');
    const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
    let pdf='%PDF-1.4\n',offsets=[0];for(let index=1;index<objects.length;index++){offsets[index]=pdf.length;pdf+=`${index} 0 obj\n${objects[index]}\nendobj\n`}const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let index=1;index<objects.length;index++)pdf+=`${String(offsets[index]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes=new Uint8Array(pdf.length);for(let index=0;index<pdf.length;index++)bytes[index]=pdf.charCodeAt(index)&255;const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),anchor=document.createElement('a');anchor.href=url;anchor.download=`${norm(proposal.name).replace(/\s+/g,'-')||'lista-alimente-facil'}.pdf`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  function recipeProposal(recipe){return refreshProposal({name:`Ingredientes — ${recipe.name}`,items:recipe.ingredients.map(ing=>item(ing[0],ing[1],ing[2])),people:2,days:1})}
  function planProposal(plan){const collected=[];Object.values(plan).forEach(recipe=>recipe.ingredients.forEach(ing=>collected.push(item(ing[0],ing[1],ing[2]))));return refreshProposal({name:'Lista do Planejamento',items:unique(collected),people:2,days:7})}

  function perform(actionCode,app){
    if(!String(actionCode).startsWith('pro:'))return null;const job=pending.get(String(actionCode).slice(4));if(!job)return {html:'Essa ação expirou. Peça para eu montar novamente. 🙂'};
    if(job.type.startsWith('auth_')){try{localStorage.setItem('afAssistantGuestDraft',JSON.stringify({type:job.type.replace(/^auth_/,''),payload:job.payload,createdAt:new Date().toISOString()}))}catch(error){}return {html:'🔐 Seu pedido ficou guardado. Entre ou crie sua conta e a CozIA continuará automaticamente no lugar certo do painel.',authRequired:true}}
    if(!app?.isLoggedIn)return {html:'Para concluir esta ação e manter seus dados salvos, crie sua conta grátis.',authRequired:true};
    if(job.type==='nav_module')return {html:'✅ Abrindo a área solicitada.',openModule:job.payload?.module||'inicio'};
    if(job.type==='save_list'){const listId=addList(app,job.payload);return {html:`✅ A lista <strong>${esc(job.payload.name)}</strong> foi salva. Vou abrir seu painel agora.`,openModule:'lista',activeListId:listId,persisted:true}}
    if(job.type==='send_pantry'){addPantry(app,job.payload);return {html:`✅ Enviei ${job.payload.items.length} itens para a despensa. Complete as validades quando quiser.`,openModule:'despensa',persisted:true}}
    if(job.type==='print_list')return {html:printList(job.payload)?'🖨️ Abri a versão pronta para imprimir. Você também pode escolher “Salvar como PDF” na janela de impressão.':'Seu navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.'};
    if(job.type==='pdf_list'){downloadPdf(job.payload);return {html:'✅ O PDF da lista foi gerado e o download começou.'}}
    if(job.type==='recipe_list'){const proposal=recipeProposal(job.payload),listId=addList(app,proposal);return {html:'✅ Criei a lista com os ingredientes da receita.',openModule:'lista',activeListId:listId,persisted:true}}
    if(job.type==='recipe_pantry'){const proposal=recipeProposal(job.payload);addPantry(app,proposal);return {html:'✅ Ingredientes enviados à despensa.',openModule:'despensa',persisted:true}}
    if(job.type==='save_recipe'){const recipe=job.payload,rid=app.generateId();app.state.receitas=app.state.receitas||{};app.state.receitas[rid]={id:rid,name:recipe.name,desc:'Criada pela CozIA.',ingredients:recipe.ingredients.map(ing=>({name:ing[0],qty:ing[1],unit:ing[2]})),content:`<h4>Ingredientes</h4><ul>${recipe.ingredients.map(ing=>`<li>${esc(ing[1])} ${esc(ing[2])} ${esc(ing[0])}</li>`).join('')}</ul><h4>Preparo</h4><p>${esc(recipe.prep)}</p>`};app.activeModule='receitas';saveState(app);app.renderReceitas?.();return {html:'✅ Receita salva no seu catálogo.',openModule:'receitas',persisted:true}}
    if(job.type==='planner_list'){const proposal=planProposal(job.payload),listId=addList(app,proposal);return {html:`✅ Lista do planejamento criada com ${proposal.items.length} ingredientes.`,openModule:'lista',activeListId:listId,persisted:true}}
    if(job.type==='save_planner'){
      const dayKeys=['seg','ter','qua','qui','sex','sab','dom'];app.state.planejador=app.state.planejador||{};app.state.receitas=app.state.receitas||{};Object.values(job.payload).forEach((recipe,index)=>{let rid=Object.keys(app.state.receitas).find(key=>norm(app.state.receitas[key]?.name)===norm(recipe.name));if(!rid){rid=app.generateId();app.state.receitas[rid]={id:rid,name:recipe.name,desc:'Receita do planejamento.',ingredients:recipe.ingredients.map(ing=>({name:ing[0],qty:ing[1],unit:ing[2]})),content:`<h4>Ingredientes</h4><ul>${recipe.ingredients.map(ing=>`<li>${esc(ing[1])} ${esc(ing[2])} ${esc(ing[0])}</li>`).join('')}</ul><h4>Preparo</h4><p>${esc(recipe.prep)}</p>`}}app.state.planejador[dayKeys[index]]={...(app.state.planejador[dayKeys[index]]||{}),jantar:{id:rid,recipeId:rid,name:recipe.name,completed:false}}});app.activeModule='planejador';saveState(app);app.renderPlanejador?.();return {html:'✅ Planejamento e receitas foram salvos.',openModule:'planejador',persisted:true}
    }
    return {html:'Ação concluída.'};
  }
  function resumePending(app){
    let draft=null;try{draft=JSON.parse(localStorage.getItem('afAssistantGuestDraft')||'null')}catch(error){}
    if(!draft?.type||!draft?.payload||!app?.isLoggedIn)return null;
    const key=makeId('resume');pending.set(key,draft);const result=perform(`pro:${key}`,app);
    try{localStorage.removeItem('afAssistantGuestDraft')}catch(error){}
    return result;
  }
  window.AF_ASSISTANT_ENGINE={resolve,perform,resumePending,normalize:norm,database:DB,memory,buildList,extractKnownIngredients,chooseRecipe,version:'7.0-cozia-domain-engine'};
})();
