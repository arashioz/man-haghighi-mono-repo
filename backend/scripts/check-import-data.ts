import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function checkImportData() {
  console.log('🔍 Checking import data...\n');

  const jsonPath = path.join(process.cwd(), 'moc-old-data', 'users_with_courses_full_update_2026-02-26.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON file not found!');
    return;
  }

  console.log('📁 Reading JSON file...');
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const jsonUsers = JSON.parse(jsonContent);
  
  console.log(`Total users in JSON: ${jsonUsers.length}\n`);

  // Check sample users
  let usersWithCourses = 0;
  let usersWithVideoAccess = 0;
  let usersWithAudioAccess = 0;
  let totalCourses = 0;
  let totalVideos = 0;
  let totalAudios = 0;

  for (const user of jsonUsers.slice(0, 100)) { // Check first 100
    if (user.purchasedCourses?.length > 0) {
      usersWithCourses++;
      totalCourses += user.purchasedCourses.length;
    }
    if (user.videoAccessIds?.length > 0) {
      usersWithVideoAccess++;
      totalVideos += user.videoAccessIds.length;
    }
    if (user.userAudioIds?.length > 0) {
      usersWithAudioAccess++;
      totalAudios += user.audioAccessIds.length;
    }
  }

  console.log('Sample check (first 100 users):');
  console.log(`  Users with courses: ${usersWithCourses}`);
  console.log(`  Users with video access: ${usersWithVideoAccess}`);
  console.log(`  Users with audio access: ${usersWithAudioAccess}`);
  console.log(`  Total courses in sample: ${totalCourses}`);
  console.log(`  Total video access: ${totalVideos}`);
  console.log(`  Total audio access: ${totalAudios}\n`);

  // Show sample user data
  console.log('Sample user data:');
  const sampleUser = jsonUsers.find((u: any) => u.purchasedCourses?.length > 0) || jsonUsers[0];
  console.log(JSON.stringify(sampleUser, null, 2));

  // Check database courses
  const dbCourses = await prisma.course.findMany({
    select: { id: true, title: true },
    take: 10,
  });
  
  console.log('\n📊 Database courses (sample):');
  for (const c of dbCourses) {
    console.log(`  - ${c.title} (${c.id})`);
  }

  // Check if any course IDs match
  if (jsonUsers[0]?.purchasedCourses?.length > 0) {
    const sampleCourseId = jsonUsers[0].purchasedCourses[0];
    const existingCourse = await prisma.course.findUnique({
      where: { id: sampleCourseId },
      select: { id: true, title: true },
    });
    
    console.log(`\n🔍 Checking sample course ID: ${sampleCourseId}`);
    if (existingCourse) {
      console.log(`  ✅ Course exists: ${existingCourse.title}`);
    } else {
      console.log(`  ❌ Course NOT found in database!`);
    }
  }

  // Check enrolled users count
  const enrolledCount = await prisma.courseEnrollment.count();
  const videoAccessCount = await prisma.videoAccess.count();
  const audioAccessCount = await prisma.audioAccess.count();

  console.log('\n📊 Current database state:');
  console.log(`  Course enrollments: ${enrolledCount}`);
  console.log(`  Video access records: ${videoAccessCount}`);
  console.log(`  Audio access records: ${audioAccessCount}`);

  await prisma.$disconnect();
}

checkImportData()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
