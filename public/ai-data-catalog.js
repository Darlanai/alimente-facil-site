(function(){
  'use strict';
  const root=window.AF_AI_DATABASE=window.AF_AI_DATABASE||{};
  const split=value=>value.split('|').map(name=>name.trim()).filter(Boolean);
  const category=(name,unit,priority,items)=>split(items).map(item=>({name:item,category:name,unit,priority}));
  root.catalog=[
    ...category('Grãos e cereais','kg',1,'Arroz branco|Arroz integral|Arroz parboilizado|Feijão carioca|Feijão preto|Feijão fradinho|Lentilha|Ervilha seca|Grão-de-bico|Quinoa|Aveia em flocos|Milho para pipoca|Canjiquinha|Cuscuz de milho|Macarrão espaguete|Macarrão parafuso|Farinha de trigo|Farinha de mandioca|Farinha de milho|Tapioca|Polvilho doce|Polvilho azedo|Granola sem açúcar|Pão integral|Pão francês'),
    ...category('Hortaliças','un',1,'Alface|Rúcula|Agrião|Couve|Espinafre|Repolho verde|Repolho roxo|Acelga|Brócolis|Couve-flor|Abobrinha|Berinjela|Chuchu|Pepino|Tomate|Tomate-cereja|Pimentão verde|Pimentão vermelho|Pimentão amarelo|Cenoura|Beterraba|Abóbora|Quiabo|Vagem|Jiló|Nabo|Rabanete|Alho-poró|Salsão|Mandioca|Batata|Batata-doce|Inhame|Cará'),
    ...category('Frutas','kg',1,'Banana prata|Banana nanica|Maçã|Laranja|Limão|Mamão|Manga|Melancia|Melão|Abacaxi|Abacate|Morango|Uva|Pera|Goiaba|Maracujá|Acerola|Tangerina|Kiwi|Pêssego|Ameixa|Coco|Caqui|Pitaya|Caju'),
    ...category('Proteínas','kg',1,'Ovos|Peito de frango|Coxa de frango|Sobrecoxa de frango|Frango inteiro|Carne moída|Patinho|Acém|Músculo bovino|Coxão mole|Lombo suíno|Pernil suíno|Filé de tilápia|Sardinha|Atum|Merluza|Camarão|Tofu|Proteína de soja|Hambúrguer vegetal'),
    ...category('Leites e derivados','un',2,'Leite integral|Leite semidesnatado|Leite desnatado|Leite sem lactose|Bebida vegetal|Iogurte natural|Iogurte sem açúcar|Queijo Minas|Muçarela|Ricota|Cottage|Requeijão|Manteiga|Creme de leite|Leite em pó'),
    ...category('Temperos','un',2,'Sal|Pimenta-do-reino|Páprica doce|Páprica defumada|Cominho|Orégano|Açafrão|Cúrcuma|Canela|Noz-moscada|Louro|Alecrim|Manjericão|Coentro|Salsa|Cebolinha|Cheiro-verde|Alho|Cebola|Gengibre|Azeite|Óleo vegetal|Vinagre|Molho de tomate|Extrato de tomate|Mostarda'),
    ...category('Bebidas','un',3,'Água mineral|Água com gás|Café|Chá de camomila|Chá de erva-doce|Chá verde|Suco integral de uva|Água de coco|Refrigerante|Achocolatado'),
    ...category('Lanches','un',3,'Castanha-do-pará|Castanha de caju|Amendoim|Nozes|Amêndoas|Uva-passa|Damasco seco|Biscoito integral|Torrada integral|Pasta de amendoim|Geleia sem açúcar|Chocolate amargo|Barra de cereais'),
    ...category('Congelados','un',4,'Legumes congelados|Ervilha congelada|Milho congelado|Polpa de fruta|Pão de queijo|Lasanha congelada|Pizza congelada|Batata congelada|Hambúrguer|Sorvete'),
    ...category('Padaria','un',3,'Pão de forma|Pão integral|Pão francês|Pão de queijo|Bolo simples|Biscoito de polvilho|Torrada|Rap10|Croissant'),
    ...category('Limpeza','un',3,'Detergente|Esponja|Sabão em pó|Sabão líquido|Amaciante|Desinfetante|Água sanitária|Álcool|Limpador multiuso|Saco de lixo|Papel-toalha|Pano de chão|Luva de limpeza|Palha de aço|Inseticida'),
    ...category('Higiene','un',3,'Papel higiênico|Sabonete|Creme dental|Escova dental|Fio dental|Shampoo|Condicionador|Desodorante|Absorvente|Algodão|Cotonete|Protetor solar|Aparelho de barbear'),
    ...category('Bebê e cuidados','un',4,'Fralda|Lenço umedecido|Pomada para assadura|Sabonete infantil|Fórmula infantil|Papinha|Água termal'),
    ...category('Animais','un',4,'Ração para cães|Ração para gatos|Petisco para cães|Petisco para gatos|Areia sanitária|Tapete higiênico')
  ];
  root.units={kg:'kg',quilo:'kg',quilos:'kg',g:'g',grama:'g',gramas:'g',l:'L',litro:'L',litros:'L',pacote:'pct',pacotes:'pct',caixa:'cx',caixas:'cx',duzia:'dz',dúzia:'dz',unidade:'un',unidades:'un'};
  root.synonyms={
    acucar:'Açúcar',feijao:'Feijão carioca',frango:'Peito de frango',carne:'Carne moída',peixe:'Filé de tilápia',queijo:'Queijo Minas',leite:'Leite integral',pao:'Pão integral',macarrao:'Macarrão espaguete',tomates:'Tomate',ovos:'Ovos',banana:'Banana prata',sabao:'Sabão em pó'
  };
})();
