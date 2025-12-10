// src/routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const { addItem, getCart, deleteCartItem } = require('../controllers/cartController');
const { authRequired } = require('../middleware/auth');

// Add item to cart (customer only — auth required)
router.post('/items', authRequired, addItem);

// Get current user's cart
router.get('/', authRequired, getCart);

// Delete cart item by id
router.delete('/items/:id', authRequired, deleteCartItem);

module.exports = router;
