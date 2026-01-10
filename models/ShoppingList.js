const mongoose = require('mongoose');

const shoppingListSchema = new mongoose.Schema({
    userId: { // <-- ADICIONADO
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: { type: String, required: true },
    items: [ { text: String, checked: { type: Boolean, default: false } } ],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ShoppingList', shoppingListSchema);