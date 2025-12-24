import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.log.findMany({
    where: {
      url: { contains: 'auth/login' }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('Last 10 login logs:');
  console.log(JSON.stringify(logs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

