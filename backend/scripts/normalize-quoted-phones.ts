/**
 * نرمال‌سازی شماره‌های داخل کوتیشن و ادغام با رکورد تمیز
 *
 * چه کار می‌کند:
 * ۱. همه کاربرانی که فیلد phone آن‌ها حاوی کاراکتر " است پیدا می‌شوند (مثل "09129582534").
 * ۲. برای هر کدام شمارهٔ نرمال محاسبه می‌شود: حذف کوتیشن + نرمال‌سازی شماره (مثلاً 09129582534).
 * ۳. اگر کاربر دیگری با همان شمارهٔ نرمال (بدون کوتیشن) وجود داشته باشد → دو رکورد برای یک شماره داریم.
 * ۴. بین این دو، رکوردی که «دارای رکورد» است (دوره، تراکنش، ویدئو، کیف‌پول و ...) به‌عنوان اصلی نگه داشته می‌شود؛
 *    دادهٔ رکورد دیگر به او منتقل و رکورد دیگر حذف می‌شود. اگر رکورد نگه‌داشته‌شده خودش phone با کوتیشن داشت، آپدیت به شمارهٔ نرمال می‌شود.
 * ۵. اگر فقط یک رکورد (همان با کوتیشن) بود → فقط همان رکورد آپدیت می‌شود و phone به شمارهٔ نرمال (بدون کوتیشن) تنظیم می‌شود.
 *
 * اجرا: npx ts-node scripts/normalize-quoted-phones.ts
 * حالت خشک: npx ts-node scripts/normalize-quoted-phones.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

/** آیا شماره در دیتابیس با کوتیشن ذخیره شده؟ */
function hasQuotedPhone(phone: string | null): boolean {
  return typeof phone === 'string' && phone.includes('"');
}

/** حذف کوتیشن از رشته و بعد نرمال */
function stripQuotesAndNormalize(phone: string | null): string | null {
  if (!phone) return null;
  const stripped = phone.replace(/"/g, '').trim();
  return normalizePhone(stripped);
}

const DRY_RUN = process.argv.includes('--dry-run');

type UserRow = {
  id: string;
  phone: string | null;
  username: string;
  firstName: string | null;
  lastName: string | null;
};

async function countUserRecords(userId: string): Promise<number> {
  const [enrollments, transactions, videos, audios, oldProducts, invoices, wallet] = await Promise.all([
    prisma.courseEnrollment.count({ where: { userId } }),
    prisma.transaction.count({ where: { userId } }),
    prisma.videoAccess.count({ where: { userId } }),
    prisma.audioAccess.count({ where: { userId } }),
    prisma.oldProduct.count({ where: { userId } }),
    prisma.invoice.count({ where: { userId } }),
    prisma.wallet.count({ where: { userId } }),
  ]);
  return enrollments + transactions + videos + audios + oldProducts + invoices + (wallet ? 1 : 0);
}

async function main() {
  console.log(DRY_RUN ? '\n--- حالت خشک (بدون تغییر واقعی) ---\n' : '\n--- نرمال‌سازی شماره‌های داخل کوتیشن ---\n');

  const allUsersWithPhone = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true, username: true, firstName: true, lastName: true },
  });

  const byNormalized: Record<string, UserRow[]> = {};
  for (const u of allUsersWithPhone) {
    const stripped = u.phone ? u.phone.replace(/"/g, '').trim() : '';
    const norm = normalizePhone(stripped || u.phone);
    if (!norm) continue;
    if (!byNormalized[norm]) byNormalized[norm] = [];
    byNormalized[norm].push(u);
  }

  const normsWithQuoted = new Set<string>();
  for (const u of allUsersWithPhone) {
    if (!hasQuotedPhone(u.phone)) continue;
    const norm = stripQuotesAndNormalize(u.phone);
    if (norm) normsWithQuoted.add(norm);
  }
  console.log(`شماره‌های نرمالی که حداقل یک رکورد با کوتیشن دارند: ${normsWithQuoted.size}`);

  if (normsWithQuoted.size === 0) {
    console.log('هیچ رکوردی برای نرمال‌سازی یافت نشد.');
    return;
  }

  let onlyQuotedFixed = 0;
  let mergedCount = 0;
  let deletedCount = 0;

  for (const norm of normsWithQuoted) {
    const group = byNormalized[norm] || [];
    if (group.length === 0) continue;

    const quotedInGroup = group.filter((u) => hasQuotedPhone(u.phone));
    if (quotedInGroup.length === 0) continue;

    if (group.length === 1) {
      const u = group[0];
      console.log(`\nفقط یک رکورد (با کوتیشن): ${u.phone} → ${norm} (${u.username})`);
      if (!DRY_RUN) {
        await prisma.user.update({ where: { id: u.id }, data: { phone: norm } });
      }
      onlyQuotedFixed++;
      continue;
    }

    const counts = await Promise.all(group.map((u) => countUserRecords(u.id)));
    const withCounts = group.map((u, i) => ({ user: u, count: counts[i] }));
    withCounts.sort((a, b) => b.count - a.count);
    const keepUser = withCounts[0].user;
    const toRemove = withCounts.slice(1).map((x) => x.user);

    console.log(`\nشماره نرمال: ${norm} (${group.length} رکورد)`);
    console.log(`  نگه‌داشتن (دارای رکورد بیشتر): ${keepUser.firstName} ${keepUser.lastName} (${keepUser.username}) - ${keepUser.id} [رکورد: ${withCounts[0].count}]`);
    for (const u of toRemove) {
      const c = withCounts.find((x) => x.user.id === u.id)!;
      console.log(`  حذف و ادغام: ${u.firstName} ${u.lastName} (${u.username}) - ${u.id} [رکورد: ${c.count}]`);
    }

    if (DRY_RUN) {
      mergedCount += toRemove.length;
      continue;
    }

    const keptWallet = await prisma.wallet.findUnique({ where: { userId: keepUser.id } });
    const keptWalletId = keptWallet?.id ?? null;

    for (const dup of toRemove) {
      const dupWallet = await prisma.wallet.findUnique({ where: { userId: dup.id } });

      await prisma.$transaction(async (tx) => {
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
      deletedCount++;
    }

    if (hasQuotedPhone(keepUser.phone)) {
      if (!DRY_RUN) {
        await prisma.user.update({ where: { id: keepUser.id }, data: { phone: norm } });
      }
      console.log(`  آپدیت شمارهٔ رکورد نگه‌داشته‌شده به: ${norm}`);
    }
    mergedCount += toRemove.length;
  }

  console.log('\n--- پایان ---');
  console.log(`فقط نرمال (تک‌رکورد): ${onlyQuotedFixed}`);
  console.log(`ادغام/حذف تکراری: ${mergedCount}`);
  if (!DRY_RUN) console.log(`کاربر حذف‌شده: ${deletedCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
