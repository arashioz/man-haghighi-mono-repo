import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

type Primitive = string | number | boolean | null | undefined;

interface CurrentUserCourse {
  course: {
    id: string;
    title: string;
  };
}

interface CurrentUser {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  firstName?: string | null;
  lastName?: string | null;
  purchasedCourses: CurrentUserCourse[];
}

interface CurrentUsersFile extends Array<CurrentUser> {}

interface OldRow {
  username?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  course_title?: string | null;
  product_name?: string | null;
}

interface PhpMyAdminDumpEntry {
  type: 'header' | 'database' | 'table';
  name?: string;
  data?: OldRow[];
}

interface PreparedNewUser {
  user: {
    username: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    role: 'USER';
    isActive: true;
    isOld: true;
    mustChangePassword: true;
    passwordHash: string;
  };
  enrollCourseIds: string[];
  key: string;
  sourceSampleTitle?: string;
}

interface PreparedExistingEnrollment {
  userId: string;
  key: string;
  addCourseIds: string[];
  sourceSampleTitle?: string;
}

interface OutputFileShape {
  metadata: {
    generatedAt: string;
    currentUsers: number;
    oldRows: number;
    aggregatedOldUsers: number;
    newUsers: number;
    existingUsersWithAdds: number;
    unmatchedCourses: number;
  };
  newUsers: PreparedNewUser[];
  existingUserEnrollments: PreparedExistingEnrollment[];
  unmatchedCourses: Array<{ original: string; normalized: string; count: number }>;
}

const CURRENT_DATA_PATH = path.resolve(__dirname, '../moc-old-data/users_with_courses_2025-12-23.json');
const OLD_DATA_PATH = path.resolve(__dirname, '../moc-old-data/last_data_on_db.json');
const OUTPUT_PATH = path.resolve(__dirname, '../moc-old-data/legacy_merge_seed.json');
const DEFAULT_PASSWORD = 'user123';

function normalizeString(value: Primitive): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (['null', 'undefined'].includes(trimmed.toLowerCase())) return null;
  return trimmed;
}

function normalizeEmail(value?: Primitive): string | null {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  return normalized.toLowerCase();
}

function normalizePhone(value?: Primitive): string | null {
  const normalized = normalizeString(value);
  if (!normalized) return null;

  let digits = normalized.replace(/[^\d+]/g, '');
  if (!digits) return null;

  if (digits.startsWith('+98')) digits = '0' + digits.slice(3);
  else if (digits.startsWith('98') && digits.length >= 12) digits = '0' + digits.slice(2);
  else if (!digits.startsWith('0') && digits.length === 10) digits = '0' + digits;

  if (digits.length > 11) digits = digits.startsWith('0') ? digits.slice(0, 11) : digits.slice(-11);
  if (!/^0\d{9,10}$/.test(digits)) return null;
  return digits;
}

function buildKey(phone: string | null, email: string | null, username: string | null): string | null {
  return phone ?? email ?? username;
}

function normalizeCourseTitle(raw: Primitive): string | null {
  const base = normalizeString(raw);
  if (!base) return null;

  const replacements = [
    /دوره\s*آموزشی/gi,
    /بسته\s*ی?/gi,
    /بسته\s*آموزشی/gi,
    /پکیج/gi,
    /سمینار/gi,
    /مستند/gi,
    /وبینار/gi,
    /آنلاین/gi,
    /آموزشی/gi,
  ];

  let cleaned = base;
  replacements.forEach((r) => (cleaned = cleaned.replace(r, ' ')));
  cleaned = cleaned.replace(/\(prod[_\-\s]*\d+\)/gi, ' ');
  cleaned = cleaned.replace(/[()«»"“”؛:،,]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim().toLowerCase();
  return cleaned || null;
}

function ensureFileExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
}

function loadCurrentData(): { users: CurrentUsersFile; courseMap: Map<string, { id: string; title: string }> } {
  ensureFileExists(CURRENT_DATA_PATH);
  const raw = fs.readFileSync(CURRENT_DATA_PATH, 'utf-8');
  const users = JSON.parse(raw) as CurrentUsersFile;

  const courseMap = new Map<string, { id: string; title: string }>();
  for (const user of users) {
    for (const pc of user.purchasedCourses || []) {
      const normalizedTitle = normalizeCourseTitle(pc.course?.title);
      if (normalizedTitle && !courseMap.has(normalizedTitle)) {
        courseMap.set(normalizedTitle, { id: pc.course.id, title: pc.course.title });
      }
    }
  }

  return { users, courseMap };
}

function loadOldRows(): OldRow[] {
  ensureFileExists(OLD_DATA_PATH);
  const raw = fs.readFileSync(OLD_DATA_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as PhpMyAdminDumpEntry[];
  const table = parsed.find((e) => e.type === 'table' && e.name === 'u');
  if (!table || !Array.isArray(table.data)) {
    throw new Error('Could not find table "u" with data in last_data_on_db.json');
  }
  return table.data;
}

function buildUsernameCandidate(row: { username?: string | null; first_name?: string | null; last_name?: string | null }, fallback: string): string {
  const full = `${normalizeString(row.first_name) ?? ''} ${normalizeString(row.last_name) ?? ''}`.trim();
  const rawUsername = normalizeString(row.username);
  const base = full || rawUsername || fallback;
  return base
    .replace(/[^\w\u0600-\u06FF\d]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .trim()
    || `old_user_${fallback}`;
}

function main() {
  console.log('▶️  Loading current users and courses...');
  const { users: currentUsers, courseMap } = loadCurrentData();
  console.log(`   • Current users loaded: ${currentUsers.length}`);
  console.log(`   • Unique courses detected: ${courseMap.size}`);

  console.log('\n▶️  Loading old rows...');
  const oldRows = loadOldRows();
  console.log(`   • Old rows: ${oldRows.length}`);

  // Build current user map and course sets
  const existingUserMap = new Map<
    string,
    { user: CurrentUser; courseIds: Set<string> }
  >();
  const existingUsernames = new Set<string>();

  for (const user of currentUsers) {
    const key = buildKey(normalizePhone(user.phone), normalizeEmail(user.email), normalizeString(user.username));
    if (!key) continue;
    existingUsernames.add(user.username || '');
    existingUserMap.set(key, {
      user,
      courseIds: new Set((user.purchasedCourses || []).map((pc) => pc.course.id)),
    });
  }

  // Aggregate old rows by user key
  const oldAgg = new Map<
    string,
    {
      phone: string | null;
      email: string | null;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      courses: Set<string>;
      sampleTitle?: string;
    }
  >();

  const unmatchedCoursesCounter = new Map<string, { normalized: string; count: number }>();

  for (const row of oldRows) {
    const phone = normalizePhone(row.phone);
    const email = normalizeEmail(row.email);
    const username = normalizeString(row.username);
    const key = buildKey(phone, email, username);
    if (!key) continue;

    const courseTitle = normalizeCourseTitle(row.course_title) || normalizeCourseTitle(row.product_name);
    if (!courseTitle) continue;

    if (!oldAgg.has(key)) {
      oldAgg.set(key, {
        phone,
        email,
        username,
        firstName: normalizeString(row.first_name),
        lastName: normalizeString(row.last_name),
        courses: new Set<string>(),
        sampleTitle: row.course_title || row.product_name || undefined,
      });
    }

    oldAgg.get(key)!.courses.add(courseTitle);
  }

  console.log(`\n▶️  Aggregated old users: ${oldAgg.size}`);

  const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  const newUsers: PreparedNewUser[] = [];
  const existingEnrollments: PreparedExistingEnrollment[] = [];

  for (const [key, record] of oldAgg.entries()) {
    const courseIds: string[] = [];
    for (const normalizedCourse of record.courses) {
      const match = courseMap.get(normalizedCourse);
      if (match) {
        courseIds.push(match.id);
      } else {
        const counter = unmatchedCoursesCounter.get(normalizedCourse) || { normalized: normalizedCourse, count: 0 };
        counter.count += 1;
        unmatchedCoursesCounter.set(normalizedCourse, counter);
      }
    }

    if (!courseIds.length) {
      continue; // nothing to add
    }

    const existing = existingUserMap.get(key);
    if (existing) {
      const missing = courseIds.filter((cid) => !existing.courseIds.has(cid));
      if (missing.length) {
        existingEnrollments.push({
          userId: existing.user.id,
          key,
          addCourseIds: Array.from(new Set(missing)),
          sourceSampleTitle: record.sampleTitle,
        });
      }
      continue;
    }

    // New user
    let desiredUsername = buildUsernameCandidate(
      { username: record.username, first_name: record.firstName || undefined, last_name: record.lastName || undefined },
      key,
    );

    // Ensure username uniqueness
    let suffix = 1;
    const usernameBase = desiredUsername;
    while (existingUsernames.has(desiredUsername)) {
      desiredUsername = `${usernameBase}_${suffix++}`;
    }
    existingUsernames.add(desiredUsername);

    newUsers.push({
      key,
      sourceSampleTitle: record.sampleTitle,
      user: {
        username: desiredUsername,
        email: record.email ?? null,
        phone: record.phone ?? null,
        firstName: record.firstName ?? null,
        lastName: record.lastName ?? null,
        role: 'USER',
        isActive: true,
        isOld: true,
        mustChangePassword: true,
        passwordHash,
      },
      enrollCourseIds: Array.from(new Set(courseIds)),
    });
  }

  const unmatchedCourses = Array.from(unmatchedCoursesCounter.entries()).map(([normalized, info]) => ({
    original: normalized,
    normalized: info.normalized,
    count: info.count,
  }));

  const output: OutputFileShape = {
    metadata: {
      generatedAt: new Date().toISOString(),
      currentUsers: currentUsers.length,
      oldRows: oldRows.length,
      aggregatedOldUsers: oldAgg.size,
      newUsers: newUsers.length,
      existingUsersWithAdds: existingEnrollments.length,
      unmatchedCourses: unmatchedCourses.length,
    },
    newUsers,
    existingUserEnrollments: existingEnrollments,
    unmatchedCourses,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log('\n✅ Merge plan generated.');
  console.log(`   • New users to create: ${newUsers.length}`);
  console.log(`   • Existing users needing new enrollments: ${existingEnrollments.length}`);
  console.log(`   • Unmatched course titles: ${unmatchedCourses.length}`);
  console.log(`   → Output: ${OUTPUT_PATH}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Failed to generate merge plan:', (error as Error).message);
    process.exit(1);
  }
}

