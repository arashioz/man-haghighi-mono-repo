import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FixReport {
  timestamp: string;
  totalFound: number;
  fixed: number;
  skipped: number;
  errors: string[];
  details: Array<{
    userId: string;
    oldUsername: string;
    newUsername: string;
    phone: string | null;
    action: 'fixed' | 'skipped_conflict' | 'skipped_same';
  }>;
}

// Extract phone number from username like "09126893082_wm82wd_2"
function extractPhoneFromUsername(username: string): string | null {
  // Pattern: phone number (starts with 0, 11 digits) followed by underscore
  const match = username.match(/^(0\d{10})_/);
  if (match) {
    return match[1]; // Return just the phone number part
  }
  return null;
}

async function extractPhoneToUsername() {
  console.log('🔍 Finding users with phone+random in username...\n');

  const report: FixReport = {
    timestamp: new Date().toISOString(),
    totalFound: 0,
    fixed: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  // Get all users
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      phone: true,
      firstName: true,
      lastName: true,
    },
  });

  // Find users with phone_number_pattern followed by underscore
  const usersToFix = allUsers.filter(user => {
    const extractedPhone = extractPhoneFromUsername(user.username);
    return extractedPhone !== null;
  });

  report.totalFound = usersToFix.length;
  console.log(`Found ${usersToFix.length} users with phone+random pattern:\n`);

  if (usersToFix.length === 0) {
    console.log('✅ No users need fixing.');
    await prisma.$disconnect();
    return;
  }

  // Display the users
  for (const user of usersToFix) {
    const extractedPhone = extractPhoneFromUsername(user.username)!;
    
    console.log(`ID: ${user.id}`);
    console.log(`Current Username: ${user.username}`);
    console.log(`Extracted Phone: ${extractedPhone}`);
    console.log(`Current Phone field: ${user.phone || 'N/A'}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log('─'.repeat(50));
  }

  // Confirm before update
  console.log(`\n⚠️  About to fix ${usersToFix.length} usernames`);
  console.log('Set DRY_RUN=false to actually update\n');

  const dryRun = process.env.DRY_RUN !== 'false';

  if (dryRun) {
    console.log('🏃 DRY RUN MODE - No changes will be made');
    console.log('Run with DRY_RUN=false to fix usernames');
    await prisma.$disconnect();
    return;
  }

  // Fix usernames
  console.log('\n📝 Starting username fixes...\n');

  for (const user of usersToFix) {
    try {
      const extractedPhone = extractPhoneFromUsername(user.username)!;
      
      // Check if this phone is already used as username by another user
      const existingUser = await prisma.user.findUnique({
        where: { username: extractedPhone },
      });

      if (existingUser && existingUser.id !== user.id) {
        console.log(`   ⚠️ Skipped: ${user.username} - Phone ${extractedPhone} already used by another user`);
        report.skipped++;
        report.details.push({
          userId: user.id,
          oldUsername: user.username,
          newUsername: user.username,
          phone: user.phone,
          action: 'skipped_conflict',
        });
        continue;
      }

      // Check if username is already the phone number
      if (user.username === extractedPhone) {
        console.log(`   ℹ️ Skipped: ${user.username} - Already correct`);
        report.skipped++;
        report.details.push({
          userId: user.id,
          oldUsername: user.username,
          newUsername: extractedPhone,
          phone: user.phone,
          action: 'skipped_same',
        });
        continue;
      }

      // Update username to just the phone number
      await prisma.user.update({
        where: { id: user.id },
        data: { username: extractedPhone },
      });

      // Also update phone field if it's null or different
      if (!user.phone || user.phone !== extractedPhone) {
        await prisma.user.update({
          where: { id: user.id },
          data: { phone: extractedPhone },
        });
      }

      console.log(`✅ Fixed: ${user.username} → ${extractedPhone}`);
      report.fixed++;
      report.details.push({
        userId: user.id,
        oldUsername: user.username,
        newUsername: extractedPhone,
        phone: extractedPhone,
        action: 'fixed',
      });
    } catch (error: any) {
      const errorMsg = `Error fixing user ${user.username}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      report.errors.push(errorMsg);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Found: ${report.totalFound}`);
  console.log(`   Fixed: ${report.fixed}`);
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
    `extract-phone-username-report-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

extractPhoneToUsername()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
