import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface OldUser {
  user_info: {
    id: string;
    user_login: string;
    user_email: string | null;
    user_pass: string;
    display_name: string;
    user_registered: string;
    phone: string | null;
    sms: string | null;
  };
  products: Array<{
    product_id: string;
    product_name: string;
    product_category: string;
  }>;
}

interface OldData {
  metadata: {
    total_users: number;
    users_with_products: number;
    total_products: number;
  };
  users: Record<string, OldUser>;
}

async function main() {
  console.log('🌱 Starting old data import from final_merged_data.json...');
  console.log('');

  // Read the JSON file
  const jsonPath = path.join(process.cwd(), '..', 'moc-old-data', 'final_merged_data.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath);
    console.error('Make sure final_merged_data.json exists in moc-old-data folder');
    process.exit(1);
  }

  console.log('📂 Reading file:', jsonPath);
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data: OldData = JSON.parse(rawData);

  console.log('');
  console.log('📊 File Statistics:');
  console.log(`   Total users: ${data.metadata.total_users}`);
  console.log(`   Users with products: ${data.metadata.users_with_products}`);
  console.log(`   Total products: ${data.metadata.total_products}`);
  console.log('');

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Hash password for old users (they all use 'user123')
  const hashedPassword = await bcrypt.hash('user123', 10);

  console.log('🔄 Importing users...');
  console.log('');

  const userIds = Object.keys(data.users);
  const total = userIds.length;

  for (let i = 0; i < total; i++) {
    const userId = userIds[i];
    const oldUser = data.users[userId];

    try {
      // Extract user data
      const email = oldUser.user_info.user_email?.trim() || null;
      const phone = oldUser.user_info.phone?.trim() || oldUser.user_info.sms?.trim() || null;
      const username = oldUser.user_info.user_login || `user_${userId}`;
      
      // Skip if no email and no phone
      if (!email && !phone) {
        skipped++;
        continue;
      }

      // Create username from email or phone if needed
      let finalUsername = username;
      if (!finalUsername || finalUsername === '') {
        if (email) {
          finalUsername = email.split('@')[0];
        } else if (phone) {
          finalUsername = `phone_${phone}`;
        } else {
          finalUsername = `user_${userId}`;
        }
      }

      // Clean phone number (remove spaces, dashes, etc.)
      let cleanPhone = phone;
      if (cleanPhone) {
        cleanPhone = cleanPhone.replace(/[\s\-\(\)]/g, '');
        if (!cleanPhone.startsWith('0') && cleanPhone.length === 10) {
          cleanPhone = '0' + cleanPhone;
        }
      }

      // Check if user already exists
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            email ? { email } : { id: 'never' },
            cleanPhone ? { phone: cleanPhone } : { id: 'never' },
            { username: finalUsername },
          ],
        },
      });

      if (existing) {
        skipped++;
        if ((i + 1) % 1000 === 0) {
          console.log(`   Progress: ${i + 1}/${total} (${imported} imported, ${skipped} skipped, ${errors} errors)`);
        }
        continue;
      }

      // Create user with their old products
      const createdUser = await prisma.user.create({
        data: {
          email: email || undefined,
          phone: cleanPhone || undefined,
          username: finalUsername,
          password: hashedPassword,
          firstName: oldUser.user_info.display_name || 'کاربر',
          lastName: 'قدیمی',
          role: 'USER',
          isActive: true,
          isOld: true, // Mark as old user
          oldProducts: {
            create: oldUser.products?.map(product => ({
              productId: product.product_id,
              productName: product.product_name,
              productCategory: product.product_category,
            })) || [],
          },
        },
      });

      imported++;

      // Log progress every 1000 users
      if ((i + 1) % 1000 === 0) {
        console.log(`   Progress: ${i + 1}/${total} (${imported} imported, ${skipped} skipped, ${errors} errors)`);
      }

    } catch (error) {
      errors++;
      if (errors <= 10) {
        console.error(`   Error importing user ${userId}:`, error.message);
      }
    }
  }

  console.log('');
  console.log('✅ Import completed!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   ✅ Successfully imported: ${imported}`);
  console.log(`   ⏭️  Skipped (duplicate or invalid): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('');
  console.log('🔐 All old users can login with password: user123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('');
    console.error('❌ Fatal error during import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

