/**
 * نرمال‌سازی شماره‌هایی که با +98 ذخیره شده‌اند
 * تبدیل +989385885965 → 09385885965
 *
 * Usage:
 *   npx ts-node scripts/normalize-phone-plus98.ts           # پیش‌نمایش
 *   npx ts-node scripts/normalize-phone-plus98.ts --apply   # اعمال در دیتابیس
 *   npm run normalize:phone-plus98
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

function normalizePhone(input: string | null | undefined): string | null {
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

/** آیا شماره با +98 شروع می‌شود و نیاز به نرمال دارد؟ */
function needsNormalize(phone: string | null): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const t = phone.trim();
  return t.startsWith('+98') || (t.startsWith('98') && /^\d{11,}$/.test(t.replace(/\D/g, '')));
}

async function main() {
  console.log(APPLY ? '🔧 حالت اعمال (--apply)' : '👀 حالت پیش‌نمایش (dry-run)');
  console.log('');

  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, username: true, phone: true },
  });

  const toUpdate = users.filter((u) => needsNormalize(u.phone));

  if (toUpdate.length === 0) {
    console.log('هیچ کاربری با شمارهٔ +98 یا 98... یافت نشد.');
    return;
  }

  console.log('تعداد کاربران با شمارهٔ نیازمند نرمال‌سازی:', toUpdate.length);
  console.log('');

  for (const u of toUpdate) {
    const normalized = normalizePhone(u.phone);
    if (!normalized) {
      console.log('  ⚠️  نرمال نشد:', u.username, '|', u.phone);
      continue;
    }
    if (APPLY) {
      const existing = await prisma.user.findFirst({
        where: { phone: normalized, id: { not: u.id } },
        select: { id: true, username: true },
      });
      if (existing) {
        console.log('  ⚠️  رد شد (شماره تکراری):', u.username, '|', u.phone, '→', normalized, '| قبلاً برای', existing.username);
        continue;
      }
    }
    console.log('  ', u.username, '|', u.phone, '→', normalized);
    if (APPLY) {
      await prisma.user.update({
        where: { id: u.id },
        data: { phone: normalized },
      });
    }
  }

  if (APPLY) {
    console.log('');
    console.log('✅ به‌روزرسانی انجام شد.');
  } else {
    console.log('');
    console.log('برای اعمال، با --apply اجرا کن.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
