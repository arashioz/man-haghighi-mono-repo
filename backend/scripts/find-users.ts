import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const login = '09126451710';
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: login },
        { phone: login },
        { email: login }
      ]
    }
  });

  console.log(`Found ${users.length} users matching "${login}":`);
  users.forEach(u => {
    console.log(`- ID: ${u.id}, Phone: ${u.phone}, Username: ${u.username}, Role: ${u.role}, IsActive: ${u.isActive}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

















