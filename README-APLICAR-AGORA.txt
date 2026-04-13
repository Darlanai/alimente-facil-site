ALIMENTE FÁCIL — pacote profissional limpo

1. Substitua no repositório estes arquivos e pastas:
- api/index.js
- public/index.html
- public/style.css
- public/script.js
- public/termos.html
- public/politica-de-privacidade.html
- server.js
- vercel.json
- package.json

2. Depois rode:
   git add .
   git commit -m "limpa demo e ativa auth real premium"
   git push origin main

3. Após o deploy, limpe os dados do site no navegador ou teste em aba anônima.

4. Variáveis necessárias na Vercel:
- APP_BASE_URL
- MONGODB_URI
- JWT_SECRET
- MP_PREMIUM_CHECKOUT_URL

5. IMPORTANTE:
- o cadastro nasce no plano basic
- o basic só visualiza
- qualquer ação exige premium
- premium só é ativado após confirmar a assinatura com preapproval_id do Mercado Pago
