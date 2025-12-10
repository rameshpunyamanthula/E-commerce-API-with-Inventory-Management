// src/controllers/cartController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Assumes req.user is set by auth middleware (req.user.id)
 */

/**
 * POST /cart/items
 * Body: { productId: number, quantity: number }
 * - creates cart if missing
 * - creates or increments cart item quantity
 */
async function addItem(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const { productId, quantity } = req.body;
    const qty = parseInt(quantity, 10) || 0;
    if (!productId || qty <= 0) return res.status(400).json({ message: 'productId and positive quantity required' });

    // ensure product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // get or create cart for user
    let cart = await prisma.cart.findUnique({ where: { userId }, include: { items: true } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId }, include: { items: true } });
    }

    // check if cart item exists
    const existing = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    if (existing) {
      // update quantity
      const updated = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + qty },
      });
      // return the full cart
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity: qty },
      });
    }

    // return full cart with product details
    const fullCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    return res.status(201).json({ message: 'Item added', cart: fullCart });
  } catch (err) {
    console.error('addItem err', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /cart
 * - returns the user's cart and items with product snapshots
 */
async function getCart(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart) return res.json({ cart: null, items: [] });

    return res.json({ cart });
  } catch (err) {
    console.error('getCart err', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /cart/items/:id
 * - deletes a cart item by id (only if belongs to the authenticated user's cart)
 */
async function deleteCartItem(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const itemId = parseInt(req.params.id, 10);
    if (!itemId) return res.status(400).json({ message: 'Invalid item id' });

    // fetch item and its cart
    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item) return res.status(404).json({ message: 'Cart item not found' });

    if (item.cart.userId !== userId) return res.status(403).json({ message: 'Forbidden' });

    await prisma.cartItem.delete({ where: { id: itemId } });

    // return updated cart
    const cart = await prisma.cart.findUnique({
      where: { id: item.cartId },
      include: { items: { include: { product: true } } },
    });

    return res.json({ message: 'Item removed', cart });
  } catch (err) {
    console.error('deleteCartItem err', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { addItem, getCart, deleteCartItem };
