import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface JsonUser {
  id: string;
  phone: string | null;
  purchasedCourses: string[];
  videoAccessIds: string[];
  audioAccessIds: string[];
}

async function assignCoursesToAllUsers() {
  console.log('🚀 Starting to assign courses to all users...\n');

  const jsonPath = path.join(process.cwd(), 'moc-old-data', 'users_with_courses_full_update_2026-02-26.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON file not found!');
    process.exit(1);
  }

  console.log('📁 Reading JSON file...');
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const jsonUsers: JsonUser[] = JSON.parse(jsonContent);
  
  console.log(`📊 Found ${jsonUsers.length} users in JSON\n`);

  let processed = 0;
  let errors = 0;
  let coursesAdded = 0;
  let videosAdded = 0;
  let audiosAdded = 0;
  let usersNotFound = 0;

  const total = jsonUsers.length;

  for (const jsonUser of jsonUsers) {
    processed++;
    if (processed % 100 === 0 || processed === total) {
      console.log(`   Progress: ${processed}/${total} (${Math.round(processed/total*100)}%) - Errors: ${errors} - NotFound: ${usersNotFound}`);
    }

    try {
      // Find user by ID first, then by phone
      let user = await prisma.user.findUnique({
        where: { id: jsonUser.id },
        include: {
          purchasedCourses: { select: { courseId: true } },
          videoAccess: { select: { videoId: true } },
          audioAccess: { select: { audioId: true } },
        },
      });

      if (!user && jsonUser.phone) {
        // Normalize phone for search
        let phone = jsonUser.phone.trim();
        if (phone.startsWith('+98')) phone = '0' + phone.slice(3);
        if (phone.startsWith('9')) phone = '0' + phone;

        user = await prisma.user.findFirst({
          where: { phone: phone },
          include: {
            purchasedCourses: { select: { courseId: true } },
            videoAccess: { select: { videoId: true } },
            audioAccess: { select: { audioId: true } },
          },
        });
      }

      if (!user) {
        usersNotFound++;
        continue;
      }

      // Get existing data
      const existingCourseIds = new Set(user.purchasedCourses.map(c => c.courseId));
      const existingVideoIds = new Set(user.videoAccess.map(v => v.videoId));
      const existingAudioIds = new Set(user.audioAccess.map(a => a.audioId));

      // Add courses
      if (jsonUser.purchasedCourses?.length > 0) {
        for (const courseId of jsonUser.purchasedCourses) {
          if (!existingCourseIds.has(courseId)) {
            try {
              await prisma.courseEnrollment.create({
                data: {
                  userId: user.id,
                  courseId: courseId,
                  enrolledAt: new Date(),
                },
              });
              coursesAdded++;
            } catch (e: any) {
              if (e.code !== 'P2002') { // Not duplicate error
                console.error(`     Error adding course ${courseId} to ${user.phone}: ${e.message}`);
              }
            }
          }
        }
      }

      // Add video access
      if (jsonUser.videoAccessIds?.length > 0) {
        for (const videoId of jsonUser.videoAccessIds) {
          if (!existingVideoIds.has(videoId)) {
            try {
              await prisma.videoAccess.create({
                data: {
                  userId: user.id,
                  videoId: videoId,
                },
              });
              videosAdded++;
            } catch (e: any) {
              if (e.code !== 'P2002') {
                console.error(`     Error adding video ${videoId} to ${user.phone}: ${e.message}`);
              }
            }
          }
        }
      }

      // Add audio access
      if (jsonUser.audioAccessIds?.length > 0) {
        for (const audioId of jsonUser.audioAccessIds) {
          if (!existingAudioIds.has(audioId)) {
            try {
              await prisma.audioAccess.create({
                data: {
                  userId: user.id,
                  audioId: audioId,
                },
              });
              audiosAdded++;
            } catch (e: any) {
              if (e.code !== 'P2002') {
                console.error(`     Error adding audio ${audioId} to ${user.phone}: ${e.message}`);
              }
            }
          }
        }
      }

    } catch (error: any) {
      errors++;
      console.error(`   ❌ Error processing ${jsonUser.phone}: ${error.message}`);
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 ASSIGNMENT COMPLETE - SUMMARY');
  console.log('═'.repeat(70));
  console.log(`Total users in JSON: ${total}`);
  console.log(`Processed: ${processed}`);
  console.log(`Users not found in DB: ${usersNotFound}`);
  console.log(`Errors: ${errors}`);
  console.log('-'.repeat(70));
  console.log(`New courses assigned: ${coursesAdded}`);
  console.log(`New video access granted: ${videosAdded}`);
  console.log(`New audio access granted: ${audiosAdded}`);
  console.log('═'.repeat(70));

  // Final count
  const finalEnrollments = await prisma.courseEnrollment.count();
  const finalVideoAccess = await prisma.videoAccess.count();
  const finalAudioAccess = await prisma.audioAccess.count();

  console.log('\n📊 Final database state:');
  console.log(`  Total course enrollments: ${finalEnrollments}`);
  console.log(`  Total video access: ${finalVideoAccess}`);
  console.log(`  Total audio access: ${finalAudioAccess}`);

  await prisma.$disconnect();
}

// Confirm before running
if (process.argv.includes('--confirm')) {
  assignCoursesToAllUsers()
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
} else {
  console.log('⚠️  WARNING: This will assign courses to ALL users!');
  console.log('   Run with --confirm flag to execute:\n');
  console.log('   npx ts-node scripts/assign-courses-to-all-users.ts --confirm\n');
  console.log('   This will read users_with_courses_full_update_2026-02-26.json');
  console.log('   and assign all courses/videos/audios to existing users.\n');
  process.exit(0);
}
