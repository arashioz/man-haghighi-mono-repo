import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FixResult {
  corruptedPhone: string;
  corruptedId: string;
  cleanPhone: string | null;
  cleanId: string | null;
  action: 'FIXED_PHONE' | 'MERGED_TO_CLEAN' | 'DELETED' | 'SKIPPED';
  coursesTransferred: number;
  videoAccessTransferred: number;
  audioAccessTransferred: number;
  reason: string;
}

// Extract clean phone from corrupted patterns
function extractPhone(phone: string): string | null {
  // Pattern 1: _xxxxx_2_09123456789 (prefix before phone)
  const prefixMatch = phone.match(/_?[a-zA-Z0-9]+_2_?(\d{11})$/);
  if (prefixMatch) return prefixMatch[1];

  // Pattern 2: 09123456789_xxxxx_2 (suffix after phone)
  const suffixMatch = phone.match(/^(\d{11})_[a-zA-Z0-9]+_2$/);
  if (suffixMatch) return suffixMatch[1];

  // Pattern 3: 09123456789_2 (simple suffix)
  const simpleMatch = phone.match(/^(\d{11})_2$/);
  if (simpleMatch) return simpleMatch[1];

  // Pattern 4: _09123456789 (just underscore prefix)
  const underscoreMatch = phone.match(/^_(\d{11})$/);
  if (underscoreMatch) return underscoreMatch[1];

  return null;
}

// Check if phone looks corrupted
function isCorrupted(phone: string): boolean {
  return /[^\d]/.test(phone) || phone.length !== 11;
}

async function fixCorruptedPhones() {
  console.log('🔧 Fixing corrupted phone numbers...\n');

  // Get all users
  const allUsers = await prisma.user.findMany({
    where: {
      phone: { not: null },
    },
    select: {
      id: true,
      username: true,
      phone: true,
    },
  });

  const corruptedUsers = allUsers.filter(u => u.phone && isCorrupted(u.phone) && extractPhone(u.phone));

  console.log(`Found ${corruptedUsers.length} corrupted users to process\n`);

  if (corruptedUsers.length === 0) {
    console.log('✅ No corrupted users found!');
    await prisma.$disconnect();
    return;
  }

  const results: FixResult[] = [];
  let processedCount = 0;

  for (const corrupted of corruptedUsers) {
    processedCount++;
    console.log(`\n[${processedCount}/${corruptedUsers.length}] Processing: "${corrupted.phone}"`);

    const extractedPhone = extractPhone(corrupted.phone!);
    if (!extractedPhone) {
      console.log(`   ⚠️  Cannot extract phone - SKIPPING`);
      results.push({
        corruptedPhone: corrupted.phone!,
        corruptedId: corrupted.id,
        cleanPhone: null,
        cleanId: null,
        action: 'SKIPPED',
        coursesTransferred: 0,
        videoAccessTransferred: 0,
        audioAccessTransferred: 0,
        reason: 'Cannot extract clean phone',
      });
      continue;
    }

    console.log(`   Extracted phone: "${extractedPhone}"`);

    // Get corrupted user's data
    const [corruptedCourses, corruptedVideos, corruptedAudios] = await Promise.all([
      prisma.courseEnrollment.findMany({
        where: { userId: corrupted.id },
        select: { courseId: true },
      }),
      prisma.videoAccess.findMany({
        where: { userId: corrupted.id },
        select: { videoId: true },
      }),
      prisma.audioAccess.findMany({
        where: { userId: corrupted.id },
        select: { audioId: true },
      }),
    ]);

    const corruptedHasData = corruptedCourses.length > 0 || corruptedVideos.length > 0 || corruptedAudios.length > 0;

    console.log(`   Corrupted user has: ${corruptedCourses.length} courses, ${corruptedVideos.length} videos, ${corruptedAudios.length} audios`);

    // Find clean user with extracted phone
    const cleanUser = await prisma.user.findFirst({
      where: {
        phone: extractedPhone,
        NOT: { id: corrupted.id },
      },
      select: {
        id: true,
        phone: true,
      },
    });

    let action: FixResult['action'];
    let reason: string;
    let coursesTransferred = 0;
    let videoAccessTransferred = 0;
    let audioAccessTransferred = 0;

    if (cleanUser) {
      console.log(`   Found clean user: "${cleanUser.phone}" (${cleanUser.id})`);

      // Get clean user's data
      const [cleanCourses, cleanVideos, cleanAudios] = await Promise.all([
        prisma.courseEnrollment.findMany({
          where: { userId: cleanUser.id },
          select: { courseId: true },
        }),
        prisma.videoAccess.findMany({
          where: { userId: cleanUser.id },
          select: { videoId: true },
        }),
        prisma.audioAccess.findMany({
          where: { userId: cleanUser.id },
          select: { audioId: true },
        }),
      ]);

      const cleanHasData = cleanCourses.length > 0 || cleanVideos.length > 0 || cleanAudios.length > 0;
      console.log(`   Clean user has: ${cleanCourses.length} courses, ${cleanVideos.length} videos, ${cleanAudios.length} audios`);

      const cleanCourseIds = new Set(cleanCourses.map(c => c.courseId));
      const cleanVideoIds = new Set(cleanVideos.map(v => v.videoId));
      const cleanAudioIds = new Set(cleanAudios.map(a => a.audioId));

      if (corruptedHasData && !cleanHasData) {
        // CORRUPTED HAS DATA, CLEAN IS EMPTY
        // 1. Delete clean user
        // 2. Fix corrupted phone
        console.log(`   Action: Corrupted has data, clean is empty -> Delete clean, fix corrupted phone`);

        // Delete clean user's data first
        await prisma.courseEnrollment.deleteMany({ where: { userId: cleanUser.id } });
        await prisma.videoAccess.deleteMany({ where: { userId: cleanUser.id } });
        await prisma.audioAccess.deleteMany({ where: { userId: cleanUser.id } });
        await prisma.user.delete({ where: { id: cleanUser.id } });
        console.log(`   ✅ Deleted empty clean user`);

        // Update corrupted user's phone
        await prisma.user.update({
          where: { id: corrupted.id },
          data: { phone: extractedPhone },
        });
        console.log(`   ✅ Fixed corrupted user phone to "${extractedPhone}"`);

        action = 'FIXED_PHONE';
        reason = 'Deleted empty clean user, fixed corrupted phone';

      } else if (!corruptedHasData && cleanHasData) {
        // CORRUPTED IS EMPTY, CLEAN HAS DATA
        // Just delete corrupted
        console.log(`   Action: Corrupted is empty, clean has data -> Delete corrupted`);

        await prisma.courseEnrollment.deleteMany({ where: { userId: corrupted.id } });
        await prisma.videoAccess.deleteMany({ where: { userId: corrupted.id } });
        await prisma.audioAccess.deleteMany({ where: { userId: corrupted.id } });
        await prisma.user.delete({ where: { id: corrupted.id } });
        console.log(`   ✅ Deleted empty corrupted user`);

        action = 'DELETED';
        reason = 'Deleted empty corrupted user, kept clean user with data';

      } else if (corruptedHasData && cleanHasData) {
        // BOTH HAVE DATA - Merge corrupted into clean
        console.log(`   Action: Both have data -> Merge corrupted into clean`);

        // Transfer unique courses
        for (const course of corruptedCourses) {
          if (!cleanCourseIds.has(course.courseId)) {
            try {
              await prisma.courseEnrollment.create({
                data: { userId: cleanUser.id, courseId: course.courseId },
              });
              coursesTransferred++;
            } catch (e) { /* Already exists */ }
          }
        }

        // Transfer unique video access
        for (const video of corruptedVideos) {
          if (!cleanVideoIds.has(video.videoId)) {
            try {
              await prisma.videoAccess.create({
                data: { userId: cleanUser.id, videoId: video.videoId },
              });
              videoAccessTransferred++;
            } catch (e) { /* Already exists */ }
          }
        }

        // Transfer unique audio access
        for (const audio of corruptedAudios) {
          if (!cleanAudioIds.has(audio.audioId)) {
            try {
              await prisma.audioAccess.create({
                data: { userId: cleanUser.id, audioId: audio.audioId },
              });
              audioAccessTransferred++;
            } catch (e) { /* Already exists */ }
          }
        }

        console.log(`   ✅ Transferred ${coursesTransferred} courses, ${videoAccessTransferred} videos, ${audioAccessTransferred} audios`);

        // Delete corrupted user
        await prisma.courseEnrollment.deleteMany({ where: { userId: corrupted.id } });
        await prisma.videoAccess.deleteMany({ where: { userId: corrupted.id } });
        await prisma.audioAccess.deleteMany({ where: { userId: corrupted.id } });
        await prisma.user.delete({ where: { id: corrupted.id } });
        console.log(`   ✅ Deleted corrupted user`);

        action = 'MERGED_TO_CLEAN';
        reason = `Merged ${coursesTransferred} courses, ${videoAccessTransferred} videos, ${audioAccessTransferred} audios into clean user`;

      } else {
        // BOTH EMPTY - Delete corrupted
        console.log(`   Action: Both are empty -> Delete corrupted`);

        await prisma.user.delete({ where: { id: corrupted.id } });
        console.log(`   ✅ Deleted empty corrupted user`);

        action = 'DELETED';
        reason = 'Both users empty, deleted corrupted';
      }

      results.push({
        corruptedPhone: corrupted.phone!,
        corruptedId: corrupted.id,
        cleanPhone: cleanUser.phone,
        cleanId: cleanUser.id,
        action,
        coursesTransferred,
        videoAccessTransferred,
        audioAccessTransferred,
        reason,
      });

    } else {
      // NO CLEAN USER FOUND - Just fix the phone
      console.log(`   No clean user found -> Just fixing phone to "${extractedPhone}"`);

      await prisma.user.update({
        where: { id: corrupted.id },
        data: { phone: extractedPhone },
      });
      console.log(`   ✅ Fixed phone number`);

      results.push({
        corruptedPhone: corrupted.phone!,
        corruptedId: corrupted.id,
        cleanPhone: extractedPhone,
        cleanId: null,
        action: 'FIXED_PHONE',
        coursesTransferred: 0,
        videoAccessTransferred: 0,
        audioAccessTransferred: 0,
        reason: 'No clean user found, fixed phone number',
      });
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 FIX COMPLETE - SUMMARY');
  console.log('═'.repeat(70));

  const fixedPhone = results.filter(r => r.action === 'FIXED_PHONE');
  const mergedToClean = results.filter(r => r.action === 'MERGED_TO_CLEAN');
  const deleted = results.filter(r => r.action === 'DELETED');
  const skipped = results.filter(r => r.action === 'SKIPPED');

  const totalCourses = results.reduce((sum, r) => sum + r.coursesTransferred, 0);
  const totalVideos = results.reduce((sum, r) => sum + r.videoAccessTransferred, 0);
  const totalAudios = results.reduce((sum, r) => sum + r.audioAccessTransferred, 0);

  console.log(`Total processed: ${results.length}`);
  console.log(`  - Phone fixed: ${fixedPhone.length}`);
  console.log(`  - Merged to clean user: ${mergedToClean.length}`);
  console.log(`  - Deleted (corrupted empty): ${deleted.length}`);
  console.log(`  - Skipped: ${skipped.length}`);
  console.log(`\nData transferred:`);
  console.log(`  - Courses: ${totalCourses}`);
  console.log(`  - Video access: ${totalVideos}`);
  console.log(`  - Audio access: ${totalAudios}`);

  // Save report
  const fs = require('fs');
  const path = require('path');

  const outputDir = '/app/scripts-output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportPath = path.join(outputDir, `fix-corrupted-phones-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalProcessed: results.length,
      fixedPhone: fixedPhone.length,
      mergedToClean: mergedToClean.length,
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
  fixCorruptedPhones()
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
} else {
  console.log('⚠️  WARNING: This script will modify user phone numbers and delete users!');
  console.log('   Run with --confirm flag to execute:\n');
  console.log('   npx ts-node scripts/fix-corrupted-phones.ts --confirm\n');
  console.log('   First, you can run the diagnose script to preview:');
  console.log('   npx ts-node scripts/diagnose-corrupted-phones.ts\n');
  process.exit(0);
}
