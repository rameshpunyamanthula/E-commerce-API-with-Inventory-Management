/**
 * Usage: node scripts/seedAdmin.js
 * It will create or update an admin user with credentials printed to the console.
 */
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
require('dotenv').config();

const prisma = new PrismaClient();

async function run() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "adminpass123";

  const hashed = await bcrypt.hash(password, 10);

  const upsert = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, role: "ADMIN" },
    create: { email, password: hashed, role: "ADMIN" },
    select: { id: true, email: true, role: true },
  });

  console.log("Admin user upserted:", upsert);
  console.log("Admin credentials -> email:", email, "password:", password);
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
