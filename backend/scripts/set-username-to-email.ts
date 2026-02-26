import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UpdateReport {
  timestamp: string;
  totalFound: number;
  updated: number;
  skipped: number;
  errors: string[];
  details: Array<{
    userId: string;
    oldUsername: string;
    newUsername: string;
    email: string | null;
    action: 'updated' | 'skipped_no_email' | 'skipped_conflict';
  }>;
}

async function setUsernameToEmail() {
  console.log('🔍 Finding users with email but no phone number...\n');

  const report: UpdateReport = {
    timestamp: new Date().toISOString(),
    totalFound: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  // Find users who have email but no phone
  // and username is NOT already set to email
  const usersToUpdate = await prisma.user.findMany({
    where: {
      AND: [
        { email: { not: null } },
        { phone: null },
        {
          username: {
            not: {
              startsWith: '',
            },
          },
        },
      ],
    },
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  report.totalFound = usersToUpdate.length;
  console.log(`Found ${usersToUpdate.length} users with email but no phone:\n`);

  if (usersToUpdate.length === 0) {
    console.log('✅ No users to update.');
    await prisma.$disconnect();
    return;
  }

  // Display the users
  for (const user of usersToUpdate) {
    console.log(`ID: ${user.id}`);
    console.log(`Current Username: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log(`Phone: ${user.phone || 'N/A'}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Role: ${user.role}`);
    console.log('─'.repeat(50));
  }

  // Confirm before update
  console.log(`\n⚠️  About to update ${usersToUpdate.length} users`);
  console.log('Set DRY_RUN=false to actually update\n');

  const dryRun = process.env.DRY_RUN !== 'false';

  if (dryRun) {
    console.log('🏃 DRY RUN MODE - No users will be updated');
    console.log('Run with DRY_RUN=false to update these users');
    await prisma.$disconnect();
    return;
  }

  // Update users
  console.log('\n📝 Starting username updates...\n');

  for (const user of usersToUpdate) {
    try {
      // Skip if no email
      if (!user.email) {
        console.log(`   ⚠️ Skipped: ${user.username} - No email`);
        report.skipped++;
        report.details.push({
          userId: user.id,
          oldUsername: user.username,
          newUsername: user.username,
          email: null,
          action: 'skipped_no_email',
        });
        continue;
      }

      const newUsername = user.email.toLowerCase().trim();

      // Check if email is already used as username by another user
      const existingUser = await prisma.user.findUnique({
        where: { username: newUsername },
      });

      if (existingUser && existingUser.id !== user.id) {
        // Conflict - email already used as username by someone else
        console.log(`   ⚠️ Skipped: ${user.username} - Email ${newUsername} already used as username`);
        report.skipped++;
        report.details.push({
          userId: user.id,
          oldUsername: user.username,
          newUsername: user.username,
          email: user.email,
          action: 'skipped_conflict',
        });
        continue;
      }

      // Update username to email
      await prisma.user.update({
        where: { id: user.id },
        data: { username: newUsername },
      });

      console.log(`✅ Updated: ${user.username} → ${newUsername}`);
      report.updated++;
      report.details.push({
        userId: user.id,
        oldUsername: user.username,
        newUsername,
        email: user.email,
        action: 'updated',
      });
    } catch (error: any) {
      const errorMsg = `Error updating user ${user.id}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      report.errors.push(errorMsg);
    }
  }

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Found: ${report.totalFound}`);
  console.log(`   Updated: ${report.updated}`);
  console.log(`   Skipped: ${report.skipped}`);
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
    `email-username-update-report-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

setUsernameToEmail()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
