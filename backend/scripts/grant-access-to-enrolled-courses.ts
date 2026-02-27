import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GrantReport {
  timestamp: string;
  totalUsers: number;
  usersProcessed: number;
  coursesWithAccessGranted: number;
  videosGranted: number;
  videosAlreadyHad: number;
  audiosGranted: number;
  audiosAlreadyHad: number;
  errors: string[];
  details: Array<{
    userId: string;
    phone: string | null;
    username: string;
    courseId: string;
    courseTitle: string;
    videosGranted: number;
    audiosGranted: number;
  }>;
}

async function grantAccessToEnrolledCourses() {
  console.log('🚀 Granting video/audio access to all enrolled courses...\n');

  const report: GrantReport = {
    timestamp: new Date().toISOString(),
    totalUsers: 0,
    usersProcessed: 0,
    coursesWithAccessGranted: 0,
    videosGranted: 0,
    videosAlreadyHad: 0,
    audiosGranted: 0,
    audiosAlreadyHad: 0,
    errors: [],
    details: [],
  };

  // 1. Get all users with their enrolled courses
  console.log('📦 Fetching all users with enrolled courses...');
  const users = await prisma.user.findMany({
    where: {
      purchasedCourses: {
        some: {}, // Has at least one course enrollment
      },
    },
    select: {
      id: true,
      username: true,
      phone: true,
      purchasedCourses: {
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
      videoAccess: {
        select: {
          videoId: true,
        },
      },
      audioAccess: {
        select: {
          audioId: true,
        },
      },
    },
  });

  report.totalUsers = users.length;
  console.log(`✅ Found ${users.length} users with enrolled courses\n`);

  if (users.length === 0) {
    console.log('⚠️ No users with courses found.');
    await prisma.$disconnect();
    return;
  }

  // 2. Get all courses with their videos and audios
  console.log('📚 Fetching all courses with videos and audios...');
  const courses = await prisma.course.findMany({
    include: {
      videos: {
        select: {
          id: true,
          title: true,
        },
      },
      audios: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  const courseMap = new Map(courses.map(c => [c.id, c]));
  console.log(`✅ Loaded ${courses.length} courses\n`);

  // 3. Process each user
  console.log('⚙️ Processing users...\n');

  for (const user of users) {
    try {
      console.log(`👤 User: ${user.phone || user.username} (${user.purchasedCourses.length} courses)`);
      
      const existingVideoIds = new Set(user.videoAccess.map(va => va.videoId));
      const existingAudioIds = new Set(user.audioAccess.map(aa => aa.audioId));
      let userVideosGranted = 0;
      let userAudiosGranted = 0;
      let userCoursesProcessed = 0;

      // For each enrolled course
      for (const enrollment of user.purchasedCourses) {
        const course = courseMap.get(enrollment.courseId);
        if (!course) {
          console.log(`   ⚠️ Course not found: ${enrollment.courseId}`);
          continue;
        }

        console.log(`   📚 Course: ${course.title}`);
        
        let courseVideosGranted = 0;
        let courseAudiosGranted = 0;

        // Grant access to all VIDEOS
        if (course.videos && course.videos.length > 0) {
          for (const video of course.videos) {
            if (existingVideoIds.has(video.id)) {
              report.videosAlreadyHad++;
              continue;
            }

            try {
              await prisma.videoAccess.create({
                data: {
                  userId: user.id,
                  videoId: video.id,
                },
              });
              
              existingVideoIds.add(video.id);
              courseVideosGranted++;
              report.videosGranted++;
              userVideosGranted++;
            } catch (e: any) {
              if (!e.message?.includes('Unique constraint')) {
                report.errors.push(`Error granting video ${video.id} to user ${user.id}: ${e.message}`);
              }
            }
          }
        }

        // Grant access to all AUDIOS
        if (course.audios && course.audios.length > 0) {
          for (const audio of course.audios) {
            if (existingAudioIds.has(audio.id)) {
              report.audiosAlreadyHad++;
              continue;
            }

            try {
              await prisma.audioAccess.create({
                data: {
                  userId: user.id,
                  audioId: audio.id,
                },
              });
              
              existingAudioIds.add(audio.id);
              courseAudiosGranted++;
              report.audiosGranted++;
              userAudiosGranted++;
            } catch (e: any) {
              if (!e.message?.includes('Unique constraint')) {
                report.errors.push(`Error granting audio ${audio.id} to user ${user.id}: ${e.message}`);
              }
            }
          }
        }

        if (courseVideosGranted > 0 || courseAudiosGranted > 0) {
          console.log(`     ✅ Videos: ${courseVideosGranted}, Audios: ${courseAudiosGranted}`);
          report.coursesWithAccessGranted++;
          
          report.details.push({
            userId: user.id,
            phone: user.phone,
            username: user.username,
            courseId: course.id,
            courseTitle: course.title,
            videosGranted: courseVideosGranted,
            audiosGranted: courseAudiosGranted,
          });
        } else {
          console.log(`     ℹ️ Already has access`);
        }
        
        userCoursesProcessed++;
      }

      report.usersProcessed++;

      if (userVideosGranted > 0 || userAudiosGranted > 0) {
        console.log(`   📊 Total: ${userVideosGranted} videos, ${userAudiosGranted} audios\n`);
      } else {
        console.log(`   ℹ️ No new access needed\n`);
      }

    } catch (error: any) {
      const errorMsg = `Error processing user ${user.id}: ${error.message}`;
      console.error(`   ❌ ${errorMsg}`);
      report.errors.push(errorMsg);
    }
  }

  // 4. Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL REPORT');
  console.log('='.repeat(70));
  console.log(`Total users with courses: ${report.totalUsers}`);
  console.log(`Users processed: ${report.usersProcessed}`);
  console.log(`Courses with new access: ${report.coursesWithAccessGranted}`);
  console.log(`Videos granted: ${report.videosGranted}`);
  console.log(`Videos already had: ${report.videosAlreadyHad}`);
  console.log(`Audios granted: ${report.audiosGranted}`);
  console.log(`Audios already had: ${report.audiosAlreadyHad}`);
  console.log(`Errors: ${report.errors.length}`);
  
  if (report.errors.length > 0) {
    console.log('\n❌ Errors:');
    report.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
    if (report.errors.length > 5) {
      console.log(`   ... and ${report.errors.length - 5} more`);
    }
  }
  
  console.log('='.repeat(70));

  // 5. Save report
  const fs = await import('fs');
  const path = await import('path');
  const reportPath = path.join(
    process.cwd(),
    '..',
    'moc-old-data',
    `enrolled-courses-access-report-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

// Run the script
grantAccessToEnrolledCourses()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
