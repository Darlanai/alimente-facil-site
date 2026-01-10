const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// ROTA DE REGISTRO: /auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Verifica se todos os campos foram enviados
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Por favor, preencha todos os campos.' });
        }

        // Verifica se o usuário já existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Este e-mail já está em uso.' });
        }

        // Cria um novo usuário (a senha será criptografada pelo middleware do Schema)
        const newUser = new User({ name, email, password });
        
        // Define um período de teste de 7 dias para novos usuários
        const trialDays = 7;
        newUser.subscriptionTier = 'premium'; // Começa como premium
        newUser.trialEndDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

        await newUser.save();

        // Cria o token JWT
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({ message: "Usuário criado com sucesso!", token });

    } catch (error) {
        console.error("Erro no registro:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// ROTA DE LOGIN: /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Por favor, preencha todos os campos.' });
        }

        // Encontra o usuário pelo e-mail
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // Compara a senha enviada com a senha criptografada no banco
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // Cria o token JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({ message: "Login bem-sucedido!", token });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

module.exports = router;

