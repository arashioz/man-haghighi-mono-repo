import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AnalysisResult {
  corruptedId: string;
  corruptedPhone: string;
  corruptedUsername: string | null;
  extractedPhone: string;
  cleanId: string | null;
  cleanPhone: string | null;
  corruptedCourses: number;
  cleanCourses: number;
  corruptedVideos: number;
  cleanVideos: number;
  corruptedAudios: number;
  cleanAudios: number;
  action: 'MERGE_TO_CLEAN' | 'FIX_CORRUPTED' | 'DELETE_CORRUPTED' | 'MANUAL';
  reason: string;
}

// Pattern: phone followed by underscore and any characters (0912xxxxxxx_suffix)
function extractCleanPhone(phone: string): string | null {
  // Match: starts with 0 or 9, has 10-11 digits, followed by underscore and anything
  const match = phone.match(/^(0\d{10}|9\d{9,10})_/);
  if (match) {
    let clean = match[1];
    // If starts with 9 without 0, add 0
    if (clean.startsWith('9') && clean.length === 10) {
      clean = '0' + clean;
    }
    return clean;
  }
  return null;
}

async function analyzeAndFix() {
  console.log('🔍 Analyzing users with suffix phone numbers...\n');

  // Pattern: starts with digits, followed by underscore
  const corruptedUsers = await prisma.user.findMany({
    where: {
      phone: {
        startsWith: '0',
        contains: '_',
      },
    },
    select: {
      id: true,
      phone: true,
      username: true,
    },
  });

  // Additional check for pattern: digits_xxxx
  const filteredUsers = corruptedUsers.filter(u => extractCleanPhone(u.phone || '') !== null);

  console.log(`Found ${filteredUsers.length} users with suffix pattern (0912..._xxxx)\n`);

  if (filteredUsers.length === 0) {
    console.log('✅ No users with suffix pattern found!');
    await prisma.$disconnect();
    return;
  }

  const results: AnalysisResult[] = [];

  for (const corrupted of filteredUsers) {
    const extractedPhone = extractCleanPhone(corrupted.phone!);
    if (!extractedPhone) continue;

    // Get corrupted user's data
    const [corruptedCourses, corruptedVideos, corruptedAudios] = await Promise.all([
      prisma.courseEnrollment.count({ where: { userId: corrupted.id } }),
      prisma.videoAccess.count({ where: { userId: corrupted.id } }),
      prisma.audioAccess.count({ where: { userId: corrupted.id } }),
    ]);

    // Find clean user
    const cleanUser = await prisma.user.findFirst({
      where: {
        phone: extractedPhone,
        NOT: { id: corrupted.id },
      },
      select: {
        id: true,
        phone: true,
        username: true,
      },
    });

    let cleanCourses = 0, cleanVideos = 0, cleanAudios = 0;

    if (cleanUser) {
      [cleanCourses, cleanVideos, cleanAudios] = await Promise.all([
        prisma.courseEnrollment.count({ where: { userId: cleanUser.id } }),
        prisma.videoAccess.count({ where: { userId: cleanUser.id } }),
        prisma.audioAccess.count({ where: { userId: cleanUser.id } }),
      ]);
    }

    // Determine action
    let action: AnalysisResult['action'];
    let reason: string;

    const corruptedHasData = corruptedCourses > 0 || corruptedVideos > 0 || corruptedAudios > 0;
    const cleanHasData = cleanCourses > 0 || cleanVideos > 0 || cleanAudios > 0;

    if (!cleanUser) {
      action = 'FIX_CORRUPTED';
      reason = 'No clean user found - just fix the phone number';
    } else if (corruptedHasData && !cleanHasData) {
      action = 'FIX_CORRUPTED';
      reason = `Corrupted has data (${corruptedCourses} courses), clean is empty → Delete clean, fix corrupted phone`;
    } else if (!corruptedHasData && cleanHasData) {
      action = 'DELETE_CORRUPTED';
      reason = `Corrupted is empty, clean has data (${cleanCourses} courses) → Delete corrupted`;
    } else if (corruptedHasData && cleanHasData) {
      action = 'MERGE_TO_CLEAN';
      reason = `Both have data → Merge corrupted (${corruptedCourses} courses) into clean (${cleanCourses} courses)`;
    } else {
      action = 'DELETE_CORRUPTED';
      reason = 'Both are empty → Delete corrupted';
    }

    results.push({
      corruptedId: corrupted.id,
      corruptedPhone: corrupted.phone!,
      corruptedUsername: corrupted.username,
      extractedPhone,
      cleanId: cleanUser?.id || null,
      cleanPhone: cleanUser?.phone || null,
      corruptedCourses,
      cleanCourses,
      corruptedVideos,
      cleanVideos,
      corruptedAudios,
      cleanAudios,
      action,
      reason,
    });
  }

  // Display analysis
  const fixCorrupted = results.filter(r => r.action === 'FIX_CORRUPTED');
  const mergeToClean = results.filter(r => r.action === 'MERGE_TO_CLEAN');
  const deleteCorrupted = results.filter(r => r.action === 'DELETE_CORRUPTED');

  console.log('═'.repeat(80));
  console.log('📊 ANALYSIS RESULTS');
  console.log('═'.repeat(80));
  console.log(`Total users with suffix: ${results.length}`);
  console.log(`  - Fix corrupted phone: ${fixCorrupted.length}`);
  console.log(`  - Merge to clean: ${mergeToClean.length}`);
  console.log(`  - Delete corrupted: ${deleteCorrupted.length}`);

  if (fixCorrupted.length > 0) {
    console.log('\n🔀 FIX CORRUPTED PHONE (corrupted has data or no clean user):');
    fixCorrupted.forEach(r => {
      console.log(`  ${r.corruptedPhone} → ${r.extractedPhone}`);
      if (r.cleanPhone) console.log(`    (will delete: ${r.cleanPhone} - empty)`);
    });
  }

  if (mergeToClean.length > 0) {
    console.log('\n🔀 MERGE TO CLEAN (both have data):');
    mergeToClean.forEach(r => {
      console.log(`  ${r.corruptedPhone} (${r.corruptedCourses} courses) → ${r.cleanPhone} (${r.cleanCourses} courses)`);
    });
  }

  if (deleteCorrupted.length > 0) {
    console.log('\n🗑️ DELETE CORRUPTED (empty or clean has data):');
    deleteCorrupted.slice(0, 5).forEach(r => {
      console.log(`  ${r.corruptedPhone} (empty, clean: ${r.cleanPhone})`);
    });
    if (deleteCorrupted.length > 5) {
      console.log(`  ... and ${deleteCorrupted.length - 5} more`);
    }
  }

  // Save report
  const fs = require('fs');
  const outputDir = '/app/scripts-output';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const reportPath = `${outputDir}/suffix-phone-analysis-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: { total: results.length, fixCorrupted: fixCorrupted.length, mergeToClean: mergeToClean.length, deleteCorrupted: deleteCorrupted.length },
    results,
  }, null, 2));
  console.log(`\n💾 Report saved: ${reportPath}`);

  console.log('\n💡 To execute these fixes, run:');
  console.log('   npx ts-node scripts/fix-suffix-phones.ts --confirm');

  await prisma.$disconnect();
}

async function executeFixes() {
  console.log('🔧 Executing fixes for suffix phone numbers...\n');

  const corruptedUsers = await prisma.user.findMany({
    where: {
      phone: {
        startsWith: '0',
        contains: '_',
      },
    },
    select: { id: true, phone: true },
  });

  const filteredUsers = corruptedUsers.filter(u => extractCleanPhone(u.phone || '') !== null);
  console.log(`Processing ${filteredUsers.length} users...\n`);

  let fixed = 0, deleted = 0, merged = 0, errors = 0;

  for (const corrupted of filteredUsers) {
    const extractedPhone = extractCleanPhone(corrupted.phone!);
    if (!extractedPhone) continue;

    try {
      const [corruptedCourses, corruptedVideos, corruptedAudios] = await Promise.all([
        prisma.courseEnrollment.findMany({ where: { userId: corrupted.id }, select: { courseId: true } }),
        prisma.videoAccess.findMany({ where: { userId: corrupted.id }, select: { videoId: true } }),
        prisma.audioAccess.findMany({ where: { userId: corrupted.id }, select: { audioId: true } }),
      ]);

      const cleanUser = await prisma.user.findFirst({
        where: { phone: extractedPhone, NOT: { id: corrupted.id } },
        select: { id: true },
      });

      const corruptedHasData = corruptedCourses.length > 0 || corruptedVideos.length > 0 || corruptedAudios.length > 0;

      if (!cleanUser) {
        // Just fix the phone
        await prisma.user.update({
          where: { id: corrupted.id },
          data: { phone: extractedPhone },
        });
        fixed++;
      } else {
        // Get clean user's existing data
        const [cleanCourses, cleanVideos, cleanAudios] = await Promise.all([
          prisma.courseEnrollment.findMany({ where: { userId: cleanUser.id }, select: { courseId: true } }),
          prisma.videoAccess.findMany({ where: { userId: cleanUser.id }, select: { videoId: true } }),
          prisma.audioAccess.findMany({ where: { userId: cleanUser.id }, select: { audioId: true } }),
        ]);

        const cleanHasData = cleanCourses.length > 0 || cleanVideos.length > 0 || cleanAudios.length > 0;
        const cleanCourseIds = new Set(cleanCourses.map(c => c.courseId));
        const cleanVideoIds = new Set(cleanVideos.map(v => v.videoId));
        const cleanAudioIds = new Set(cleanAudios.map(a => a.audioId));

        if (corruptedHasData && !cleanHasData) {
          // Delete clean, fix corrupted
          await prisma.courseEnrollment.deleteMany({ where: { userId: cleanUser.id } });
          await prisma.videoAccess.deleteMany({ where: { userId: cleanUser.id } });
          await prisma.audioAccess.deleteMany({ where: { userId: cleanUser.id } });
          await prisma.user.delete({ where: { id: cleanUser.id } });

          await prisma.user.update({
            where: { id: corrupted.id },
            data: { phone: extractedPhone },
          });
          fixed++;
        } else if (!corruptedHasData && cleanHasData) {
          // Delete corrupted
          await prisma.courseEnrollment.deleteMany({ where: { userId: corrupted.id } });
          await prisma.videoAccess.deleteMany({ where: { userId: corrupted.id } });
          await prisma.audioAccess.deleteMany({ where: { userId: corrupted.id } });
          await prisma.user.delete({ where: { id: corrupted.id } });
          deleted++;
        } else if (corruptedHasData && cleanHasData) {
          // Merge to clean
          for (const c of corruptedCourses) {
            if (!cleanCourseIds.has(c.courseId)) {
              await prisma.courseEnrollment.create({ data: { userId: cleanUser.id, courseId: c.courseId } }).catch(() => {});
            }
          }
          for (const v of corruptedVideos) {
            if (!cleanVideoIds.has(v.videoId)) {
              await prisma.videoAccess.create({ data: { userId: cleanUser.id, videoId: v.videoId } }).catch(() => {});
            }
          }
          for (const a of corruptedAudios) {
            if (!cleanAudioIds.has(a.audioId)) {
              await prisma.audioAccess.create({ data: { userId: cleanUser.id, audioId: a.audioId } }).catch(() => {});
            }
          }

          await prisma.courseEnrollment.deleteMany({ where: { userId: corrupted.id } });
          await prisma.videoAccess.deleteMany({ where: { userId: corrupted.id } });
          await prisma.audioAccess.deleteMany({ where: { userId: corrupted.id } });
          await prisma.user.delete({ where: { id: corrupted.id } });
          merged++;
        } else {
          // Both empty - delete corrupted
          await prisma.user.delete({ where: { id: corrupted.id } });
          deleted++;
        }
      }
    } catch (error: any) {
      console.error(`❌ Error fixing ${corrupted.phone}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('📊 FIX COMPLETE');
  console.log('═'.repeat(80));
  console.log(`Fixed (phone corrected): ${fixed}`);
  console.log(`Merged (data transferred): ${merged}`);
  console.log(`Deleted (empty or duplicate): ${deleted}`);
  console.log(`Errors: ${errors}`);
  console.log('═'.repeat(80));

  await prisma.$disconnect();
}

// Main execution
if (process.argv.includes('--confirm')) {
  executeFixes().catch((e) => { console.error(e); process.exit(1); });
} else {
  analyzeAndFix().catch((e) => { console.error(e); process.exit(1); });
}
