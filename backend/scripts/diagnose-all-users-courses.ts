import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UserMismatch {
  userId: string;
  username: string | null;
  phone: string | null;
  mismatchedCourses: {
    courseId: string;
    courseTitle: string;
    hasVideoAccess: boolean;
    hasAudioAccess: boolean;
  }[];
}

async function diagnoseAllUsersCourses() {
  console.log('🔍 Scanning all users for course access mismatches...\n');

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      phone: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`Found ${users.length} total users to check\n`);

  const usersWithMismatch: UserMismatch[] = [];
  let processedCount = 0;
  let totalMismatchedCourses = 0;

  for (const user of users) {
    processedCount++;
    if (processedCount % 100 === 0) {
      console.log(`  Processed ${processedCount}/${users.length} users...`);
    }

    // Get enrolled courses
    const enrolledCourses = await prisma.courseEnrollment.findMany({
      where: { userId: user.id },
      select: { courseId: true },
    });
    const enrolledCourseIds = new Set(enrolledCourses.map(e => e.courseId));

    // Get courses from video access
    const videoAccess = await prisma.videoAccess.findMany({
      where: { userId: user.id },
      include: {
        video: {
          select: {
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
    });

    // Get courses from audio access
    const audioAccess = await prisma.audioAccess.findMany({
      where: { userId: user.id },
      include: {
        audio: {
          select: {
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
    });

    // Find all unique course IDs from video and audio access
    const videoCourseIds = new Set<string>();
    const audioCourseIds = new Set<string>();
    const courseInfo = new Map<string, string>();

    for (const va of videoAccess) {
      if (va.video?.courseId) {
        videoCourseIds.add(va.video.courseId);
        if (va.video.course?.title) {
          courseInfo.set(va.video.courseId, va.video.course.title);
        }
      }
    }

    for (const aa of audioAccess) {
      if (aa.audio?.courseId) {
        audioCourseIds.add(aa.audio.courseId);
        if (aa.audio.course?.title) {
          courseInfo.set(aa.audio.courseId, aa.audio.course.title);
        }
      }
    }

    // Find courses with access but not enrolled
    const allAccessCourseIds = new Set([...videoCourseIds, ...audioCourseIds]);
    const mismatchedCourses: UserMismatch['mismatchedCourses'] = [];

    for (const courseId of allAccessCourseIds) {
      if (!enrolledCourseIds.has(courseId)) {
        mismatchedCourses.push({
          courseId,
          courseTitle: courseInfo.get(courseId) || 'Unknown Course',
          hasVideoAccess: videoCourseIds.has(courseId),
          hasAudioAccess: audioCourseIds.has(courseId),
        });
      }
    }

    if (mismatchedCourses.length > 0) {
      usersWithMismatch.push({
        userId: user.id,
        username: user.username,
        phone: user.phone,
        mismatchedCourses,
      });
      totalMismatchedCourses += mismatchedCourses.length;
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('📊 DIAGNOSTIC RESULTS');
  console.log('═'.repeat(70));
  console.log(`Total users scanned: ${users.length}`);
  console.log(`Users with mismatches: ${usersWithMismatch.length}`);
  console.log(`Total mismatched course access records: ${totalMismatchedCourses}`);

  if (usersWithMismatch.length > 0) {
    console.log('\n' + '═'.repeat(70));
    console.log('⚠️  USERS WITH MISMATCH (access but not enrolled)');
    console.log('═'.repeat(70));

    for (const user of usersWithMismatch) {
      console.log(`\n👤 ${user.username || 'Unknown'} (ID: ${user.userId})`);
      console.log(`   Phone: ${user.phone || 'N/A'}`);
      console.log(`   Mismatched courses (${user.mismatchedCourses.length}):`);

      for (const course of user.mismatchedCourses) {
        const accessTypes = [];
        if (course.hasVideoAccess) accessTypes.push('video');
        if (course.hasAudioAccess) accessTypes.push('audio');
        console.log(`     - "${course.courseTitle}" (${course.courseId})`);
        console.log(`       Access: ${accessTypes.join(' + ')}`);
      }
    }

    // Save to JSON file
    const fs = require('fs');
    const outputPath = `./diagnose-results-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(outputPath, JSON.stringify({
      summary: {
        totalUsers: users.length,
        usersWithMismatch: usersWithMismatch.length,
        totalMismatchedCourses,
        generatedAt: new Date().toISOString(),
      },
      usersWithMismatch,
    }, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);

    console.log('\n💡 TO FIX: Run the following command:');
    console.log('   npx ts-node scripts/fix-all-users-course-access.ts');
  } else {
    console.log('\n✅ No mismatches found! All users have proper course enrollments.');
  }

  await prisma.$disconnect();
}

diagnoseAllUsersCourses()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
