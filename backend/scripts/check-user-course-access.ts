import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserCourseAccess() {
  // Get user by phone number
  const phoneNumber = '09386083968';
  
  console.log(`🔍 Checking user with phone: ${phoneNumber}\n`);
  
  const user = await prisma.user.findFirst({
    where: {
      phone: phoneNumber,
    },
    select: {
      id: true,
      username: true,
      phone: true,
      email: true,
      isActive: true,
      purchasedCourses: {
        select: {
          id: true,
          courseId: true,
          enrolledAt: true,
          course: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      },
      videoAccess: {
        select: {
          id: true,
          videoId: true,
          video: {
            select: {
              id: true,
              title: true,
              courseId: true,
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      },
      audioAccess: {
        select: {
          id: true,
          audioId: true,
          audio: {
            select: {
              id: true,
              title: true,
              courseId: true,
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      },
      oldProducts: {
        select: {
          id: true,
          productId: true,
          productName: true,
          productCategory: true,
        },
      },
    },
  });

  if (!user) {
    console.log('❌ User not found!');
    await prisma.$disconnect();
    return;
  }

  console.log('═'.repeat(70));
  console.log('👤 USER INFO');
  console.log('═'.repeat(70));
  console.log(`ID: ${user.id}`);
  console.log(`Username: ${user.username}`);
  console.log(`Phone: ${user.phone}`);
  console.log(`Email: ${user.email || 'N/A'}`);
  console.log(`Active: ${user.isActive ? 'Yes' : 'No'}`);
  console.log();

  // Enrolled Courses
  console.log('═'.repeat(70));
  console.log('📚 ENROLLED COURSES (purchasedCourses)');
  console.log('═'.repeat(70));
  if (user.purchasedCourses.length === 0) {
    console.log('❌ No enrolled courses found!\n');
  } else {
    for (const enrollment of user.purchasedCourses) {
      console.log(`  • ${enrollment.course.title}`);
      console.log(`    Course ID: ${enrollment.courseId}`);
      console.log(`    Enrolled: ${enrollment.enrolledAt}`);
      console.log();
    }
  }

  // Video Access
  console.log('═'.repeat(70));
  console.log('🎥 VIDEO ACCESS (videoAccess)');
  console.log('═'.repeat(70));
  
  // Group videos by course
  const videoAccessByCourse = new Map<string, { courseTitle: string; videos: any[] }>();
  for (const va of user.videoAccess) {
    const courseId = va.video?.courseId || 'unknown';
    const courseTitle = va.video?.course?.title || 'Unknown Course';
    if (!videoAccessByCourse.has(courseId)) {
      videoAccessByCourse.set(courseId, { courseTitle, videos: [] });
    }
    videoAccessByCourse.get(courseId)!.videos.push(va);
  }
  
  if (user.videoAccess.length === 0) {
    console.log('❌ No video access found!\n');
  } else {
    console.log(`Total videos accessible: ${user.videoAccess.length}\n`);
    for (const [courseId, data] of videoAccessByCourse) {
      console.log(`  📹 Course: ${data.courseTitle} (${courseId})`);
      console.log(`     Videos: ${data.videos.length}`);
      const enrolledInThisCourse = user.purchasedCourses.some(pc => pc.courseId === courseId);
      console.log(`     Enrolled: ${enrolledInThisCourse ? '✅ Yes' : '❌ NO - This is the problem!'}`);
      console.log();
    }
  }

  // Audio Access
  console.log('═'.repeat(70));
  console.log('🎵 AUDIO ACCESS (audioAccess)');
  console.log('═'.repeat(70));
  
  // Group audios by course
  const audioAccessByCourse = new Map<string, { courseTitle: string; audios: any[] }>();
  for (const aa of user.audioAccess) {
    const courseId = aa.audio?.courseId || 'unknown';
    const courseTitle = aa.audio?.course?.title || 'Unknown Course';
    if (!audioAccessByCourse.has(courseId)) {
      audioAccessByCourse.set(courseId, { courseTitle, audios: [] });
    }
    audioAccessByCourse.get(courseId)!.audios.push(aa);
  }
  
  if (user.audioAccess.length === 0) {
    console.log('❌ No audio access found!\n');
  } else {
    console.log(`Total audios accessible: ${user.audioAccess.length}\n`);
    for (const [courseId, data] of audioAccessByCourse) {
      console.log(`  🎵 Course: ${data.courseTitle} (${courseId})`);
      console.log(`     Audios: ${data.audios.length}`);
      const enrolledInThisCourse = user.purchasedCourses.some(pc => pc.courseId === courseId);
      console.log(`     Enrolled: ${enrolledInThisCourse ? '✅ Yes' : '❌ NO - This is the problem!'}`);
      console.log();
    }
  }

  // Old Products
  console.log('═'.repeat(70));
  console.log('📦 OLD PRODUCTS');
  console.log('═'.repeat(70));
  if (user.oldProducts.length === 0) {
    console.log('No old products found.\n');
  } else {
    for (const op of user.oldProducts) {
      console.log(`  • ${op.productName} (${op.productId})`);
      console.log(`    Category: ${op.productCategory}`);
      console.log();
    }
  }

  // Summary - Find mismatches
  console.log('═'.repeat(70));
  console.log('⚠️  MISMATCH ANALYSIS');
  console.log('═'.repeat(70));
  
  const enrolledCourseIds = new Set(user.purchasedCourses.map(pc => pc.courseId));
  const videoCourseIds = new Set(user.videoAccess.map(va => va.video?.courseId).filter(Boolean));
  const audioCourseIds = new Set(user.audioAccess.map(aa => aa.audio?.courseId).filter(Boolean));
  
  const allCourseIdsWithAccess = new Set([...videoCourseIds, ...audioCourseIds]);
  const missingEnrollments: string[] = [];
  
  for (const courseId of allCourseIdsWithAccess) {
    if (!enrolledCourseIds.has(courseId)) {
      missingEnrollments.push(courseId);
    }
  }
  
  if (missingEnrollments.length > 0) {
    console.log(`❌ User has video/audio access but NOT enrolled in ${missingEnrollments.length} courses:\n`);
    for (const courseId of missingEnrollments) {
      const courseInfo = videoCourseIds.has(courseId) 
        ? user.videoAccess.find(va => va.video?.courseId === courseId)?.video?.course
        : user.audioAccess.find(aa => aa.audio?.courseId === courseId)?.audio?.course;
      console.log(`   - ${courseInfo?.title || 'Unknown'} (${courseId})`);
    }
    console.log();
    console.log('💡 SOLUTION: Run grant-access-to-enrolled-courses.ts or manually enroll user in these courses.\n');
  } else {
    console.log('✅ All courses with video/audio access are properly enrolled.\n');
  }

  await prisma.$disconnect();
}

checkUserCourseAccess()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
