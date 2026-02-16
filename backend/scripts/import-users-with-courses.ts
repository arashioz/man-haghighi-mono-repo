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
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  purchasedCourses: UserCourseData[];
  videoAccessIds: string[];
  audioAccessIds: string[];
}

/**
 * برای همهٔ کاربرانی که شماره همراه دارند، username (user_login) را برابر با شماره همراه قرار می‌دهد.
 * تمام رکوردهای دیتابیس اپدیت می‌شوند.
 */
async function setPhoneAsUsernameForAllUsers() {
  console.log('\n--- به‌روزرسانی username برابر با شماره همراه برای تمام کاربران ---');
  const usersWithPhone = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true, username: true },
  });
  let updated = 0;
  let skipped = 0;
  for (let i = 0; i < usersWithPhone.length; i += UPDATE_BATCH_SIZE) {
    const batch = usersWithPhone.slice(i, i + UPDATE_BATCH_SIZE);
    await prisma.$transaction(async (tx) => {
      for (const u of batch) {
        const phone = u.phone!;
        const normalized = phone.replace(/\s/g, '').trim();
        if (!normalized) {
          skipped++;
          continue;
        }
        if (u.username === normalized) {
          skipped++;
          continue;
        }
        try {
          await tx.user.update({
            where: { id: u.id },
            data: { username: normalized },
          });
          updated++;
          if (updated <= 5 || updated % 500 === 0) {
            console.log(`  username به شماره همراه تنظیم شد: ${u.id} -> ${normalized}`);
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
          // Skip if no phone number
          if (!userData.phone) {
            console.log(`Skipping user with no phone number (ID: ${userData.id})`);
            invalidUsers++;
            continue;
          }

          const normalizedPhone = userData.phone.replace(/\s/g, '').trim();
          if (!normalizedPhone) {
            invalidUsers++;
            continue;
          }

          // Check if user exists by phone
          const existingUser = await tx.user.findUnique({
            where: { phone: normalizedPhone },
          });

          if (existingUser) {
            console.log(`User ${normalizedPhone} already exists, skipping`);
            skippedUsers++;
            continue;
          }

          // Create new user — شماره همراه به‌عنوان user_login (username) قرار می‌گیرد
          const user = await tx.user.create({
            data: {
              phone: normalizedPhone,
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              username: normalizedPhone,
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
  console.log(`- Users skipped (no phone number): ${invalidUsers}`);

  await setPhoneAsUsernameForAllUsers();
}

// آرگومان‌ها: [--update-only] یا [مسیر فایل JSON]
// --update-only: فقط تمام کاربران دارای شماره را اپدیت کن (username = phone)، بدون import از فایل
const args = process.argv.slice(2);
const updateOnly = args.includes('--update-only');
const filePathArg = args.find((a) => !a.startsWith('--'));
const defaultPath = path.join(process.cwd(), 'moc-old-data/users_with_courses_2025-12-23.json');
const filePath = filePathArg || defaultPath;

async function main() {
  if (updateOnly) {
    await setPhoneAsUsernameForAllUsers();
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