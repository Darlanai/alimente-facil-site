(function(){
  'use strict';
  const root=window.AF_AI_DATABASE=window.AF_AI_DATABASE||{};
  root.recipeBases=[
    {name:'Arroz com feijão e legumes',tags:'economica brasileira almoco jantar',ingredients:['Arroz branco|1|xícara','Feijão carioca|1|xícara','Cenoura|1|un','Couve|4|folhas','Alho|2|dentes'],prep:'Cozinhe o arroz e o feijão. Refogue os legumes e sirva em um prato equilibrado.'},
    {name:'Omelete de legumes',tags:'rapida economica cafe jantar',ingredients:['Ovos|2|un','Tomate|1|un','Cebola|1/4|un','Queijo Minas|40|g'],prep:'Bata os ovos, misture os ingredientes picados e cozinhe em frigideira antiaderente.'},
    {name:'Frango com batata',tags:'proteina almoco jantar',ingredients:['Peito de frango|500|g','Batata|3|un','Cebola|1|un','Alho|2|dentes','Páprica doce|1|colher'],prep:'Tempere e doure o frango. Junte cebola e batata e cozinhe até ficarem macios.'},
    {name:'Sopa de legumes',tags:'leve economica jantar',ingredients:['Batata|2|un','Cenoura|1|un','Abobrinha|1|un','Cebola|1|un','Alho|2|dentes'],prep:'Refogue os temperos, junte os legumes, cubra com água e cozinhe até amaciar.'},
    {name:'Salada de grão-de-bico',tags:'vegetariana leve almoco',ingredients:['Grão-de-bico|2|xícaras','Tomate|2|un','Pepino|1|un','Cebola|1/2|un','Limão|1|un'],prep:'Misture o grão-de-bico cozido aos vegetais picados e tempere com limão e azeite.'},
    {name:'Peixe assado com legumes',tags:'leve proteina almoco jantar',ingredients:['Filé de tilápia|500|g','Batata|2|un','Tomate|2|un','Cebola|1|un','Limão|1|un'],prep:'Tempere o peixe, acomode com os legumes e asse até tudo ficar cozido.'},
    {name:'Mingau de aveia e banana',tags:'cafe lanche rapida',ingredients:['Aveia em flocos|3|colheres','Leite semidesnatado|250|ml','Banana prata|1|un','Canela|1|pitada'],prep:'Cozinhe a aveia com o leite em fogo baixo. Finalize com banana e canela.'},
    {name:'Macarrão ao molho de tomate',tags:'economica almoco jantar',ingredients:['Macarrão espaguete|250|g','Tomate|4|un','Cebola|1/2|un','Alho|2|dentes','Azeite|1|fio'],prep:'Cozinhe o macarrão. Faça o molho com os demais ingredientes e misture.'},
    {name:'Frango xadrez simples',tags:'proteina almoco jantar',ingredients:['Peito de frango|500|g','Pimentão verde|1|un','Pimentão vermelho|1|un','Cebola|1|un','Arroz branco|1|xícara'],prep:'Doure o frango em cubos, acrescente vegetais e cozinhe rapidamente. Sirva com arroz.'},
    {name:'Lentilha com legumes',tags:'vegetariana economica almoco jantar',ingredients:['Lentilha|1|xícara','Cenoura|1|un','Tomate|2|un','Cebola|1|un','Alho|2|dentes'],prep:'Cozinhe a lentilha e finalize com os legumes refogados e temperos.'},
    {name:'Panqueca de aveia',tags:'cafe lanche rapida',ingredients:['Ovos|1|un','Aveia em flocos|3|colheres','Banana prata|1|un','Canela|1|pitada'],prep:'Misture tudo e doure pequenas porções em frigideira antiaderente.'},
    {name:'Escondidinho de carne',tags:'almoco jantar',ingredients:['Carne moída|500|g','Mandioca|600|g','Cebola|1|un','Tomate|2|un','Queijo Minas|80|g'],prep:'Faça o purê de mandioca, refogue a carne e monte em camadas. Leve ao forno para gratinar.'},
    {name:'Tapioca com ovo e queijo',tags:'cafe lanche rapida',ingredients:['Tapioca|4|colheres','Ovos|1|un','Queijo Minas|40|g','Tomate|1/2|un'],prep:'Prepare a tapioca na frigideira, recheie com ovo, queijo e tomate.'},
    {name:'Abóbora com carne moída',tags:'economica almoco jantar',ingredients:['Abóbora|500|g','Carne moída|300|g','Cebola|1|un','Alho|2|dentes','Cheiro-verde|1|porção'],prep:'Refogue a carne, acrescente a abóbora e cozinhe até ficar macia.'},
    {name:'Risoto simples de legumes',tags:'vegetariana almoco jantar',ingredients:['Arroz branco|1|xícara','Abobrinha|1|un','Cenoura|1|un','Cebola|1|un','Queijo Minas|60|g'],prep:'Refogue o arroz e acrescente água aos poucos. Junte legumes e finalize com queijo.'}
  ].map(recipe=>({...recipe,ingredients:recipe.ingredients.map(value=>{const [name,qty,unit]=value.split('|');return [name,qty,unit]})}));

  const proteins=['frango','carne moída','tilápia','ovos','tofu','grão-de-bico','lentilha'];
  const sides=['arroz','macarrão','batata','batata-doce','mandioca','cuscuz','quinoa','salada'];
  const vegetables=['cenoura','abobrinha','brócolis','couve','abóbora','tomate','berinjela','vagem','chuchu','pimentão'];
  const methods=['assado','grelhado','refogado','cozido','ensopado'];
  root.recipeCombinations={proteins,sides,vegetables,methods,total:proteins.length*sides.length*vegetables.length*methods.length};
  root.substitutions={
    ovo:['linhaça hidratada em alguns bolos','banana amassada em massas doces'],leite:['bebida vegetal','água em preparos compatíveis'],manteiga:['azeite','óleo vegetal'],acucar:['banana madura','frutas secas'],farinha:['aveia triturada','farinha de arroz'],carne:['lentilha','grão-de-bico','tofu'],creme:['iogurte natural','creme vegetal'],queijo:['ricota','tofu temperado']
  };
})();
