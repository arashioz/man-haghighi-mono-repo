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
  logs.forEach(log => {
    console.log(`[${log.createdAt}] ${log.method} ${log.url} ${log.statusCode} - ${log.message}`);
    if (log.requestBody) {
      console.log(`  Body: ${JSON.stringify(log.requestBody)}`);
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());














