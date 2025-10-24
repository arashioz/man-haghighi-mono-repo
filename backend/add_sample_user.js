const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function addSampleUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: '09123456791' }
    });

    let userId;
    
    if (existingUser) {
      console.log('User with phone 09123456791 already exists');
      userId = existingUser.id;
    } else {
      // Create the sample user
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const user = await prisma.user.create({
        data: {
          phone: '09123456791',
          username: 'sample_user',
          password: hashedPassword,
          firstName: 'کاربر',
          lastName: 'نمونه',
          role: 'USER',
          isActive: true
        }
      });
      
      console.log('Created sample user:', user.id);
      userId = user.id;
    }

    // Create a sample course
    const existingCourse = await prisma.course.findFirst({
      where: { title: 'دوره نمونه - فریبا کسرایی' }
    });

    let courseId;
    
    if (existingCourse) {
      console.log('Sample course already exists');
      courseId = existingCourse.id;
    } else {
      const course = await prisma.course.create({
        data: {
          title: 'دوره نمونه - فریبا کسرایی',
          description: 'این یک دوره نمونه است که کاربران عادی می‌توانند آن را مشاهده کنند',
          price: 0,
          published: true,
          thumbnail: 'book.png', // Using existing thumbnail
          videoFile: 'fariba-kosari.mp4',
          attachments: [],
          courseVideos: ['fariba-kosari.mp4']
        }
      });
      
      console.log('Created sample course:', course.id);
      courseId = course.id;
    }

    // Create a sample video
    const existingVideo = await prisma.video.findFirst({
      where: { title: 'ویدیو نمونه - فریبا کسرایی' }
    });

    let videoId;
    
    if (existingVideo) {
      console.log('Sample video already exists');
      videoId = existingVideo.id;
    } else {
      const video = await prisma.video.create({
        data: {
          title: 'ویدیو نمونه - فریبا کسرایی',
          description: 'این یک ویدیو نمونه است که کاربران عادی می‌توانند آن را مشاهده کنند',
          videoFile: 'fariba-kosari.mp4',
          thumbnail: 'book.png',
          duration: 300, // 5 minutes
          order: 1,
          courseId: courseId,
          published: true
        }
      });
      
      console.log('Created sample video:', video.id);
      videoId = video.id;
    }

    // Enroll user in the course
    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: userId,
          courseId: courseId
        }
      }
    });

    if (!existingEnrollment) {
      await prisma.courseEnrollment.create({
        data: {
          userId: userId,
          courseId: courseId
        }
      });
      console.log('Enrolled user in course');
    } else {
      console.log('User already enrolled in course');
    }

    // Grant direct video access
    const existingVideoAccess = await prisma.videoAccess.findUnique({
      where: {
        userId_videoId: {
          userId: userId,
          videoId: videoId
        }
      }
    });

    if (!existingVideoAccess) {
      await prisma.videoAccess.create({
        data: {
          userId: userId,
          videoId: videoId
        }
      });
      console.log('Granted direct video access');
    } else {
      console.log('User already has video access');
    }

    console.log('Sample data setup completed successfully!');
    console.log('User phone: 09123456791');
    console.log('User password: password123');
    console.log('User can now access the sample video and course');

  } catch (error) {
    console.error('Error setting up sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleUser();
