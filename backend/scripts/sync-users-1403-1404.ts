import fs from 'fs';
import path from 'path';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

type PurchasedCourseItem = {
  courseId?: string | null;
  enrolledAt?: string | null;
  createdAt?: string | null;
  course?: {
    id?: string | null;
  } | null;
};

type ImportUser = {
  id?: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  isActive?: boolean | null;
  isOld?: boolean | null;
  isBlocked?: boolean | null;
  education?: string | null;
  university?: string | null;
  job?: string | null;
  state?: string | null;
  gender?: string | null;
  purchasedCourses?: PurchasedCourseItem[];
  videoAccessIds?: string[];
  audioAccessIds?: string[];
};

type SyncCounters = {
  processed: number;
  createdUsers: number;
  updatedUsers: number;
  skippedNoIdentity: number;
  duplicateInputUsers: number;
  coursesAdded: number;
  coursesRemoved: number;
  videosAdded: number;
  videosRemoved: number;
  audiosAdded: number;
  audiosRemoved: number;
  missingUsersSoftDeleted: number;
  missingUsersHardDeleted: number;
};

const counters: SyncCounters = {
  processed: 0,
  createdUsers: 0,
  updatedUsers: 0,
  skippedNoIdentity: 0,
  duplicateInputUsers: 0,
  coursesAdded: 0,
  coursesRemoved: 0,
  videosAdded: 0,
  videosRemoved: 0,
  audiosAdded: 0,
  audiosRemoved: 0,
  missingUsersSoftDeleted: 0,
  missingUsersHardDeleted: 0,
};

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const shouldHardDeleteMissingUsers = args.includes('--hard-delete-missing-users');
const shouldSoftDeleteMissingUsers = !shouldHardDeleteMissingUsers;
const fileArg = args.find((a) => !a.startsWith('--'));

function normalizeString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeEmail(email: string | null | undefined): string | null {
  const value = normalizeString(email);
  return value ? value.toLowerCase() : null;
}

// If a phone contains two numbers with separators, only the first valid chunk is used.
function normalizePhone(phone: string | null | undefined): string | null {
  const value = normalizeString(phone);
  if (!value) return null;
  const compact = value.replace(/\s/g, '');
  const firstChunk = compact.split(/\s*[-/]+\s*/).map((s) => s.trim()).filter(Boolean)[0] || compact;
  return firstChunk || null;
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

function getDefaultDataFilePath(): string {
  const fromRoot = path.resolve(__dirname, '../../moc-old-data/users_import_1403_1404.json');
  const fromBackend = path.resolve(__dirname, '../moc-old-data/users_import_1403_1404.json');
  if (fs.existsSync(fromRoot)) return fromRoot;
  if (fs.existsSync(fromBackend)) return fromBackend;
  return fromRoot;
}

function resolveDataFilePath(): string {
  if (!fileArg) return getDefaultDataFilePath();
  if (path.isAbsolute(fileArg)) return fileArg;
  return path.resolve(process.cwd(), fileArg);
}

function getIdentityKey(phone: string | null, email: string | null): string | null {
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  return null;
}

async function getValidIds(table: 'course' | 'video' | 'audio', ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set<string>();
  const out = new Set<string>();
  const chunks = chunkArray(ids, 1000);
  for (const idChunk of chunks) {
    if (table === 'course') {
      const rows = await prisma.course.findMany({
        where: { id: { in: idChunk } },
        select: { id: true },
      });
      rows.forEach((r) => out.add(r.id));
    } else if (table === 'video') {
      const rows = await prisma.video.findMany({
        where: { id: { in: idChunk } },
        select: { id: true },
      });
      rows.forEach((r) => out.add(r.id));
    } else {
      const rows = await prisma.audio.findMany({
        where: { id: { in: idChunk } },
        select: { id: true },
      });
      rows.forEach((r) => out.add(r.id));
    }
  }
  return out;
}

async function buildUsername(base: string, userIdSuffixSource: string): Promise<string> {
  let candidate = base;
  let i = 0;
  while (true) {
    const existing = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!existing) return candidate;
    i += 1;
    candidate = `${base}_${userIdSuffixSource.slice(-6)}_${i}`;
  }
}

async function main() {
  const filePath = resolveDataFilePath();
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found at: ${filePath}`);
  }

  console.log(`Reading users from: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as ImportUser[];
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid JSON structure: expected an array of users.');
  }

  console.log(`Users in file: ${parsed.length}`);

  const normalizedInput = parsed.map((u, idx) => {
    const phone = normalizePhone(u.phone);
    const email = normalizeEmail(u.email);
    const identityKey = getIdentityKey(phone, email);
    const desiredUsernameBase = normalizeString(phone) || normalizeString(email) || `legacy_${idx + 1}`;
    const courseItems = Array.isArray(u.purchasedCourses) ? u.purchasedCourses : [];
    const desiredCourseIds = uniq(
      courseItems
        .map((c) => normalizeString(c?.courseId) || normalizeString(c?.course?.id))
        .filter((v): v is string => Boolean(v)),
    );
    const desiredVideoIds = uniq((u.videoAccessIds || []).map((v) => normalizeString(v)).filter((v): v is string => Boolean(v)));
    const desiredAudioIds = uniq((u.audioAccessIds || []).map((v) => normalizeString(v)).filter((v): v is string => Boolean(v)));

    return {
      original: u,
      idx,
      phone,
      email,
      identityKey,
      desiredUsernameBase,
      desiredCourseIds,
      desiredVideoIds,
      desiredAudioIds,
      desiredCourseItems: courseItems,
    };
  });

  const dedupedByIdentity = new Map<string, (typeof normalizedInput)[number]>();
  for (const item of normalizedInput) {
    if (!item.identityKey) {
      counters.skippedNoIdentity += 1;
      continue;
    }
    if (dedupedByIdentity.has(item.identityKey)) {
      counters.duplicateInputUsers += 1;
      continue;
    }
    dedupedByIdentity.set(item.identityKey, item);
  }

  const deduped = Array.from(dedupedByIdentity.values());
  console.log(`Users considered for sync: ${deduped.length}`);
  console.log(`Skipped (no phone/email): ${counters.skippedNoIdentity}`);
  console.log(`Skipped duplicate identities in file: ${counters.duplicateInputUsers}`);

  const allPhones = uniq(deduped.map((u) => u.phone).filter((v): v is string => Boolean(v)));
  const allEmails = uniq(deduped.map((u) => u.email).filter((v): v is string => Boolean(v)));

  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [
        ...(allPhones.length ? [{ phone: { in: allPhones } }] : []),
        ...(allEmails.length ? [{ email: { in: allEmails } }] : []),
      ],
    },
    select: {
      id: true,
      phone: true,
      email: true,
      username: true,
    },
  });

  const byPhone = new Map<string, (typeof existingUsers)[number]>();
  const byEmail = new Map<string, (typeof existingUsers)[number]>();
  existingUsers.forEach((u) => {
    if (u.phone) byPhone.set(u.phone, u);
    if (u.email) byEmail.set(u.email, u);
  });

  const allCourseIdsInFile = uniq(deduped.flatMap((u) => u.desiredCourseIds));
  const allVideoIdsInFile = uniq(deduped.flatMap((u) => u.desiredVideoIds));
  const allAudioIdsInFile = uniq(deduped.flatMap((u) => u.desiredAudioIds));

  const validCourseIds = await getValidIds('course', allCourseIdsInFile);
  const validVideoIds = await getValidIds('video', allVideoIdsInFile);
  const validAudioIds = await getValidIds('audio', allAudioIdsInFile);

  const managedIdentityKeys = new Set<string>();

  for (const item of deduped) {
    counters.processed += 1;
    if (counters.processed % 200 === 0) {
      console.log(`Processed ${counters.processed}/${deduped.length} users...`);
    }

    const { original, phone, email, desiredUsernameBase, desiredCourseIds, desiredVideoIds, desiredAudioIds, desiredCourseItems } = item;
    if (!item.identityKey) continue;
    managedIdentityKeys.add(item.identityKey);

    const matched = (phone && byPhone.get(phone)) || (email && byEmail.get(email)) || null;

    if (!shouldApply) {
      if (matched) {
        counters.updatedUsers += 1;
      } else {
        counters.createdUsers += 1;
      }
      continue;
    }

    let userId: string;
    if (matched) {
      userId = matched.id;
      counters.updatedUsers += 1;

      const usernameBase = desiredUsernameBase || matched.username;
      const targetUsername = usernameBase === matched.username ? matched.username : await buildUsername(usernameBase, matched.id);

      await prisma.user.update({
        where: { id: matched.id },
        data: {
          phone: phone || null,
          email: email || null,
          firstName: normalizeString(original.firstName),
          lastName: normalizeString(original.lastName),
          education: normalizeString(original.education),
          university: normalizeString(original.university),
          job: normalizeString(original.job),
          state: normalizeString(original.state),
          gender: normalizeString(original.gender),
          role: UserRole.USER,
          username: targetUsername,
          isOld: true,
          isActive: typeof original.isActive === 'boolean' ? original.isActive : true,
          isBlocked: typeof original.isBlocked === 'boolean' ? original.isBlocked : false,
        },
      });
    } else {
      counters.createdUsers += 1;
      const usernameBase = desiredUsernameBase || `legacy_${item.idx + 1}`;
      const username = await buildUsername(usernameBase, `${item.idx + 1}`);
      const created = await prisma.user.create({
        data: {
          phone: phone || null,
          email: email || null,
          username,
          firstName: normalizeString(original.firstName),
          lastName: normalizeString(original.lastName),
          education: normalizeString(original.education),
          university: normalizeString(original.university),
          job: normalizeString(original.job),
          state: normalizeString(original.state),
          gender: normalizeString(original.gender),
          role: UserRole.USER,
          isOld: true,
          isActive: typeof original.isActive === 'boolean' ? original.isActive : true,
          isBlocked: typeof original.isBlocked === 'boolean' ? original.isBlocked : false,
        },
      });
      userId = created.id;
      if (phone) byPhone.set(phone, { ...created, email: created.email, phone: created.phone });
      if (email) byEmail.set(email, { ...created, email: created.email, phone: created.phone });
    }

    const desiredCourseSet = new Set(desiredCourseIds.filter((id) => validCourseIds.has(id)));
    const desiredVideoSet = new Set(desiredVideoIds.filter((id) => validVideoIds.has(id)));
    const desiredAudioSet = new Set(desiredAudioIds.filter((id) => validAudioIds.has(id)));

    const [existingEnrollments, existingVideoAccess, existingAudioAccess] = await Promise.all([
      prisma.courseEnrollment.findMany({ where: { userId }, select: { courseId: true } }),
      prisma.videoAccess.findMany({ where: { userId }, select: { videoId: true } }),
      prisma.audioAccess.findMany({ where: { userId }, select: { audioId: true } }),
    ]);

    const existingCourseSet = new Set(existingEnrollments.map((e) => e.courseId));
    const existingVideoSet = new Set(existingVideoAccess.map((v) => v.videoId));
    const existingAudioSet = new Set(existingAudioAccess.map((a) => a.audioId));

    const coursesToAdd = Array.from(desiredCourseSet).filter((courseId) => !existingCourseSet.has(courseId));
    const coursesToRemove = Array.from(existingCourseSet).filter((courseId) => !desiredCourseSet.has(courseId));

    const videosToAdd = Array.from(desiredVideoSet).filter((videoId) => !existingVideoSet.has(videoId));
    const videosToRemove = Array.from(existingVideoSet).filter((videoId) => !desiredVideoSet.has(videoId));

    const audiosToAdd = Array.from(desiredAudioSet).filter((audioId) => !existingAudioSet.has(audioId));
    const audiosToRemove = Array.from(existingAudioSet).filter((audioId) => !desiredAudioSet.has(audioId));

    if (coursesToAdd.length > 0) {
      for (const courseId of coursesToAdd) {
        const matchingCourseItem = desiredCourseItems.find((c) => {
          const id = normalizeString(c?.courseId) || normalizeString(c?.course?.id);
          return id === courseId;
        });
        const enrolledAtRaw = normalizeString(matchingCourseItem?.enrolledAt) || normalizeString(matchingCourseItem?.createdAt);
        await prisma.courseEnrollment.create({
          data: {
            userId,
            courseId,
            enrolledAt: enrolledAtRaw ? new Date(enrolledAtRaw) : new Date(),
          },
        });
      }
      counters.coursesAdded += coursesToAdd.length;
    }

    if (coursesToRemove.length > 0) {
      await prisma.courseEnrollment.deleteMany({
        where: { userId, courseId: { in: coursesToRemove } },
      });
      counters.coursesRemoved += coursesToRemove.length;
    }

    if (videosToAdd.length > 0) {
      await prisma.videoAccess.createMany({
        data: videosToAdd.map((videoId) => ({ userId, videoId })),
        skipDuplicates: true,
      });
      counters.videosAdded += videosToAdd.length;
    }

    if (videosToRemove.length > 0) {
      await prisma.videoAccess.deleteMany({
        where: { userId, videoId: { in: videosToRemove } },
      });
      counters.videosRemoved += videosToRemove.length;
    }

    if (audiosToAdd.length > 0) {
      await prisma.audioAccess.createMany({
        data: audiosToAdd.map((audioId) => ({ userId, audioId })),
        skipDuplicates: true,
      });
      counters.audiosAdded += audiosToAdd.length;
    }

    if (audiosToRemove.length > 0) {
      await prisma.audioAccess.deleteMany({
        where: { userId, audioId: { in: audiosToRemove } },
      });
      counters.audiosRemoved += audiosToRemove.length;
    }
  }

  if (shouldApply) {
    // Scope for "missing users": old imported normal users.
    const candidateMissingUsers = await prisma.user.findMany({
      where: {
        role: UserRole.USER,
        isOld: true,
      },
      select: {
        id: true,
        phone: true,
        email: true,
      },
    });

    const missingUserIds = candidateMissingUsers
      .filter((u) => {
        const identity = getIdentityKey(normalizePhone(u.phone), normalizeEmail(u.email));
        if (!identity) return false;
        return !managedIdentityKeys.has(identity);
      })
      .map((u) => u.id);

    if (missingUserIds.length > 0) {
      if (shouldHardDeleteMissingUsers) {
        await prisma.user.deleteMany({ where: { id: { in: missingUserIds } } });
        counters.missingUsersHardDeleted = missingUserIds.length;
      } else if (shouldSoftDeleteMissingUsers) {
        await prisma.user.updateMany({
          where: { id: { in: missingUserIds } },
          data: { isActive: false },
        });
        counters.missingUsersSoftDeleted = missingUserIds.length;
      }
    }
  }

  console.log('\n=== Sync Result ===');
  console.log(`Mode: ${shouldApply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Processed users: ${counters.processed}`);
  console.log(`Users created: ${counters.createdUsers}`);
  console.log(`Users updated: ${counters.updatedUsers}`);
  console.log(`Skipped (no identity): ${counters.skippedNoIdentity}`);
  console.log(`Skipped (duplicate in file): ${counters.duplicateInputUsers}`);
  console.log(`Courses added: ${counters.coursesAdded}`);
  console.log(`Courses removed: ${counters.coursesRemoved}`);
  console.log(`Video access added: ${counters.videosAdded}`);
  console.log(`Video access removed: ${counters.videosRemoved}`);
  console.log(`Audio access added: ${counters.audiosAdded}`);
  console.log(`Audio access removed: ${counters.audiosRemoved}`);
  console.log(`Missing users soft-deleted: ${counters.missingUsersSoftDeleted}`);
  console.log(`Missing users hard-deleted: ${counters.missingUsersHardDeleted}`);
  console.log('\nFlags:');
  console.log('  --apply                    Apply changes to DB (default is dry-run)');
  console.log('  --hard-delete-missing-users Permanently delete missing imported users');
  console.log('  [filePath]                 Optional path to users_import_1403_1404.json');
}

main()
  .catch((err) => {
    console.error('Sync failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
