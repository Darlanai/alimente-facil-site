require('dotenv').config();

async function listarModelos() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("❌ ERRO: Chave não encontrada no .env");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("\n✅ MODELOS DISPONÍVEIS NA SUA CONTA:");
            console.log("=====================================");
            data.models.forEach(m => {
                // Filtra apenas os modelos que geram conteúdo (chat)
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name.replace('models/', '')}`);
                }
            });
            console.log("=====================================\n");
        } else {
            console.error("❌ Erro ao listar modelos:", data);
        }
    } catch (error) {
        console.error("❌ Erro de conexão:", error.message);
    }
}

listarModelos();