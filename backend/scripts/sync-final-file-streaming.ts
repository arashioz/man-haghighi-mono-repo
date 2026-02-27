import { PrismaClient, UserRole } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface JsonUser {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  isOld: boolean;
  isBlocked: boolean;
  education: string | null;
  university: string | null;
  job: string | null;
  state: string | null;
  gender: string | null;
  createdAt: string;
  updatedAt: string;
  purchasedCourses: string[];
  videoAccessIds: string[];
  audioAccessIds: string[];
}

interface SyncReport {
  timestamp: string;
  totalJsonUsers: number;
  processed: number;
  created: number;
  updated: number;
  deleted: number;
  coursesAdded: number;
  coursesRemoved: number;
  videoAccessAdded: number;
  videoAccessRemoved: number;
  audioAccessAdded: number;
  audioAccessRemoved: number;
  errors: string[];
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  let normalized = phone.trim();
  if (normalized.startsWith('+98')) {
    normalized = '0' + normalized.slice(3);
  }
  if (normalized.startsWith('9')) {
    normalized = '0' + normalized;
  }
  return normalized;
}

// Parse NDJSON or array JSON
async function* readUsersFromFile(filePath: string): AsyncGenerator<JsonUser> {
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  
  // Check first character to determine format
  const firstChunk = await new Promise<string>((resolve) => {
    fileStream.once('data', (chunk) => {
      resolve(chunk.toString().trim()[0]);
      fileStream.destroy();
    });
  });

  const isArray = firstChunk === '[';
  
  // Re-create stream
  const newStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: newStream,
    crlfDelay: Infinity,
  });

  let buffer = '';
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for await (const line of rl) {
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (escapeNext) {
        buffer += char;
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        buffer += char;
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{' || char === '[') depth++;
        if (char === '}' || char === ']') depth--;
      }
      
      buffer += char;
      
      // When we complete an object at depth 1 (inside the array)
      if (depth === 1 && char === '}' && buffer.trim().startsWith('{')) {
        try {
          const user = JSON.parse(buffer.trim().replace(/,$/, ''));
          if (user.id) {
            yield user;
          }
        } catch (e) {
          // Invalid JSON, skip
        }
        buffer = '';
      }
    }
  }
}

async function fullSync() {
  console.log('🚀 Starting STREAMING SYNC of users and courses...\n');

  const report: SyncReport = {
    timestamp: new Date().toISOString(),
    totalJsonUsers: 0,
    processed: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    coursesAdded: 0,
    coursesRemoved: 0,
    videoAccessAdded: 0,
    videoAccessRemoved: 0,
    audioAccessAdded: 0,
    audioAccessRemoved: 0,
    errors: [],
  };

  const jsonPath = path.join(process.cwd(), 'moc-old-data', 'users_with_courses_full_update_2026-02-26.json');
  console.log(`📁 Reading JSON file (streaming): ${jsonPath}`);

  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON file not found!');
    process.exit(1);
  }

  // Collect users from file
  const phoneToJsonUser = new Map<string, JsonUser>();
  const idToJsonUser = new Map<string, JsonUser>();
  
  console.log('📖 Parsing JSON (streaming mode)...\n');
  
  let count = 0;
  for await (const user of readUsersFromFile(jsonPath)) {
    count++;
    report.totalJsonUsers++;
    
    const normalizedPhone = normalizePhone(user.phone);
    if (normalizedPhone) {
      phoneToJsonUser.set(normalizedPhone, user);
    }
    if (user.id) {
      idToJsonUser.set(user.id, user);
    }
    
    if (count % 1000 === 0) {
      process.stdout.write(`\r   Processed ${count} users...`);
    }
  }
  
  console.log(`\n✅ Loaded ${report.totalJsonUsers} users from JSON`);
  console.log(`${phoneToJsonUser.size} users have phone numbers\n`);

  // 2. Get all users from database
  console.log('🔄 Fetching users from database...');
  const dbUsers = await prisma.user.findMany({
    where: { role: 'USER' },
    include: {
      purchasedCourses: {
        include: {
          course: { select: { title: true } },
        },
      },
      videoAccess: { select: { id: true, videoId: true } },
      audioAccess: { select: { id: true, audioId: true } },
    },
  });
  console.log(`✅ Found ${dbUsers.length} users in database\n`);

  // 3. Find users to delete
  const usersToDelete = dbUsers.filter(dbUser => {
    const normalizedDbPhone = normalizePhone(dbUser.phone);
    return !idToJsonUser.has(dbUser.id) && !phoneToJsonUser.has(normalizedDbPhone || '');
  });

  if (usersToDelete.length > 0) {
    console.log(`Found ${usersToDelete.length} users to DELETE\n`);
  }

  // 4. Process users from JSON
  console.log('⚙️  Processing users...\n');
  
  let processed = 0;
  const total = phoneToJsonUser.size;

  for (const [phone, jsonUser] of Array.from(phoneToJsonUser.entries())) {
    processed++;
    if (processed % 100 === 0) {
      console.log(`   Progress: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
    }

    try {
      let dbUser = dbUsers.find(u => u.id === jsonUser.id);
      if (!dbUser && phone) {
        dbUser = dbUsers.find(u => normalizePhone(u.phone) === phone);
      }

      if (!dbUser) {
        await createNewUser(jsonUser);
        report.created++;
        report.coursesAdded += jsonUser.purchasedCourses?.length || 0;
        report.videoAccessAdded += jsonUser.videoAccessIds?.length || 0;
        report.audioAccessAdded += jsonUser.audioAccessIds?.length || 0;
      } else {
        const syncResult = await syncExistingUser(dbUser, jsonUser);
        report.updated++;
        report.coursesAdded += syncResult.coursesAdded;
        report.coursesRemoved += syncResult.coursesRemoved;
        report.videoAccessAdded += syncResult.videoAccessAdded;
        report.videoAccessRemoved += syncResult.videoAccessRemoved;
        report.audioAccessAdded += syncResult.audioAccessAdded;
        report.audioAccessRemoved += syncResult.audioAccessRemoved;
      }

      report.processed++;
    } catch (error: any) {
      const errorMsg = `Error processing user ${phone}: ${error.message}`;
      console.error(`   ❌ ${errorMsg}`);
      report.errors.push(errorMsg);
    }
  }

  // 5. Delete users not in JSON
  console.log('\n🗑️  Deleting users not in JSON...\n');
  
  for (const user of usersToDelete) {
    try {
      console.log(`   Deleting: ${user.phone} - ${user.firstName} ${user.lastName}`);
      
      await prisma.courseEnrollment.deleteMany({ where: { userId: user.id } });
      await prisma.videoAccess.deleteMany({ where: { userId: user.id } });
      await prisma.audioAccess.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      
      report.deleted++;
    } catch (error: any) {
      const errorMsg = `Error deleting user ${user.phone}: ${error.message}`;
      console.error(`   ❌ ${errorMsg}`);
      report.errors.push(errorMsg);
    }
  }

  // 6. Final report
  console.log('\n' + '='.repeat(70));
  console.log('📊 SYNC COMPLETE - SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total JSON users: ${report.totalJsonUsers}`);
  console.log(`Processed: ${report.processed}`);
  console.log(`Created: ${report.created}`);
  console.log(`Updated: ${report.updated}`);
  console.log(`Deleted: ${report.deleted}`);
  console.log(`Courses added: ${report.coursesAdded}`);
  console.log(`Courses removed: ${report.coursesRemoved}`);
  console.log(`Video access added: ${report.videoAccessAdded}`);
  console.log(`Video access removed: ${report.videoAccessRemoved}`);
  console.log(`Audio access added: ${report.audioAccessAdded}`);
  console.log(`Audio access removed: ${report.audioAccessRemoved}`);
  console.log(`Errors: ${report.errors.length}`);
  console.log('='.repeat(70));

  // Save report
  const reportPath = path.join(process.cwd(), '..', 'moc-old-data', `stream-sync-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

async function createNewUser(jsonUser: any) {
  const username = jsonUser.username || 
    `${jsonUser.firstName || ''} ${jsonUser.lastName || ''}`.trim() || 
    `user-${jsonUser.phone}`;

  const randomPassword = Math.random().toString(36).slice(-8);
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const user = await prisma.user.create({
    data: {
      id: jsonUser.id,
      email: jsonUser.email,
      phone: normalizePhone(jsonUser.phone),
      username: username,
      password: hashedPassword,
      firstName: jsonUser.firstName,
      lastName: jsonUser.lastName,
      role: UserRole.USER,
      isActive: jsonUser.isActive ?? true,
      isOld: jsonUser.isOld ?? true,
      isBlocked: jsonUser.isBlocked ?? false,
      education: jsonUser.education,
      university: jsonUser.university,
      job: jsonUser.job,
      state: jsonUser.state,
      gender: jsonUser.gender,
    },
  });

  // Add courses
  if (jsonUser.purchasedCourses?.length > 0) {
    for (const courseId of jsonUser.purchasedCourses) {
      try {
        await prisma.courseEnrollment.create({
          data: { userId: user.id, courseId: courseId },
        });
      } catch (e) { }
    }
  }

  // Add video access
  if (jsonUser.videoAccessIds?.length > 0) {
    for (const videoId of jsonUser.videoAccessIds) {
      try {
        await prisma.videoAccess.create({
          data: { userId: user.id, videoId: videoId },
        });
      } catch (e) { }
    }
  }

  // Add audio access
  if (jsonUser.audioAccessIds?.length > 0) {
    for (const audioId of jsonUser.audioAccessIds) {
      try {
        await prisma.audioAccess.create({
          data: { userId: user.id, audioId: audioId },
        });
      } catch (e) { }
    }
  }

  return user;
}

async function syncExistingUser(dbUser: any, jsonUser: any) {
  const result = {
    coursesAdded: 0,
    coursesRemoved: 0,
    videoAccessAdded: 0,
    videoAccessRemoved: 0,
    audioAccessAdded: 0,
    audioAccessRemoved: 0,
  };

  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      email: jsonUser.email ?? dbUser.email,
      username: jsonUser.username ?? dbUser.username,
      firstName: jsonUser.firstName ?? dbUser.firstName,
      lastName: jsonUser.lastName ?? dbUser.lastName,
      education: jsonUser.education ?? dbUser.education,
      university: jsonUser.university ?? dbUser.university,
      job: jsonUser.job ?? dbUser.job,
      state: jsonUser.state ?? dbUser.state,
      gender: jsonUser.gender ?? dbUser.gender,
      isActive: jsonUser.isActive ?? dbUser.isActive,
      isOld: jsonUser.isOld ?? dbUser.isOld,
      isBlocked: jsonUser.isBlocked ?? dbUser.isBlocked,
    },
  });

  // Sync courses
  const jsonCourseIds = new Set<string>(jsonUser.purchasedCourses || []);
  const dbCourseIds = new Set<string>(dbUser.purchasedCourses.map((e: any) => e.courseId));

  const toAdd = Array.from(jsonCourseIds).filter(id => !dbCourseIds.has(id));
  const toRemove = Array.from(dbCourseIds).filter(id => !jsonCourseIds.has(id)) as string[];

  if (toRemove.length > 0) {
    for (const courseId of toRemove) {
      const enrollment = dbUser.purchasedCourses.find((e: any) => e.courseId === courseId);
      if (enrollment) {
        await prisma.courseEnrollment.delete({ where: { id: enrollment.id } });
        result.coursesRemoved++;
      }
    }
  }

  if (toAdd.length > 0) {
    for (const courseId of toAdd) {
      try {
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: { id: true },
        });
        if (course) {
          await prisma.courseEnrollment.create({
            data: { userId: dbUser.id, courseId: courseId },
          });
          result.coursesAdded++;
        }
      } catch (e) { }
    }
  }

  // Sync video access
  const jsonVideoIds = new Set<string>(jsonUser.videoAccessIds || []);
  const dbVideoIds = new Set<string>(dbUser.videoAccess.map((v: any) => v.videoId));

  const videosToAdd = Array.from(jsonVideoIds).filter(id => !dbVideoIds.has(id));
  const videosToRemove = Array.from(dbVideoIds).filter(id => !jsonVideoIds.has(id)) as string[];

  if (videosToRemove.length > 0) {
    await prisma.videoAccess.deleteMany({
      where: { userId: dbUser.id, videoId: { in: videosToRemove } },
    });
    result.videoAccessRemoved += videosToRemove.length;
  }

  for (const videoId of videosToAdd) {
    try {
      await prisma.videoAccess.create({
        data: { userId: dbUser.id, videoId: videoId },
      });
      result.videoAccessAdded++;
    } catch (e) { }
  }

  // Sync audio access
  const jsonAudioIds = new Set<string>(jsonUser.audioAccessIds || []);
  const dbAudioIds = new Set<string>(dbUser.audioAccess.map((a: any) => a.audioId));

  const audiosToAdd = Array.from(jsonAudioIds).filter(id => !dbAudioIds.has(id));
  const audiosToRemove = Array.from(dbAudioIds).filter(id => !jsonAudioIds.has(id)) as string[];

  if (audiosToRemove.length > 0) {
    await prisma.audioAccess.deleteMany({
      where: { userId: dbUser.id, audioId: { in: audiosToRemove } },
    });
    result.audioAccessRemoved += audiosToRemove.length;
  }

  for (const audioId of audiosToAdd) {
    try {
      await prisma.audioAccess.create({
        data: { userId: dbUser.id, audioId: audioId },
      });
      result.audioAccessAdded++;
    } catch (e) { }
  }

  return result;
}

fullSync()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
