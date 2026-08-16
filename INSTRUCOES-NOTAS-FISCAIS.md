# Alimente Fácil — ativação das notas fiscais

## 1. Adicione o token na Vercel

No projeto **alimente-facil-site**, abra **Settings → Environment Variables → Add Environment Variable**.

- Key: `INFOSIMPLES_TOKEN`
- Value: cole o token criado na sua conta da InfoSimples
- Sensitive: ligado
- Environments: Production e Preview

Não use `NEXT_PUBLIC_`, não coloque o token no HTML e não envie o arquivo `.env` para ninguém.

No campo Value, use preferencialmente somente o token. O servidor também reconhece `token=...` ou a URL de teste completa e extrai o token automaticamente. Não deixe o valor de exemplo `COLE_AQUI_O_TOKEN_DA_INFOSIMPLES`.

## 2. Faça um novo deployment

Depois de salvar a variável, abra **Deployments**, escolha o deployment mais recente e use **Redeploy**. Variáveis novas só entram em uma nova implantação.

## 3. Limites implementados

- Teste gratuito de 7 dias: 1 nota fiscal.
- Premium: 10 notas fiscais por ciclo de 30 dias.
- Reabrir a mesma chave não faz uma nova consulta e não consome outra unidade.
- O controle é feito no servidor; mudar o navegador ou limpar o celular não reinicia o limite.

## 4. Privacidade e funcionamento

- A câmera lê o QR no aparelho e envia somente a chave de 44 números.
- O token da InfoSimples permanece no servidor.
- A nota original é somente leitura. O usuário pode renomear o título ou excluir a nota da própria interface.
- Os itens podem ser enviados para a despensa sem duplicação e ficam identificados com o número da nota.

## 5. Verificação rápida

1. Entre com uma conta de teste.
2. Abra **Minhas Notas**.
3. Leia um QR ou digite uma chave com 44 números.
4. Confirme estabelecimento, data, total e quantidade de itens.
5. Envie os itens à despensa duas vezes; na segunda tentativa o sistema deve avisar que eles já existem.
6. Gere uma lista pela nota e confira a aba **Análises**.

## Atenção de custo

A consulta à InfoSimples pode ter cobrança por uso. Mantenha um limite mensal de gastos no painel da própria InfoSimples compatível com sua base de assinantes.
