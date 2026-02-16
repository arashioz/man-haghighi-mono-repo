/**
 * پاکسازی کاربران تکراری بر اساس شماره تلفن نرمال‌شده
 * - شماره‌ها نرمال می‌شوند (۱۱ رقم؛ اگر بیشتر بود ۲ رقم آخر و غیره حذف)
 * - اگر برای یک شماره فقط ۱ رکورد باشد، دست نمی‌زنیم.
 * - اگر ۲ تا یا بیشتر بود: رکوردی که **نام‌خانوادگی**اش «قدیمی» دارد به‌عنوان اصلی نگه داشته می‌شود؛ بقیه حذف می‌شوند (داده‌شان به همین یکی منتقل می‌شود).
 * - اگر هیچ‌کدام نام‌خانوادگی «قدیمی» نداشتند، اولین رکورد گروه نگه داشته می‌شود و بقیه حذف.
 *
 * اجرا: npx ts-node scripts/cleanup-duplicate-users-by-phone.ts
 * حالت خشک (فقط گزارش، بدون حذف): npx ts-node scripts/cleanup-duplicate-users-by-phone.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** نرمال‌سازی شماره تلفن (مطابق phone.utils) تا اسکریپت بدون وابستگی به مسیر src اجرا شود */
function normalizePhone(input?: string | null): string | null {
  if (!input) return null;
  let digits = String(input)
    .trim()
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[^\d+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+98')) digits = '0' + digits.slice(3);
  else if (digits.startsWith('98') && digits.length >= 11) digits = '0' + digits.slice(2);
  else if (!digits.startsWith('0') && digits.length === 10) digits = '0' + digits;
  if (digits.length > 11) digits = digits.startsWith('0') ? digits.slice(0, 11) : digits.slice(-11);
  if (!/^0\d{9,10}$/.test(digits)) return null;
  return digits;
}

const DRY_RUN = process.argv.includes('--dry-run');

/** فقط نام‌خانوادگی (lastName) چک می‌شود — همانی که «قدیمی» داره نگه داشته می‌شه */
function hasOldInLastName(user: { lastName?: string | null }) {
  return user.lastName != null && /قدیمی/.test(user.lastName);
}

async function main() {
  console.log(DRY_RUN ? '\n--- حالت خشک (بدون حذف واقعی) ---\n' : '\n--- پاکسازی کاربران تکراری بر اساس شماره ---\n');

  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: {
      id: true,
      phone: true,
      username: true,
      firstName: true,
      lastName: true,
      isOld: true,
      createdAt: true,
    },
  });

  const byNormalizedPhone: Record<string, typeof users> = {};
  for (const u of users) {
    const norm = normalizePhone(u.phone);
    if (!norm) continue;
    if (!byNormalizedPhone[norm]) byNormalizedPhone[norm] = [];
    byNormalizedPhone[norm].push(u);
  }

  const duplicatePhones = Object.entries(byNormalizedPhone).filter(([, list]) => list.length > 1);
  console.log(`تعداد شماره‌های تکراری: ${duplicatePhones.length}`);

  let totalMerged = 0;
  let totalDeleted = 0;

  for (const [normPhone, group] of duplicatePhones) {
    const withOldLastName = group.filter(hasOldInLastName);
    const keepUser = withOldLastName.length > 0 ? withOldLastName[0] : group[0];
    const toRemove = group.filter((u) => u.id !== keepUser.id);

    console.log(`\nشماره نرمال: ${normPhone} (${group.length} رکورد)`);
    console.log(`  نگه‌داشتن (نام‌خانوادگی قدیمی یا اولین): ${keepUser.firstName} ${keepUser.lastName} (${keepUser.username}) - ${keepUser.id}`);
    for (const u of toRemove) {
      console.log(`  حذف: ${u.firstName} ${u.lastName} (${u.username}) - ${u.id}`);
    }

    if (DRY_RUN) {
      totalMerged += toRemove.length;
      continue;
    }

    for (const dup of toRemove) {
      const keptWallet = await prisma.wallet.findUnique({ where: { userId: keepUser.id } });
      const keptWalletId = keptWallet?.id ?? null;

      await prisma.$transaction(async (tx) => {
        const dupWallet = await tx.wallet.findUnique({ where: { userId: dup.id } });

        await tx.transaction.updateMany({ where: { userId: dup.id }, data: { userId: keepUser.id, walletId: keptWalletId } });
        await tx.invoice.updateMany({ where: { userId: dup.id }, data: { userId: keepUser.id, walletId: keptWalletId } });

        const dupEnrollments = await tx.courseEnrollment.findMany({ where: { userId: dup.id } });
        for (const en of dupEnrollments) {
          const exists = await tx.courseEnrollment.findUnique({
            where: { userId_courseId: { userId: keepUser.id, courseId: en.courseId } },
          });
          if (exists) await tx.courseEnrollment.delete({ where: { id: en.id } });
          else await tx.courseEnrollment.update({ where: { id: en.id }, data: { userId: keepUser.id } });
        }

        const dupVideos = await tx.videoAccess.findMany({ where: { userId: dup.id } });
        for (const v of dupVideos) {
          const exists = await tx.videoAccess.findUnique({
            where: { userId_videoId: { userId: keepUser.id, videoId: v.videoId } },
          });
          if (exists) await tx.videoAccess.delete({ where: { id: v.id } });
          else await tx.videoAccess.update({ where: { id: v.id }, data: { userId: keepUser.id } });
        }
        const dupAudios = await tx.audioAccess.findMany({ where: { userId: dup.id } });
        for (const a of dupAudios) {
          const exists = await tx.audioAccess.findUnique({
            where: { userId_audioId: { userId: keepUser.id, audioId: a.audioId } },
          });
          if (exists) await tx.audioAccess.delete({ where: { id: a.id } });
          else await tx.audioAccess.update({ where: { id: a.id }, data: { userId: keepUser.id } });
        }
        const dupProducts = await tx.oldProduct.findMany({ where: { userId: dup.id } });
        for (const p of dupProducts) {
          const exists = await tx.oldProduct.findUnique({
            where: { userId_productId: { userId: keepUser.id, productId: p.productId } },
          });
          if (exists) await tx.oldProduct.delete({ where: { id: p.id } });
          else await tx.oldProduct.update({ where: { id: p.id }, data: { userId: keepUser.id } });
        }

        await tx.userSession.deleteMany({ where: { userId: dup.id } });
        if (dupWallet) await tx.wallet.delete({ where: { id: dupWallet.id } });
        await tx.user.delete({ where: { id: dup.id } });
      });

      totalDeleted++;
    }
    totalMerged += toRemove.length;
  }

  console.log('\n--- پایان ---');
  console.log(`رکوردهای تکراری ادغام‌شده (یا در dry-run): ${totalMerged}`);
  if (!DRY_RUN) console.log(`کاربر حذف‌شده: ${totalDeleted}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
