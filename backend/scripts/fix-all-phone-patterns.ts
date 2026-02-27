import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UserAnalysis {
  id: string;
  phone: string;
  username: string | null;
  extractedPhone: string | null;
  pattern: string;
  courses: number;
  videos: number;
  audios: number;
  cleanUserId: string | null;
  cleanUserPhone: string | null;
  cleanUserCourses: number;
  action: 'FIX' | 'MERGE' | 'DELETE' | 'SKIP';
}

// Extract clean phone from various patterns
function extractCleanPhone(phone: string): { clean: string | null; pattern: string } {
  // Pattern 1: 0XXXXXXXXXX_suffix (11 digits starting with 0)
  const match1 = phone.match(/^(0\d{10})_/);
  if (match1) {
    return { clean: match1[1], pattern: '0XX_suffix' };
  }

  // Pattern 2: 9XXXXXXXXX_suffix (10 digits starting with 9, add 0)
  const match2 = phone.match(/^(9\d{9})_/);
  if (match2) {
    return { clean: '0' + match2[1], pattern: '9XX_suffix' };
  }

  // Pattern 3: +98XXXXXXXXXX_suffix (with +98 prefix)
  const match3 = phone.match(/^\+98(\d{10})_/);
  if (match3) {
    return { clean: '0' + match3[1], pattern: '+98_suffix' };
  }

  // Pattern 4: 98XXXXXXXXXX_suffix (with 98 prefix)
  const match4 = phone.match(/^98(\d{10})_/);
  if (match4) {
    return { clean: '0' + match4[1], pattern: '98_suffix' };
  }

  // Pattern 5: Just underscore somewhere (try to extract first 11 digits starting with 0)
  const match5 = phone.match(/^(0\d{10})[^0-9]/);
  if (match5) {
    return { clean: match5[1], pattern: '0XX_other' };
  }

  return { clean: null, pattern: 'unknown' };
}

async function analyzeUsers() {
  console.log('🔍 Analyzing all users with non-standard phone patterns...\n');

  // Get all users with phone containing underscore
  const allUsers = await prisma.user.findMany({
    where: {
      phone: {
        contains: '_',
      },
    },
    select: {
      id: true,
      phone: true,
      username: true,
    },
  });

  console.log(`Found ${allUsers.length} users with underscore in phone\n`);

  const results: UserAnalysis[] = [];

  for (const user of allUsers) {
    if (!user.phone) continue;

    const { clean, pattern } = extractCleanPhone(user.phone);

    if (clean) {
      const [courses, videos, audios] = await Promise.all([
        prisma.courseEnrollment.count({ where: { userId: user.id } }),
        prisma.videoAccess.count({ where: { userId: user.id } }),
        prisma.audioAccess.count({ where: { userId: user.id } }),
      ]);

      // Find clean user
      const cleanUser = await prisma.user.findFirst({
        where: {
          phone: clean,
          NOT: { id: user.id },
        },
        select: { id: true, phone: true },
      });

      let cleanCourses = 0;
      if (cleanUser) {
        cleanCourses = await prisma.courseEnrollment.count({
          where: { userId: cleanUser.id },
        });
      }

      const hasData = courses > 0 || videos > 0 || audios > 0;
      const cleanHasData = cleanCourses > 0;

      let action: UserAnalysis['action'];
      if (!cleanUser) {
        action = 'FIX';
      } else if (hasData && !cleanHasData) {
        action = 'FIX';
      } else if (!hasData && cleanHasData) {
        action = 'DELETE';
      } else if (hasData && cleanHasData) {
        action = 'MERGE';
      } else {
        action = 'DELETE';
      }

      results.push({
        id: user.id,
        phone: user.phone,
        username: user.username,
        extractedPhone: clean,
        pattern,
        courses,
        videos,
        audios,
        cleanUserId: cleanUser?.id || null,
        cleanUserPhone: cleanUser?.phone || null,
        cleanUserCourses: cleanCourses,
        action,
      });
    }
  }

  // Group by pattern
  const byPattern: Record<string, number> = {};
  results.forEach(r => {
    byPattern[r.pattern] = (byPattern[r.pattern] || 0) + 1;
  });

  console.log('📊 Patterns found:');
  Object.entries(byPattern).forEach(([p, count]) => {
    console.log(`  ${p}: ${count}`);
  });

  const fixCount = results.filter(r => r.action === 'FIX').length;
  const mergeCount = results.filter(r => r.action === 'MERGE').length;
  const deleteCount = results.filter(r => r.action === 'DELETE').length;

  console.log(`\n📋 Actions needed:`);
  console.log(`  Fix (update phone): ${fixCount}`);
  console.log(`  Merge (transfer data): ${mergeCount}`);
  console.log(`  Delete (remove duplicate): ${deleteCount}`);

  // Show specific examples
  const specificPattern = results.filter(r => r.pattern === '0XX_suffix');
  if (specificPattern.length > 0) {
    console.log(`\n🔍 Users with 0XX_suffix pattern (${specificPattern.length}):`);
    specificPattern.slice(0, 10).forEach(r => {
      console.log(`  ${r.phone} → ${r.extractedPhone} (${r.courses} courses) → ${r.action}`);
    });
  }

  return results;
}

async function executeFixes(results: UserAnalysis[]) {
  console.log('\n🔧 Executing fixes...\n');

  let fixed = 0, merged = 0, deleted = 0, errors = 0;

  for (const user of results) {
    try {
      if (user.action === 'FIX') {
        // Delete clean user if exists (it's empty)
        if (user.cleanUserId) {
          await prisma.courseEnrollment.deleteMany({ where: { userId: user.cleanUserId } });
          await prisma.videoAccess.deleteMany({ where: { userId: user.cleanUserId } });
          await prisma.audioAccess.deleteMany({ where: { userId: user.cleanUserId } });
          await prisma.user.delete({ where: { id: user.cleanUserId } });
        }

        // Update corrupted user
        await prisma.user.update({
          where: { id: user.id },
          data: { phone: user.extractedPhone },
        });
        fixed++;
      } else if (user.action === 'MERGE') {
        // Transfer data
        const [corruptedCourses, corruptedVideos, corruptedAudios] = await Promise.all([
          prisma.courseEnrollment.findMany({ where: { userId: user.id }, select: { courseId: true } }),
          prisma.videoAccess.findMany({ where: { userId: user.id }, select: { videoId: true } }),
          prisma.audioAccess.findMany({ where: { userId: user.id }, select: { audioId: true } }),
        ]);

        const [cleanCourses, cleanVideos, cleanAudios] = await Promise.all([
          prisma.courseEnrollment.findMany({ where: { userId: user.cleanUserId! }, select: { courseId: true } }),
          prisma.videoAccess.findMany({ where: { userId: user.cleanUserId! }, select: { videoId: true } }),
          prisma.audioAccess.findMany({ where: { userId: user.cleanUserId! }, select: { audioId: true } }),
        ]);

        const cleanCourseIds = new Set(cleanCourses.map(c => c.courseId));
        const cleanVideoIds = new Set(cleanVideos.map(v => v.videoId));
        const cleanAudioIds = new Set(cleanAudios.map(a => a.audioId));

        // Transfer unique courses
        for (const c of corruptedCourses) {
          if (!cleanCourseIds.has(c.courseId)) {
            await prisma.courseEnrollment.create({
              data: { userId: user.cleanUserId!, courseId: c.courseId },
            }).catch(() => {});
          }
        }

        // Transfer unique videos
        for (const v of corruptedVideos) {
          if (!cleanVideoIds.has(v.videoId)) {
            await prisma.videoAccess.create({
              data: { userId: user.cleanUserId!, videoId: v.videoId },
            }).catch(() => {});
          }
        }

        // Transfer unique audios
        for (const a of corruptedAudios) {
          if (!cleanAudioIds.has(a.audioId)) {
            await prisma.audioAccess.create({
              data: { userId: user.cleanUserId!, audioId: a.audioId },
            }).catch(() => {});
          }
        }

        // Delete corrupted user
        await prisma.courseEnrollment.deleteMany({ where: { userId: user.id } });
        await prisma.videoAccess.deleteMany({ where: { userId: user.id } });
        await prisma.audioAccess.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });

        merged++;
      } else if (user.action === 'DELETE') {
        // Just delete corrupted user
        await prisma.courseEnrollment.deleteMany({ where: { userId: user.id } });
        await prisma.videoAccess.deleteMany({ where: { userId: user.id } });
        await prisma.audioAccess.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
        deleted++;
      }
    } catch (error: any) {
      console.error(`❌ Error fixing ${user.phone}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('📊 FIX COMPLETE');
  console.log('═'.repeat(70));
  console.log(`Fixed (phone updated): ${fixed}`);
  console.log(`Merged (data transferred): ${merged}`);
  console.log(`Deleted (removed): ${deleted}`);
  console.log(`Errors: ${errors}`);
  console.log('═'.repeat(70));
}

// Main
async function main() {
  const results = await analyzeUsers();

  if (results.length === 0) {
    console.log('\n✅ No users with fixable patterns found!');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n💡 Found ${results.length} users to fix`);
  console.log('Run with --confirm to execute fixes:\n');
  console.log('  npx ts-node scripts/fix-all-phone-patterns.ts --confirm\n');

  await prisma.$disconnect();
}

if (process.argv.includes('--confirm')) {
  analyzeUsers()
    .then(async (results) => {
      if (results.length > 0) {
        await executeFixes(results);
      }
      await prisma.$disconnect();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
} else {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
