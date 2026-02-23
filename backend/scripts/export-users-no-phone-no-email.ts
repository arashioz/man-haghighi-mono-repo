/**
 * خروجی CSV کاربرانی که نه شماره همراه دارند نه ایمیل
 *
 * خروجی در: exports/users-no-phone-no-email.csv (و مسیر چاپ می‌شود تا با scp دانلود کنی)
 *
 * Usage:
 *   npx ts-node scripts/export-users-no-phone-no-email.ts
 *   npm run export:users-no-phone-no-email
 *
 * دانلود از سرور (روی لپ‌تاپ/دسکتاپ):
 *   scp USER@SERVER:/path/to/new-haghighi/backend/exports/users-no-phone-no-email.csv .
 * یا اگر با docker اجرا می‌کنی و فایل داخل کانتینر است:
 *   docker cp CONTAINER_NAME:/app/exports/users-no-phone-no-email.csv .
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OUT_DIR = path.join(process.cwd(), 'exports');
const OUT_FILE = path.join(OUT_DIR, 'users-no-phone-no-email.csv');

function escapeCsvCell(value: string | number | boolean | Date | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function main() {
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { OR: [{ phone: null }, { phone: '' }] },
        { OR: [{ email: null }, { email: '' }] },
      ],
    },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      isOld: true,
      isForeign: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // فیلتر اضافی: شماره/ایمیل فقط فاصله نباشند
  const filtered = users.filter((u) => {
    const p = (u.phone || '').trim();
    const e = (u.email || '').trim();
    return !p && !e;
  });

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const headers = [
    'id',
    'username',
    'firstName',
    'lastName',
    'email',
    'phone',
    'role',
    'isActive',
    'isOld',
    'isForeign',
    'createdAt',
    'updatedAt',
  ];
  const rows = filtered.map((u) =>
    headers.map((h) => escapeCsvCell((u as any)[h] ?? '')),
  );
  const csv =
    '\uFEFF' + headers.join(',') + '\n' + rows.map((r) => r.join(',')).join('\n');

  fs.writeFileSync(OUT_FILE, csv, 'utf8');

  console.log('تعداد کاربران بدون شماره و بدون ایمیل:', filtered.length);
  console.log('فایل ذخیره شد:', OUT_FILE);
  console.log('');
  console.log('--- دستور دانلود از سرور (روی لپ‌تاپ اجرا کن) ---');
  console.log('  scp USER@SERVER:' + OUT_FILE + ' .');
  console.log('');
  console.log('مثال (جای USER و SERVER را عوض کن):');
  console.log('  scp root@194.180.11.193:' + OUT_FILE + ' .');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
