import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://haghighi_user:ChangeThisPassword123!@127.0.0.1:5433/haghighi_db?schema=public',
    },
  },
});

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: {
      id: true,
      email: true,
      username: true,
      phone: true,
      isActive: true,
    },
  });

  console.log('Admin Users:');
  console.log(JSON.stringify(admins, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

