const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Pega o token do cabeçalho 'Authorization'
    const authHeader = req.headers.authorization;

    // Verifica se o cabeçalho existe e se começa com "Bearer "
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Se não houver token, retorna erro 401 (Não Autorizado)
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    // Extrai o token, removendo o "Bearer "
    const token = authHeader.split(' ')[1];

    try {
        // Verifica se o token é válido usando o segredo
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Adiciona os dados do usuário (do token) ao objeto 'req'
        // para que as próximas rotas possam usá-lo
        req.user = decoded;
        
        // Passa para a próxima etapa (a rota que o usuário quer acessar)
        next();
    } catch (error) {
        // Se o token for inválido, retorna erro 400 (Requisição Inválida)
        res.status(400).json({ message: 'Token inválido.' });
    }
};

module.exports = authMiddleware;
