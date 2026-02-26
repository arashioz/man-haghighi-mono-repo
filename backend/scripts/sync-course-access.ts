import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface JsonUser {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  isOld: boolean;
  isBlocked: boolean;
  education: string | null;
  university: string | null;
  job: string | null;
  state: string | null;
  gender: string | null;
  createdAt: string;
  updatedAt: string;
  purchasedCourses: string[];
  videoAccessIds: string[];
  audioAccessIds: string[];
}

interface SyncResult {
  phone: string;
  name: string;
  jsonCourseCount: number;
  dbCourseCount: number;
  action: string;
  removedCourses?: string[];
}

async function syncCourseAccess() {
  console.log('🚀 Starting course access synchronization...\n');

  // 1. خواندن فایل JSON
  const jsonPath = path.join(process.cwd(), '..', 'moc-old-data', 'users_import_1403_1404.json');
  console.log(`📁 Reading JSON file: ${jsonPath}`);

  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON file not found!');
    process.exit(1);
  }

  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const jsonUsers: JsonUser[] = JSON.parse(jsonContent);
  console.log(`✅ Loaded ${jsonUsers.length} users from JSON\n`);

  // 2. ساخت Map از شماره موبایل به purchasedCourses
  const jsonPhoneToCourses = new Map<string, string[]>();
  for (const user of jsonUsers) {
    if (user.phone) {
      // Normalize phone number
      const normalizedPhone = user.phone.replace(/^0/, ''); // حذف 0 اول
      jsonPhoneToCourses.set(normalizedPhone, user.purchasedCourses || []);
    }
  }

  // 3. دریافت همه کاربران از دیتابیس با دوره‌هایشان
  console.log('🔄 Fetching users from database...');
  const dbUsers = await prisma.user.findMany({
    where: {
      role: 'USER',
      phone: {
        not: null,
      },
    },
    select: {
      id: true,
      phone: true,
      firstName: true,
      lastName: true,
      courseEnrollments: {
        select: {
          id: true,
          courseId: true,
          course: {
            select: {
              title: true,
            },
          },
        },
      },
      videoAccess: {
        select: {
          id: true,
          videoId: true,
        },
      },
      audioAccess: {
        select: {
          id: true,
          audioId: true,
        },
      },
    },
  });
  console.log(`✅ Found ${dbUsers.length} users in database\n`);

  const results: SyncResult[] = [];
  const usersToFix: {
    userId: string;
    phone: string;
    name: string;
    jsonCourses: string[];
    dbCourses: { id: string; courseId: string; title: string }[];
  }[] = [];

  // 4. مقایسه هر کاربر
  for (const dbUser of dbUsers) {
    if (!dbUser.phone) continue;

    // نرمالایز کردن شماره موبایل دیتابیس
    const normalizedDbPhone = dbUser.phone.replace(/^0/, '').replace('+98', '');

    // پیدا کردن کاربر در JSON
    const jsonCourses = jsonPhoneToCourses.get(normalizedDbPhone) || [];

    // دوره‌های دیتابیس
    const dbCourses = dbUser.courseEnrollments.map(e => ({
      id: e.id,
      courseId: e.courseId,
      title: e.course?.title || 'Unknown',
    }));

    // اگر در دیتابیس دوره داره ولی در JSON نداره
    if (dbCourses.length > 0 && jsonCourses.length === 0) {
      console.log(`⚠️  MISMATCH FOUND:`);
      console.log(`   Phone: ${dbUser.phone}`);
      console.log(`   Name: ${dbUser.firstName} ${dbUser.lastName}`);
      console.log(`   JSON courses: ${jsonCourses.length}`);
      console.log(`   DB courses: ${dbCourses.length}`);
      console.log(`   DB Course IDs: ${dbCourses.map(c => c.courseId).join(', ')}`);
      console.log('');

      results.push({
        phone: dbUser.phone,
        name: `${dbUser.firstName} ${dbUser.lastName}`,
        jsonCourseCount: jsonCourses.length,
        dbCourseCount: dbCourses.length,
        action: 'NEEDS_FIX',
        removedCourses: dbCourses.map(c => c.title),
      });

      usersToFix.push({
        userId: dbUser.id,
        phone: dbUser.phone,
        name: `${dbUser.firstName} ${dbUser.lastName}`,
        jsonCourses,
        dbCourses,
      });
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total users checked: ${dbUsers.length}`);
  console.log(`   Users with mismatch: ${usersToFix.length}`);

  if (usersToFix.length === 0) {
    console.log('\n✅ All course access is synchronized! No action needed.');
    await prisma.$disconnect();
    return;
  }

  // 5. نمایش گزارش
  console.log('\n📋 Users that need fixing:');
  console.log('─'.repeat(80));
  for (const result of results) {
    console.log(`Phone: ${result.phone}`);
    console.log(`Name: ${result.name}`);
    console.log(`JSON courses: ${result.jsonCourseCount}`);
    console.log(`DB courses: ${result.dbCourseCount} (Will be removed)`);
    console.log(`Courses to remove: ${result.removedCourses?.join(', ')}`);
    console.log('─'.repeat(80));
  }

  // 6. اجرای عملیات پاک کردن
  console.log('\n⚠️  WARNING: About to remove course access for mismatched users');
  console.log(`   This will delete enrollments for ${usersToFix.length} users\n`);

  // در اینجا می‌تونی به صورت دستی تأیید کنی یا از ENV بگیری
  const shouldDelete = process.env.FORCE_DELETE === 'true' || process.env.DRY_RUN !== 'true';

  if (process.env.DRY_RUN === 'true') {
    console.log('🏃 DRY RUN MODE - No changes will be made\n');
    console.log('To actually delete, run with DRY_RUN=false');
    await prisma.$disconnect();
    return;
  }

  if (!shouldDelete) {
    console.log('❌ Deletion cancelled. Set FORCE_DELETE=true or DRY_RUN=false to proceed.\n');
    await prisma.$disconnect();
    return;
  }

  // شروع پاک کردن
  console.log('🗑️  Starting deletion process...\n');

  for (const user of usersToFix) {
    console.log(`Deleting access for: ${user.name} (${user.phone})`);

    try {
      // حذف video access
      const deletedVideos = await prisma.videoAccess.deleteMany({
        where: { userId: user.userId },
      });
      console.log(`   ✓ Deleted ${deletedVideos.count} video access records`);

      // حذف audio access
      const deletedAudios = await prisma.audioAccess.deleteMany({
        where: { userId: user.userId },
      });
      console.log(`   ✓ Deleted ${deletedAudios.count} audio access records`);

      // حذف course enrollments
      const deletedEnrollments = await prisma.courseEnrollment.deleteMany({
        where: { userId: user.userId },
      });
      console.log(`   ✓ Deleted ${deletedEnrollments.count} course enrollments`);

      console.log(`   ✅ Done for user: ${user.name}\n`);
    } catch (error) {
      console.error(`   ❌ Error deleting for user ${user.phone}:`, error);
    }
  }

  // 7. ذخیره گزارش
  const reportPath = path.join(process.cwd(), '..', 'moc-old-data', 'course-sync-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    totalChecked: dbUsers.length,
    mismatchesFound: usersToFix.length,
    usersFixed: usersToFix.map(u => ({
      phone: u.phone,
      name: u.name,
      dbCourses: u.dbCourses.map(c => ({ id: c.courseId, title: c.title })),
    })),
    results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  console.log('\n✅ Synchronization complete!');
  await prisma.$disconnect();
}

// اجرای اسکریپت
syncCourseAccess()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
