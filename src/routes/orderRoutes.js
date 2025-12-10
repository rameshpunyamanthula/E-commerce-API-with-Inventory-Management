// src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { placeOrder, getOrder } = require('../controllers/orderController');
const { authRequired } = require('../middleware/auth');

// Place order from cart (customer)
router.post('/', authRequired, placeOrder);

// Get a specific order (customer)
router.get('/:id', authRequired, getOrder);

module.exports = router;
