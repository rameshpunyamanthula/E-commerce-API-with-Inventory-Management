// src/controllers/productController.js
const { PrismaClient } = require('@prisma/client');
const { redis, delByPattern } = require('../utils/redisClient');
const prisma = new PrismaClient();

const PRODUCTS_LIST_KEY_PREFIX = 'products:list:';

function makeCacheKey(query) {
  const { category = '', sort = '', page = 1, limit = 100 } = query;
  return PRODUCTS_LIST_KEY_PREFIX + [category, sort, page, limit].join('|');
}

module.exports = {
  // PUBLIC: GET /products?category=cat&sort=price_asc&page=1&limit=20
  listProducts: async (req, res) => {
    try {
      const { category, sort, page = 1, limit = 100 } = req.query;
      const pageInt = parseInt(page, 10) || 1;
      const limitInt = parseInt(limit, 10) || 100;

      const key = makeCacheKey({ category, sort, page: pageInt, limit: limitInt });
      const cached = await redis.get(key);
      if (cached) {
        return res.json({ source: 'cache', data: JSON.parse(cached) });
      }

      const where = {};
      if (category) where.category = category;

      const orderBy = {};
      if (sort === 'price_asc') orderBy.price = 'asc';
      else if (sort === 'price_desc') orderBy.price = 'desc';
      else orderBy.id = 'asc';

      const products = await prisma.product.findMany({
        where,
        orderBy,
        skip: (pageInt - 1) * limitInt,
        take: limitInt,
      });

      // cache result for 60 seconds
      await redis.set(key, JSON.stringify(products), 'EX', 60);

      return res.json({ source: 'db', data: products });
    } catch (err) {
      console.error('listProducts err', err);
      return res.status(500).json({ error: err.message });
    }
  },

  getProduct: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) return res.status(404).json({ message: 'Product not found' });
      return res.json(product);
    } catch (err) {
      console.error('getProduct err', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // ADMIN: create product
  createProduct: async (req, res) => {
    try {
      const { name, description, category, price, stockQuantity } = req.body;
      if (!name || price == null || stockQuantity == null) {
        return res.status(400).json({ message: 'name, price, stockQuantity required' });
      }
      const product = await prisma.product.create({
        data: {
          name,
          description: description || null,
          category: category || null,
          price,
          stockQuantity,
        },
      });

      // invalidate product list caches
      await delByPattern(PRODUCTS_LIST_KEY_PREFIX + '*');

      return res.status(201).json(product);
    } catch (err) {
      console.error('createProduct err', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // ADMIN: update product (increment version automatically if stock changed)
  updateProduct: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { name, description, category, price, stockQuantity } = req.body;

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: 'Product not found' });

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (price !== undefined) updateData.price = price;
      if (stockQuantity !== undefined) {
        updateData.stockQuantity = stockQuantity;
        // bump version when admin manually changes stock
        updateData.version = { increment: 1 };
      }

      const updated = await prisma.product.update({
        where: { id },
        data: updateData,
      });

      await delByPattern(PRODUCTS_LIST_KEY_PREFIX + '*');

      return res.json(updated);
    } catch (err) {
      console.error('updateProduct err', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // ADMIN: delete product
  deleteProduct: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await prisma.product.delete({ where: { id } });
      await delByPattern(PRODUCTS_LIST_KEY_PREFIX + '*');
      return res.json({ message: 'deleted' });
    } catch (err) {
      console.error('deleteProduct err', err);
      return res.status(500).json({ error: err.message });
    }
  },
};
