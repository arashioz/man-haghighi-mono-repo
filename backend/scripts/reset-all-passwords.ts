import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const NEW_PASSWORD = 'user123';

async function resetAllPasswords() {
  const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
  console.log(`Hashing new password for all users (salt rounds: ${saltRounds})...`);

  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, saltRounds);

  const result = await prisma.user.updateMany({
    data: {
      password: hashedPassword,
      mustChangePassword: false,
    },
  });

  console.log(`Passwords updated for ${result.count} users.`);
}

resetAllPasswords()
  .catch((error) => {
    console.error('Failed to reset passwords:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

