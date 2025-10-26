const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Define types for our data (as comments for reference)
// interface ProductData {
//   id: string;
//   name: string;
//   category: string;
// }

// interface UserInfo {
//   id: string;
//   user_login: string;
//   user_nicename: string;
//   user_email: string;
//   phone: string | null;
//   display_name: string;
// }

// interface UserProduct {
//   product_id: string;
//   product_name: string;
//   product_category: string;
// }

// interface UserData {
//   user_info: UserInfo;
//   products: UserProduct[];
// }

// interface MergedData {
//   users: Record<string, UserData>;
//   products: Record<string, ProductData>;
// }

async function main() {
  console.log('🌱 Starting old data seed...');

  // Read the merged data
  const mergedDataPath = path.join(__dirname, '../../moc-old-data/final_merged_data.json');
  const mergedData = JSON.parse(fs.readFileSync(mergedDataPath, 'utf8'));

  console.log(`📊 Total users to import: ${Object.keys(mergedData.users).length}`);
  console.log(`📊 Total products to import: ${Object.keys(mergedData.products).length}`);

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('123456', 10);

  let importedUsers = 0;
  let importedCourses = 0;
  let importedEnrollments = 0;

  // Process each user
  for (const [userId, userData] of Object.entries(mergedData.users)) {
    try {
      const userInfo = userData.user_info;
      
      // Create user
      const user = await prisma.user.upsert({
        where: { phone: userInfo.phone || `old_${userId}` },
        update: {},
        create: {
          phone: userInfo.phone || `old_${userId}`,
          password: hashedPassword,
          firstName: userInfo.display_name || userInfo.user_nicename,
          lastName: '',
          email: userInfo.user_email,
          role: 'USER',
          isActive: true,
        },
      });

      importedUsers++;

      // Process user's products (courses)
      for (const product of userData.products) {
        try {
          // Create course from product
          const course = await prisma.course.upsert({
            where: { title: product.product_name },
            update: {},
            create: {
              title: product.product_name,
              description: `دوره ${product.product_name} - منتقل شده از سیستم قدیمی`,
              price: 0, // Free for migrated users
              thumbnail: 'book.png',
              published: true,
            },
          });

          importedCourses++;

          // Create enrollment
          await prisma.courseEnrollment.upsert({
            where: {
              userId_courseId: {
                userId: user.id,
                courseId: course.id,
              },
            },
            update: {},
            create: {
              userId: user.id,
              courseId: course.id,
              enrolledAt: new Date(),
              status: 'ACTIVE',
            },
          });

          importedEnrollments++;

        } catch (error) {
          console.log(`⚠️ Error processing product ${product.product_name} for user ${userInfo.user_login}:`, error.message);
        }
      }

      if (importedUsers % 100 === 0) {
        console.log(`📈 Progress: ${importedUsers} users imported...`);
      }

    } catch (error) {
      console.log(`⚠️ Error processing user ${userData.user_info.user_login}:`, error.message);
    }
  }

  console.log('🎉 Old data import completed!');
  console.log(`👥 Users imported: ${importedUsers}`);
  console.log(`📚 Courses imported: ${importedCourses}`);
  console.log(`🎓 Enrollments imported: ${importedEnrollments}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
