import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GrantReport {
  timestamp: string;
  totalUsersProcessed: number;
  totalOldProducts: number;
  videosGranted: number;
  videosAlreadyHad: number;
  audiosGranted: number;
  audiosAlreadyHad: number;
  coursesEnrolled: number;
  coursesAlreadyEnrolled: number;
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
    audiosGranted: number;
    enrolled: boolean;
  }>;
}

async function grantVideoAudioAccessFromOldProducts() {
  console.log('🚀 Starting to grant VIDEO and AUDIO access from old products...\n');

  const report: GrantReport = {
    timestamp: new Date().toISOString(),
    totalUsersProcessed: 0,
    totalOldProducts: 0,
    videosGranted: 0,
    videosAlreadyHad: 0,
    audiosGranted: 0,
    audiosAlreadyHad: 0,
    coursesEnrolled: 0,
    coursesAlreadyEnrolled: 0,
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
      purchasedCourses: {
        select: {
          courseId: true,
        },
      },
      videoAccess: {
        select: {
          videoId: true,
        },
      },
      audioAccess: {
        select: {
          audioId: true,
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

  // 2. Get all courses with their videos AND audios for mapping
  console.log('📚 Fetching courses, videos, and audios...');
  const courses = await prisma.course.findMany({
    include: {
      videos: {
        select: {
          id: true,
          title: true,
        },
      },
      audios: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // Create a map for productId -> course lookup
  const productToCourseMap = new Map<string, string>();
  
  for (const course of courses) {
    productToCourseMap.set(course.id, course.id);
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
      const existingAudioIds = new Set(user.audioAccess.map(aa => aa.audioId));
      const existingCourseIds = new Set(user.purchasedCourses.map(pc => pc.courseId));
      let userVideosGranted = 0;
      let userAudiosGranted = 0;
      let userCoursesEnrolled = 0;

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
        
        if (!course) {
          console.log(`   ⚠️ Course not found: ${courseId}`);
          continue;
        }

        const videoCount = course.videos?.length || 0;
        const audioCount = course.audios?.length || 0;
        console.log(`   📹 Course: ${course.title} (${videoCount} videos, ${audioCount} audios)`);
        
        let productVideosGranted = 0;
        let productAudiosGranted = 0;
        let enrolled = false;

        // ALSO ENROLL USER IN THE COURSE (if not already enrolled)
        if (!existingCourseIds.has(courseId)) {
          try {
            await prisma.courseEnrollment.create({
              data: {
                userId: user.id,
                courseId: courseId,
              },
            });
            existingCourseIds.add(courseId);
            report.coursesEnrolled++;
            userCoursesEnrolled++;
            enrolled = true;
            console.log(`   📝 Enrolled in course: ${course.title}`);
          } catch (e: any) {
            if (!e.message?.includes('Unique constraint')) {
              report.errors.push(`Error enrolling user ${user.id} in course ${courseId}: ${e.message}`);
            } else {
              report.coursesAlreadyEnrolled++;
              enrolled = true;
            }
          }
        } else {
          report.coursesAlreadyEnrolled++;
          enrolled = true;
        }

        // Grant access to all VIDEOS in the course
        if (course.videos && course.videos.length > 0) {
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
              if (!e.message?.includes('Unique constraint')) {
                report.errors.push(`Error granting video access to user ${user.id}, video ${video.id}: ${e.message}`);
              }
            }
          }
        }

        // Grant access to all AUDIOS in the course
        if (course.audios && course.audios.length > 0) {
          for (const audio of course.audios) {
            if (existingAudioIds.has(audio.id)) {
              report.audiosAlreadyHad++;
              continue;
            }

            try {
              await prisma.audioAccess.create({
                data: {
                  userId: user.id,
                  audioId: audio.id,
                },
              });
              
              existingAudioIds.add(audio.id);
              productAudiosGranted++;
              report.audiosGranted++;
              userAudiosGranted++;
            } catch (e: any) {
              if (!e.message?.includes('Unique constraint')) {
                report.errors.push(`Error granting audio access to user ${user.id}, audio ${audio.id}: ${e.message}`);
              }
            }
          }
        }

        if (productVideosGranted > 0 || productAudiosGranted > 0) {
          console.log(`   ✅ Granted: ${productVideosGranted} videos, ${productAudiosGranted} audios`);
        }

        report.details.push({
          userId: user.id,
          phone: user.phone,
          productId: oldProduct.productId,
          productName: oldProduct.productName,
          courseId: course.id,
          courseTitle: course.title,
          videosGranted: productVideosGranted,
          audiosGranted: productAudiosGranted,
          enrolled,
        });
      }

      if (userVideosGranted > 0 || userAudiosGranted > 0 || userCoursesEnrolled > 0) {
        console.log(`   📊 Videos: ${userVideosGranted}, Audios: ${userAudiosGranted}, Enrolled: ${userCoursesEnrolled}\n`);
      } else {
        console.log(`   ℹ️ No new access granted\n`);
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
  console.log(`Courses enrolled: ${report.coursesEnrolled}`);
  console.log(`Courses already enrolled: ${report.coursesAlreadyEnrolled}`);
  console.log(`Videos granted: ${report.videosGranted}`);
  console.log(`Videos already had: ${report.videosAlreadyHad}`);
  console.log(`Audios granted: ${report.audiosGranted}`);
  console.log(`Audios already had: ${report.audiosAlreadyHad}`);
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
    `video-audio-access-grant-report-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

// Run the script
grantVideoAudioAccessFromOldProducts()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
