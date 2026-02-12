import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

interface UserCourseData {
  id: string;
  enrolledAt?: string;
  createdAt?: string;
  courseId?: string;
  course?: {
    id: string;
    title: string;
    description: string;
    price: string;
  };
}

interface ImportUser {
  id: string;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  purchasedCourses: UserCourseData[];
  videoAccessIds: string[];
  audioAccessIds: string[];
}

async function importUsers(filePath: string) {
  console.log(`Reading user data from: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const usersData: ImportUser[] = JSON.parse(fileContent);

  console.log(`Found ${usersData.length} users to process`);

  let importedUsers = 0;
  let importedEnrollments = 0;
  let skippedUsers = 0;
  let invalidUsers = 0;

  for (let i = 0; i < usersData.length; i += BATCH_SIZE) {
    const batch = Math.min(BATCH_SIZE, usersData.length - i);
    const currentBatch = usersData.slice(i, i + batch);
    
    try {
      await prisma.$transaction(async (tx) => {
        for (const userData of currentBatch) {
          // Skip if no phone number
          if (!userData.phone) {
            console.log(`Skipping user with no phone number (ID: ${userData.id})`);
            invalidUsers++;
            continue;
          }

          // Check if user exists by phone
          const existingUser = await tx.user.findUnique({
            where: { phone: userData.phone }
          });

          if (existingUser) {
            console.log(`User ${userData.phone} already exists, skipping`);
            skippedUsers++;
            continue;
          }

          // Create new user
          const user = await tx.user.create({
            data: {
              phone: userData.phone,
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              username: `user_${Date.now()}`,
              role: 'USER',
              isOld: true
            }
          });

          importedUsers++;

          // Create course enrollments if they exist
          if (userData.purchasedCourses && Array.isArray(userData.purchasedCourses)) {
            console.log(`Processing ${userData.purchasedCourses.length} courses for user ${user.id}`);
            for (const courseData of userData.purchasedCourses) {
              try {
                const courseId = courseData.courseId || courseData.course?.id;
                if (!courseId) {
                  console.log(`No course ID found for user ${user.id}, skipping`);
                  continue;
                }

                // Check if course exists
                const courseExists = await tx.course.findUnique({
                  where: { id: courseId }
                });

                if (!courseExists) {
                  console.log(`Course ${courseId} not found, skipping enrollment`);
                  continue;
                }

                // Create enrollment
                await tx.courseEnrollment.create({
                  data: {
                    userId: user.id,
                    courseId: courseId,
                    enrolledAt: new Date(courseData.enrolledAt || courseData.createdAt || new Date())
                  }
                });
                importedEnrollments++;
                console.log(`Created enrollment for user ${user.id} in course ${courseId}`);
              } catch (e) {
                console.error(`Error creating enrollment for user ${user.id}:`, {
                  courseData,
                  error: e
                });
              }
            }
          } else {
            console.log(`No purchased courses found for user ${user.id}`);
          }
        }
      });
    } catch (error) {
      console.error(`Error processing batch starting at user ${i}:`, error);
    }
  }

  console.log('Import completed:');
  console.log(`- Users imported: ${importedUsers}`);
  console.log(`- Course enrollments: ${importedEnrollments}`);
  console.log(`- Users skipped (already existed): ${skippedUsers}`);
  console.log(`- Users skipped (no phone number): ${invalidUsers}`);
}

// Get file path from command line or use default
const defaultPath = path.join(process.cwd(), 'moc-old-data/users_with_courses_2025-12-23.json');
const filePath = process.argv[2] || defaultPath;

if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found at ${filePath}`);
  console.error('Available files in moc-old-data:');
  try {
    const files = fs.readdirSync(path.join(process.cwd(), 'moc-old-data'));
    console.log(files.join('\n'));
  } catch (err) {
    console.error('Could not list moc-old-data directory');
  }
  process.exit(1);
}

importUsers(filePath)
  .catch(e => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });