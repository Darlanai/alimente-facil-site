(function(){
  'use strict';
  const root=window.AF_AI_DATABASE=window.AF_AI_DATABASE||{};
  root.knowledge={
    economy:[
      'Confira a despensa antes de comprar e transforme o que já existe em refeições do planejamento.',
      'Compare preço por quilo ou litro, não apenas o valor da embalagem.',
      'Produtos da estação costumam ter melhor oferta; substitua quando a qualidade e o preço compensarem.',
      'Use uma lista por setores do mercado para reduzir compras por impulso.',
      'Planeje o reaproveitamento seguro de ingredientes em mais de uma refeição.'
    ],
    safety:[
      'Separe alimentos crus dos prontos e use utensílios limpos para evitar contaminação cruzada.',
      'Refrigere alimentos perecíveis rapidamente e siga a orientação da embalagem.',
      'Descongele na geladeira ou em método seguro; não deixe carnes descongelando sobre a pia.',
      'Na dúvida sobre odor, aparência ou conservação, descarte o alimento.'
    ],
    storage:{
      arroz:'Guarde em pote seco, bem fechado e protegido de calor e umidade.',feijao:'Mantenha o grão seco em recipiente fechado; depois de cozido, refrigere rapidamente.',ovos:'Mantenha refrigerados e evite lavar antes de guardar.',frango:'Refrigere ou congele rapidamente e mantenha separado de alimentos prontos.',peixe:'Use o quanto antes, sempre refrigerado, ou congele corretamente.',folhas:'Se lavar antes de guardar, seque muito bem e use recipiente protegido.',frutas:'Separe frutas muito maduras e refrigere as que se beneficiam da baixa temperatura.'
    },
    nutrition:[
      'Uma organização alimentar geral pode combinar vegetais, fonte de proteína, carboidrato e água, respeitando cultura, rotina e orçamento.',
      'Variedade ao longo da semana ajuda a incluir diferentes nutrientes sem depender de um único alimento.',
      'Rótulos ajudam a comparar porção, sódio, açúcares adicionados e lista de ingredientes.'
    ],
    agriculture:[
      'Sazonalidade, clima, safra, transporte e oferta influenciam preço e disponibilidade.',
      'Aproveitamento integral só deve ser feito quando a parte do alimento for própria para consumo e estiver bem higienizada.',
      'Comprar de produtores locais pode reduzir etapas de transporte, mas preço e qualidade ainda devem ser comparados.'
    ],
    health:'Posso ajudar com educação alimentar e organização geral. Sintomas, alergias, doenças, medicamentos e dietas terapêuticas precisam de avaliação individual de médico ou nutricionista.',
    product:{price:'O Alimente Fácil custa R$ 9,90 por mês após 7 dias grátis, sem cartão no início.',trial:'Você pode testar por 7 dias grátis sem cartão e conhecer listas, despensa, receitas, planejamento e análises.',privacy:'Os dados da conta são usados para oferecer os recursos do aplicativo conforme os termos e a política de privacidade.'}
  };
  root.conversationExamples=[
    'Monte uma lista econômica para duas pessoas','Quero compras para a semana sem carne','Adicione arroz, feijão e ovos','Faça uma lista para churrasco de dez pessoas','O que está vencendo na despensa?','Crie receitas com frango e batata','Planeje sete jantares','Quero reduzir desperdício','O que posso substituir por leite?','Como guardar folhas?','Mande os itens da lista para a despensa','Mostre os gráficos da minha cozinha'
  ];
})();
