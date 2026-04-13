
SUBSTITUA ESTES ARQUIVOS NO REPOSITÓRIO:
- api/index.js
- public/index.html
- public/style.css
- public/script.js
- public/termos.html
- public/politica-de-privacidade.html
- server.js
- vercel.json

DEPOIS:
1) git add .
2) git commit -m "limpa fake login e ativa basic visual"
3) git push origin main

OBSERVAÇÃO:
- Cadastro agora cria plano basic.
- Login só entra com usuário real do banco.
- Plano basic navega pelas abas, mas qualquer ação abre o card do premium.
- O formulário de contato grava mensagens na coleção contact_messages do MongoDB.
