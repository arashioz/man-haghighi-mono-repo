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

  let digits = String(input)
    .trim()
    .replace(/[^\d+]/g, '');

  if (!digits) {
    return null;
  }

  if (digits.startsWith('+98')) {
    digits = '0' + digits.slice(3);
  } else if (digits.startsWith('98') && digits.length >= 11) {
    digits = '0' + digits.slice(2);
  } else if (!digits.startsWith('0') && digits.length === 10) {
    digits = '0' + digits;
  }

  if (digits.length > 11) {
    digits = digits.startsWith('0') ? digits.slice(0, 11) : digits.slice(-11);
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
  const map = new Map<string, AggregatedUser>();
  for (const row of rows) {
    const rawPhone = row.phone?.toString().trim();
    const normPhone = rawPhone ? normalizePhone(rawPhone) : null;
    const email = row.email?.toString().trim() || null;
    const username = row.username?.toString().trim() || null;

    const key = normPhone || email || username;
    if (!key) continue; // skip entries without any identifier

    const agg = map.get(key) || {
      key,
      phone: normPhone,
      email,
      username,
      firstName: row.first_name?.toString().trim() || null,
      lastName: row.last_name?.toString().trim() || null,
      courses: new Set<string>(),
    };

    const courseTitle = row.course_title?.toString().trim();
    const productName = row.product_name?.toString().trim();
    const chosenTitle = courseTitle || productName;
    if (chosenTitle) {
      agg.courses.add(chosenTitle);
    }

    // prefer to keep a phone/email/username if it was missing initially
    if (!agg.phone && normPhone) agg.phone = normPhone;
    if (!agg.email && email) agg.email = email;
    if (!agg.username && username) agg.username = username;
    if (!agg.firstName && row.first_name) agg.firstName = row.first_name;
    if (!agg.lastName && row.last_name) agg.lastName = row.last_name;

    map.set(key, agg);
  }
  return map;
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

async function ensureUserAndCourses(
  agg: AggregatedUser,
  courseMatches: MatchedCourse[],
): Promise<{ created: boolean; addedCourses: number }> {
  const courseIds = Array.from(
    new Set(
      courseMatches
        .filter((m) => m.matchedCourseId && m.score >= 0.25)
        .map((m) => m.matchedCourseId as string),
    ),
  );

  if (!courseIds.length) return { created: false, addedCourses: 0 };

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        ...(agg.phone ? [{ phone: agg.phone }] : []),
        ...(agg.email ? [{ email: agg.email }] : []),
        ...(agg.username ? [{ username: agg.username }] : []),
      ],
    },
    select: { id: true },
  });

  if (existing) {
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
    return { created: false, addedCourses: added };
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
        return { created: false, addedCourses: 0 };
      }
      throw error;
    }
  }

  return { created: true, addedCourses: courseIds.length };
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


