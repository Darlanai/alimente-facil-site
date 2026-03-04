require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit'); 

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));

// Limite de segurança do seu servidor
const chefIALimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 30, 
    message: { 
        error: "Você atingiu o limite de perguntas ao Chef IA. Aguarde alguns minutos." 
    },
    standardHeaders: true, 
    legacyHeaders: false, 
});

// ----------------------------------------------------
// ROTA: Chef IA (Agora usando GROQ / LLaMA 3.3 70B)
// ----------------------------------------------------
app.post('/api/chef-ia', chefIALimiter, async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'O prompt é obrigatório.' });
    }

    // Pega a chave nova da Groq
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    if (!GROQ_API_KEY) {
        console.error("ERRO: Chave GROQ_API_KEY não encontrada no .env");
        return res.status(500).json({ error: "Erro de configuração no servidor." });
    }

    const URL = "https://api.groq.com/openai/v1/chat/completions";

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                // O modelo mais atual, poderoso e veloz da Groq
                model: "llama-3.3-70b-versatile", 
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3 
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Erro na resposta da IA');
        }

        // Isso aqui "engana" seu front-end pra ele achar que ainda é o Gemini
        const fakeGeminiFormat = {
            candidates: [
                {
                    content: {
                        parts: [
                            { text: data.choices[0].message.content }
                        ]
                    }
                }
            ]
        };

        return res.json(fakeGeminiFormat);

    } catch (error) {
        console.error("Erro no servidor Chef IA:", error.message);
        return res.status(500).json({ 
            error: "A Inteligência Artificial falhou ao processar o pedido.",
            details: error.message 
        });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`✅ Servidor rodando em http://localhost:${port}`);
    console.log(`🚀 Motor IA Atual: GROQ (LLaMA 3.3 70B)`);
});