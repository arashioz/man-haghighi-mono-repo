/**
 * اسکریپت: تخصیص دوره‌های سایت به کاربران بر اساس محصولات قدیمی (OldProduct)
 *
 * اگر نام محصول قدیمی کاربر شبیه عنوان یک دورهٔ منتشرشده در سایت باشد،
 * آن دوره به لیست دوره‌های کاربر (CourseEnrollment) اضافه می‌شود تا بتواند از دورهٔ جدید استفاده کند.
 *
 * شباهت: نرمال‌سازی عنوان (حذف «بسته آموزشی»، «دوره آموزش» و...) + تطبیق شامل بودن یا Jaccard.
 *
 * Usage:
 *   npx ts-node scripts/assign-courses-from-old-products.ts           # پیش‌نمایش (dry-run)
 *   npx ts-node scripts/assign-courses-from-old-products.ts --apply   # اعمال در دیتابیس
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const TITLE_STOP_WORDS = [
  'دوره',
  'بسته',
  'پکیج',
  'پکیچ',
  'آموزشی',
  'آموزش',
  'سمینار',
  'مستند',
  'ترجمه',
  'شده',
  'پک',
  'pack',
  'package',
  'course',
];

function normalizeTitle(input: string | null | undefined): string {
  if (!input) return '';
  let s = input
    .trim()
    .toLowerCase()
    .replace(/آ/g, 'ا')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک');
  TITLE_STOP_WORDS.forEach((w) => {
    const pattern = new RegExp(`\\b${w}\\b`, 'gu');
    s = s.replace(pattern, ' ');
  });
  s = s.replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

function tokens(s: string): Set<string> {
  return new Set(s.split(' ').filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let intersect = 0;
  a.forEach((t) => {
    if (b.has(t)) intersect++;
  });
  const union = a.size + b.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

/** حداقل طول نرمال‌شده برای در نظر گرفتن تطبیق */
const MIN_NORMALIZED_LENGTH = 2;

type CourseEntry = {
  id: string;
  title: string;
  normalized: string;
  tokens: Set<string>;
};

async function loadPublishedCourses(): Promise<CourseEntry[]> {
  const courses = await prisma.course.findMany({
    where: { published: true },
    select: { id: true, title: true },
  });
  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    normalized: normalizeTitle(c.title),
    tokens: tokens(normalizeTitle(c.title)),
  }));
}

async function main() {
  console.log(APPLY ? '🔧 حالت اعمال (--apply)' : '👀 حالت پیش‌نمایش (dry-run)');
  console.log('');

  const courses = await loadPublishedCourses();
  console.log(`📚 تعداد دوره‌های منتشرشده: ${courses.length}`);

  const usersWithOldProducts = await prisma.user.findMany({
    where: {
      oldProducts: { some: {} },
    },
    select: {
      id: true,
      username: true,
      phone: true,
      oldProducts: {
        select: { id: true, productName: true, productId: true },
      },
      purchasedCourses: { select: { courseId: true } },
    },
  });

  console.log(`👥 تعداد کاربران دارای محصول قدیمی: ${usersWithOldProducts.length}`);
  if (usersWithOldProducts.length === 0) {
    console.log('هیچ کاربری با محصول قدیمی یافت نشد.');
    return;
  }

  let totalAssignments = 0;
  const report: { userId: string; username: string; productName: string; courseTitle: string; courseId: string }[] = [];

  for (const user of usersWithOldProducts) {
    const enrolledIds = new Set(user.purchasedCourses.map((e) => e.courseId));

    for (const op of user.oldProducts) {
      const productName = op.productName?.trim() || '';
      if (!productName) continue;

      const normProduct = normalizeTitle(productName);
      const productTokens = tokens(normProduct);
      if (normProduct.length < MIN_NORMALIZED_LENGTH) continue;

      let bestCourse: CourseEntry | null = null;
      let bestScore = 0;

      for (const course of courses) {
        if (enrolledIds.has(course.id)) continue;
        const byInclude =
          course.normalized.includes(normProduct) || normProduct.includes(course.normalized);
        const sim = jaccard(productTokens, course.tokens);
        const score = byInclude ? Math.max(sim, 0.5) : sim;
        if ((score >= 0.3 || byInclude) && score > bestScore) {
          bestScore = score;
          bestCourse = course;
        }
      }

      if (bestCourse) {
        report.push({
          userId: user.id,
          username: user.username,
          productName: productName,
          courseTitle: bestCourse.title,
          courseId: bestCourse.id,
        });
        if (APPLY) {
          await prisma.courseEnrollment.upsert({
            where: {
              userId_courseId: { userId: user.id, courseId: bestCourse.id },
            },
            create: { userId: user.id, courseId: bestCourse.id },
            update: {},
          });
          totalAssignments++;
        }
        enrolledIds.add(bestCourse.id);
      }
    }
  }

  if (report.length === 0) {
    console.log('هیچ تطبیقی برای تخصیص یافت نشد.');
    return;
  }

  console.log('');
  console.log(`✅ تعداد تطبیق‌های پیشنهادی: ${report.length}`);
  report.slice(0, 25).forEach((r) => {
    console.log(`   ${r.username} | "${r.productName}" → "${r.courseTitle}" (${r.courseId})`);
  });
  if (report.length > 25) {
    console.log(`   ... و ${report.length - 25} مورد دیگر`);
  }

  if (APPLY) {
    console.log('');
    console.log(`🎉 تعداد enrollment ایجاد/تأیید شده: ${totalAssignments}`);
  } else {
    console.log('');
    console.log('برای اعمال تغییرات، اسکریپت را با --apply اجرا کن.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
