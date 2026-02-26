import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteUsersWithConcatenatedPhones() {
  console.log('🔍 Finding users with concatenated phone numbers...\n');

  // Find users where username or phone contains - or /
  const usersToDelete = await prisma.user.findMany({
    where: {
      OR: [
        // Username contains - or /
        {
          username: {
            contains: '-',
          },
        },
        {
          username: {
            contains: '/',
          },
        },
        // Phone contains - or /
        {
          phone: {
            contains: '-',
          },
        },
        {
          phone: {
            contains: '/',
          },
        },
      ],
    },
    select: {
      id: true,
      username: true,
      phone: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log(`Found ${usersToDelete.length} users with concatenated phones:\n`);

  if (usersToDelete.length === 0) {
    console.log('✅ No users to delete.');
    await prisma.$disconnect();
    return;
  }

  // Display the users
  for (const user of usersToDelete) {
    console.log(`ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Phone: ${user.phone}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log('─'.repeat(50));
  }

  // Confirm before deletion
  console.log(`\n⚠️  About to delete ${usersToDelete.length} users`);
  console.log('Set DRY_RUN=false to actually delete\n');

  const dryRun = process.env.DRY_RUN !== 'false';

  if (dryRun) {
    console.log('🏃 DRY RUN MODE - No users will be deleted');
    console.log('Run with DRY_RUN=false to delete these users');
    await prisma.$disconnect();
    return;
  }

  // Delete users
  console.log('\n🗑️  Starting deletion...\n');

  let deletedCount = 0;
  let errorCount = 0;

  for (const user of usersToDelete) {
    try {
      // Delete related records first
      await prisma.courseEnrollment.deleteMany({
        where: { userId: user.id },
      });

      await prisma.videoAccess.deleteMany({
        where: { userId: user.id },
      });

      await prisma.audioAccess.deleteMany({
        where: { userId: user.id },
      });

      await prisma.oldProduct.deleteMany({
        where: { userId: user.id },
      });

      await prisma.transaction.deleteMany({
        where: { userId: user.id },
      });

      await prisma.invoice.deleteMany({
        where: { userId: user.id },
      });

      await prisma.userMessage.deleteMany({
        where: { userId: user.id },
      });

      await prisma.wallet.deleteMany({
        where: { userId: user.id },
      });

      await prisma.workshopParticipant.deleteMany({
        where: { createdBy: user.id },
      });

      await prisma.salesTeamMember.deleteMany({
        where: { salesPersonId: user.id },
      });

      await prisma.salesPersonWorkshopAccess.deleteMany({
        where: { salesPersonId: user.id },
      });

      // Finally delete the user
      await prisma.user.delete({
        where: { id: user.id },
      });

      console.log(`✅ Deleted: ${user.username} (${user.phone})`);
      deletedCount++;
    } catch (error: any) {
      console.error(`❌ Error deleting ${user.username}: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Deleted: ${deletedCount}`);
  console.log(`   Errors: ${errorCount}`);

  await prisma.$disconnect();
}

deleteUsersWithConcatenatedPhones()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
