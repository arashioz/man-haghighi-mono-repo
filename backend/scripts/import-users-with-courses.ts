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
 * اولویت: شماره همراه؛ اگر نبود ایمیل. اگر username موردنظر قبلاً در دیتابیس استفاده شده، یک نام یکتا ساخته می‌شود.
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
  const assignedInThisRun = new Set<string>();
  for (let i = 0; i < users.length; i += UPDATE_BATCH_SIZE) {
    const batch = users.slice(i, i + UPDATE_BATCH_SIZE);
    for (const u of batch) {
      const loginId = normalizePhone(u.phone) || normalizeEmail(u.email);
      if (!loginId) {
        skipped++;
        continue;
      }
      if (u.username === loginId) {
        skipped++;
        assignedInThisRun.add(loginId);
        continue;
      }
      let targetUsername = loginId;
      if (assignedInThisRun.has(loginId)) {
        targetUsername = `${loginId}_${u.id.slice(-8)}`;
      }
      assignedInThisRun.add(targetUsername);
      try {
        await prisma.user.update({
          where: { id: u.id },
          data: { username: targetUsername },
        });
        updated++;
        if (updated <= 5 || updated % 500 === 0) {
          console.log(`  username تنظیم شد: ${u.id} -> ${targetUsername}`);
        }
      } catch (e) {
        const err = e as { code?: string; meta?: { target?: string[] } };
        if (err.code === 'P2002' && err.meta?.target?.includes('username')) {
          targetUsername = `${loginId}_${u.id.slice(-8)}`;
          assignedInThisRun.add(targetUsername);
          try {
            await prisma.user.update({
              where: { id: u.id },
              data: { username: targetUsername },
            });
            updated++;
            console.log(`  username یکتا شد: ${u.id} -> ${targetUsername}`);
          } catch (e2) {
            console.error(`  خطا در اپدیت user ${u.id}:`, e2);
          }
        } else {
          console.error(`  خطا در اپدیت user ${u.id}:`, e);
        }
      }
    }
  }
  console.log(`  تعداد به‌روزرسانی‌شده: ${updated}, بدون تغییر: ${skipped}`);
}

/** یک کاربر و در صورت وجود دوره‌هاش را در یک تراکنش جدا وارد می‌کند تا خطا در یکی باعث 25P02 برای بقیه نشود. */
async function importOneUser(userData: ImportUser): Promise<{ userCreated: boolean; enrollmentsCreated: number }> {
  const normalizedPhone = normalizePhone(userData.phone);
  const normalizedEmail = normalizeEmail(userData.email);
  const loginId = normalizedPhone || normalizedEmail;

  if (!loginId) {
    return { userCreated: false, enrollmentsCreated: 0 };
  }

  return await prisma.$transaction(async (tx) => {
    const existingByPhone = normalizedPhone
      ? await tx.user.findUnique({ where: { phone: normalizedPhone } })
      : null;
    const existingByEmail = normalizedEmail
      ? await tx.user.findUnique({ where: { email: normalizedEmail } })
      : null;
    const existingUser = existingByPhone || existingByEmail;

    if (existingUser) {
      return { userCreated: false, enrollmentsCreated: 0 };
    }

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

    let enrollmentsCreated = 0;
    if (userData.purchasedCourses && Array.isArray(userData.purchasedCourses)) {
      for (const courseData of userData.purchasedCourses) {
        const courseId = courseData.courseId || courseData.course?.id;
        if (!courseId) continue;
        const courseExists = await tx.course.findUnique({ where: { id: courseId } });
        if (!courseExists) continue;
        await tx.courseEnrollment.create({
          data: {
            userId: user.id,
            courseId,
            enrolledAt: new Date(courseData.enrolledAt || courseData.createdAt || new Date()),
          },
        });
        enrollmentsCreated++;
      }
    }
    return { userCreated: true, enrollmentsCreated };
  });
}

/** فقط دوره‌ها را برای کاربران موجود (بر اساس phone/email) از فایل JSON اضافه می‌کند. */
async function addEnrollmentsOnly(filePath: string) {
  console.log(`Reading user data from: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const usersData: ImportUser[] = JSON.parse(fileContent);
  console.log(`Found ${usersData.length} users in file to process for enrollments`);

  let usersMatched = 0;
  let enrollmentsAdded = 0;
  let enrollmentsSkipped = 0;
  let courseNotFound = 0;

  for (let i = 0; i < usersData.length; i++) {
    const userData = usersData[i];
    const normalizedPhone = normalizePhone(userData.phone);
    const normalizedEmail = normalizeEmail(userData.email);
    if (!normalizedPhone && !normalizedEmail) continue;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ],
      },
    });
    if (!existing) continue;

    usersMatched++;
    if (!userData.purchasedCourses?.length) continue;

    for (const courseData of userData.purchasedCourses) {
      const courseId = courseData.courseId || courseData.course?.id;
      if (!courseId) continue;

      const courseExists = await prisma.course.findUnique({ where: { id: courseId } });
      if (!courseExists) {
        courseNotFound++;
        continue;
      }

      try {
        await prisma.courseEnrollment.upsert({
          where: {
            userId_courseId: { userId: existing.id, courseId },
          },
          create: {
            userId: existing.id,
            courseId,
            enrolledAt: new Date(courseData.enrolledAt || courseData.createdAt || new Date()),
          },
          update: {},
        });
        enrollmentsAdded++;
        if (enrollmentsAdded <= 10 || enrollmentsAdded % 500 === 0) {
          console.log(`  enrollment: user ${existing.id} -> course ${courseId}`);
        }
      } catch (e) {
        console.error(`  خطا در enrollment user ${existing.id} course ${courseId}:`, e);
        enrollmentsSkipped++;
      }
    }
  }

  console.log('Enrollments-only completed:');
  console.log(`- Users matched (existing): ${usersMatched}`);
  console.log(`- Enrollments added: ${enrollmentsAdded}`);
  console.log(`- Skipped (error): ${enrollmentsSkipped}`);
  console.log(`- Course not found in DB: ${courseNotFound}`);
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
  let failedUsers = 0;

  for (let i = 0; i < usersData.length; i++) {
    const userData = usersData[i];
    const loginId = normalizePhone(userData.phone) || normalizeEmail(userData.email);
    if (!loginId) {
      invalidUsers++;
      continue;
    }

    try {
      const result = await importOneUser(userData);
      if (result.userCreated) {
        importedUsers++;
        importedEnrollments += result.enrollmentsCreated;
        if (importedUsers <= 5 || importedUsers % 500 === 0) {
          console.log(`  imported user ${i + 1}/${usersData.length}: ${loginId} (${result.enrollmentsCreated} courses)`);
        }
      } else {
        skippedUsers++;
      }
    } catch (error) {
      failedUsers++;
      console.error(`Error importing user at index ${i} (${loginId}):`, error);
    }
  }

  console.log('Import completed:');
  console.log(`- Users imported: ${importedUsers}`);
  console.log(`- Course enrollments: ${importedEnrollments}`);
  console.log(`- Users skipped (already existed): ${skippedUsers}`);
  console.log(`- Users skipped (no phone and no email): ${invalidUsers}`);
  console.log(`- Users failed: ${failedUsers}`);

  await setLoginUsernameForAllUsers();
}

// آرگومان‌ها:
//   --update-only       فقط username تمام کاربران را اپدیت کن (شماره یا ایمیل)
//   --enrollments-only  فقط دوره‌ها را برای کاربران موجود از فایل اضافه کن (بدون ساخت کاربر جدید)
//   [مسیر فایل JSON]   مسیر فایل؛ پیش‌فرض: moc-old-data/users_with_courses_2025-12-23.json
const args = process.argv.slice(2);
const updateOnly = args.includes('--update-only');
const enrollmentsOnly = args.includes('--enrollments-only');
const filePathArg = args.find((a) => !a.startsWith('--'));
const defaultPath = path.join(process.cwd(), 'moc-old-data/users_with_courses_2026-02-23.json');
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
  if (enrollmentsOnly) {
    await addEnrollmentsOnly(filePath);
    return;
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