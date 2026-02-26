import { PrismaClient, UserRole, Prisma } from '@prisma/client';
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

interface SyncReport {
  timestamp: string;
  totalJsonUsers: number;
  processed: number;
  created: number;
  updated: number;
  coursesAdded: number;
  coursesRemoved: number;
  videoAccessAdded: number;
  videoAccessRemoved: number;
  audioAccessAdded: number;
  audioAccessRemoved: number;
  errors: string[];
  details: Array<{
    phone: string;
    name: string;
    action: 'created' | 'updated';
    previousCourseCount: number;
    newCourseCount: number;
    coursesAdded: string[];
    coursesRemoved: string[];
  }>;
}

// نرمالایز کردن شماره موبایل
function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  let normalized = phone.trim();
  // حذف +98 و اضافه کردن 0
  if (normalized.startsWith('+98')) {
    normalized = '0' + normalized.slice(3);
  }
  // اگه با 9 شروع میشه، 0 اضافه کن
  if (normalized.startsWith('9')) {
    normalized = '0' + normalized;
  }
  return normalized;
}

async function fullSync() {
  console.log('🚀 Starting FULL SYNC of users and courses...\n');

  const report: SyncReport = {
    timestamp: new Date().toISOString(),
    totalJsonUsers: 0,
    processed: 0,
    created: 0,
    updated: 0,
    coursesAdded: 0,
    coursesRemoved: 0,
    videoAccessAdded: 0,
    videoAccessRemoved: 0,
    audioAccessAdded: 0,
    audioAccessRemoved: 0,
    errors: [],
    details: [],
  };

  // 1. خواندن فایل JSON
  const jsonPath = path.join(process.cwd(), '..', 'moc-old-data', 'users_import_1403_1404.json');
  console.log(`📁 Reading JSON file: ${jsonPath}`);

  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON file not found!');
    process.exit(1);
  }

  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const jsonUsers: JsonUser[] = JSON.parse(jsonContent);
  report.totalJsonUsers = jsonUsers.length;
  console.log(`✅ Loaded ${jsonUsers.length} users from JSON\n`);

  // 2. ساخت Map از شماره موبایل به user
  const phoneToJsonUser = new Map<string, JsonUser>();
  for (const user of jsonUsers) {
    const normalizedPhone = normalizePhone(user.phone);
    if (normalizedPhone) {
      phoneToJsonUser.set(normalizedPhone, user);
    }
  }
  console.log(`📊 ${phoneToJsonUser.size} users have phone numbers\n`);

  // 3. دریافت همه کاربران از دیتابیس
  console.log('🔄 Fetching users from database...');
  const dbUsers = await prisma.user.findMany({
    where: {
      role: 'USER',
    },
    include: {
      purchasedCourses: {
        include: {
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

  // 4. پردازش هر کاربر از JSON
  console.log('⚙️  Processing users...\n');

  let processed = 0;
  const total = phoneToJsonUser.size;

  for (const [phone, jsonUser] of Array.from(phoneToJsonUser.entries())) {
    processed++;
    if (processed % 100 === 0) {
      console.log(`   Progress: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
    }

    try {
      // پیدا کردن کاربر در دیتابیس
      const dbUser = dbUsers.find(u => normalizePhone(u.phone) === phone);

      const detail = {
        phone,
        name: jsonUser.username || `${jsonUser.firstName} ${jsonUser.lastName}`,
        action: dbUser ? 'updated' as const : 'created' as const,
        previousCourseCount: dbUser?.purchasedCourses.length || 0,
        newCourseCount: jsonUser.purchasedCourses?.length || 0,
        coursesAdded: [] as string[],
        coursesRemoved: [] as string[],
      };

      if (!dbUser) {
        // === کاربر جدید ===
        await createNewUser(jsonUser);
        report.created++;
        report.coursesAdded += jsonUser.purchasedCourses?.length || 0;
        report.videoAccessAdded += jsonUser.videoAccessIds?.length || 0;
        report.audioAccessAdded += jsonUser.audioAccessIds?.length || 0;
      } else {
        // === کاربر موجود - آپدیت ===
        const syncResult = await syncExistingUser(dbUser, jsonUser);
        report.updated++;
        report.coursesAdded += syncResult.coursesAdded;
        report.coursesRemoved += syncResult.coursesRemoved;
        report.videoAccessAdded += syncResult.videoAccessAdded;
        report.videoAccessRemoved += syncResult.videoAccessRemoved;
        report.audioAccessAdded += syncResult.audioAccessAdded;
        report.audioAccessRemoved += syncResult.audioAccessRemoved;
        detail.coursesAdded = syncResult.addedCourseTitles;
        detail.coursesRemoved = syncResult.removedCourseTitles;
      }

      report.details.push(detail);
      report.processed++;

    } catch (error) {
      const errorMsg = `Error processing user ${phone}: ${error.message}`;
      console.error(`   ❌ ${errorMsg}`);
      report.errors.push(errorMsg);
    }
  }

  // 5. گزارش نهایی
  console.log('\n' + '='.repeat(60));
  console.log('📊 SYNC COMPLETE - SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total JSON users: ${report.totalJsonUsers}`);
  console.log(`Processed: ${report.processed}`);
  console.log(`Created: ${report.created}`);
  console.log(`Updated: ${report.updated}`);
  console.log(`Courses added: ${report.coursesAdded}`);
  console.log(`Courses removed: ${report.coursesRemoved}`);
  console.log(`Video access added: ${report.videoAccessAdded}`);
  console.log(`Video access removed: ${report.videoAccessRemoved}`);
  console.log(`Audio access added: ${report.audioAccessAdded}`);
  console.log(`Audio access removed: ${report.audioAccessRemoved}`);
  console.log(`Errors: ${report.errors.length}`);
  if (report.errors.length > 0) {
    console.log('\nErrors:');
    report.errors.forEach(e => console.log(`   - ${e}`));
  }
  console.log('='.repeat(60));

  // 6. ذخیره گزارش
  const reportPath = path.join(process.cwd(), '..', 'moc-old-data', `full-sync-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

// ایجاد کاربر جدید
async function createNewUser(jsonUser: JsonUser) {
  // ساخت username از firstName و lastName
  const username = jsonUser.username || 
    `${jsonUser.firstName || ''} ${jsonUser.lastName || ''}`.trim() || 
    `user-${jsonUser.phone}`;

  // ایجاد کاربر
  const user = await prisma.user.create({
    data: {
      email: jsonUser.email,
      phone: normalizePhone(jsonUser.phone),
      username: username,
      password: await import('bcryptjs').then(bcrypt => bcrypt.hash(Math.random().toString(36).slice(-8), 10)), // پسورد تصادفی
      firstName: jsonUser.firstName,
      lastName: jsonUser.lastName,
      role: UserRole.USER,
      isActive: jsonUser.isActive ?? true,
      isOld: jsonUser.isOld ?? false,
      education: jsonUser.education,
      university: jsonUser.university,
      job: jsonUser.job,
      state: jsonUser.state,
      gender: jsonUser.gender,
    },
  });

  // اضافه کردن دوره‌ها
  if (jsonUser.purchasedCourses && jsonUser.purchasedCourses.length > 0) {
    for (const courseId of jsonUser.purchasedCourses) {
      try {
        await prisma.courseEnrollment.create({
          data: {
            userId: user.id,
            courseId: courseId,
          },
        });
      } catch (e) {
        // اگه courseId نامعتبر باشه، skip
      }
    }
  }

  // اضافه کردن video access
  if (jsonUser.videoAccessIds && jsonUser.videoAccessIds.length > 0) {
    for (const videoId of jsonUser.videoAccessIds) {
      try {
        await prisma.videoAccess.create({
          data: {
            userId: user.id,
            videoId: videoId,
          },
        });
      } catch (e) {
        // skip if invalid
      }
    }
  }

  // اضافه کردن audio access
  if (jsonUser.audioAccessIds && jsonUser.audioAccessIds.length > 0) {
    for (const audioId of jsonUser.audioAccessIds) {
      try {
        await prisma.audioAccess.create({
          data: {
            userId: user.id,
            audioId: audioId,
          },
        });
      } catch (e) {
        // skip if invalid
      }
    }
  }

  return user;
}

// آپدیت کاربر موجود
async function syncExistingUser(
  dbUser: any,
  jsonUser: JsonUser
) {
  const result = {
    coursesAdded: 0,
    coursesRemoved: 0,
    videoAccessAdded: 0,
    videoAccessRemoved: 0,
    audioAccessAdded: 0,
    audioAccessRemoved: 0,
    addedCourseTitles: [] as string[],
    removedCourseTitles: [] as string[],
  };

  // آپدیت اطلاعات کاربر
  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      email: jsonUser.email ?? dbUser.email,
      firstName: jsonUser.firstName ?? dbUser.firstName,
      lastName: jsonUser.lastName ?? dbUser.lastName,
      education: jsonUser.education ?? dbUser.education,
      university: jsonUser.university ?? dbUser.university,
      job: jsonUser.job ?? dbUser.job,
      state: jsonUser.state ?? dbUser.state,
      gender: jsonUser.gender ?? dbUser.gender,
      isActive: jsonUser.isActive ?? dbUser.isActive,
      isOld: jsonUser.isOld ?? dbUser.isOld,
    },
  });

  // === همگام‌سازی دوره‌ها ===
  const jsonCourseIds = new Set<string>(jsonUser.purchasedCourses || []);
  const dbCourseIds = new Set<string>(dbUser.purchasedCourses.map((e: any) => e.courseId));

  // دوره‌هایی که باید اضافه بشن (توی JSON هستن ولی توی DB نیستن)
  const toAdd = Array.from(jsonCourseIds).filter(id => !dbCourseIds.has(id));
  // دوره‌هایی که باید حذف بشن (توی DB هستن ولی توی JSON نیستن)
  const toRemove = Array.from(dbCourseIds).filter(id => !jsonCourseIds.has(id));

  // حذف دوره‌ها
  if (toRemove.length > 0) {
    for (const courseId of toRemove) {
      const enrollment = dbUser.purchasedCourses.find((e: any) => e.courseId === courseId);
      if (enrollment) {
        await prisma.courseEnrollment.delete({
          where: { id: enrollment.id },
        });
        result.coursesRemoved++;
        result.removedCourseTitles.push(enrollment.course?.title || courseId);
      }
    }
  }

  // اضافه کردن دوره‌ها
  if (toAdd.length > 0) {
    for (const courseId of toAdd) {
      try {
        // چک کردن اینکه دوره وجود داره
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: { id: true, title: true },
        });

        if (course) {
          await prisma.courseEnrollment.create({
            data: {
              userId: dbUser.id,
              courseId: courseId,
            },
          });
          result.coursesAdded++;
          result.addedCourseTitles.push(course.title);
        }
      } catch (e) {
        // skip if error
      }
    }
  }

  // === همگام‌سازی Video Access ===
  const jsonVideoIds = new Set<string>(jsonUser.videoAccessIds || []);
  const dbVideoIds = new Set<string>(dbUser.videoAccess.map((v: any) => v.videoId));

  const videosToAdd = Array.from(jsonVideoIds).filter(id => !dbVideoIds.has(id));
  const videosToRemove = Array.from(dbVideoIds).filter(id => !jsonVideoIds.has(id)) as string[];

  if (videosToRemove.length > 0) {
    await prisma.videoAccess.deleteMany({
      where: {
        userId: dbUser.id,
        videoId: { in: videosToRemove },
      },
    });
    result.videoAccessRemoved += videosToRemove.length;
  }

  if (videosToAdd.length > 0) {
    for (const videoId of videosToAdd) {
      try {
        await prisma.videoAccess.create({
          data: {
            userId: dbUser.id,
            videoId: videoId,
          },
        });
        result.videoAccessAdded++;
      } catch (e) {
        // skip
      }
    }
  }

  // === همگام‌سازی Audio Access ===
  const jsonAudioIds = new Set<string>(jsonUser.audioAccessIds || []);
  const dbAudioIds = new Set<string>(dbUser.audioAccess.map((a: any) => a.audioId));

  const audiosToAdd = Array.from(jsonAudioIds).filter(id => !dbAudioIds.has(id));
  const audiosToRemove = Array.from(dbAudioIds).filter(id => !jsonAudioIds.has(id)) as string[];

  if (audiosToRemove.length > 0) {
    await prisma.audioAccess.deleteMany({
      where: {
        userId: dbUser.id,
        audioId: { in: audiosToRemove },
      },
    });
    result.audioAccessRemoved += audiosToRemove.length;
  }

  if (audiosToAdd.length > 0) {
    for (const audioId of audiosToAdd) {
      try {
        await prisma.audioAccess.create({
          data: {
            userId: dbUser.id,
            audioId: audioId,
          },
        });
        result.audioAccessAdded++;
      } catch (e) {
        // skip
      }
    }
  }

  return result;
}

// اجرای اسکریپت
fullSync()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
