import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * نرمال‌سازی شماره موبایل:
 * - اگر با +98 شروع شد، تبدیل به 0...
 * - اگر با 9 شروع شد (بدون 0)، اضافه کردن 0 در اول
 * - اگر با 0 شروع شد، همونو نگه دار
 */
function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;

  let normalized = phone.trim();

  // اگر با +98 شروع شد
  if (normalized.startsWith('+98')) {
    normalized = '0' + normalized.slice(3);
  }
  // اگر با 9 شروع شد و 11 رقم بود (بدون 0 اول)
  else if (normalized.startsWith('9') && normalized.length === 10) {
    normalized = '0' + normalized;
  }
  // اگر با 98 شروع شد (بدون +)
  else if (normalized.startsWith('98') && normalized.length === 12) {
    normalized = '0' + normalized.slice(2);
  }

  return normalized;
}

async function normalizePhoneNumbers() {
  console.log('🚀 Starting phone number normalization...\n');

  // گرفتن همه کاربران با شماره موبایل
  const users = await prisma.user.findMany({
    where: {
      phone: {
        not: null,
      },
    },
    select: {
      id: true,
      phone: true,
      username: true,
    },
  });

  console.log(`📱 Found ${users.length} users with phone numbers\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const needsFix: Array<{ id: string; oldPhone: string; newPhone: string }> = [];

  for (const user of users) {
    if (!user.phone) continue;

    const normalizedPhone = normalizePhone(user.phone);

    // اگر تغییری لازم بود
    if (normalizedPhone && normalizedPhone !== user.phone) {
      needsFix.push({
        id: user.id,
        oldPhone: user.phone,
        newPhone: normalizedPhone,
      });
    } else {
      skipped++;
    }
  }

  console.log(`📊 Analysis complete:`);
  console.log(`  - Needs fix: ${needsFix.length}`);
  console.log(`  - Already correct: ${skipped}\n`);

  if (needsFix.length === 0) {
    console.log('✅ All phone numbers are already normalized!');
    await prisma.$disconnect();
    return;
  }

  // نمایش نمونه
  console.log('Sample changes:');
  needsFix.slice(0, 10).forEach((item) => {
    console.log(`  ${item.oldPhone} → ${item.newPhone}`);
  });
  if (needsFix.length > 10) {
    console.log(`  ... and ${needsFix.length - 10} more`);
  }
  console.log();

  // آپدیت کردن
  console.log('Updating phone numbers...\n');

  for (let i = 0; i < needsFix.length; i++) {
    const item = needsFix[i];

    if ((i + 1) % 100 === 0 || i === needsFix.length - 1) {
      console.log(`   Progress: ${i + 1}/${needsFix.length}`);
    }

    try {
      // چک کردن تکراری نبودن شماره جدید
      const existing = await prisma.user.findFirst({
        where: {
          phone: item.newPhone,
          NOT: { id: item.id },
        },
        select: { id: true, username: true },
      });

      if (existing) {
        console.log(`   ⚠️  Duplicate phone ${item.newPhone} (user: ${existing.username}) - skipping ${item.id}`);
        errors++;
        continue;
      }

      await prisma.user.update({
        where: { id: item.id },
        data: { phone: item.newPhone },
      });

      updated++;
    } catch (error: any) {
      console.error(`   ❌ Error updating ${item.id}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('📊 NORMALIZATION COMPLETE');
  console.log('═'.repeat(70));
  console.log(`Total users checked: ${users.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already correct): ${skipped}`);
  console.log(`Errors (duplicates): ${errors}`);
  console.log('═'.repeat(70));

  // چک نهایی
  const finalCheck = await prisma.user.count({
    where: {
      phone: {
        not: null,
      },
      NOT: {
        phone: {
          startsWith: '0',
        },
      },
    },
  });

  console.log(`\n📱 Users without leading 0: ${finalCheck}`);

  if (finalCheck > 0) {
    console.log('⚠️  Some phone numbers still need attention');
  } else {
    console.log('✅ All phone numbers now start with 0!');
  }

  await prisma.$disconnect();
}

// Confirm before running
if (process.argv.includes('--confirm')) {
  normalizePhoneNumbers()
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
} else {
  console.log('⚠️  This script will normalize all phone numbers to start with 0');
  console.log('   Examples:');
  console.log('     +989123456789 → 09123456789');
  console.log('     989123456789  → 09123456789');
  console.log('     9123456789    → 09123456789');
  console.log('     09123456789   → 09123456789 (no change)');
  console.log('\n   Run with --confirm to execute:\n');
  console.log('   npx ts-node scripts/normalize-phone-numbers.ts --confirm\n');
  process.exit(0);
}
