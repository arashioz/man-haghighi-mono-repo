import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FixResult {
  duplicatePhone: string;
  duplicateId: string;
  mainPhone: string;
  mainId: string;
  action: 'MERGED' | 'DELETED' | 'SKIPPED';
  coursesTransferred: number;
  videoAccessTransferred: number;
  audioAccessTransferred: number;
  reason: string;
}

async function fixDuplicateUsers() {
  console.log('🔧 Fixing duplicate users with _xxxxx_2 pattern...\n');

  // Pattern: 11 digits followed by underscore, random chars, underscore, 2
  const pattern = /^\d{11}_[a-zA-Z0-9]+_2$/;

  // Find all users with this pattern
  const allUsers = await prisma.user.findMany({
    where: {
      phone: {
        not: null,
      },
    },
    select: {
      id: true,
      username: true,
      phone: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const duplicateUsers = allUsers.filter(u => u.phone && pattern.test(u.phone));

  console.log(`Found ${duplicateUsers.length} duplicate users to process\n`);

  if (duplicateUsers.length === 0) {
    console.log('✅ No duplicate users found!');
    await prisma.$disconnect();
    return;
  }

  const results: FixResult[] = [];
  let processedCount = 0;

  for (const dup of duplicateUsers) {
    processedCount++;
    console.log(`\n[${processedCount}/${duplicateUsers.length}] Processing: ${dup.phone}`);

    const originalPhone = dup.phone.substring(0, 11);

    // Find main user with original phone
    const mainUser = await prisma.user.findFirst({
      where: {
        phone: originalPhone,
        NOT: {
          phone: {
            contains: '_',
          },
        },
      },
      select: {
        id: true,
        phone: true,
      },
    });

    if (!mainUser) {
      console.log(`   ⚠️  No main user found for ${originalPhone} - SKIPPING`);
      results.push({
        duplicatePhone: dup.phone,
        duplicateId: dup.id,
        mainPhone: originalPhone,
        mainId: '',
        action: 'SKIPPED',
        coursesTransferred: 0,
        videoAccessTransferred: 0,
        audioAccessTransferred: 0,
        reason: 'No main user found',
      });
      continue;
    }

    console.log(`   Main user: ${mainUser.phone} (${mainUser.id})`);

    // Get duplicate's data
    const [dupCourses, dupVideoAccess, dupAudioAccess] = await Promise.all([
      prisma.courseEnrollment.findMany({
        where: { userId: dup.id },
        select: { courseId: true },
      }),
      prisma.videoAccess.findMany({
        where: { userId: dup.id },
        select: { videoId: true },
      }),
      prisma.audioAccess.findMany({
        where: { userId: dup.id },
        select: { audioId: true },
      }),
    ]);

    // Get main user's existing data
    const [mainCourses, mainVideoAccess, mainAudioAccess] = await Promise.all([
      prisma.courseEnrollment.findMany({
        where: { userId: mainUser.id },
        select: { courseId: true },
      }),
      prisma.videoAccess.findMany({
        where: { userId: mainUser.id },
        select: { videoId: true },
      }),
      prisma.audioAccess.findMany({
        where: { userId: mainUser.id },
        select: { audioId: true },
      }),
    ]);

    const mainCourseIds = new Set(mainCourses.map(c => c.courseId));
    const mainVideoIds = new Set(mainVideoAccess.map(v => v.videoId));
    const mainAudioIds = new Set(mainAudioAccess.map(a => a.audioId));

    // Find unique data in duplicate
    const coursesToTransfer = dupCourses
      .map(c => c.courseId)
      .filter(id => !mainCourseIds.has(id));

    const videosToTransfer = dupVideoAccess
      .map(v => v.videoId)
      .filter(id => !mainVideoIds.has(id));

    const audiosToTransfer = dupAudioAccess
      .map(a => a.audioId)
      .filter(id => !mainAudioIds.has(id));

    console.log(`   Duplicate has: ${dupCourses.length} courses, ${dupVideoAccess.length} videos, ${dupAudioAccess.length} audios`);
    console.log(`   To transfer: ${coursesToTransfer.length} courses, ${videosToTransfer.length} videos, ${audiosToTransfer.length} audios`);

    // Transfer courses
    let coursesTransferred = 0;
    for (const courseId of coursesToTransfer) {
      try {
        await prisma.courseEnrollment.create({
          data: {
            userId: mainUser.id,
            courseId: courseId,
            enrolledAt: new Date(),
          },
        });
        coursesTransferred++;
      } catch (e) {
        // Course already exists (race condition)
      }
    }

    // Transfer video access
    let videoAccessTransferred = 0;
    for (const videoId of videosToTransfer) {
      try {
        await prisma.videoAccess.create({
          data: {
            userId: mainUser.id,
            videoId: videoId,
          },
        });
        videoAccessTransferred++;
      } catch (e) {
        // Video access already exists
      }
    }

    // Transfer audio access
    let audioAccessTransferred = 0;
    for (const audioId of audiosToTransfer) {
      try {
        await prisma.audioAccess.create({
          data: {
            userId: mainUser.id,
            audioId: audioId,
          },
        });
        audioAccessTransferred++;
      } catch (e) {
        // Audio access already exists
      }
    }

    // Delete duplicate user's data
    await prisma.courseEnrollment.deleteMany({
      where: { userId: dup.id },
    });
    await prisma.videoAccess.deleteMany({
      where: { userId: dup.id },
    });
    await prisma.audioAccess.deleteMany({
      where: { userId: dup.id },
    });

    // Delete the duplicate user
    await prisma.user.delete({
      where: { id: dup.id },
    });

    const action = (coursesTransferred > 0 || videoAccessTransferred > 0 || audioAccessTransferred > 0)
      ? 'MERGED'
      : 'DELETED';

    const reason = action === 'MERGED'
      ? `Transferred ${coursesTransferred} courses, ${videoAccessTransferred} videos, ${audioAccessTransferred} audios`
      : 'No unique data to transfer';

    console.log(`   ✅ ${action}: ${reason}`);

    results.push({
      duplicatePhone: dup.phone,
      duplicateId: dup.id,
      mainPhone: mainUser.phone,
      mainId: mainUser.id,
      action,
      coursesTransferred,
      videoAccessTransferred,
      audioAccessTransferred,
      reason,
    });
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 FIX COMPLETE - SUMMARY');
  console.log('═'.repeat(70));

  const merged = results.filter(r => r.action === 'MERGED');
  const deleted = results.filter(r => r.action === 'DELETED');
  const skipped = results.filter(r => r.action === 'SKIPPED');

  const totalCourses = results.reduce((sum, r) => sum + r.coursesTransferred, 0);
  const totalVideos = results.reduce((sum, r) => sum + r.videoAccessTransferred, 0);
  const totalAudios = results.reduce((sum, r) => sum + r.audioAccessTransferred, 0);

  console.log(`Total processed: ${results.length}`);
  console.log(`  - MERGED (data transferred): ${merged.length}`);
  console.log(`  - DELETED (no unique data): ${deleted.length}`);
  console.log(`  - SKIPPED (no main user): ${skipped.length}`);
  console.log(`\nData transferred to main users:`);
  console.log(`  - Courses: ${totalCourses}`);
  console.log(`  - Video access: ${totalVideos}`);
  console.log(`  - Audio access: ${totalAudios}`);

  // Save report
  const fs = require('fs');
  const path = require('path');
  
  // Ensure output directory exists (mounted in Docker)
  const outputDir = '/app/scripts-output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const reportPath = path.join(outputDir, `fix-duplicates-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalProcessed: results.length,
      merged: merged.length,
      deleted: deleted.length,
      skipped: skipped.length,
      totalCoursesTransferred: totalCourses,
      totalVideoAccessTransferred: totalVideos,
      totalAudioAccessTransferred: totalAudios,
      fixedAt: new Date().toISOString(),
    },
    results,
  }, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

// Confirm before running
if (process.argv.includes('--confirm')) {
  fixDuplicateUsers()
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
} else {
  console.log('⚠️  WARNING: This script will DELETE duplicate users and transfer their data!');
  console.log('   Run with --confirm flag to execute:\n');
  console.log('   npx ts-node scripts/fix-duplicate-users.ts --confirm\n');
  console.log('   First, you can run the diagnose script to preview:');
  console.log('   npx ts-node scripts/diagnose-duplicate-users.ts\n');
  process.exit(0);
}
