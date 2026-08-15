(function(){
  'use strict';
  const root=window.AF_AI_DATABASE=window.AF_AI_DATABASE||{};
  root.dietProfiles={
    omnivore:{label:'Onívoro',emoji:'🍽️',avoid:[],prefer:['vegetais variados','leguminosas','proteínas variadas','grãos','frutas'],note:'Inclui alimentos vegetais e de origem animal, com variedade e equilíbrio.'},
    vegetarian:{label:'Vegetariano',emoji:'🥕',avoid:['frango','carne','linguiça','lombo','pernil','peixe','tilápia','sardinha','atum','camarão'],prefer:['ovos','tofu','proteína de soja','lentilha','grão-de-bico','feijão'],note:'Exclui carnes e pescados; pode incluir ovos e laticínios conforme a preferência individual.'},
    vegan:{label:'Vegano',emoji:'🌱',avoid:['frango','carne','linguiça','lombo','pernil','peixe','tilápia','sardinha','atum','camarão','ovos','leite','queijo','iogurte','manteiga','requeijão','creme de leite','mel'],prefer:['tofu','proteína de soja','lentilha','grão-de-bico','feijão','bebida vegetal'],note:'Exclui ingredientes de origem animal. Rótulos e possíveis derivados precisam ser conferidos.'},
    pescatarian:{label:'Pescetariano',emoji:'🐟',avoid:['frango','carne moída','patinho','acém','músculo','linguiça','lombo','pernil'],prefer:['peixe','tilápia','sardinha','atum','ovos','tofu','leguminosas'],note:'Exclui carnes bovina, suína e de aves, mantendo pescados e alimentos vegetais.'}
  };
  root.healthProfiles={
    lactoseFree:{label:'Sem lactose',emoji:'🥛',avoid:['leite integral','leite semidesnatado','leite desnatado','queijo minas','muçarela','requeijão','creme de leite'],prefer:['leite sem lactose','bebida vegetal','iogurte sem lactose'],note:'Intolerância e alergia à proteína do leite são condições diferentes; alergia exige orientação e cuidado mais rigoroso.'},
    glutenFree:{label:'Sem glúten',emoji:'🌾',avoid:['farinha de trigo','pão integral','pão francês','macarrão espaguete','macarrão parafuso','massa para lasanha','trigo'],prefer:['arroz','tapioca','polvilho','quinoa','milho'],note:'Para doença celíaca, contaminação cruzada e certificação sem glúten também importam.'},
    lowSugar:{label:'Atenção à glicemia',emoji:'🩺',avoid:['açúcar','refrigerante','achocolatado','leite condensado','chocolate granulado','geleia'],prefer:['vegetais','feijão','aveia','proteína','frutas inteiras'],note:'Organização geral não substitui plano individual para diabetes, medicação ou controle de glicemia.'},
    lowSodium:{label:'Atenção ao sódio',emoji:'💙',avoid:['linguiça','presunto','salsicha','caldo pronto','macarrão instantâneo','salgadinho'],prefer:['ervas','alho','cebola','limão','alimentos in natura'],note:'Hipertensão e outras condições exigem metas individualizadas por profissional de saúde.'},
    heartFriendly:{label:'Atenção cardiovascular',emoji:'❤️',avoid:['bacon','linguiça','manteiga','fritura','carne gordurosa'],prefer:['aveia','feijão','vegetais','peixe','azeite'],note:'Colesterol e triglicerídeos dependem do padrão alimentar completo e da avaliação clínica.'},
    liverFriendly:{label:'Atenção ao fígado',emoji:'💚',avoid:['refrigerante','açúcar','bebida alcoólica','fritura','ultraprocessado'],prefer:['vegetais','feijão','aveia','frutas inteiras','proteínas magras'],note:'Doença hepática precisa de acompanhamento médico; a lista oferece apenas organização alimentar geral.'},
    nutFree:{label:'Sem oleaginosas',emoji:'⚠️',avoid:['amendoim','castanha','amêndoa','nozes','pasta de amendoim'],prefer:[],note:'Alergias podem envolver traços e contaminação cruzada. Sempre confira o rótulo e orientação médica.'}
  };
  root.medicalNutrition={
    boundaries:'A CozIA oferece educação e organização alimentar geral. Não diagnostica, não prescreve tratamento e não substitui médico ou nutricionista.',
    pregnancy:'Gestação exige atenção individual a segurança dos alimentos, suplementação e necessidades nutricionais. Use apenas sugestões gerais e confirme com o pré-natal.',
    children:'Crianças têm necessidades por idade, desenvolvimento e rotina. Quantidades são estimativas domésticas, não prescrição nutricional.',
    elderly:'Para idosos, textura, hidratação, apetite, medicamentos e condições clínicas podem alterar a organização alimentar.',
    allergy:'Em alergias, ingredientes, traços e contaminação cruzada precisam ser verificados no rótulo e no preparo.',
    symptoms:'Sintomas persistentes ou intensos precisam de avaliação profissional; a lista de compras não deve ser usada como diagnóstico.'
  };
  root.supermarketKnowledge={
    compare:['Compare o preço por kg, litro ou unidade equivalente.','Considere rendimento e desperdício, não apenas o menor preço da embalagem.','Registre o valor real depois da compra para melhorar as próximas estimativas.'],
    route:['Hortifruti','Açougue e proteínas','Mercearia','Frios e laticínios','Limpeza','Higiene'],
    savings:['Confira despensa e validade antes de sair.','Defina orçamento e refeições antes da lista.','Priorize itens da estação e marcas equivalentes quando fizer sentido.','Evite promoções de produtos que não serão consumidos.','Use sobras de forma segura no planejamento seguinte.'],
    warning:'Preços apresentados são aproximações editáveis e não representam oferta em tempo real.'
  };
  root.coziaConversations=[
    {emoji:'👋',text:'Oi! Eu sou a CozIA. Quantas pessoas comem na sua casa?'},
    {emoji:'🥗',text:'Você é vegano, vegetariano, pescetariano ou onívoro?'},
    {emoji:'🛒',text:'Me diga pessoas, dias e orçamento. Eu monto a lista.'},
    {emoji:'🍳',text:'Tem algum ingrediente em casa? Posso transformar em receita.'},
    {emoji:'💰',text:'Quer economizar? Eu organizo a compra por prioridade.'},
    {emoji:'📦',text:'Vamos conferir o que falta na despensa?'}
  ];
})();
