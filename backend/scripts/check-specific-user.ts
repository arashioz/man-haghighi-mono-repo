import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://haghighi_user:ChangeThisPassword123!@127.0.0.1:5433/haghighi_db?schema=public',
    },
  },
});

async function main() {
  const identifier = '09126451710';
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: identifier },
        { email: identifier },
        { username: identifier }
      ]
    },
    select: {
      id: true,
      email: true,
      username: true,
      phone: true,
      role: true,
      isActive: true,
      password: true,
      isOld: true,
    }
  });

  if (user) {
    console.log('User Found:');
    console.log(JSON.stringify({ ...user, password: user.password ? '[SET]' : '[NOT SET]' }, null, 2));
    
    // Check common passwords
    const passwords = ['user123', 'password123', 'admin123', '123456'];
    for (const pwd of passwords) {
      if (user.password) {
        const isMatch = await bcrypt.compare(pwd, user.password);
        console.log(`Password "${pwd}" matches: ${isMatch}`);
      }
    }
  } else {
    console.log('User not found.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

