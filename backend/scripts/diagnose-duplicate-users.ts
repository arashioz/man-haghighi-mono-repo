import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateUser {
  id: string;
  username: string | null;
  phone: string;
  suffix: string;
  createdAt: Date;
  courseCount: number;
  videoAccessCount: number;
  audioAccessCount: number;
}

interface MainUser {
  id: string;
  username: string | null;
  phone: string;
  createdAt: Date;
  courseCount: number;
  videoAccessCount: number;
  audioAccessCount: number;
}

interface AnalysisResult {
  originalPhone: string;
  mainUser: MainUser | null;
  duplicateUser: DuplicateUser;
  coursesOnlyInDuplicate: string[];
  coursesOnlyInMain: string[];
  coursesInBoth: string[];
  action: 'DELETE' | 'MERGE' | 'MANUAL';
  reason: string;
}

async function diagnoseDuplicateUsers() {
  console.log('🔍 Diagnosing duplicate users with _xxxxx_2 pattern...\n');

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

  const duplicateUsers: DuplicateUser[] = [];

  for (const user of allUsers) {
    if (user.phone && pattern.test(user.phone)) {
      // Get course counts
      const [courseCount, videoAccessCount, audioAccessCount] = await Promise.all([
        prisma.courseEnrollment.count({ where: { userId: user.id } }),
        prisma.videoAccess.count({ where: { userId: user.id } }),
        prisma.audioAccess.count({ where: { userId: user.id } }),
      ]);

      // Extract suffix (everything after the phone number)
      const originalPhone = user.phone.substring(0, 11);
      const suffix = user.phone.substring(11); // _xxxxx_2

      duplicateUsers.push({
        id: user.id,
        username: user.username,
        phone: user.phone,
        suffix,
        createdAt: user.createdAt,
        courseCount,
        videoAccessCount,
        audioAccessCount,
      });
    }
  }

  console.log(`Found ${duplicateUsers.length} duplicate users with _xxxxx_2 pattern\n`);

  if (duplicateUsers.length === 0) {
    console.log('✅ No duplicate users found!');
    await prisma.$disconnect();
    return;
  }

  // Analyze each duplicate
  const results: AnalysisResult[] = [];

  for (const dup of duplicateUsers) {
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
        username: true,
        phone: true,
        createdAt: true,
      },
    });

    let main: MainUser | null = null;
    let coursesOnlyInDuplicate: string[] = [];
    let coursesOnlyInMain: string[] = [];
    let coursesInBoth: string[] = [];

    if (mainUser) {
      const [mainCourseCount, mainVideoCount, mainAudioCount] = await Promise.all([
        prisma.courseEnrollment.count({ where: { userId: mainUser.id } }),
        prisma.videoAccess.count({ where: { userId: mainUser.id } }),
        prisma.audioAccess.count({ where: { userId: mainUser.id } }),
      ]);

      main = {
        id: mainUser.id,
        username: mainUser.username,
        phone: mainUser.phone,
        createdAt: mainUser.createdAt,
        courseCount: mainCourseCount,
        videoAccessCount: mainVideoCount,
        audioAccessCount: mainAudioCount,
      };

      // Compare courses
      const [dupCourses, mainCourses] = await Promise.all([
        prisma.courseEnrollment.findMany({
          where: { userId: dup.id },
          select: { courseId: true },
        }),
        prisma.courseEnrollment.findMany({
          where: { userId: mainUser.id },
          select: { courseId: true },
        }),
      ]);

      const dupCourseIds = dupCourses.map(c => c.courseId);
      const mainCourseIds = mainCourses.map(c => c.courseId);

      coursesOnlyInDuplicate = dupCourseIds.filter(id => !mainCourseIds.includes(id));
      coursesOnlyInMain = mainCourseIds.filter(id => !dupCourseIds.includes(id));
      coursesInBoth = dupCourseIds.filter(id => mainCourseIds.includes(id));
    }

    // Determine action
    let action: 'DELETE' | 'MERGE' | 'MANUAL';
    let reason: string;

    if (!main) {
      action = 'MANUAL';
      reason = 'No main user found - need to check manually';
    } else if (dup.courseCount === 0 && dup.videoAccessCount === 0 && dup.audioAccessCount === 0) {
      action = 'DELETE';
      reason = 'Duplicate has no courses or access - safe to delete';
    } else if (coursesOnlyInDuplicate.length > 0) {
      action = 'MERGE';
      reason = `Duplicate has ${coursesOnlyInDuplicate.length} courses that main user doesn't have - need to merge`;
    } else {
      action = 'DELETE';
      reason = 'Duplicate has no unique courses - safe to delete';
    }

    results.push({
      originalPhone,
      mainUser: main,
      duplicateUser: dup,
      coursesOnlyInDuplicate,
      coursesOnlyInMain,
      coursesInBoth,
      action,
      reason,
    });
  }

  // Display results
  console.log('═'.repeat(80));
  console.log('📊 ANALYSIS RESULTS');
  console.log('═'.repeat(80));

  const toMerge = results.filter(r => r.action === 'MERGE');
  const toDelete = results.filter(r => r.action === 'DELETE');
  const manual = results.filter(r => r.action === 'MANUAL');

  console.log(`\nTotal duplicates: ${results.length}`);
  console.log(`  - To MERGE (transfer courses): ${toMerge.length}`);
  console.log(`  - To DELETE (no unique data): ${toDelete.length}`);
  console.log(`  - MANUAL check needed: ${manual.length}`);

  if (toMerge.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log('🔀 USERS TO MERGE (transfer courses from duplicate to main)');
    console.log('─'.repeat(80));

    for (const result of toMerge) {
      const dup = result.duplicateUser;
      const main = result.mainUser!;

      console.log(`\n👤 ${dup.username || 'Unknown'}`);
      console.log(`   Duplicate: ${dup.phone} (ID: ${dup.id})`);
      console.log(`   Main User: ${main.phone} (ID: ${main.id})`);
      console.log(`   Duplicate has: ${dup.courseCount} courses, ${dup.videoAccessCount} videos, ${dup.audioAccessCount} audios`);
      console.log(`   Main has: ${main.courseCount} courses, ${main.videoAccessCount} videos, ${main.audioAccessCount} audios`);
      console.log(`   Courses to transfer: ${result.coursesOnlyInDuplicate.length}`);
      if (result.coursesOnlyInDuplicate.length > 0) {
        // Get course titles
        const courses = await prisma.course.findMany({
          where: { id: { in: result.coursesOnlyInDuplicate } },
          select: { id: true, title: true },
        });
        for (const c of courses) {
          console.log(`     - ${c.title} (${c.id})`);
        }
      }
    }
  }

  if (toDelete.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log('🗑️  USERS TO DELETE (no unique courses)');
    console.log('─'.repeat(80));

    for (const result of toDelete) {
      const dup = result.duplicateUser;
      const main = result.mainUser;

      console.log(`\n👤 ${dup.username || 'Unknown'}`);
      console.log(`   Duplicate: ${dup.phone} (ID: ${dup.id})`);
      console.log(`   Courses: ${dup.courseCount}, Videos: ${dup.videoAccessCount}, Audios: ${dup.audioAccessCount}`);
      if (main) {
        console.log(`   Main User: ${main.phone} (ID: ${main.id})`);
      } else {
        console.log(`   ⚠️  No main user found!`);
      }
    }
  }

  if (manual.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log('⚠️  MANUAL CHECK NEEDED');
    console.log('─'.repeat(80));

    for (const result of manual) {
      const dup = result.duplicateUser;
      console.log(`\n👤 ${dup.username || 'Unknown'}`);
      console.log(`   Phone: ${dup.phone} (ID: ${dup.id})`);
      console.log(`   Original phone: ${result.originalPhone}`);
      console.log(`   No main user found with original phone number`);
    }
  }

  // Save report
  const fs = require('fs');
  const reportPath = `./diagnose-duplicates-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalDuplicates: results.length,
      toMerge: toMerge.length,
      toDelete: toDelete.length,
      manual: manual.length,
      generatedAt: new Date().toISOString(),
    },
    results,
  }, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);

  if (toMerge.length > 0 || toDelete.length > 0) {
    console.log('\n💡 To fix these issues, run:');
    console.log('   npx ts-node scripts/fix-duplicate-users.ts --confirm');
  }

  await prisma.$disconnect();
}

diagnoseDuplicateUsers()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
