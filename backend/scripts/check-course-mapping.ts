import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function checkCourseMapping() {
  console.log('🔍 Checking course mapping between JSON and database...\n');

  // Get all courses from database
  const dbCourses = await prisma.course.findMany({
    select: { id: true, title: true },
  });
  console.log(`📚 Courses in database: ${dbCourses.length}`);
  for (const c of dbCourses) {
    console.log(`  - ${c.id}: ${c.title}`);
  }

  // Read a sample from JSON to see course IDs
  const jsonPath = path.join(process.cwd(), 'moc-old-data', 'users_with_courses_full_update_2026-02-26.json');
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const jsonUsers = JSON.parse(jsonContent);

  // Collect unique course IDs from JSON
  const jsonCourseIds = new Set<string>();
  for (const user of jsonUsers.slice(0, 1000)) { // Check first 1000 users
    if (user.purchasedCourses?.length > 0) {
      for (const course of user.purchasedCourses) {
        const courseId = typeof course === 'string' ? course : course?.id;
        if (courseId) jsonCourseIds.add(courseId);
      }
    }
  }

  console.log(`\n📋 Unique course IDs in JSON (sample): ${jsonCourseIds.size}`);

  // Check which ones exist in database
  let found = 0;
  let notFound = 0;
  for (const courseId of jsonCourseIds) {
    const exists = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (exists) {
      found++;
    } else {
      notFound++;
      if (notFound <= 5) {
        console.log(`  ❌ Course ID not found: ${courseId}`);
      }
    }
  }

  console.log(`\n📊 Course ID Match Results:`);
  console.log(`  ✅ Found in database: ${found}`);
  console.log(`  ❌ Not found: ${notFound}`);

  if (notFound > 0) {
    console.log(`\n⚠️  WARNING: ${notFound} courses from JSON don't exist in database!`);
    console.log(`   These enrollments will fail.`);
  }

  await prisma.$disconnect();
}

checkCourseMapping()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
