# Alimente Fácil — IA conversacional especialista V5

Esta entrega adiciona um assistente gratuito, sem API paga e sem cobrança por mensagem.

## Recursos incluídos

- Conversa em português com respostas e botões contextuais.
- Comando de voz quando o navegador oferece `SpeechRecognition`.
- Abordagem automática e conversacional na landing page.
- Convites rotativos com emojis antes de abrir a conversa.
- Janela reposicionada mais ao centro e acima, sem cobrir o rodapé.
- Criação e salvamento de listas semanais, mensais, econômicas, vegetarianas, churrasco, limpeza e listas personalizadas.
- Prévia comercial: visitante vê parte da lista e recebe o cadastro ao tentar salvar, enviar, imprimir ou baixar.
- Usuário logado salva no painel, envia à despensa, imprime e baixa PDF.
- A ação escolhida antes do login é retomada automaticamente depois da autenticação.
- A seta lateral é reativada e a iluminação da landing permanece consistente após o login.
- Sugestões e salvamento de receitas, inclusive a partir da despensa.
- Planejamento semanal com receitas vinculadas ao painel.
- Cadastro conversacional de itens na despensa.
- Consultas de estoque baixo e validade.
- Lembretes locais, mediante permissão do usuário.
- Resumo visual dos dados de listas, despensa, receitas e planejamento.
- Conteúdo educativo sobre cozinha, conservação, nutrição geral, economia e agricultura.

## Arquivos da entrega

- `public/assistant-pro.js`: motor conversacional, base local e ações.
- `public/ai-data-catalog.js`: catálogo com 228 itens e categorias.
- `public/ai-data-recipes.js`: fórmulas culinárias e 2.800 combinações possíveis.
- `public/ai-recipes-extended.js`: 75 receitas curadas, incluindo pratos brasileiros, massas, sopas, saladas, bolos, sobremesas e lanches.
- `public/ai-data-pricing.js`: estimativas editáveis, quantidades por pessoas/dias e cálculo por orçamento.
- `public/ai-data-knowledge.js`: economia, conservação, nutrição geral, agricultura e conversa.
- `public/assistant-knowledge.js`: conhecimento institucional do produto.
- `public/script.js`: integração com o painel e reconhecimento de voz.
- `public/index.html`: interface e carregamento do assistente.
- `public/landing-art.css`: componentes visuais minimalistas.
- `public/service-worker.js`: atualização do cache da aplicação.

## Observações

O assistente usa regras, combinações e uma base extensível. Ele não é um modelo de linguagem geral como o ChatGPT, mas atende ao domínio do Alimente Fácil sem custo por consulta. Informações médicas são apenas educativas; diagnóstico e dietas terapêuticas devem ser tratados por profissionais habilitados.

Depois de publicar, limpe o cache do site ou recarregue a página; a nova versão do service worker também renova os arquivos automaticamente.
