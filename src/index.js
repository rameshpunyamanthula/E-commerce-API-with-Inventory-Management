require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();
app.use(express.json());

// routes
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
app.use("/cart", cartRoutes);

const orderRoutes = require("./routes/orderRoutes");
app.use("/orders", orderRoutes);

app.use("/auth", authRoutes);
app.use("/products", productRoutes);

// middleware
const { authRequired, requireRole } = require("./middleware/auth");

app.get('/', (req, res) => res.json({ ok: true }));

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ db: 'ok' });
  } catch (err) {
    console.error('DB health failed', err);
    res.status(500).json({ db: 'error', error: err.message });
  }
});

// protected endpoints for testing
app.get('/protected', authRequired, (req, res) => {
  res.json({ message: 'protected content', user: req.user });
});

app.get('/admin-only', authRequired, requireRole('ADMIN'), (req, res) => {
  res.json({ message: 'admin content', user: req.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on', PORT));
