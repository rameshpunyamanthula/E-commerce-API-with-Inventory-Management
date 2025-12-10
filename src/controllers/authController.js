const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { generateToken } = require("../utils/jwt");

const prisma = new PrismaClient();

module.exports = {
  register: async (req, res) => {
    try {
      const { email, password, role } = req.body;
      if (!email || !password) return res.status(400).json({ message: "email and password required" });

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ message: "Email already exists" });

      const hashed = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashed,
          role: role || "CUSTOMER",
        },
        select: { id: true, email: true, role: true, createdAt: true }
      });

      return res.status(201).json({ message: "User registered", user });
    } catch (err) {
      console.error("Register error:", err);
      return res.status(500).json({ error: err.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "email and password required" });

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(400).json({ message: "Invalid credentials" });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ message: "Invalid credentials" });

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return res.json({ message: "Login successful", token });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: err.message });
    }
  },
};
