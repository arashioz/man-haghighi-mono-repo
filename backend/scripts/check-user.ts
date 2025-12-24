import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const phone = '09126451710';
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone },
        { username: phone },
        { email: phone }
      ]
    }
  });

  if (user && user.password) {
    console.log('User found:');
    console.log(JSON.stringify({
      id: user.id,
      phone: user.phone,
      username: user.username,
      isOld: user.isOld,
      mustChangePassword: user.mustChangePassword,
    }, null, 2));

    const defaultPassword = 'user123';
    const isValid = await bcrypt.compare(defaultPassword, user.password);
    console.log(`Password check ("${defaultPassword}"): ${isValid}`);
    
    // Also test another common password just in case
    const altPassword = 'password123';
    const isAltValid = await bcrypt.compare(altPassword, user.password);
    console.log(`Password check ("${altPassword}"): ${isAltValid}`);
  } else if (user) {
    console.log('User found but has no password set.');
  } else {
    console.log('User not found.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
