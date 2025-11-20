import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function renamePhoneColumn() {
  try {
    console.log('🔍 Checking if phone column rename is needed...');

    // Check if user_phone column exists
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('phone', 'user_phone')
      ORDER BY column_name;
    `;

    const hasPhone = result.some((r) => r.column_name === 'phone');
    const hasUserPhone = result.some((r) => r.column_name === 'user_phone');

    if (hasUserPhone) {
      console.log('✅ Column user_phone already exists');
      return;
    }

    if (hasPhone) {
      console.log('⚠️  Column "phone" exists but "user_phone" does not. Renaming...');
      await prisma.$executeRaw`ALTER TABLE "users" RENAME COLUMN "phone" TO "user_phone";`;
      console.log('✅ Column renamed successfully from "phone" to "user_phone"');
    } else {
      console.log('⚠️  Neither "phone" nor "user_phone" column exists');
    }
  } catch (error) {
    console.error('❌ Error renaming column:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

renamePhoneColumn()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

