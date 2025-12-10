const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const prod = await prisma.product.findUnique({ where: { id: 1 } });
  console.log(prod);
  await prisma.$disconnect();
})();
