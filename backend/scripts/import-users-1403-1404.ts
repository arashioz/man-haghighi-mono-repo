/**
 * ایمپورت کاربران و دوره‌های آن‌ها از فایل users_import_1403_1404.json به دیتابیس.
 * id کاربران فایل نادیده گرفته می‌شود؛ برای هر کاربر جدید دیتابیس id جدید می‌سازد.
 *
 * اجرا از ریشهٔ پروژه:
 *   cd backend && npx ts-node scripts/import-users-1403-1404.ts
 *
 * یا از پوشه backend:
 *   npx ts-node scripts/import-users-1403-1404.ts
 */

import fs from 'fs';
import path from 'path';
import { importUsers, fixExistingUsersWithDoublePhone, prisma } from './import-users-with-courses';

const FILE_NAME = 'users_import_1403_1404.json';

async function main() {
  // ۱) اول کاربران قبلی که شمارهٔ دوگانه (مثل 0912--0919) دارند را به اولین شماره اصلاح کن
  await fixExistingUsersWithDoublePhone();

  // ۲) مسیر فایل و اجرای ایمپورت (در فایل هم فقط اولین شماره استفاده می‌شود)
  const projectRoot = path.resolve(__dirname, '..', '..');
  const filePath = path.join(projectRoot, 'moc-old-data', FILE_NAME);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  console.log(`\nImporting from: ${filePath}\n`);
  await importUsers(filePath);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
