ALIMENTE FÁCIL - PACOTE CORRIGIDO

O que já foi ajustado neste pacote:
1. Cadastro com nome, e-mail e senha com aceite de termos.
2. Fluxo de acesso pendente até configurar o pagamento no Mercado Pago.
3. Endpoint para finalizar a conta pendente após o retorno do Mercado Pago.
4. Webhook do Mercado Pago para atualizar status de assinatura.
5. Contato do site enviando para projetosdarlan@gmail.com via SMTP.
6. Termos de Uso e Política de Privacidade criados.
7. Estrutura pronta para Vercel + MongoDB Atlas.

IMPORTANTE:
- Login com Google NÃO está ativado neste pacote porque isso exige credenciais do Google Cloud.
- O retorno automático 100% perfeito depende de o Mercado Pago redirecionar com um identificador da assinatura ou do webhook chegar rapidamente.
- Se o retorno do Mercado Pago não vier com ID da assinatura, será necessário aprofundar a integração pela API do Mercado Pago em vez de usar apenas o link pronto do plano.

Arquivos principais:
- api/index.js  -> backend
- public/index.html -> site
- public/script.js -> lógica do frontend
- public/style.css -> estilos
- public/termos.html
- public/politica-de-privacidade.html
- .env.example -> variáveis de ambiente
- vercel.json -> configuração da Vercel


ATUALIZAÇÃO 2026-04-13
- Cadastro agora cria usuário no plano BASIC (visual).
- Usuário BASIC pode entrar no painel e trocar abas, mas qualquer ação abre o card Premium.
- Usuário PREMIUM tem acesso ilimitado.
- Retorno do Mercado Pago pode ser confirmado pela rota /api/billing/confirm-premium.
