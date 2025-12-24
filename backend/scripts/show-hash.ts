import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: '09126451710' },
    select: { password: true }
  });
  console.log('Password hash:', user?.password);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());







