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

async function fix9DigitPhones() {
  console.log('🔍 Finding users with 9-digit phone numbers (missing 0)...\n');

  const report: FixReport = {
    timestamp: new Date().toISOString(),
    totalFound: 0,
    fixed: 0,
    errors: [],
    details: [],
  };

  // Get all users with phone numbers
  const usersWithPhone = await prisma.user.findMany({
    where: {
      phone: {
        not: null,
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

  // Filter users with 9-digit phones that don't start with 0
  const usersToFix = usersWithPhone.filter(user => {
    const phone = user.phone!;
    // Check if it's exactly 9 digits and doesn't start with 0
    return phone.length === 9 && /^9\d{8}$/.test(phone);
  });

  report.totalFound = usersToFix.length;
  console.log(`Found ${usersToFix.length} users with 9-digit phone numbers:\n`);

  if (usersToFix.length === 0) {
    console.log('✅ No users need fixing.');
    await prisma.$disconnect();
    return;
  }

  // Display the users
  for (const user of usersToFix) {
    const newPhone = '0' + user.phone!; // Add 0 at the beginning
    
    console.log(`ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Old Phone: ${user.phone} (9 digits)`);
    console.log(`New Phone: ${newPhone} (10 digits)`);
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
      const newPhone = '0' + user.phone!; // Add 0 at the beginning
      
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
    `fix-9-digit-phones-report-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

fix9DigitPhones()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
