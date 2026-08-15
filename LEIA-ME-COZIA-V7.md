# Alimente Fácil — CozIA, assistente de domínio V7

Esta entrega adiciona um assistente gratuito, sem API paga e sem cobrança por mensagem.

## Recursos incluídos

- Nova identidade “CozIA”, com ícone de IA próprio, transparente e integrado à interface.
- Botão um pouco mais largo e novamente móvel, com posição lembrada no aparelho.
- Janela conversacional mais larga e centralizada na landing page e no painel.
- Conversa em português com emojis, respostas, perguntas de contexto e botões contextuais.
- Comando de voz quando o navegador oferece `SpeechRecognition`.
- Abordagem automática e conversacional na landing page.
- Dez convites rotativos com emojis antes de abrir a conversa.
- Perfis alimentares lembrados durante a conversa: onívoro, vegetariano, vegano e pescetariano.
- Restrições gerais para lactose, glúten, glicemia, sódio, saúde cardiovascular, fígado e oleaginosas.
- Criação e salvamento de listas semanais, mensais, econômicas, por perfil alimentar, churrasco, limpeza e listas personalizadas.
- Interpretação de listas digitadas naturalmente, com ou sem frase pronta, reconhecendo quantidades, unidades e itens livres.
- Quantidades adaptadas à quantidade de pessoas e dias, com orçamento e preços aproximados.
- Prévia comercial: visitante vê parte da lista e recebe o cadastro ao tentar salvar, enviar, imprimir ou baixar.
- Usuário logado envia ao painel e abre o módulo correspondente imediatamente; também pode enviar à despensa, imprimir e baixar PDF.
- A ação escolhida antes do login é retomada automaticamente depois da autenticação.
- A sincronização aguarda os dados da conta, aplica a criação e força a gravação online antes de abrir o módulo, evitando sobrescrita.
- A seta lateral é reativada e a iluminação da landing permanece consistente após o login.
- Sugestões e salvamento de receitas, inclusive a partir da despensa e dos ingredientes digitados pelo usuário.
- Combinação dinâmica de ingrediente, técnica, estilo culinário, refeição, perfil alimentar e porções.
- 474 ingredientes reconhecidos e mais de 37 milhões de combinações locais possíveis.
- Planejamento semanal com receitas vinculadas ao painel.
- Cadastro conversacional de itens na despensa.
- Consultas de estoque baixo e validade.
- Lembretes locais, mediante permissão do usuário.
- Resumo visual dos dados de listas, despensa, receitas e planejamento.
- Conteúdo educativo sobre cozinha, conservação, nutrição geral, saúde alimentar, economia, supermercado e agricultura.

## Arquivos da entrega

- `api/index.js`: rotas de estado por conta usadas pela sincronização do painel.
- `package.json` e `package-lock.json`: dependências completas do servidor desta versão.
- `public/assistant-pro.js`: motor conversacional, base local e ações.
- `public/ai-data-catalog.js`: catálogo com 228 itens e categorias.
- `public/ai-data-recipes.js`: fórmulas culinárias e 2.800 combinações possíveis.
- `public/ai-recipes-extended.js`: 75 receitas curadas, incluindo pratos brasileiros, massas, sopas, saladas, bolos, sobremesas e lanches.
- `public/ai-data-pricing.js`: estimativas editáveis, quantidades por pessoas/dias e cálculo por orçamento.
- `public/ai-data-knowledge.js`: economia, conservação, nutrição geral, agricultura e conversa.
- `public/ai-data-health-profiles.js`: perfis alimentares, restrições, limites de saúde e conhecimento de supermercado.
- `public/ai-data-cozia-brain.js`: intenções, ingredientes ampliados, técnicas, cozinhas, módulos do painel e matriz combinatória.
- `public/alimenta-ai-icon.png`: ícone transparente exclusivo da CozIA.
- `public/assistant-knowledge.js`: conhecimento institucional do produto.
- `public/script.js`: integração com o painel e reconhecimento de voz.
- `public/index.html`: interface e carregamento do assistente.
- `public/landing-art.css`: componentes visuais minimalistas.
- `public/cozia-v7.css`: prioridade visual final, largura e movimentação do botão.
- `public/service-worker.js`: atualização do cache da aplicação.

## Observações

A assistente usa regras, intenções, combinações e uma base local extensível, sem API paga e sem cobrança por consulta. Ela atende ao domínio do Alimente Fácil, mas não se apresenta como médica ou nutricionista. Informações de saúde são educativas; diagnóstico, tratamento e dietas terapêuticas devem ser tratados por profissionais habilitados. Para alergias e doença celíaca, rótulos e contaminação cruzada precisam ser verificados.

Depois de publicar, limpe o cache do site ou recarregue a página; a nova versão do service worker também renova os arquivos automaticamente.
