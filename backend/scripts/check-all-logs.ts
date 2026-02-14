import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const logs = await prisma.log.findMany({
    where: {
      createdAt: { gte: yesterday },
      level: 'ERROR'
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  console.log(`Found ${logs.length} error logs from the last 24 hours:`);
  console.log(JSON.stringify(logs.map(l => ({
    id: l.id,
    level: l.level,
    message: l.message,
    url: l.url,
    statusCode: l.statusCode,
    createdAt: l.createdAt
  })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());





















