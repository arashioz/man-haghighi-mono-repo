/**
 * Merge newly discovered legacy users/courses into current DB.
 *
 * Sources:
 * - moc-old-data/last_data_on_db.json    (raw export with username/email/phone/course_title/product_name)
 * - DB courses (for mapping course titles)
 *
 * Behavior:
 * - Unique user key priority: phone > email > username (user_login)
 * - Existing users: keep current data; only add missing course enrollments.
 * - New users: create with default password "user123", role USER, isOld=true, mustChangePassword=true.
 * - Course matching: normalize titles (remove "دوره/بسته/پکیج/آموزشی") and pick best Jaccard token match.
 *
 * Usage:
 *   npx ts-node scripts/merge-old-users.ts --dry-run   # only report (default)
 *   npx ts-node scripts/merge-old-users.ts --apply     # perform DB writes
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

export function normalizePhone(input?: string | null): string | null {
  if (!input) {
    return null;
  }

  // Convert Persian/Arabic digits to English digits
  let digits = String(input)
    .trim()
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[^\d+]/g, '');

  if (!digits) {
    return null;
  }

  // Handle +98 or 98 prefix
  if (digits.startsWith('+98')) {
    digits = '0' + digits.slice(3);
  } else if (digits.startsWith('98')) {
    // Only strip 98 if it's followed by 10 digits (like 98912...)
    if (digits.length === 12) {
      digits = '0' + digits.slice(2);
    } else if (digits.length === 11 && !digits.startsWith('0')) {
      // Handle cases like 98912345678 (11 digits, starts with 98)
      digits = '0' + digits.slice(2);
    }
  }

  // If it's 10 digits and doesn't start with 0, prepend 0 (e.g. 9123456789 -> 09123456789)
  if (!digits.startsWith('0') && digits.length === 10) {
    digits = '0' + digits;
  }

  // If it's more than 11 digits, try to find a valid 11-digit mobile number within it
  if (digits.length > 11) {
    if (digits.startsWith('0098')) {
      digits = '0' + digits.slice(4);
    } else {
      digits = digits.startsWith('0') ? digits.slice(0, 11) : digits.slice(-11);
    }
  }

  if (!/^0\d{9,10}$/.test(digits)) {
    return null;
  }

  return digits;
}

type RawEntry =
  | { type: 'header' | 'database'; [k: string]: any }
  | { type: 'table'; name: string; data: RawRow[]; [k: string]: any };

type RawRow = {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  product_name?: string;
  product_id?: string;
  course_title?: string;
};

type AggregatedUser = {
  key: string;
  phone?: string | null;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  courses: Set<string>; // raw course titles
};

type MatchedCourse = {
  rawTitle: string;
  matchedCourseId?: string;
  matchedCourseTitle?: string;
  score: number;
};

const prisma = new PrismaClient();

const DATA_DIR = path.join(process.cwd(), 'moc-old-data');
const RAW_FILE = path.join(DATA_DIR, 'last_data_on_db.json');
const DEFAULT_PASSWORD = 'user123';
const APPLY_CHANGES = process.argv.includes('--apply');

// Keywords to strip from titles before matching
const TITLE_STOP_WORDS = [
  'دوره',
  'بسته',
  'پکیج',
  'پکیچ',
  'آموزشی',
  'آموزش',
  'سمینار',
  'مستند',
  'ترجمه شده',
  'آموزشـی',
  'پک',
  'pack',
  'package',
  'course',
];

function normalizeTitle(input?: string | null): string {
  if (!input) return '';
  let s = input.toLowerCase();
  s = s.replace(/آ/g, 'ا').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  TITLE_STOP_WORDS.forEach((w) => {
    const pattern = new RegExp(`\\b${w}\\b`, 'gu');
    s = s.replace(pattern, ' ');
  });
  s = s.replace(/[^\p{L}\p{N}]+/gu, ' ');
  s = s.replace(/\s+/g, ' ').trim();
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

type CourseIndex = Awaited<ReturnType<typeof loadCourses>>;
type CourseIndexEntry = CourseIndex[number];

async function loadCourses() {
  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
  });
  return courses.map((c) => ({
    ...c,
    normalized: normalizeTitle(c.title),
    tokens: tokens(normalizeTitle(c.title)),
  }));
}

function loadRawRows(): RawRow[] {
  const content = fs.readFileSync(RAW_FILE, 'utf-8');
  const parsed = JSON.parse(content) as RawEntry[];
  const table = parsed.find((e) => e.type === 'table' && (e as any).name === 'u') as
    | (RawEntry & { data: RawRow[] })
    | undefined;
  if (!table || !Array.isArray(table.data)) {
    throw new Error('Could not find table "u" data in last_data_on_db.json');
  }
  return table.data;
}

function aggregateUsers(rows: RawRow[]): Map<string, AggregatedUser> {
  const users: AggregatedUser[] = [];
  const phoneMap = new Map<string, AggregatedUser>();
  const emailMap = new Map<string, AggregatedUser>();
  const usernameMap = new Map<string, AggregatedUser>();

  for (const row of rows) {
    const rawPhone = row.phone?.toString().trim();
    const normPhone = rawPhone ? normalizePhone(rawPhone) : null;
    const email = row.email?.toString().trim().toLowerCase() || null;
    const username = row.username?.toString().trim() || null;

    if (!normPhone && !email && !username) continue;

    // Find if we already have this user by any identifier
    let agg =
      (normPhone ? phoneMap.get(normPhone) : null) ||
      (email ? emailMap.get(email) : null) ||
      (username ? usernameMap.get(username) : null);

    if (!agg) {
      agg = {
        key: normPhone || email || username || 'unknown',
        phone: normPhone,
        email,
        username,
        firstName: row.first_name?.toString().trim() || null,
        lastName: row.last_name?.toString().trim() || null,
        courses: new Set<string>(),
      };
      users.push(agg);
    }

    // Merge identifiers
    if (normPhone) {
      agg.phone = agg.phone || normPhone;
      phoneMap.set(normPhone, agg);
    }
    if (email) {
      agg.email = agg.email || email;
      emailMap.set(email, agg);
    }
    if (username) {
      agg.username = agg.username || username;
      usernameMap.set(username, agg);
    }

    const courseTitle = row.course_title?.toString().trim();
    const productName = row.product_name?.toString().trim();
    const chosenTitle = courseTitle || productName;
    if (chosenTitle) {
      agg.courses.add(chosenTitle);
    }

    if (!agg.firstName && row.first_name) agg.firstName = row.first_name.toString().trim();
    if (!agg.lastName && row.last_name) agg.lastName = row.last_name.toString().trim();
  }

  // Use phone or email or username as final key in the resulting map
  const finalMap = new Map<string, AggregatedUser>();
  for (const user of users) {
    const key = user.phone || user.email || user.username || 'unknown';
    finalMap.set(key, user);
  }
  return finalMap;
}

function matchCourse(rawTitle: string, courseIndex: CourseIndex): MatchedCourse {
  const normalized = normalizeTitle(rawTitle);
  const rawTokens = tokens(normalized);
  let best: MatchedCourse = { rawTitle, score: 0 };
  for (const c of courseIndex) {
    const score = jaccard(rawTokens, c.tokens);
    if (score > best.score) {
      best = {
        rawTitle,
        matchedCourseId: c.id,
        matchedCourseTitle: c.title,
        score,
      };
    }
  }
  return best;
}

function isEmptyValue(value?: string | null): boolean {
  if (!value) {
    return true;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  const normalized = trimmed.toLowerCase();
  return normalized === 'null' || normalized === 'undefined';
}

async function ensureUserAndCourses(
  agg: AggregatedUser,
  courseMatches: MatchedCourse[],
): Promise<{ created: boolean; addedCourses: number; updated: boolean }> {
  const courseIds = Array.from(
    new Set(
      courseMatches
        .filter((m) => m.matchedCourseId && m.score >= 0.25)
        .map((m) => m.matchedCourseId as string),
    ),
  );

  if (!courseIds.length) {
    if (agg.username === 'samirarajabiehfard' || agg.phone === '09209203626') {
      console.log(`⚠️  User ${agg.username} has no matching courses. Titles:`, Array.from(agg.courses));
    }
    return { created: false, addedCourses: 0, updated: false };
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        ...(agg.phone ? [{ phone: agg.phone }] : []),
        ...(agg.email ? [{ email: agg.email }] : []),
        ...(agg.username ? [{ username: agg.username }] : []),
      ],
    },
  });

  if (existing) {
    let updated = false;
    const updateData: any = {};

    // Update missing fields
    if (isEmptyValue(existing.phone) && agg.phone) {
      const phoneOwner = await prisma.user.findFirst({
        where: { phone: agg.phone },
        select: { id: true, username: true },
      });
      if (phoneOwner && phoneOwner.id !== existing.id) {
        console.log(
          `⚠️  Phone ${agg.phone} already assigned to ${phoneOwner.username || phoneOwner.id}, skipping update for ${existing.username || existing.id}`,
        );
      } else {
        updateData.phone = agg.phone;
        updated = true;
      }
    }
    if (isEmptyValue(existing.email) && agg.email) {
      updateData.email = agg.email;
      updated = true;
    }
    if (isEmptyValue(existing.firstName) && agg.firstName) {
      updateData.firstName = agg.firstName;
      updated = true;
    }
    if (isEmptyValue(existing.lastName) && agg.lastName) {
      updateData.lastName = agg.lastName;
      updated = true;
    }

    if (updated && APPLY_CHANGES) {
      await prisma.user.update({
        where: { id: existing.id },
        data: updateData,
      });
      console.log(`✅ Updated info for user: ${existing.username || existing.id}`);
    }

    let added = 0;
    for (const courseId of courseIds) {
      const already = await prisma.courseEnrollment.findUnique({
        where: {
          userId_courseId: { userId: existing.id, courseId },
        },
      });
      if (!already) {
        if (APPLY_CHANGES) {
          try {
            await prisma.courseEnrollment.create({
              data: {
                userId: existing.id,
                courseId,
              },
            });
          } catch (error: any) {
            if (error.code === 'P2002') {
              console.log(`⚠️  Course enrollment already exists, skipping: user ${existing.id} -> course ${courseId}`);
              continue;
            }
            throw error;
          }
        }
        added++;
      }
    }
    return { created: false, addedCourses: added, updated };
  }

  // Create new user
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  if (APPLY_CHANGES) {
    try {
      await prisma.user.create({
        data: {
          phone: agg.phone,
          email: agg.email,
          username: agg.username || agg.phone || agg.email || undefined,
          firstName: agg.firstName || agg.username || 'کاربر',
          lastName: agg.lastName || '',
          role: UserRole.USER,
          isActive: true,
          isOld: true,
          password: hashedPassword,
          mustChangePassword: true,
          otp: null,
          otpExpiresAt: null,
          purchasedCourses: {
            create: courseIds.map((courseId) => ({
              course: { connect: { id: courseId } },
            })),
          },
        },
      });
    } catch (error: any) {
      // If user already exists (unique constraint violation), skip creation
      if (error.code === 'P2002') {
        console.log(`⚠️  User already exists, skipping: ${agg.email || agg.phone || agg.username}`);
        return { created: false, addedCourses: 0, updated: false };
      }
      throw error;
    }
  }

  return { created: true, addedCourses: courseIds.length, updated: false };
}

async function main() {
  console.log(`🔎 Loading raw data from ${RAW_FILE}`);
  const rawRows = loadRawRows();
  console.log(`📦 Rows loaded: ${rawRows.length}`);

  console.log('🔎 Loading courses from DB...');
  const courses = await loadCourses();
  console.log(`📚 Courses in DB: ${courses.length}`);

  const users = aggregateUsers(rawRows);
  console.log(`👥 Aggregated users: ${users.size}`);

  let createdUsers = 0;
  let addedEnrollments = 0;
  const unresolvedCourses: Record<string, number> = {};

  let processed = 0;
  for (const agg of users.values()) {
    processed++;
    const matches: MatchedCourse[] = [];
    for (const title of agg.courses) {
      const m = matchCourse(title, courses);
      matches.push(m);
      if (!m.matchedCourseId || m.score < 0.25) {
        const key = normalizeTitle(title) || title;
        unresolvedCourses[key] = (unresolvedCourses[key] || 0) + 1;
      }
    }

    const result = await ensureUserAndCourses(agg, matches);
    createdUsers += result.created ? 1 : 0;
    addedEnrollments += result.addedCourses;

    if (processed % 500 === 0) {
      console.log(
        `   ... processed ${processed}/${users.size} | new users: ${createdUsers} | enrollments added (incl dry-run): ${addedEnrollments}`,
      );
    }
  }

  console.log('');
  console.log('✅ Merge completed.');
  console.log(`   Users processed: ${users.size}`);
  console.log(`   New users created${APPLY_CHANGES ? '' : ' (would be)'}: ${createdUsers}`);
  console.log(`   Enrollments added${APPLY_CHANGES ? '' : ' (would be)'}: ${addedEnrollments}`);
  console.log(`   Unresolved course titles: ${Object.keys(unresolvedCourses).length}`);

  const unresolvedPath = path.join(DATA_DIR, 'unresolved_courses_merge.json');
  fs.writeFileSync(unresolvedPath, JSON.stringify(unresolvedCourses, null, 2), 'utf-8');
  console.log(`   ↳ Unresolved titles saved to ${unresolvedPath}`);

  if (!APPLY_CHANGES) {
    console.log('');
    console.log('Dry run only. Re-run with --apply to write changes to DB.');
  }
}

main()
  .catch((err) => {
    console.error('❌ Merge failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


