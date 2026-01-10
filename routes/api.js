const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const checkPremium = require('../middleware/checkPremium');
const DespensaItem = require('../models/DespensaItem');
const ShoppingList = require('../models/ShoppingList');

// Aplica o middleware de autenticação a TODAS as rotas deste arquivo
router.use(authMiddleware);

// --- ROTAS DA DESPENSA ---

// GET /api/despensa - Busca todos os itens da despensa do usuário
router.get('/despensa', async (req, res) => {
    try {
        const items = await DespensaItem.find({ userId: req.user.id });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar itens da despensa.' });
    }
});

// POST /api/despensa - Adiciona um item à despensa
router.post('/despensa', async (req, res) => {
    try {
        const { name, quantity, unit } = req.body;
        const newItem = new DespensaItem({
            name,
            quantity,
            unit,
            userId: req.user.id
        });
        await newItem.save();
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar item na despensa.' });
    }
});

// DELETE /api/despensa/:id - Remove um item da despensa
router.delete('/despensa/:id', async (req, res) => {
    try {
        const item = await DespensaItem.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!item) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }
        res.json({ message: 'Item removido com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover item da despensa.' });
    }
});


// --- ROTAS DAS LISTAS DE COMPRAS ---

// GET /api/listas - Busca todas as listas do usuário
router.get('/listas', async (req, res) => {
    try {
        const lists = await ShoppingList.find({ userId: req.user.id });
        res.json(lists);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar listas de compras.' });
    }
});

// POST /api/listas - Cria uma nova lista
router.post('/listas', async (req, res) => {
    try {
        const { name } = req.body;
        const newList = new ShoppingList({ name, userId: req.user.id });
        await newList.save();
        res.status(201).json(newList);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar lista de compras.' });
    }
});

// POST /api/listas/:id/items - Adiciona um item a uma lista
router.post('/listas/:id/items', async (req, res) => {
    try {
        const { text } = req.body;
        const list = await ShoppingList.findOne({ _id: req.params.id, userId: req.user.id });
        if (!list) return res.status(404).json({ message: 'Lista não encontrada.' });
        
        list.items.push({ text, checked: false });
        await list.save();
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar item à lista.' });
    }
});

// PUT /api/listas/:id/items/:index - Marca/desmarca um item
router.put('/listas/:id/items/:index', async (req, res) => {
    try {
        const list = await ShoppingList.findOne({ _id: req.params.id, userId: req.user.id });
        if (!list) return res.status(404).json({ message: 'Lista não encontrada.' });
        
        const itemIndex = parseInt(req.params.index, 10);
        if (list.items[itemIndex]) {
            list.items[itemIndex].checked = !list.items[itemIndex].checked;
            await list.save();
        }
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar item da lista.' });
    }
});

// POST /api/listas/:id/confirmar-compra - Move itens marcados para a despensa
router.post('/listas/:id/confirmar-compra', async (req, res) => {
    try {
        const list = await ShoppingList.findOne({ _id: req.params.id, userId: req.user.id });
        if (!list) return res.status(404).json({ message: 'Lista não encontrada.' });

        const itemsComprados = list.items.filter(item => item.checked);
        const itemsParaManter = list.items.filter(item => !item.checked);

        if (itemsComprados.length === 0) {
            return res.status(400).json({ message: 'Nenhum item marcado para confirmar.' });
        }

        // Adiciona os itens na despensa
        const despensaNovosItens = itemsComprados.map(item => ({
            name: item.text,
            quantity: 1, // Padrão, o usuário pode editar depois
            unit: 'un',
            userId: req.user.id
        }));
        await DespensaItem.insertMany(despensaNovosItens);

        // Atualiza a lista de compras, removendo os itens comprados
        list.items = itemsParaManter;
        await list.save();

        res.json({ message: `${itemsComprados.length} itens movidos para a despensa!` });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao confirmar a compra.' });
    }
});


// --- ROTA DO CHEF IA (PREMIUM) ---

// POST /api/chef/sugestao
// Aplica o middleware checkPremium apenas a esta rota
router.post('/chef/sugestao', checkPremium, (req, res) => {
    const { mood, despensa } = req.body;
    // Lógica para gerar uma sugestão com base nos dados...
    // Esta é uma lógica de exemplo, você pode integrar com uma IA real no futuro
    let sugestao = `Com base na sua despensa e no seu desejo de se sentir **${mood}**, sugiro uma receita incrível: `;
    if (despensa && despensa.length > 0) {
        sugestao += `**Salada Energética com ${despensa[0].name} e sementes.**`;
    } else {
        sugestao += `**Ovos mexidos com ervas finas.**`;
    }
    res.json({ message: sugestao });
});

module.exports = router;

