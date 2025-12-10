const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authRequired, requireRole } = require('../middleware/auth');

// public
router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);

// admin-only
router.post('/', authRequired, requireRole('ADMIN'), productController.createProduct);
router.put('/:id', authRequired, requireRole('ADMIN'), productController.updateProduct);
router.delete('/:id', authRequired, requireRole('ADMIN'), productController.deleteProduct);

module.exports = router;
