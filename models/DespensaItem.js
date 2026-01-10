const mongoose = require('mongoose');

const despensaItemSchema = new mongoose.Schema({
    userId: { // <-- ADICIONADO
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unit: { type: String, required: true, default: 'un' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DespensaItem', despensaItemSchema);