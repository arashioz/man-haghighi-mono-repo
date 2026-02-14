import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://haghighi_user:ChangeThisPassword123!@127.0.0.1:5433/haghighi_db?schema=public',
    },
  },
});

async function main() {
  const users = await prisma.user.findMany({
    where: { isBlocked: true },
    select: {
      id: true,
      username: true,
      phone: true,
      blockedUntil: true,
      rateLimitViolations: true,
    },
  });

  console.log('Blocked Users:');
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());





















