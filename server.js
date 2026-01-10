require('dotenv').config(); // Carrega as variáveis do arquivo .env
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit'); // Importa a proteção contra abuso

const app = express();
const port = process.env.PORT || 3000;

// Configurações básicas
app.use(cors()); // Permite conexões do front-end
app.use(express.json()); // Permite leitura de JSON no corpo das requisições

// Serve os arquivos estáticos (HTML, CSS, JS, Imagens) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------
// CONFIGURAÇÃO DE LIMITE (RATE LIMIT)
// Impede que um usuário faça muitas perguntas seguidas
// ----------------------------------------------------
const chefIALimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Janela de 15 minutos
    max: 20, // Máximo de 20 perguntas por IP nessa janela
    message: { 
        error: "Você atingiu o limite de perguntas ao Chef IA. Aguarde alguns minutos e tente novamente." 
    },
    standardHeaders: true, // Retorna info de limite nos headers `RateLimit-*`
    legacyHeaders: false, // Desativa os headers `X-RateLimit-*`
});

// ----------------------------------------------------
// ROTA: Chef IA (Proxy para o Google Gemini)
// O front-end chama essa rota, e o servidor chama o Google
// Adicionamos 'chefIALimiter' aqui para proteger a rota
// ----------------------------------------------------
app.post('/api/chef-ia', chefIALimiter, async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'O prompt é obrigatório.' });
    }

    // Pega a chave do arquivo .env (seguro)
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
        console.error("ERRO: Chave GEMINI_API_KEY não encontrada no .env");
        return res.status(500).json({ error: "Erro de configuração no servidor." });
    }

    // Modelo configurado.
    // Se você cadastrar o cartão e quiser usar o 2.0, mude aqui para "gemini-2.0-flash"
    const MODEL = "gemini-flash-latest"; 
    
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Erro na resposta do Google Gemini');
        }

        // Devolve a resposta do Google para o seu front-end
        res.json(data);

    } catch (error) {
        console.error("Erro no servidor Chef IA:", error.message);
        res.status(500).json({ 
            error: "Erro ao processar a solicitação da IA.",
            details: error.message 
        });
    }
});

// Rota padrão para entregar o index.html em qualquer outra URL
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`✅ Servidor rodando em http://localhost:${port}`);
    console.log(`🔐 Modo: ${process.env.NODE_ENV || 'development'}`);
});