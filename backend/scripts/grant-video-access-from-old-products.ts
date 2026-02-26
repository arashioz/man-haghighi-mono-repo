import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GrantReport {
  timestamp: string;
  totalUsersProcessed: number;
  totalOldProducts: number;
  videosGranted: number;
  videosAlreadyHad: number;
  coursesMapped: number;
  coursesNotFound: number;
  errors: string[];
  details: Array<{
    userId: string;
    phone: string | null;
    productId: string;
    productName: string;
    courseId: string | null;
    courseTitle: string | null;
    videosGranted: number;
  }>;
}

async function grantVideoAccessFromOldProducts() {
  console.log('🚀 Starting to grant video access from old products...\n');

  const report: GrantReport = {
    timestamp: new Date().toISOString(),
    totalUsersProcessed: 0,
    totalOldProducts: 0,
    videosGranted: 0,
    videosAlreadyHad: 0,
    coursesMapped: 0,
    coursesNotFound: 0,
    errors: [],
    details: [],
  };

  // 1. Get all users with old products
  console.log('📦 Fetching users with old products...');
  const usersWithOldProducts = await prisma.user.findMany({
    where: {
      oldProducts: {
        some: {}, // Has at least one old product
      },
    },
    include: {
      oldProducts: true,
      videoAccess: {
        select: {
          videoId: true,
        },
      },
    },
  });

  report.totalUsersProcessed = usersWithOldProducts.length;
  console.log(`✅ Found ${usersWithOldProducts.length} users with old products\n`);

  if (usersWithOldProducts.length === 0) {
    console.log('⚠️ No users with old products found.');
    await prisma.$disconnect();
    return;
  }

  // 2. Get all courses with their videos for mapping
  console.log('📚 Fetching courses and videos...');
  const courses = await prisma.course.findMany({
    include: {
      videos: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // Create a map for productId -> course lookup
  // This mapping can be customized based on your data
  const productToCourseMap = new Map<string, string>();
  
  // Common patterns for mapping old product IDs to courses
  for (const course of courses) {
    // Add various ways the course might be referenced
    productToCourseMap.set(course.id, course.id);
    
    // If course title contains certain keywords, map common product IDs
    const title = course.title.toLowerCase();
    
    // Add your specific mappings here based on your old product IDs
    // For example: productToCourseMap.set('PROD_1382', course.id);
  }

  console.log(`✅ Loaded ${courses.length} courses\n`);

  // 3. Process each user
  console.log('⚙️ Processing users...\n');

  for (const user of usersWithOldProducts) {
    try {
      console.log(`👤 User: ${user.phone || user.username} (${user.oldProducts.length} old products)`);
      
      const existingVideoIds = new Set(user.videoAccess.map(va => va.videoId));
      let userVideosGranted = 0;

      for (const oldProduct of user.oldProducts) {
        report.totalOldProducts++;
        
        // Try to find matching course
        let courseId = productToCourseMap.get(oldProduct.productId);
        
        // If not found by direct ID, try to match by name/title
        if (!courseId) {
          const matchedCourse = courses.find(c => 
            oldProduct.productName.toLowerCase().includes(c.title.toLowerCase()) ||
            c.title.toLowerCase().includes(oldProduct.productName.toLowerCase())
          );
          if (matchedCourse) {
            courseId = matchedCourse.id;
          }
        }

        if (!courseId) {
          console.log(`   ⚠️ No course found for product: ${oldProduct.productName} (${oldProduct.productId})`);
          report.coursesNotFound++;
          continue;
        }

        report.coursesMapped++;
        const course = courses.find(c => c.id === courseId);
        
        if (!course || course.videos.length === 0) {
          console.log(`   ⚠️ Course has no videos: ${course?.title || courseId}`);
          continue;
        }

        console.log(`   📹 Course: ${course.title} (${course.videos.length} videos)`);
        
        let productVideosGranted = 0;

        // Grant access to all videos in the course
        for (const video of course.videos) {
          if (existingVideoIds.has(video.id)) {
            report.videosAlreadyHad++;
            continue;
          }

          try {
            await prisma.videoAccess.create({
              data: {
                userId: user.id,
                videoId: video.id,
              },
            });
            
            existingVideoIds.add(video.id);
            productVideosGranted++;
            report.videosGranted++;
            userVideosGranted++;
          } catch (e: any) {
            // Skip duplicates or other errors
            if (!e.message?.includes('Unique constraint')) {
              report.errors.push(`Error granting access to user ${user.id}, video ${video.id}: ${e.message}`);
            }
          }
        }

        if (productVideosGranted > 0) {
          console.log(`   ✅ Granted access to ${productVideosGranted} videos`);
        }

        report.details.push({
          userId: user.id,
          phone: user.phone,
          productId: oldProduct.productId,
          productName: oldProduct.productName,
          courseId: course.id,
          courseTitle: course.title,
          videosGranted: productVideosGranted,
        });
      }

      if (userVideosGranted > 0) {
        console.log(`   📊 Total videos granted: ${userVideosGranted}\n`);
      } else {
        console.log(`   ℹ️ No new videos granted\n`);
      }

    } catch (error: any) {
      const errorMsg = `Error processing user ${user.id}: ${error.message}`;
      console.error(`   ❌ ${errorMsg}`);
      report.errors.push(errorMsg);
    }
  }

  // 4. Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL REPORT');
  console.log('='.repeat(70));
  console.log(`Users processed: ${report.totalUsersProcessed}`);
  console.log(`Old products checked: ${report.totalOldProducts}`);
  console.log(`Courses mapped: ${report.coursesMapped}`);
  console.log(`Courses not found: ${report.coursesNotFound}`);
  console.log(`Videos granted: ${report.videosGranted}`);
  console.log(`Videos already had: ${report.videosAlreadyHad}`);
  console.log(`Errors: ${report.errors.length}`);
  
  if (report.errors.length > 0) {
    console.log('\n❌ Errors:');
    report.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
    if (report.errors.length > 5) {
      console.log(`   ... and ${report.errors.length - 5} more`);
    }
  }
  
  console.log('='.repeat(70));

  // 5. Save report
  const fs = await import('fs');
  const path = await import('path');
  const reportPath = path.join(
    process.cwd(),
    '..',
    'moc-old-data',
    `video-access-grant-report-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

// Run the script
grantVideoAccessFromOldProducts()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
