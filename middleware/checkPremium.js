// middleware/checkPremium.js
const User = require('../models/User');

const checkPremium = async (req, res, next) => {
    try {
        // CORREÇÃO: O ID do usuário vem de `req.user.id`, definido pelo authMiddleware
        const user = await User.findById(req.user.id).select('subscriptionTier trialEndDate');
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        // Verifica se o período de teste acabou
        if (user.subscriptionTier === 'premium' && user.trialEndDate && user.trialEndDate < new Date()) {
            // Reverte o usuário para o plano 'basic'
            user.subscriptionTier = 'basic';
            await user.save();
            return res.status(403).json({ message: 'Seu período de teste premium expirou. Faça upgrade para continuar usando este recurso.' });
        }

        if (user.subscriptionTier === 'premium') {
            next(); // O usuário é premium, pode prosseguir
        } else {
            res.status(403).json({ message: 'Este é um recurso exclusivo para assinantes Premium.' });
        }
    } catch (error) {
        console.error("Erro no checkPremium:", error);
        res.status(500).json({ message: 'Erro ao verificar o status da assinatura.' });
    }
};

module.exports = checkPremium;

