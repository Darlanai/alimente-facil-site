# Alimente Fácil — Luma, assistente especialista V6

Esta entrega adiciona um assistente gratuito, sem API paga e sem cobrança por mensagem.

## Recursos incluídos

- Nova identidade “Luma”, com ícone de IA próprio, transparente e integrado à interface.
- Botão e janela centralizados na landing page e no painel.
- Conversa em português com emojis, respostas, perguntas de contexto e botões contextuais.
- Comando de voz quando o navegador oferece `SpeechRecognition`.
- Abordagem automática e conversacional na landing page.
- Seis convites rotativos com emojis antes de abrir a conversa.
- Perfis alimentares lembrados durante a conversa: onívoro, vegetariano, vegano e pescetariano.
- Restrições gerais para lactose, glúten, glicemia, sódio, saúde cardiovascular, fígado e oleaginosas.
- Criação e salvamento de listas semanais, mensais, econômicas, por perfil alimentar, churrasco, limpeza e listas personalizadas.
- Quantidades adaptadas à quantidade de pessoas e dias, com orçamento e preços aproximados.
- Prévia comercial: visitante vê parte da lista e recebe o cadastro ao tentar salvar, enviar, imprimir ou baixar.
- Usuário logado envia ao painel e abre o módulo correspondente imediatamente; também pode enviar à despensa, imprimir e baixar PDF.
- A ação escolhida antes do login é retomada automaticamente depois da autenticação.
- A seta lateral é reativada e a iluminação da landing permanece consistente após o login.
- Sugestões e salvamento de receitas, inclusive a partir da despensa.
- Planejamento semanal com receitas vinculadas ao painel.
- Cadastro conversacional de itens na despensa.
- Consultas de estoque baixo e validade.
- Lembretes locais, mediante permissão do usuário.
- Resumo visual dos dados de listas, despensa, receitas e planejamento.
- Conteúdo educativo sobre cozinha, conservação, nutrição geral, saúde alimentar, economia, supermercado e agricultura.

## Arquivos da entrega

- `public/assistant-pro.js`: motor conversacional, base local e ações.
- `public/ai-data-catalog.js`: catálogo com 228 itens e categorias.
- `public/ai-data-recipes.js`: fórmulas culinárias e 2.800 combinações possíveis.
- `public/ai-recipes-extended.js`: 75 receitas curadas, incluindo pratos brasileiros, massas, sopas, saladas, bolos, sobremesas e lanches.
- `public/ai-data-pricing.js`: estimativas editáveis, quantidades por pessoas/dias e cálculo por orçamento.
- `public/ai-data-knowledge.js`: economia, conservação, nutrição geral, agricultura e conversa.
- `public/ai-data-health-profiles.js`: perfis alimentares, restrições, limites de saúde e conhecimento de supermercado.
- `public/alimenta-ai-icon.png`: ícone transparente exclusivo da Luma.
- `public/assistant-knowledge.js`: conhecimento institucional do produto.
- `public/script.js`: integração com o painel e reconhecimento de voz.
- `public/index.html`: interface e carregamento do assistente.
- `public/landing-art.css`: componentes visuais minimalistas.
- `public/service-worker.js`: atualização do cache da aplicação.

## Observações

O assistente usa regras, combinações e uma base local extensível, sem API paga e sem cobrança por consulta. Ele atende ao domínio do Alimente Fácil, mas não se apresenta como médico ou nutricionista. Informações de saúde são educativas; diagnóstico, tratamento e dietas terapêuticas devem ser tratados por profissionais habilitados. Para alergias e doença celíaca, rótulos e contaminação cruzada precisam ser verificados.

Depois de publicar, limpe o cache do site ou recarregue a página; a nova versão do service worker também renova os arquivos automaticamente.
