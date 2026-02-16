import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;
const UPDATE_BATCH_SIZE = 500;

interface UserCourseData {
  id: string;
  enrolledAt?: string;
  createdAt?: string;
  courseId?: string;
  course?: {
    id: string;
    title: string;
    description: string;
    price: string;
  };
}

interface ImportUser {
  id: string;
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  purchasedCourses: UserCourseData[];
  videoAccessIds: string[];
  audioAccessIds: string[];
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\s/g, '').trim();
}

function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * برای همهٔ کاربران: شناسه ورود (username) را از شماره همراه یا در نبود آن از ایمیل تنظیم می‌کند.
 * اولویت: شماره همراه؛ اگر نبود ایمیل. تمام رکوردهای دیتابیس اپدیت می‌شوند.
 */
async function setLoginUsernameForAllUsers() {
  console.log('\n--- به‌روزرسانی username (شناسه ورود) برای تمام کاربران ---');
  const users = await prisma.user.findMany({
    where: {
      OR: [{ phone: { not: null } }, { email: { not: null } }],
    },
    select: { id: true, phone: true, email: true, username: true },
  });
  let updated = 0;
  let skipped = 0;
  for (let i = 0; i < users.length; i += UPDATE_BATCH_SIZE) {
    const batch = users.slice(i, i + UPDATE_BATCH_SIZE);
    await prisma.$transaction(async (tx) => {
      for (const u of batch) {
        const loginId = normalizePhone(u.phone) || normalizeEmail(u.email);
        if (!loginId) {
          skipped++;
          continue;
        }
        if (u.username === loginId) {
          skipped++;
          continue;
        }
        try {
          await tx.user.update({
            where: { id: u.id },
            data: { username: loginId },
          });
          updated++;
          if (updated <= 5 || updated % 500 === 0) {
            console.log(`  username تنظیم شد: ${u.id} -> ${loginId}`);
          }
        } catch (e) {
          console.error(`  خطا در اپدیت user ${u.id}:`, e);
        }
      }
    });
  }
  console.log(`  تعداد به‌روزرسانی‌شده: ${updated}, بدون تغییر: ${skipped}`);
}

async function importUsers(filePath: string) {
  console.log(`Reading user data from: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const usersData: ImportUser[] = JSON.parse(fileContent);

  console.log(`Found ${usersData.length} users to process`);

  let importedUsers = 0;
  let importedEnrollments = 0;
  let skippedUsers = 0;
  let invalidUsers = 0;

  for (let i = 0; i < usersData.length; i += BATCH_SIZE) {
    const batch = Math.min(BATCH_SIZE, usersData.length - i);
    const currentBatch = usersData.slice(i, i + batch);

    try {
      await prisma.$transaction(async (tx) => {
        for (const userData of currentBatch) {
          const normalizedPhone = normalizePhone(userData.phone);
          const normalizedEmail = normalizeEmail(userData.email);
          const loginId = normalizedPhone || normalizedEmail;

          if (!loginId) {
            console.log(`Skipping user with no phone and no email (ID: ${userData.id})`);
            invalidUsers++;
            continue;
          }

          const existingByPhone = normalizedPhone
            ? await tx.user.findUnique({ where: { phone: normalizedPhone } })
            : null;
          const existingByEmail = normalizedEmail
            ? await tx.user.findUnique({ where: { email: normalizedEmail } })
            : null;
          const existingUser = existingByPhone || existingByEmail;

          if (existingUser) {
            console.log(`User ${loginId} already exists, skipping`);
            skippedUsers++;
            continue;
          }

          // شناسه ورود: اول شماره همراه، در نبود آن ایمیل
          const user = await tx.user.create({
            data: {
              phone: normalizedPhone || null,
              email: normalizedEmail || userData.email?.trim() || null,
              firstName: userData.firstName,
              lastName: userData.lastName,
              username: loginId,
              role: 'USER',
              isOld: true,
            },
          });

          importedUsers++;

          // Create course enrollments if they exist
          if (userData.purchasedCourses && Array.isArray(userData.purchasedCourses)) {
            console.log(`Processing ${userData.purchasedCourses.length} courses for user ${user.id}`);
            for (const courseData of userData.purchasedCourses) {
              try {
                const courseId = courseData.courseId || courseData.course?.id;
                if (!courseId) {
                  console.log(`No course ID found for user ${user.id}, skipping`);
                  continue;
                }

                const courseExists = await tx.course.findUnique({
                  where: { id: courseId },
                });

                if (!courseExists) {
                  console.log(`Course ${courseId} not found, skipping enrollment`);
                  continue;
                }

                await tx.courseEnrollment.create({
                  data: {
                    userId: user.id,
                    courseId: courseId,
                    enrolledAt: new Date(courseData.enrolledAt || courseData.createdAt || new Date()),
                  },
                });
                importedEnrollments++;
                console.log(`Created enrollment for user ${user.id} in course ${courseId}`);
              } catch (e) {
                console.error(`Error creating enrollment for user ${user.id}:`, {
                  courseData,
                  error: e,
                });
              }
            }
          } else {
            console.log(`No purchased courses found for user ${user.id}`);
          }
        }
      });
    } catch (error) {
      console.error(`Error processing batch starting at user ${i}:`, error);
    }
  }

  console.log('Import completed:');
  console.log(`- Users imported: ${importedUsers}`);
  console.log(`- Course enrollments: ${importedEnrollments}`);
  console.log(`- Users skipped (already existed): ${skippedUsers}`);
  console.log(`- Users skipped (no phone and no email): ${invalidUsers}`);

  await setLoginUsernameForAllUsers();
}

// آرگومان‌ها: [--update-only] یا [مسیر فایل JSON]
// --update-only: فقط username تمام کاربران را اپدیت کن (شماره یا ایمیل)، بدون import از فایل
const args = process.argv.slice(2);
const updateOnly = args.includes('--update-only');
const filePathArg = args.find((a) => !a.startsWith('--'));
const defaultPath = path.join(process.cwd(), 'moc-old-data/users_with_courses_2025-12-23.json');
const filePath = filePathArg || defaultPath;

async function main() {
  if (updateOnly) {
    await setLoginUsernameForAllUsers();
    return;
  }
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    console.error('Available files in moc-old-data:');
    try {
      const files = fs.readdirSync(path.join(process.cwd(), 'moc-old-data'));
      console.log(files.join('\n'));
    } catch (err) {
      console.error('Could not list moc-old-data directory');
    }
    process.exit(1);
  }
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