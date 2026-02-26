import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ActivationReport {
  timestamp: string;
  totalUsers: number;
  alreadyActive: number;
  activated: number;
  errors: string[];
  details: Array<{
    userId: string;
    username: string;
    phone: string | null;
    previousStatus: boolean;
    action: 'already_active' | 'activated';
  }>;
}

async function activateAllUsers() {
  console.log('🚀 Starting to activate all users...\n');

  const report: ActivationReport = {
    timestamp: new Date().toISOString(),
    totalUsers: 0,
    alreadyActive: 0,
    activated: 0,
    errors: [],
    details: [],
  };

  // Get all users
  console.log('📦 Fetching all users from database...');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      phone: true,
      isActive: true,
      firstName: true,
      lastName: true,
    },
  });

  report.totalUsers = users.length;
  console.log(`✅ Found ${users.length} users\n`);

  if (users.length === 0) {
    console.log('⚠️ No users found.');
    await prisma.$disconnect();
    return;
  }

  // Separate already active and inactive users
  const inactiveUsers = users.filter(u => !u.isActive);
  report.alreadyActive = users.filter(u => u.isActive).length;

  console.log(`📊 Status summary:`);
  console.log(`   Already active: ${report.alreadyActive}`);
  console.log(`   Inactive (will activate): ${inactiveUsers.length}\n`);

  if (inactiveUsers.length === 0) {
    console.log('✅ All users are already active.');
    await prisma.$disconnect();
    return;
  }

  // Show sample of inactive users
  console.log('Sample of users to activate:');
  inactiveUsers.slice(0, 5).forEach(user => {
    console.log(`   - ${user.phone || user.username} (${user.firstName} ${user.lastName})`);
  });
  if (inactiveUsers.length > 5) {
    console.log(`   ... and ${inactiveUsers.length - 5} more\n`);
  }

  // Confirm before activation
  console.log(`\n⚠️  About to activate ${inactiveUsers.length} users`);
  console.log('Set DRY_RUN=false to actually activate\n');

  const dryRun = process.env.DRY_RUN !== 'false';

  if (dryRun) {
    console.log('🏃 DRY RUN MODE - No changes will be made');
    console.log('Run with DRY_RUN=false to activate these users');
    await prisma.$disconnect();
    return;
  }

  // Activate users
  console.log('\n📝 Activating users...\n');

  for (const user of users) {
    try {
      if (user.isActive) {
        report.details.push({
          userId: user.id,
          username: user.username,
          phone: user.phone,
          previousStatus: true,
          action: 'already_active',
        });
        continue;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true },
      });

      report.activated++;
      report.details.push({
        userId: user.id,
        username: user.username,
        phone: user.phone,
        previousStatus: false,
        action: 'activated',
      });

      console.log(`✅ Activated: ${user.phone || user.username}`);
    } catch (error: any) {
      const errorMsg = `Error activating user ${user.id}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      report.errors.push(errorMsg);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL REPORT');
  console.log('='.repeat(60));
  console.log(`Total users: ${report.totalUsers}`);
  console.log(`Already active: ${report.alreadyActive}`);
  console.log(`Activated: ${report.activated}`);
  console.log(`Errors: ${report.errors.length}`);
  console.log('='.repeat(60));

  if (report.errors.length > 0) {
    console.log('\n❌ Errors:');
    report.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
    if (report.errors.length > 5) {
      console.log(`   ... and ${report.errors.length - 5} more`);
    }
  }

  // Save report
  const fs = await import('fs');
  const path = await import('path');
  const reportPath = path.join(
    process.cwd(),
    '..',
    'moc-old-data',
    `activate-users-report-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

activateAllUsers()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
