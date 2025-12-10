// src/controllers/orderController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { redis } = require("../utils/redisClient");

module.exports = {
  placeOrder: async (req, res) => {
    const userId = req.user.id;

    try {
      // 1) Load cart with product + version + price info
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Will accumulate total
        let totalAmount = 0;

        // 2) STOCK UPDATE (optimistic locking) for each item
        for (const item of cart.items) {
          const product = item.product;
          const qty = item.quantity;

          const updateRes = await tx.product.updateMany({
            where: {
              id: product.id,
              version: product.version,
              stockQuantity: { gte: qty },
            },
            data: {
              stockQuantity: { decrement: qty },
              version: { increment: 1 },
            },
          });

          if (!updateRes || updateRes.count === 0) {
            throw new Error(
              `Concurrent update detected or insufficient stock for product ${product.id}`
            );
          }

          const itemPrice = Number(product.price);
          totalAmount += itemPrice * qty;
        }

        // 3) Create order
        const order = await tx.order.create({
          data: {
            userId,
            totalAmount,
            status: "PENDING",
          },
        });

        // 4) Create order items
        for (const item of cart.items) {
          const product = item.product;
          const qty = item.quantity;

          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: product.id,
              quantity: qty,
              priceSnapshot: product.price,
            },
          });
        }

        // 5) Clear cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        return { orderId: order.id, totalAmount };
      });

      // 6) ENQUEUE BACKGROUND JOB (email)
      const emailJob = {
        type: "order_confirmation",
        userId,
        orderId: result.orderId,
        timestamp: Date.now(),
      };

      await redis.lpush("queue:emails", JSON.stringify(emailJob));

      return res.status(201).json({
        message: "Order created successfully",
        order: result,
      });
    } catch (err) {
      console.error("placeOrder ERROR:", err.message);
      return res.status(500).json({ error: err.message });
    }
  },

  getOrder: async (req, res) => {
    const userId = req.user.id;
    const id = parseInt(req.params.id, 10);

    try {
      const order = await prisma.order.findFirst({
        where: { id, userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      return res.json(order);
    } catch (err) {
      console.error("getOrder ERROR:", err.message);
      return res.status(500).json({ error: err.message });
    }
  },
};
