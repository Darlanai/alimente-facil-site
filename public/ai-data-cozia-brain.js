(function(){
  'use strict';
  const root=window.AF_AI_DATABASE=window.AF_AI_DATABASE||{};
  root.catalog=root.catalog||[];
  const split=value=>String(value||'').split('|').map(item=>item.trim()).filter(Boolean);
  const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s-]/g,' ').replace(/\s+/g,' ').trim();

  const ingredientGroups=[
    ['Grãos e cereais','kg',1,8.5,'Arroz arbóreo|Arroz basmati|Arroz jasmine|Arroz vermelho|Arroz negro|Feijão branco|Feijão vermelho|Feijão azuki|Fava|Soja em grãos|Amaranto|Trigo sarraceno|Cevada|Centeio|Painço|Sorgo|Fubá|Farelo de aveia|Farinha de arroz|Farinha de aveia|Farinha de coco|Farinha de amêndoas|Trigo para quibe|Massa para lasanha|Macarrão de arroz|Macarrão para yakisoba|Macarrão integral|Macarrão instantâneo|Cevadinha'],
    ['Hortaliças','un',1,5.5,'Alcachofra|Aspargo|Bambu|Broto de feijão|Broto de alfafa|Catalonha|Chicória|Escarola|Endívia|Erva-doce|Funcho|Maxixe|Palmito|Ora-pro-nóbis|Taioba|Almeirão|Cogumelo|Champignon|Shimeji|Shitake|Portobello|Mandioquinha|Yacon|Milho verde|Ervilha fresca|Azeitona|Alcaparra|Tomate seco|Hortelã|Cebola roxa|Cebola branca|Alho negro|Pimenta biquinho|Pimenta dedo-de-moça|Pimenta jalapeño'],
    ['Frutas','kg',1,8,'Amora|Framboesa|Mirtilo|Jabuticaba|Graviola|Cupuaçu|Açaí|Carambola|Figo|Romã|Tâmara|Nectarina|Lichia|Physalis|Seriguela|Umbu|Uxi|Tamarindo|Pinha|Fruta-do-conde|Jaca|Rambutã|Guaraná|Limão-siciliano|Limão-taiti|Toranja'],
    ['Proteínas','kg',1,24,'Carne seca|Bacon|Linguiça|Salsicha|Presunto|Peito de peru|Costela bovina|Alcatra|Filé-mignon|Coxão duro|Lagarto|Picanha|Cupim|Fígado bovino|Bisteca suína|Costelinha suína|Filé de salmão|Bacalhau|Pescada|Dourado|Robalo|Truta|Lula|Polvo|Mexilhão|Caranguejo|Tempeh|Seitan|Edamame|Feijão branco cozido|Grão-de-bico cozido|Lentilha cozida'],
    ['Leites e derivados','un',2,11,'Queijo parmesão|Queijo coalho|Queijo prato|Queijo provolone|Queijo gorgonzola|Queijo brie|Queijo vegano|Leite de coco|Leite de aveia|Leite de amêndoas|Kefir|Coalhada|Iogurte grego|Iogurte sem lactose|Creme vegetal|Nata'],
    ['Temperos','un',2,5,'Curry|Garam masala|Zaatar|Pimenta calabresa|Pimenta caiena|Cardamomo|Cravo-da-índia|Anis-estrelado|Endro|Estragão|Sálvia|Tomilho|Lemon pepper|Chimichurri|Tahine|Missô|Molho shoyu|Molho inglês|Molho barbecue|Molho de pimenta|Azeite de dendê|Óleo de coco|Óleo de gergelim|Caldo de legumes|Caldo de frango|Caldo de carne'],
    ['Mercearia','un',2,9,'Açúcar|Açúcar mascavo|Açúcar demerara|Mel|Melado|Stevia|Fermento químico|Fermento biológico|Bicarbonato de sódio|Chocolate em pó|Cacau em pó|Chocolate granulado|Leite condensado|Coco ralado|Amido de milho|Gelatina|Essência de baunilha|Maionese|Ketchup|Molho pesto|Molho branco|Molho teriyaki|Leite de coco em pó'],
    ['Sementes e oleaginosas','un',3,12,'Chia|Linhaça|Gergelim|Semente de girassol|Semente de abóbora|Pistache|Macadâmia|Avelã|Castanha portuguesa|Pinoli|Pecan'],
    ['Enlatados e conservas','un',3,8,'Atum em lata|Sardinha em lata|Milho em lata|Ervilha em lata|Grão-de-bico em conserva|Feijão em conserva|Tomate pelado|Pepino em conserva|Palmito em conserva|Azeitona em conserva'],
    ['Bebidas','un',3,7,'Café solúvel|Café em grãos|Chá preto|Chá de hortelã|Chá de hibisco|Chá de gengibre|Suco de laranja|Suco de maçã|Kombucha|Bebida isotônica'],
    ['Padaria','un',3,9,'Baguete|Pão sírio|Pão australiano|Pão de centeio|Pão sem glúten|Tortilha|Massa folhada|Massa de pastel|Biscoito maisena|Farinha de rosca'],
    ['Limpeza','un',3,10,'Lava-roupas|Tira-manchas|Lava-louças|Lustra-móveis|Limpa-vidros|Limpa-forno|Odorizador|Papel-alumínio|Filme plástico|Papel-manteiga'],
    ['Higiene','un',3,9,'Enxaguante bucal|Hidratante corporal|Sabonete líquido|Álcool em gel|Repelente|Lenço de papel|Lâmina de barbear|Escova de cabelo']
  ];

  const expanded=[];
  ingredientGroups.forEach(([category,unit,priority,referencePrice,names])=>{
    split(names).forEach(name=>expanded.push({name,category,unit,priority,referencePrice}));
  });
  const seen=new Set((root.catalog||[]).map(item=>normalize(item.name)));
  expanded.forEach(item=>{if(!seen.has(normalize(item.name))){root.catalog.push(item);seen.add(normalize(item.name))}});

  root.synonyms={...(root.synonyms||{}),
    aroz:'Arroz branco',arroz:'Arroz branco',feijao:'Feijão carioca',feijaozinho:'Feijão carioca',grao:'Grão-de-bico',grao_de_bico:'Grão-de-bico',
    macarrao:'Macarrão espaguete',massa:'Macarrão espaguete',espaguete:'Macarrão espaguete',lasanha:'Massa para lasanha',miojo:'Macarrão instantâneo',
    frango:'Peito de frango',peito_de_frango:'Peito de frango',carne:'Carne moída',boi:'Patinho',porco:'Lombo suíno',
    peixe:'Filé de tilápia',tilapia:'Filé de tilápia',salmao:'Filé de salmão',camarao:'Camarão',ovo:'Ovos',ovos:'Ovos',
    leite:'Leite integral',leite_vegetal:'Bebida vegetal',queijo:'Queijo Minas',mussarela:'Muçarela',mucarela:'Muçarela',parmesao:'Queijo parmesão',
    tomate:'Tomate',tomates:'Tomate',cebola:'Cebola',batata:'Batata',batata_inglesa:'Batata',batata_doce:'Batata-doce',pimentao:'Pimentão verde',
    banana:'Banana prata',maca:'Maçã',limao:'Limão',laranja:'Laranja',mamao:'Mamão',abacaxi:'Abacaxi',
    cafe:'Café',acucar:'Açúcar',oleo:'Óleo vegetal',azeite:'Azeite',sal:'Sal',pimenta:'Pimenta-do-reino',
    detergente:'Detergente',sabao:'Sabão em pó',papel_higienico:'Papel higiênico',shampoo:'Shampoo'
  };

  root.coziaBrain={
    version:'7.0',
    intentPatterns:{
      createList:['crie uma lista','monte uma lista','faca uma lista','lista de compras','anote para comprar','preciso comprar','coloque na lista','adicione na lista'],
      automaticList:['lista automatica','sugestao de lista','lista completa','nao sei o que comprar','compra da semana','compra do mes'],
      explicitList:['lista com','comprar:','preciso de','anote:','adicione os itens','coloque estes itens'],
      recipe:['receita de','receita com','o que cozinhar','o que fazer com','como preparar','como cozinhar','quero fazer','ideia para jantar','ideia para almoco'],
      panel:['abrir painel','ir para o painel','acessar painel','mostrar painel','ver meu painel'],
      pantry:['abrir despensa','ir para despensa','ver despensa','mostrar despensa','o que tem na despensa'],
      planner:['abrir planejador','ir para planejador','ver planejamento','mostrar cardapio','organizar semana'],
      analytics:['abrir analises','ver graficos','mostrar graficos','meus gastos','resumo da cozinha'],
      settings:['abrir configuracoes','minha conta','meu perfil','configurar conta']
    },
    panelModules:{
      inicio:{label:'Painel inicial',emoji:'🏠',keywords:['painel','inicio','home','resumo geral']},
      lista:{label:'Listas de compras',emoji:'🛒',keywords:['lista','listas','compras','mercado']},
      despensa:{label:'Despensa',emoji:'📦',keywords:['despensa','estoque','validade','vencimento']},
      receitas:{label:'Receitas',emoji:'🍳',keywords:['receita','receitas','cozinhar','prato']},
      planejador:{label:'Planejador',emoji:'📅',keywords:['planejador','planejamento','cardapio','semana']},
      analises:{label:'Análises',emoji:'📊',keywords:['analise','analises','grafico','graficos','gastos']},
      configuracoes:{label:'Configurações',emoji:'⚙️',keywords:['configuracao','configuracoes','perfil','conta']}
    },
    techniques:[
      {key:'assado',words:['forno','assar','assado'],verb:'Asse em forno preaquecido até dourar e cozinhar por completo.'},
      {key:'airfryer',words:['airfryer','fritadeira'],verb:'Prepare na airfryer em porções, virando na metade do tempo.'},
      {key:'grelhado',words:['grelhar','grelhado','chapa'],verb:'Grelhe em superfície quente até dourar dos dois lados.'},
      {key:'refogado',words:['refogar','refogado','frigideira'],verb:'Refogue os aromáticos, junte os ingredientes e cozinhe até ficarem macios.'},
      {key:'cozido',words:['cozinhar','cozido','panela'],verb:'Cozinhe em panela com líquido suficiente até atingir textura macia.'},
      {key:'pressao',words:['pressao','panela de pressao'],verb:'Cozinhe sob pressão pelo tempo adequado ao ingrediente principal e libere a pressão com segurança.'},
      {key:'sopa',words:['sopa','caldo','creme'],verb:'Refogue a base, cubra com água ou caldo e cozinhe até encorpar.'},
      {key:'salada',words:['salada','cru','fresco'],verb:'Higienize, corte e misture os ingredientes; tempere apenas ao servir.'},
      {key:'massa',words:['massa','macarrao','lasanha'],verb:'Cozinhe a massa e envolva no molho preparado com os demais ingredientes.'},
      {key:'omelete',words:['omelete','fritada'],verb:'Misture os ingredientes aos ovos e cozinhe em frigideira tampada.'},
      {key:'ensopado',words:['ensopado','molho'],verb:'Doure a base, acrescente líquido e cozinhe lentamente até encorpar.'},
      {key:'rapido',words:['rapido','rapida','15 minutos'],verb:'Corte em pedaços pequenos e cozinhe em fogo alto, mexendo, até ficar pronto.'}
    ],
    flavorProfiles:[
      {name:'brasileiro',words:['brasileiro','caseiro','comida de casa'],seasonings:['Alho','Cebola','Cheiro-verde']},
      {name:'mineiro',words:['mineiro','minas'],seasonings:['Alho','Cebola','Couve']},
      {name:'nordestino',words:['nordestino','baiano'],seasonings:['Coentro','Cominho','Pimenta dedo-de-moça']},
      {name:'italiano',words:['italiano','italiana'],seasonings:['Tomate','Manjericão','Orégano']},
      {name:'mexicano',words:['mexicano','mexicana'],seasonings:['Cominho','Páprica defumada','Pimenta jalapeño']},
      {name:'oriental',words:['oriental','chines','japones'],seasonings:['Molho shoyu','Gengibre','Óleo de gergelim']},
      {name:'indiano',words:['indiano','indiana','curry'],seasonings:['Curry','Cúrcuma','Garam masala']},
      {name:'mediterraneo',words:['mediterraneo','grego'],seasonings:['Azeite','Limão','Orégano']},
      {name:'árabe',words:['arabe','libanes'],seasonings:['Zaatar','Hortelã','Tahine']},
      {name:'suave',words:['suave','crianca','sem pimenta'],seasonings:['Alho','Cebola','Salsa']},
      {name:'picante',words:['picante','apimentado'],seasonings:['Pimenta calabresa','Páprica defumada','Pimenta dedo-de-moça']}
    ],
    mealTypes:['café da manhã','lanche','almoço','jantar','marmita','entrada','acompanhamento','sobremesa','bolo','sopa','salada','massa','assado','refogado','grelhado'],
    ingredientCount:(root.catalog||[]).length,
    combinationCapacity:0
  };
  root.coziaBrain.combinationCapacity=(root.catalog||[]).length*root.coziaBrain.techniques.length*root.coziaBrain.flavorProfiles.length*root.coziaBrain.mealTypes.length*4*10;

  root.coziaConversations=[
    {emoji:'👋',text:'Oi! Eu sou a CozIA. O que vamos organizar hoje?'},
    {emoji:'🛒',text:'Digite os ingredientes que quer comprar e eu monto a lista.'},
    {emoji:'✨',text:'Quer uma lista automática? Diga pessoas, dias e orçamento.'},
    {emoji:'🍳',text:'Conte o que tem em casa e eu combino uma receita.'},
    {emoji:'🥗',text:'É vegano, vegetariano, pescetariano ou onívoro?'},
    {emoji:'💰',text:'Quer economizar? Eu priorizo o essencial dentro do orçamento.'},
    {emoji:'📦',text:'Posso enviar a lista direto para sua despensa.'},
    {emoji:'📅',text:'Posso criar refeições e levar tudo ao planejador.'},
    {emoji:'📊',text:'Quer abrir seus gráficos e conferir a cozinha?'},
    {emoji:'🎙️',text:'Você também pode falar os ingredientes pelo microfone.'}
  ];
})();
