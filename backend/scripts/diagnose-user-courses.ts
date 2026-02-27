import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseUserCourses() {
  const phoneNumber = '09386083968';
  
  console.log(`🔍 Diagnosing user with phone: ${phoneNumber}\n`);
  
  // 1. Find user
  const user = await prisma.user.findFirst({
    where: { phone: phoneNumber },
    select: {
      id: true,
      username: true,
      phone: true,
      firstName: true,
      lastName: true,
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
  console.log();

  // 2. Get enrolled courses (from purchasedCourses)
  const enrolledCourses = await prisma.courseEnrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          published: true,
        },
      },
    },
  });

  console.log('═'.repeat(70));
  console.log(`📚 ENROLLED COURSES (purchasedCourses): ${enrolledCourses.length}`);
  console.log('═'.repeat(70));
  for (const enrollment of enrolledCourses) {
    console.log(`  • ${enrollment.course.title}`);
    console.log(`    ID: ${enrollment.courseId}`);
    console.log(`    Published: ${enrollment.course.published ? '✅' : '❌'}`);
    console.log(`    Enrolled: ${enrollment.enrolledAt}`);
    console.log();
  }

  // 3. Get courses from video access
  const videoAccess = await prisma.videoAccess.findMany({
    where: { userId: user.id },
    include: {
      video: {
        select: {
          id: true,
          title: true,
          courseId: true,
          course: {
            select: {
              id: true,
              title: true,
              published: true,
            },
          },
        },
      },
    },
  });

  const videoCourseIds = new Set(videoAccess.map(v => v.video.courseId));
  
  console.log('═'.repeat(70));
  console.log(`🎥 COURSES FROM VIDEO ACCESS: ${videoCourseIds.size}`);
  console.log('═'.repeat(70));
  for (const courseId of videoCourseIds) {
    const video = videoAccess.find(v => v.video.courseId === courseId);
    if (video?.video.course) {
      const isEnrolled = enrolledCourses.some(e => e.courseId === courseId);
      console.log(`  • ${video.video.course.title}`);
      console.log(`    ID: ${courseId}`);
      console.log(`    Published: ${video.video.course.published ? '✅' : '❌'}`);
      console.log(`    Enrolled: ${isEnrolled ? '✅ Yes' : '❌ NO - This is the extra course!'}`);
      console.log();
    }
  }

  // 4. Get courses from audio access
  const audioAccess = await prisma.audioAccess.findMany({
    where: { userId: user.id },
    include: {
      audio: {
        select: {
          id: true,
          title: true,
          courseId: true,
          course: {
            select: {
              id: true,
              title: true,
              published: true,
            },
          },
        },
      },
    },
  });

  const audioCourseIds = new Set(audioAccess.map(a => a.audio.courseId));
  
  console.log('═'.repeat(70));
  console.log(`🎵 COURSES FROM AUDIO ACCESS: ${audioCourseIds.size}`);
  console.log('═'.repeat(70));
  for (const courseId of audioCourseIds) {
    const audio = audioAccess.find(a => a.audio.courseId === courseId);
    if (audio?.audio.course) {
      const isEnrolled = enrolledCourses.some(e => e.courseId === courseId);
      console.log(`  • ${audio.audio.course.title}`);
      console.log(`    ID: ${courseId}`);
      console.log(`    Published: ${audio.audio.course.published ? '✅' : '❌'}`);
      console.log(`    Enrolled: ${isEnrolled ? '✅ Yes' : '❌ NO'}`);
      console.log();
    }
  }

  // 5. Find the mismatch - courses with video/audio access but not enrolled
  const allAccessCourseIds = new Set([...videoCourseIds, ...audioCourseIds]);
  const enrolledCourseIds = new Set(enrolledCourses.map(e => e.courseId));
  
  const notEnrolledButHaveAccess: string[] = [];
  for (const courseId of allAccessCourseIds) {
    if (!enrolledCourseIds.has(courseId)) {
      notEnrolledButHaveAccess.push(courseId);
    }
  }

  console.log('═'.repeat(70));
  console.log('⚠️  MISMATCH ANALYSIS');
  console.log('═'.repeat(70));
  
  if (notEnrolledButHaveAccess.length > 0) {
    console.log(`❌ Found ${notEnrolledButHaveAccess.length} courses with video/audio access but NOT enrolled:\n`);
    
    for (const courseId of notEnrolledButHaveAccess) {
      const video = videoAccess.find(v => v.video.courseId === courseId);
      const audio = audioAccess.find(a => a.audio.courseId === courseId);
      const course = video?.video.course || audio?.audio.course;
      
      if (course) {
        console.log(`   📛 ${course.title} (${courseId})`);
        console.log(`      Status: ${course.published ? 'Published' : 'NOT Published'}`);
        console.log(`      Issue: User has video/audio access but no enrollment!`);
        console.log();
      }
    }
    
    console.log('💡 SOLUTION: Run fix-missing-enrollments.ts to fix this issue.\n');
  } else {
    console.log('✅ All courses with video/audio access are properly enrolled.\n');
  }

  // 6. Summary
  console.log('═'.repeat(70));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(70));
  console.log(`Enrolled courses (DB): ${enrolledCourses.length}`);
  console.log(`Video access courses: ${videoCourseIds.size}`);
  console.log(`Audio access courses: ${audioCourseIds.size}`);
  console.log(`Unique courses with access: ${allAccessCourseIds.size}`);
  console.log(`Mismatch (not enrolled but have access): ${notEnrolledButHaveAccess.length}`);
  
  if (enrolledCourses.length + notEnrolledButHaveAccess.length > 6) {
    console.log(`\n⚠️  UI shows ${enrolledCourses.length + notEnrolledButHaveAccess.length} courses but DB shows ${enrolledCourses.length} enrolled!`);
  }

  await prisma.$disconnect();
}

diagnoseUserCourses()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
