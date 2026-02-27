import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMissingEnrollments() {
  console.log('🔧 Fixing missing enrollments for users with video/audio access...\n');

  // Find all users who have video/audio access but missing enrollment
  const usersWithAccess = await prisma.user.findMany({
    where: {
      OR: [
        { videoAccess: { some: {} } },
        { audioAccess: { some: {} } },
      ],
    },
    select: {
      id: true,
      username: true,
      phone: true,
      videoAccess: {
        select: {
          video: {
            select: {
              courseId: true,
            },
          },
        },
      },
      audioAccess: {
        select: {
          audio: {
            select: {
              courseId: true,
            },
          },
        },
      },
      purchasedCourses: {
        select: {
          courseId: true,
        },
      },
    },
  });

  let fixedCount = 0;
  let alreadyEnrolledCount = 0;
  const errors: string[] = [];

  for (const user of usersWithAccess) {
    try {
      // Get all course IDs from video and audio access
      const courseIdsFromAccess = new Set<string>();
      
      for (const va of user.videoAccess) {
        if (va.video?.courseId) {
          courseIdsFromAccess.add(va.video.courseId);
        }
      }
      
      for (const aa of user.audioAccess) {
        if (aa.audio?.courseId) {
          courseIdsFromAccess.add(aa.audio.courseId);
        }
      }

      // Get enrolled course IDs
      const enrolledCourseIds = new Set(user.purchasedCourses.map(pc => pc.courseId));

      // Find missing enrollments
      const missingEnrollments: string[] = [];
      for (const courseId of courseIdsFromAccess) {
        if (!enrolledCourseIds.has(courseId)) {
          missingEnrollments.push(courseId);
        }
      }

      if (missingEnrollments.length > 0) {
        console.log(`👤 ${user.phone || user.username}: Missing ${missingEnrollments.length} enrollments`);
        
        for (const courseId of missingEnrollments) {
          try {
            await prisma.courseEnrollment.create({
              data: {
                userId: user.id,
                courseId: courseId,
              },
            });
            console.log(`   ✅ Enrolled in course: ${courseId}`);
            fixedCount++;
          } catch (e: any) {
            if (e.message?.includes('Unique constraint')) {
              alreadyEnrolledCount++;
            } else {
              errors.push(`Error enrolling user ${user.id} in course ${courseId}: ${e.message}`);
            }
          }
        }
      }
    } catch (error: any) {
      errors.push(`Error processing user ${user.id}: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`Enrollments created: ${fixedCount}`);
  console.log(`Already enrolled (skipped): ${alreadyEnrolledCount}`);
  console.log(`Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`   - ${e}`));
  }
  
  console.log('='.repeat(70));

  await prisma.$disconnect();
}

fixMissingEnrollments()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
