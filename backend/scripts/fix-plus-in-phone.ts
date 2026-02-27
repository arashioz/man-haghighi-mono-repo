import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FixReport {
  timestamp: string;
  totalFound: number;
  fixed: number;
  errors: string[];
  details: Array<{
    userId: string;
    username: string;
    oldPhone: string;
    newPhone: string;
  }>;
}

async function fixPlusInPhone() {
  console.log('🔍 Finding users with + in phone number...\n');

  const report: FixReport = {
    timestamp: new Date().toISOString(),
    totalFound: 0,
    fixed: 0,
    errors: [],
    details: [],
  };

  // Find users where phone starts with +
  const usersToFix = await prisma.user.findMany({
    where: {
      phone: {
        startsWith: '+',
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

  report.totalFound = usersToFix.length;
  console.log(`Found ${usersToFix.length} users with + in phone number:\n`);

  if (usersToFix.length === 0) {
    console.log('✅ No users need fixing.');
    await prisma.$disconnect();
    return;
  }

  // Display the users
  for (const user of usersToFix) {
    const newPhone = user.phone!.replace(/^\+/, ''); // Remove + from start
    
    console.log(`ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Old Phone: ${user.phone}`);
    console.log(`New Phone: ${newPhone}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log('─'.repeat(50));

    report.details.push({
      userId: user.id,
      username: user.username,
      oldPhone: user.phone!,
      newPhone: newPhone,
    });
  }

  // Confirm before update
  console.log(`\n⚠️  About to fix ${usersToFix.length} phone numbers`);
  console.log('Set DRY_RUN=false to actually update\n');

  const dryRun = process.env.DRY_RUN !== 'false';

  if (dryRun) {
    console.log('🏃 DRY RUN MODE - No changes will be made');
    console.log('Run with DRY_RUN=false to fix phone numbers');
    await prisma.$disconnect();
    return;
  }

  // Fix phone numbers
  console.log('\n📝 Starting phone number fixes...\n');

  for (const user of usersToFix) {
    try {
      const newPhone = user.phone!.replace(/^\+/, ''); // Remove + from start
      
      await prisma.user.update({
        where: { id: user.id },
        data: { phone: newPhone },
      });

      console.log(`✅ Fixed: ${user.phone} → ${newPhone}`);
      report.fixed++;
    } catch (error: any) {
      const errorMsg = `Error fixing user ${user.username}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      report.errors.push(errorMsg);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Found: ${report.totalFound}`);
  console.log(`   Fixed: ${report.fixed}`);
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
    `fix-plus-phone-report-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

fixPlusInPhone()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
