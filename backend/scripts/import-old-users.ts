import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface OldUserInfo {
  id?: string;
  ID?: string;
  user_login?: string;
  user_pass?: string;
  user_nicename?: string;
  user_email?: string;
  user_phone?: string | null;
  user_url?: string | null;
  user_activation_key?: string | null;
  user_status?: string | null;
  display_name?: string | null;
  sms?: string | null;
  phone?: string | null;
  uToken?: string | null;
  spam?: string | null;
  deleted?: string | null;
  user_registered?: string | null;
  education?: string | null;
  univercity?: string | null;
  job?: string | null;
  state?: string | null;
  gender?: string | null;
}

interface OldUserProduct {
  product_id?: string | null;
  product_name?: string | null;
  product_category?: string | null;
}

interface MergedDataUser {
  user_info: OldUserInfo;
  products?: OldUserProduct[];
}

interface MergedDataFile {
  metadata?: {
    total_users?: number;
    users_with_products?: number;
    total_products?: number;
    created_at?: string;
  };
  users: Record<string, MergedDataUser>;
}

interface UsersJsonFile {
  users: OldUserInfo[];
}

interface NormalizedOldUser {
  legacyId: string;
  info: OldUserInfo;
  products: OldUserProduct[];
}

interface ImportStats {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  usersWithProducts: number;
  productsCreated: number;
  coursesEnsured: number;
  enrollmentsCreated: number;
}

interface ImportOptions {
  reset?: boolean;
  dryRun?: boolean;
}

const DEFAULT_PASSWORD = 'OldUser123!';
const LEGACY_COURSE_MARKER = 'Legacy product ID:';

function logSection(title: string) {
  console.log('\n' + ''.padStart(title.length + 6, '─'));
  console.log(`—— ${title} ——`);
  console.log(''.padStart(title.length + 6, '─') + '\n');
}

function normalizeString(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.replace(/"/g, '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return null;
  }
  return trimmed;
}

function normalizeEmail(email?: string | null): string | null {
  const normalized = normalizeString(email);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizePhone(...inputs: Array<string | null | undefined>): string | null {
  for (const candidate of inputs) {
    let normalized = normalizeString(candidate);
    if (!normalized) {
      continue;
    }

    normalized = normalized.replace(/[^\d+]/g, '');
    if (!normalized) {
      continue;
    }

    if (normalized.startsWith('+98')) {
      normalized = '0' + normalized.slice(3);
    } else if (normalized.startsWith('98') && normalized.length >= 12) {
      normalized = '0' + normalized.slice(2);
    } else if (!normalized.startsWith('0') && normalized.length === 10) {
      normalized = '0' + normalized;
    }

    if (normalized.length > 11) {
      normalized = normalized.startsWith('0')
        ? normalized.slice(0, 11)
        : normalized.slice(-11);
    }

    if (!/^0\d{9,10}$/.test(normalized)) {
      continue;
    }

    return normalized;
  }

  return null;
}

function generateUsername(base: string, uniquenessHint: string) {
  const sanitized = base
    .replace(/[^\w\d_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  if (sanitized) {
    return sanitized;
  }

  return `old_user_${uniquenessHint}`;
}

function hasAlphabeticCharacter(value: string): boolean {
  return /[A-Za-z\u0600-\u06FF]/.test(value);
}

function sanitizeProductName(rawName: string | null | undefined, productId: string): string {
  const normalizedName = normalizeString(rawName);

  if (normalizedName && hasAlphabeticCharacter(normalizedName)) {
    const withoutOldSuffix = normalizedName.replace(/\s*قدیمی\s*$/u, '').trim();
    if (withoutOldSuffix) {
      return withoutOldSuffix;
    }
  }

  return `محصول (${productId})`;
}

function buildLegacyCourseTitle(productName: string, productId: string): string {
  return productName.includes(productId) ? productName : `${productName} (${productId})`;
}

async function resetOldUserData() {
  logSection('Resetting existing imported users');
  const deletedOldProducts = await prisma.oldProduct.deleteMany({});
  const deletedVideoAccess = await prisma.videoAccess.deleteMany({
    where: {
      user: {
        isOld: true,
      },
    },
  });
  const deletedAudioAccess = await prisma.audioAccess.deleteMany({
    where: {
      user: {
        isOld: true,
      },
    },
  });
  const deletedEnrollments = await prisma.courseEnrollment.deleteMany({
    where: {
      user: {
        isOld: true,
      },
    },
  });
  const deletedLegacyCourses = await prisma.course.deleteMany({
    where: {
      description: {
        startsWith: LEGACY_COURSE_MARKER,
      },
    },
  });
  const deletedUsers = await prisma.user.deleteMany({
    where: { isOld: true },
  });

  console.log(`🧹 Removed ${deletedOldProducts.count} old product records`);
  console.log(`🧹 Removed ${deletedVideoAccess.count} legacy video access records`);
  console.log(`🧹 Removed ${deletedAudioAccess.count} legacy audio access records`);
  console.log(`🧹 Removed ${deletedEnrollments.count} legacy course enrollments`);
  console.log(`🧹 Removed ${deletedLegacyCourses.count} legacy courses`);
  console.log(`🧹 Removed ${deletedUsers.count} old users\n`);
}

function loadOldUsers(): { source: 'merged' | 'users.json'; records: NormalizedOldUser[] } {
  const mergedPath = path.join(__dirname, '../moc-old-data/final_merged_data.json');
  const usersJsonPath = path.join(__dirname, '../moc-old-data/users.json');

  if (fs.existsSync(mergedPath)) {
    const rawData = JSON.parse(fs.readFileSync(mergedPath, 'utf-8')) as MergedDataFile;
    const records: NormalizedOldUser[] = [];

    for (const [legacyId, entry] of Object.entries(rawData.users || {})) {
      records.push({
        legacyId,
        info: entry.user_info || {},
        products: entry.products || [],
      });
    }

    logSection('Source: final_merged_data.json');
    const metaTotalUsers = rawData.metadata?.total_users ?? records.length;
    const metaUsersWithProducts = rawData.metadata?.users_with_products ?? records.filter(r => (r.products?.length ?? 0) > 0).length;
    const metaProducts = rawData.metadata?.total_products ?? records.reduce((acc, user) => acc + (user.products?.length ?? 0), 0);

    console.log(`📊 Users detected: ${records.length} (metadata total: ${metaTotalUsers})`);
    console.log(`📦 Users with products: ${metaUsersWithProducts}`);
    console.log(`🎁 Total product entries: ${metaProducts}`);

    return { source: 'merged', records };
  }

  if (fs.existsSync(usersJsonPath)) {
    const rawData = JSON.parse(fs.readFileSync(usersJsonPath, 'utf-8')) as UsersJsonFile | OldUserInfo[];
    const users = Array.isArray(rawData) ? rawData : rawData.users;
    if (!users || users.length === 0) {
      throw new Error('users.json found but contains no user entries.');
    }

    const records: NormalizedOldUser[] = users.map((info, idx) => ({
      legacyId: info.id || info.ID || `${idx}`,
      info,
      products: [],
    }));

    logSection('Source: users.json');
    console.log(`📊 Users detected: ${records.length}`);
    console.log('⚠️ No product information available in this file.');

    return { source: 'users.json', records };
  }

  throw new Error('No old user data found. Place final_merged_data.json or users.json inside backend/moc-old-data.');
}

async function findExistingUser(email: string | null, phone: string | null, username: string) {
  return prisma.user.findFirst({
    where: {
      OR: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
        { username },
      ],
    },
  });
}

type ProductPayload = {
  userId: string;
  productId: string;
  productName: string;
  productCategory: string;
  courseTitle: string;
};

function buildProductPayload(user: NormalizedOldUser, userId: string): ProductPayload[] {
  const products = user.products || [];
  const payload: ProductPayload[] = [];
  const seenProductIds = new Set<string>();

  products.forEach((product, idx) => {
    const rawProductId = normalizeString(product.product_id) || `legacy-no-id-${user.legacyId}-${idx + 1}`;
    let productId = rawProductId;
    let counter = 1;

    while (seenProductIds.has(productId)) {
      productId = `${rawProductId}-${counter}`;
      counter++;
    }
    seenProductIds.add(productId);

    const productName = sanitizeProductName(product.product_name, productId);
    const productCategory = normalizeString(product.product_category) || 'unknown';
    const courseTitle = buildLegacyCourseTitle(productName, productId);

    if (productCategory?.toLowerCase() === 'code_or_number') {
      return;
    }
    if(productCategory?.toLowerCase() === 'other') {
      return;}

    payload.push({
      userId,
      productId,
      productName,
      productCategory,
      courseTitle,
    });
  });

  return payload;
}

const legacyCourseCache = new Map<string, string>();

async function ensureLegacyCourse(
  productId: string,
  productName: string,
  productCategory: string,
  stats: ImportStats,
) {
  if (legacyCourseCache.has(productId)) {
    return legacyCourseCache.get(productId)!;
  }

  const legacyMarker = `${LEGACY_COURSE_MARKER} ${productId}`;
  const courseTitle = buildLegacyCourseTitle(productName, productId);

  const existing = await prisma.course.findFirst({
    where: {
      OR: [
        {
          description: {
            contains: legacyMarker,
          },
        },
        { title: courseTitle },
      ],
    },
  });

  if (existing) {
    legacyCourseCache.set(productId, existing.id);
    return existing.id;
  }

  const course = await prisma.course.create({
    data: {
      title: courseTitle,
      description: `${legacyMarker}\nیادداشت: این دوره از سیستم قدیمی منتقل شده است.${productCategory ? `\nدسته‌بندی: ${productCategory}` : ''}`,
      price: new Prisma.Decimal(0),
      thumbnail: null,
      attachments: [],
      courseVideos: [],
      published: false,
    },
  });

  legacyCourseCache.set(productId, course.id);
  stats.coursesEnsured++;
  return course.id;
}

async function upsertOldUser(user: NormalizedOldUser, hashedPassword: string, options: ImportOptions, stats: ImportStats) {
  const email = normalizeEmail(user.info.user_email);
  const phone = normalizePhone(
    user.info.user_phone,
    user.info.phone,
    user.info.sms,
    user.info.user_login,
    user.info.user_nicename,
    user.info.display_name,
    user.info.user_email,
  );
  const usernameBase =
    normalizeString(user.info.user_login) ||
    normalizeString(user.info.user_nicename) ||
    (email ? email.split('@')[0] : null) ||
    (phone ? phone.slice(-8) : null) ||
    `legacy_${user.legacyId}`;

  const desiredUsername = generateUsername(usernameBase ?? `legacy_${user.legacyId}`, user.legacyId);

  // Skip users without any identifiable contact information
  if (!email && !phone) {
    stats.skipped++;
    return;
  }

  // Skip deleted/inactive users
  const deletedStatus = normalizeString(user.info.deleted);
  const userStatus = normalizeString(user.info.user_status);
  if (deletedStatus === '1' || userStatus === '1') {
    stats.skipped++;
    return;
  }

  const displayName = normalizeString(user.info.display_name);
  let firstName = displayName ? displayName.split(/\s+/)[0] : null;
  let lastName = displayName ? displayName.split(/\s+/).slice(1).join(' ') : null;

  const profileData = {
    education: normalizeString(user.info.education),
    university: normalizeString(user.info.univercity),
    job: normalizeString(user.info.job),
    state: normalizeString(user.info.state),
    gender: normalizeString(user.info.gender),
  };

  if (!firstName) {
    firstName = normalizeString(user.info.user_nicename) || normalizeString(user.info.user_login) || 'کاربر';
  }

  if (!lastName) {
    lastName = 'قدیمی';
  }

  const existing = await findExistingUser(email, phone, desiredUsername);

  const productsPayload = buildProductPayload(user, existing?.id ?? '');

  if (existing) {
    const updateData: any = {
      isOld: true,
      firstName: existing.firstName || firstName,
      lastName: existing.lastName || lastName,
    };

    if (!existing.email && email) {
      updateData.email = email;
    }
    if (!existing.phone && phone) {
      updateData.phone = phone;
    }

    for (const [key, value] of Object.entries(profileData)) {
      if (value && !(existing as any)[key]) {
        updateData[key] = value;
      }
    }

    if (!options.dryRun) {
      await prisma.user.update({
        where: { id: existing.id },
        data: updateData,
      });

      if (productsPayload.length > 0) {
        await prisma.oldProduct.createMany({
          data: productsPayload.map(({ courseTitle, ...product }) => ({
            ...product,
            userId: existing.id,
          })),
          skipDuplicates: true,
        });

        for (const product of productsPayload) {
          const courseId = await ensureLegacyCourse(product.productId, product.productName, product.productCategory, stats);
          if (!courseId) {
            continue;
          }

          try {
            await prisma.courseEnrollment.create({
              data: {
                userId: existing.id,
                courseId,
              },
            });
            stats.enrollmentsCreated++;
          } catch (error) {
            if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
              throw error;
            }
          }
        }
      }
    }

    stats.updated++;
    if (productsPayload.length > 0) {
      stats.usersWithProducts++;
      stats.productsCreated += productsPayload.length;
    }
    return;
  }

  const createData = {
    email,
    phone,
    username: desiredUsername,
    password: hashedPassword,
    firstName,
    lastName,
    role: 'USER' as const,
    isActive: true,
    isOld: true,
    ...profileData,
  };

  if (!options.dryRun) {
    const created = await prisma.user.create({
      data: createData,
    });

    if (productsPayload.length > 0) {
      await prisma.oldProduct.createMany({
        data: productsPayload.map(({ courseTitle, ...product }) => ({
          ...product,
          userId: created.id,
        })),
        skipDuplicates: true,
      });

      for (const product of productsPayload) {
        const courseId = await ensureLegacyCourse(product.productId, product.productName, product.productCategory, stats);
        if (!courseId) {
          continue;
        }

        try {
          await prisma.courseEnrollment.create({
            data: {
              userId: created.id,
              courseId,
            },
          });
          stats.enrollmentsCreated++;
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
            throw error;
          }
        }
      }
    }
  }

  stats.imported++;
  if (productsPayload.length > 0) {
    stats.usersWithProducts++;
    stats.productsCreated += productsPayload.length;
  }
}

async function importOldUsers(options: ImportOptions = {}) {
  const { reset = false, dryRun = false } = options;

  logSection('Legacy user import');
  console.log(`⚙️  Options → reset=${reset ? 'yes' : 'no'}, dryRun=${dryRun ? 'yes' : 'no'}`);

  try {
    if (reset && !dryRun) {
      await resetOldUserData();
    }

    const { source, records } = loadOldUsers();

    if (!records.length) {
      console.log('⚠️ No users found to import. Exiting.');
      return;
    }

    const stats: ImportStats = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      usersWithProducts: 0,
      productsCreated: 0,
    coursesEnsured: 0,
    enrollmentsCreated: 0,
    };

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    console.log('\n🚀 Starting migration...');
    const startTime = Date.now();

    for (let idx = 0; idx < records.length; idx++) {
      const record = records[idx];

      try {
        await upsertOldUser(record, hashedPassword, { reset, dryRun }, stats);
      } catch (error) {
        stats.errors++;
        if (stats.errors <= 10) {
          console.error(`❌ Failed to import legacy user ${record.legacyId}:`, (error as Error).message);
        }
      }

      if ((idx + 1) % 500 === 0) {
        const progress = (((idx + 1) / records.length) * 100).toFixed(1);
        console.log(`   ➤ Processed ${idx + 1}/${records.length} users (${progress}%)`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    logSection('Import complete');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✨ Created: ${stats.imported}`);
    console.log(`♻️  Updated: ${stats.updated}`);
    console.log(`⏭️  Skipped: ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(`📦 Users with products: ${stats.usersWithProducts}`);
    console.log(`🎁 Product records created (attempted): ${stats.productsCreated}`);
    console.log(`📚 Courses ensured: ${stats.coursesEnsured}`);
    console.log(`🎓 Enrollments created: ${stats.enrollmentsCreated}`);

    if (dryRun) {
      console.log('\nℹ️ Dry-run mode enabled: no changes were written to the database.');
    } else {
      console.log(`\n🔐 Legacy users default password: ${DEFAULT_PASSWORD}`);
      console.log('📌 You can re-run with --reset to wipe and re-import if needed.');
    }

    if (source === 'users.json' && stats.usersWithProducts === 0) {
      console.log('\n⚠️ Consider switching to final_merged_data.json to import historic product ownership.');
    }
  } catch (error) {
    console.error('💥 Fatal import error:', (error as Error).message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function parseOptionsFromArgs(): ImportOptions {
  const args = process.argv.slice(2);
  return {
    reset: args.includes('--reset'),
    dryRun: args.includes('--dry-run'),
  };
}

if (require.main === module) {
  const options = parseOptionsFromArgs();
  importOldUsers(options)
    .then(() => {
      console.log('\n✅ Import process finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import process failed:', error);
      process.exit(1);
    });
}

export { importOldUsers };
