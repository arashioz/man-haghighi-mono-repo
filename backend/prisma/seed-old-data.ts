import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Define types for our data
interface ProductData {
  id: string;
  name: string;
  category: string;
}

interface UserInfo {
  id: string;
  user_login: string;
  user_nicename: string;
  user_email: string;
  phone: string | null;
  display_name: string;
}

interface UserProduct {
  product_id: string;
  product_name: string;
  product_category: string;
}

interface UserData {
  user_info: UserInfo;
  products: UserProduct[];
}

interface MergedData {
  users: Record<string, UserData>;
  products: Record<string, ProductData>;
}

async function main() {
  console.log('🌱 Starting old data seed...');

  // Read the merged data
  const mergedDataPath = path.join(__dirname, '../../moc-old-data/final_merged_data.json');
  const mergedData: MergedData = JSON.parse(fs.readFileSync(mergedDataPath, 'utf8'));

  console.log(`📊 Total users to import: ${Object.keys(mergedData.users).length}`);
  console.log(`📊 Total products to import: ${Object.keys(mergedData.products).length}`);

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('user123', 10);

  // Import products first
  console.log('📚 Importing products...');
  const productMap = new Map<string, string>(); // Map old product IDs to new Prisma IDs

  for (const [oldProductId, productData] of Object.entries(mergedData.products)) {
    try {
      const course = await prisma.course.create({
        data: {
          title: productData.name,
          description: `دوره آموزشی: ${productData.name}`,
          price: 0, // Free for old users
          published: true,
        },
      });
      
      productMap.set(oldProductId, course.id);
      
      if (productMap.size % 100 === 0) {
        console.log(`📚 Imported ${productMap.size} products...`);
      }
    } catch (error: any) {
      console.error(`❌ Error importing product ${oldProductId}:`, error.message);
    }
  }

  console.log(`✅ Imported ${productMap.size} products`);

  // Import users
  console.log('👥 Importing users...');
  const userMap = new Map<string, string>(); // Map old user IDs to new Prisma IDs
  let importedUsers = 0;
  let usersWithProducts = 0;

  for (const [oldUserId, userData] of Object.entries(mergedData.users)) {
    try {
      // Generate unique username if not available
      let username = userData.user_info.user_login || userData.user_info.user_nicename || `user_${oldUserId}`;
      
      // Clean username (remove special characters)
      username = username.replace(/[^a-zA-Z0-9_]/g, '_');
      
      // Ensure username is unique
      let finalUsername = username;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
        finalUsername = `${username}_${counter}`;
        counter++;
      }

      const user = await prisma.user.create({
        data: {
          email: userData.user_info.user_email || null,
          phone: userData.user_info.phone || null,
          username: finalUsername,
          password: hashedPassword,
          firstName: userData.user_info.display_name || userData.user_info.user_nicename || 'کاربر',
          lastName: null,
          role: 'USER',
          isActive: true,
          isOld: true, // Flag for old imported users
          createdAt: new Date('2024-03-21T00:00:00Z'), // Persian date: 1403/01/01
        },
      });

      userMap.set(oldUserId, user.id);
      importedUsers++;

      // Import user's products (course enrollments)
      if (userData.products && userData.products.length > 0) {
        usersWithProducts++;
        
        for (const product of userData.products) {
          const courseId = productMap.get(product.product_id);
          if (courseId) {
            try {
              await prisma.courseEnrollment.create({
                data: {
                  userId: user.id,
                  courseId: courseId,
                },
              });
            } catch (error: any) {
              // Skip if already exists (unique constraint)
              if (!error.message.includes('Unique constraint')) {
                console.error(`❌ Error creating enrollment for user ${user.id}:`, error.message);
              }
            }
          }
        }
      }

      if (importedUsers % 1000 === 0) {
        console.log(`👥 Imported ${importedUsers} users...`);
      }
    } catch (error: any) {
      console.error(`❌ Error importing user ${oldUserId}:`, error.message);
    }
  }

  console.log(`✅ Imported ${importedUsers} users`);
  console.log(`✅ ${usersWithProducts} users have products`);

  // Create summary
  const totalEnrollments = await prisma.courseEnrollment.count();
  const totalCourses = await prisma.course.count();
  const totalUsers = await prisma.user.count();

  console.log('\n📊 FINAL STATISTICS:');
  console.log(`👥 Total users: ${totalUsers}`);
  console.log(`📚 Total courses: ${totalCourses}`);
  console.log(`🎓 Total enrollments: ${totalEnrollments}`);
  console.log(`👤 Users with products: ${usersWithProducts}`);

  console.log('\n🎉 Old data seed completed successfully!');
  console.log('🔑 All users have password: user123');
  console.log('📅 All users registered on: 1403/01/01 (Persian calendar)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });