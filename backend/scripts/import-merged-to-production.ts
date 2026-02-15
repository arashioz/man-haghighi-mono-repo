/**
 * Import users and old products from final_merged_data_cleaned.json into production DB.
 *
 * Logic:
 * - If user does NOT exist in DB → create user (isOld: true) and add all their OldProduct.
 * - If user EXISTS → only add OldProduct records that don't already exist (no duplicate users).
 *
 * Usage:
 *   DATA_FILE=/path/to/final_merged_data_cleaned.json npx ts-node scripts/import-merged-to-production.ts
 *   # or from repo root with default path:
 *   cd backend && npm run import:merged
 *
 * With Docker (production DB):
 *   docker exec -e DATABASE_URL="postgresql://..." <backend-container> npx ts-node scripts/import-merged-to-production.ts
 *   # or mount file and run:
 *   docker run --rm -e DATABASE_URL="..." -v $(pwd)/moc-old-data:/data ... node npx ts-node scripts/import-merged-to-production.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'user123';

interface UserInfo {
  id?: string;
  user_login?: string;
  user_email?: string;
  user_pass?: string;
  display_name?: string;
  user_nicename?: string;
  phone?: string | null;
  [key: string]: unknown;
}

interface OldProductItem {
  product_id: string;
  product_name: string;
  product_category: string;
}

interface MergedUser {
  user_info: UserInfo;
  products: OldProductItem[];
}

interface MergedFile {
  metadata?: Record<string, unknown>;
  users: Record<string, MergedUser>;
}

function normalize(s: string | null | undefined): string | null {
  if (s == null || s === '') return null;
  const t = String(s).replace(/^"|"$/g, '').trim();
  return t === '' || t.toLowerCase() === 'null' ? null : t;
}

function getDataFilePath(): string {
  const envPath = process.env.DATA_FILE;
  if (envPath && fs.existsSync(envPath)) return envPath;
  const fromBackend = path.join(__dirname, '../moc-old-data/final_merged_data_cleaned.json');
  if (fs.existsSync(fromBackend)) return fromBackend;
  const fromRoot = path.join(__dirname, '../../moc-old-data/final_merged_data_cleaned.json');
  if (fs.existsSync(fromRoot)) return fromRoot;
  throw new Error(
    `Data file not found. Set DATA_FILE or place final_merged_data_cleaned.json in backend/moc-old-data or moc-old-data. Tried: ${fromBackend}, ${fromRoot}`
  );
}

async function main() {
  const filePath = getDataFilePath();
  console.log('Reading:', filePath);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data: MergedFile = JSON.parse(raw);

  const usersMap = data.users;
  if (!usersMap || typeof usersMap !== 'object') {
    throw new Error('Invalid file: expected "users" object');
  }

  const entries = Object.entries(usersMap).filter(
    (e): e is [string, MergedUser] =>
      e[1] != null && typeof e[1] === 'object' && e[1].user_info != null
  );

  console.log(`Total users in file: ${entries.length}`);

  let usersCreated = 0;
  let usersSkipped = 0;
  let productsCreated = 0;
  let productsSkipped = 0;
  let errors = 0;

  for (const [legacyId, { user_info: ui, products = [] }] of entries) {
    const email = normalize(ui.user_email);
    const login = normalize(ui.user_login);
    const phone = normalize(ui.phone as string) || normalize(ui.user_phone as string);

    const username = login || (email ? email.split('@')[0] : null) || `user_${legacyId}`;
    if (!username) {
      console.warn(`[${legacyId}] Skip: no username/login/email`);
      usersSkipped++;
      continue;
    }

    try {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            { username },
            ...(phone ? [{ phone }] : []),
          ].filter(Boolean),
        },
      });

      let userId: string;

      if (existing) {
        userId = existing.id;
        usersSkipped++;
      } else {
        const passwordRaw = normalize(ui.user_pass) || DEFAULT_PASSWORD;
        const hashedPassword = await bcrypt.hash(passwordRaw, 10);

        const created = await prisma.user.create({
          data: {
            username,
            email: email || undefined,
            phone: phone || undefined,
            password: hashedPassword,
            firstName: normalize(ui.display_name) || undefined,
            lastName: normalize(ui.user_nicename) || undefined,
            role: 'USER',
            isOld: true,
            isActive: true,
          },
        });
        userId = created.id;
        usersCreated++;
      }

      for (const p of products) {
        const productId = normalize(p.product_id);
        const productName = normalize(p.product_name) || '—';
        const productCategory = normalize(p.product_category) || 'other';
        if (!productId) continue;

        try {
          await prisma.oldProduct.upsert({
            where: {
              userId_productId: { userId, productId },
            },
            create: {
              userId,
              productId,
              productName,
              productCategory,
            },
            update: {
              productName,
              productCategory,
            },
          });
          productsCreated++;
        } catch (e) {
          productsSkipped++;
        }
      }
    } catch (e) {
      console.error(`[${legacyId}] Error:`, (e as Error).message);
      errors++;
    }
  }

  console.log('\n--- Result ---');
  console.log('Users created:', usersCreated);
  console.log('Users already existed (only products added):', usersSkipped);
  console.log('OldProduct records created/updated:', productsCreated);
  console.log('Products skipped (duplicate or error):', productsSkipped);
  console.log('User-level errors:', errors);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
