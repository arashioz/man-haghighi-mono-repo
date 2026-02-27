import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FixResult {
  userId: string;
  username: string | null;
  phone: string | null;
  removedVideoAccess: number;
  removedAudioAccess: number;
  affectedCourses: string[];
}

async function fixAllUsersCourseAccess() {
  console.log('🔧 Fixing orphaned video/audio access for all users...\n');
  console.log('⚠️  This will remove video/audio access for courses that users are not enrolled in.\n');

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

  console.log(`Found ${users.length} total users to process\n`);

  const fixResults: FixResult[] = [];
  let processedCount = 0;
  let totalRemovedVideoAccess = 0;
  let totalRemovedAudioAccess = 0;
  let usersFixed = 0;

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

    // Get video access with course info
    const videoAccess = await prisma.videoAccess.findMany({
      where: { userId: user.id },
      include: {
        video: {
          select: {
            id: true,
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

    // Get audio access with course info
    const audioAccess = await prisma.audioAccess.findMany({
      where: { userId: user.id },
      include: {
        audio: {
          select: {
            id: true,
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

    // Find video access records for courses user is NOT enrolled in
    const orphanedVideoAccess = videoAccess.filter(va =>
      va.video?.courseId && !enrolledCourseIds.has(va.video.courseId)
    );

    // Find audio access records for courses user is NOT enrolled in
    const orphanedAudioAccess = audioAccess.filter(aa =>
      aa.audio?.courseId && !enrolledCourseIds.has(aa.audio.courseId)
    );

    // Get unique affected course IDs
    const affectedCourseIds = new Set<string>();
    for (const va of orphanedVideoAccess) {
      if (va.video?.courseId) affectedCourseIds.add(va.video.courseId);
    }
    for (const aa of orphanedAudioAccess) {
      if (aa.audio?.courseId) affectedCourseIds.add(aa.audio.courseId);
    }

    // Delete orphaned video access
    if (orphanedVideoAccess.length > 0) {
      const videoIds = orphanedVideoAccess.map(va => va.videoId);
      await prisma.videoAccess.deleteMany({
        where: {
          userId: user.id,
          videoId: { in: videoIds },
        },
      });
      totalRemovedVideoAccess += orphanedVideoAccess.length;
    }

    // Delete orphaned audio access
    if (orphanedAudioAccess.length > 0) {
      const audioIds = orphanedAudioAccess.map(aa => aa.audioId);
      await prisma.audioAccess.deleteMany({
        where: {
          userId: user.id,
          audioId: { in: audioIds },
        },
      });
      totalRemovedAudioAccess += orphanedAudioAccess.length;
    }

    // Record result if any fixes were made
    if (orphanedVideoAccess.length > 0 || orphanedAudioAccess.length > 0) {
      usersFixed++;
      const affectedCourses = [...affectedCourseIds];

      fixResults.push({
        userId: user.id,
        username: user.username,
        phone: user.phone,
        removedVideoAccess: orphanedVideoAccess.length,
        removedAudioAccess: orphanedAudioAccess.length,
        affectedCourses,
      });

      console.log(`\n✅ Fixed user: ${user.username || 'Unknown'} (${user.phone || 'N/A'})`);
      console.log(`   Removed: ${orphanedVideoAccess.length} video + ${orphanedAudioAccess.length} audio access records`);
      console.log(`   Courses: ${affectedCourses.length}`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('📊 FIX RESULTS');
  console.log('═'.repeat(70));
  console.log(`Total users processed: ${users.length}`);
  console.log(`Users fixed: ${usersFixed}`);
  console.log(`Total video access removed: ${totalRemovedVideoAccess}`);
  console.log(`Total audio access removed: ${totalRemovedAudioAccess}`);
  console.log(`Total orphaned records removed: ${totalRemovedVideoAccess + totalRemovedAudioAccess}`);

    if (fixResults.length > 0) {
    // Save detailed results to JSON
    const fs = require('fs');
    const path = require('path');
    
    // Ensure output directory exists (mounted in Docker)
    const outputDir = '/app/scripts-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `fix-results-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(outputPath, JSON.stringify({
      summary: {
        totalUsers: users.length,
        usersFixed,
        totalRemovedVideoAccess,
        totalRemovedAudioAccess,
        totalRemoved: totalRemovedVideoAccess + totalRemovedAudioAccess,
        fixedAt: new Date().toISOString(),
      },
      fixResults,
    }, null, 2));
    console.log(`\n💾 Detailed results saved to: ${outputPath}`);

    console.log('\n📋 List of fixed users:');
    for (const result of fixResults) {
      console.log(`   - ${result.username || 'Unknown'} (${result.phone || 'N/A'}): ` +
        `${result.removedVideoAccess} video + ${result.removedAudioAccess} audio removed`);
    }
  } else {
    console.log('\n✅ No orphaned access records found! Nothing to fix.');
  }

  await prisma.$disconnect();
}

// Confirm before running
if (process.argv.includes('--confirm')) {
  fixAllUsersCourseAccess()
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
} else {
  console.log('⚠️  WARNING: This script will delete data!');
  console.log('   Run with --confirm flag to execute:\n');
  console.log('   npx ts-node scripts/fix-all-users-course-access.ts --confirm\n');
  console.log('   First, you can run the diagnose script to preview:');
  console.log('   npx ts-node scripts/diagnose-all-users-courses.ts\n');
  process.exit(0);
}
