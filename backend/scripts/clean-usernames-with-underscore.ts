import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CleanReport {
  timestamp: string;
  totalFound: number;
  cleaned: number;
  errors: string[];
  details: Array<{
    userId: string;
    oldUsername: string;
    newUsername: string;
    phone: string | null;
  }>;
}

async function cleanUsernamesWithUnderscore() {
  console.log('🔍 Finding users with underscore in username...\n');

  const report: CleanReport = {
    timestamp: new Date().toISOString(),
    totalFound: 0,
    cleaned: 0,
    errors: [],
    details: [],
  };

  // Find users where username contains underscore
  const usersToClean = await prisma.user.findMany({
    where: {
      username: {
        contains: '_',
      },
    },
    select: {
      id: true,
      username: true,
      phone: true,
      firstName: true,
      lastName: true,
    },
  });

  report.totalFound = usersToClean.length;
  console.log(`Found ${usersToClean.length} users with underscore in username:\n`);

  if (usersToClean.length === 0) {
    console.log('✅ No users to clean.');
    await prisma.$disconnect();
    return;
  }

  // Display the users
  for (const user of usersToClean) {
    // Extract phone number part (everything before underscore)
    const parts = user.username.split('_');
    const newUsername = parts[0]; // Keep only the phone number part

    console.log(`ID: ${user.id}`);
    console.log(`Current Username: ${user.username}`);
    console.log(`New Username: ${newUsername}`);
    console.log(`Phone: ${user.phone}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log('─'.repeat(50));

    report.details.push({
      userId: user.id,
      oldUsername: user.username,
      newUsername: newUsername,
      phone: user.phone,
    });
  }

  // Confirm before update
  console.log(`\n⚠️  About to clean ${usersToClean.length} usernames`);
  console.log('Set DRY_RUN=false to actually update\n');

  const dryRun = process.env.DRY_RUN !== 'false';

  if (dryRun) {
    console.log('🏃 DRY RUN MODE - No users will be updated');
    console.log('Run with DRY_RUN=false to update these users');
    await prisma.$disconnect();
    return;
  }

  // Update users
  console.log('\n📝 Starting username cleanup...\n');

  for (const user of usersToClean) {
    try {
      const parts = user.username.split('_');
      const newUsername = parts[0];

      // Check if new username already exists (conflict)
      const existingUser = await prisma.user.findUnique({
        where: { username: newUsername },
      });

      if (existingUser && existingUser.id !== user.id) {
        // If conflict, append a random suffix to make it unique
        const uniqueSuffix = Math.random().toString(36).substring(2, 6);
        const uniqueUsername = `${newUsername}_${uniqueSuffix}`;
        
        await prisma.user.update({
          where: { id: user.id },
          data: { username: uniqueUsername },
        });
        
        console.log(`✅ Updated: ${user.username} → ${uniqueUsername} (conflict resolved)`);
      } else {
        // No conflict, use the clean phone number as username
        await prisma.user.update({
          where: { id: user.id },
          data: { username: newUsername },
        });
        
        console.log(`✅ Updated: ${user.username} → ${newUsername}`);
      }
      
      report.cleaned++;
    } catch (error: any) {
      const errorMsg = `Error updating user ${user.id}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      report.errors.push(errorMsg);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Found: ${report.totalFound}`);
  console.log(`   Cleaned: ${report.cleaned}`);
  console.log(`   Errors: ${report.errors.length}`);

  if (report.errors.length > 0) {
    console.log('\n❌ Errors:');
    report.errors.forEach(e => console.log(`   - ${e}`));
  }

  // Save report
  const fs = await import('fs');
  const path = await import('path');
  const reportPath = path.join(
    process.cwd(),
    '..',
    'moc-old-data',
    `username-cleanup-report-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

cleanUsernamesWithUnderscore()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
