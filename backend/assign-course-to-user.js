const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignCourseToUser() {
  try {
    // Get the first user
    const user = await prisma.user.findFirst({
      where: {
        role: 'USER'
      }
    });

    if (!user) {
      console.log('No user found with role USER');
      return;
    }

    // Get the first course
    const course = await prisma.course.findFirst({
      where: {
        published: true
      },
      include: {
        videos: true
      }
    });

    if (!course) {
      console.log('No published course found');
      return;
    }

    console.log(`Assigning course "${course.title}" to user "${user.firstName} ${user.lastName}"`);

    // Check if user is already enrolled
    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
    });

    if (existingEnrollment) {
      console.log('User is already enrolled in this course');
      return;
    }

    // Create enrollment
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
      },
    });

    console.log('Enrollment created:', enrollment.id);

    // Grant access to all course videos
    const videoAccessPromises = course.videos.map(video =>
      prisma.videoAccess.create({
        data: {
          userId: user.id,
          videoId: video.id,
        },
      }).catch(() => {
        // Ignore duplicate key errors
        console.log(`Video access already exists for video: ${video.title}`);
      })
    );

    await Promise.all(videoAccessPromises);

    console.log('Video access granted for all course videos');
    console.log(`User can now access ${course.videos.length} videos from course "${course.title}"`);

  } catch (error) {
    console.error('Error assigning course to user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignCourseToUser();

