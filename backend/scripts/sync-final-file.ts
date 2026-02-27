import { PrismaClient, UserRole } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
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
  details: Array<{
    phone: string;
    name: string;
    action: 'created' | 'updated' | 'deleted';
    previousCourseCount: number;
    newCourseCount: number;
  }>;
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

async function fullSync() {
  console.log('Starting FINAL SYNC with users_with_courses_full_update_2026-02-26.json...\n');

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
    details: [],
  };

  const jsonPath = path.join(process.cwd(), 'moc-old-data', 'users_with_courses_full_update_2026-02-26.json');
  console.log('Reading JSON file: ' + jsonPath);

  if (!fs.existsSync(jsonPath)) {
    console.error('JSON file not found!');
    process.exit(1);
  }

  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const jsonUsers: JsonUser[] = JSON.parse(jsonContent);
  report.totalJsonUsers = jsonUsers.length;
  console.log('Loaded ' + jsonUsers.length + ' users from JSON\n');

  const phoneToJsonUser = new Map<string, JsonUser>();
  const idToJsonUser = new Map<string, JsonUser>();
  
  for (const user of jsonUsers) {
    const normalizedPhone = normalizePhone(user.phone);
    if (normalizedPhone) {
      phoneToJsonUser.set(normalizedPhone, user);
    }
    if (user.id) {
      idToJsonUser.set(user.id, user);
    }
  }
  console.log(phoneToJsonUser.size + ' users have phone numbers\n');

  console.log('Fetching users from database...');
  const dbUsers = await prisma.user.findMany({
    where: { role: 'USER' },
    include: {
      purchasedCourses: { include: { course: { select: { title: true } } } },
      videoAccess: true,
      audioAccess: true,
    },
  });
  console.log('Found ' + dbUsers.length + ' users in database\n');

  const usersToDelete = dbUsers.filter(dbUser => {
    const normalizedDbPhone = normalizePhone(dbUser.phone);
    return !idToJsonUser.has(dbUser.id) && !phoneToJsonUser.has(normalizedDbPhone);
  });

  if (usersToDelete.length > 0) {
    console.log('Found ' + usersToDelete.length + ' users to DELETE (in DB but not in JSON):');
    for (const user of usersToDelete.slice(0, 10)) {
      console.log('   - ' + user.phone + ': ' + user.firstName + ' ' + user.lastName);
    }
    if (usersToDelete.length > 10) {
      console.log('   ... and ' + (usersToDelete.length - 10) + ' more');
    }
    console.log('');
  }

  console.log('Processing users from JSON...\n');

  let processed = 0;
  const total = jsonUsers.length;

  for (const jsonUser of jsonUsers) {
    processed++;
    if (processed % 100 === 0 || processed === total) {
      console.log('   Progress: ' + processed + '/' + total + ' (' + Math.round(processed/total*100) + '%)');
    }

    try {
      const normalizedPhone = normalizePhone(jsonUser.phone);
      
      let dbUser = dbUsers.find(u => u.id === jsonUser.id);
      if (!dbUser && normalizedPhone) {
        dbUser = dbUsers.find(u => normalizePhone(u.phone) === normalizedPhone);
      }

      const detail = {
        phone: jsonUser.phone || 'N/A',
        name: jsonUser.username || (jsonUser.firstName + ' ' + jsonUser.lastName).trim() || 'Unknown',
        action: dbUser ? 'updated' : 'created' as any,
        previousCourseCount: dbUser?.purchasedCourses?.length || 0,
        newCourseCount: jsonUser.purchasedCourses?.length || 0,
      };

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

      report.details.push(detail);
      report.processed++;

    } catch (error: any) {
      const errorMsg = 'Error processing user ' + jsonUser.phone + ': ' + error.message;
      console.error('   X ' + errorMsg);
      report.errors.push(errorMsg);
    }
  }

  console.log('\nDeleting users not in JSON...\n');
  
  for (const user of usersToDelete) {
    try {
      console.log('   Deleting: ' + user.phone + ' - ' + user.firstName + ' ' + user.lastName);
      
      await prisma.courseEnrollment.deleteMany({ where: { userId: user.id } });
      await prisma.videoAccess.deleteMany({ where: { userId: user.id } });
      await prisma.audioAccess.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      
      report.deleted++;
      
      report.details.push({
        phone: user.phone || 'N/A',
        name: (user.firstName + ' ' + user.lastName).trim() || 'Unknown',
        action: 'deleted',
        previousCourseCount: user.purchasedCourses?.length || 0,
        newCourseCount: 0,
      });
      
    } catch (error: any) {
      const errorMsg = 'Error deleting user ' + user.phone + ': ' + error.message;
      console.error('   X ' + errorMsg);
      report.errors.push(errorMsg);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('FINAL SYNC COMPLETE - SUMMARY');
  console.log('='.repeat(70));
  console.log('Total JSON users: ' + report.totalJsonUsers);
  console.log('Processed: ' + report.processed);
  console.log('Created: ' + report.created);
  console.log('Updated: ' + report.updated);
  console.log('Deleted: ' + report.deleted + ' WARNING');
  console.log('-'.repeat(70));
  console.log('Courses added: ' + report.coursesAdded);
  console.log('Courses removed: ' + report.coursesRemoved);
  console.log('Video access added: ' + report.videoAccessAdded);
  console.log('Video access removed: ' + report.videoAccessRemoved);
  console.log('Audio access added: ' + report.audioAccessAdded);
  console.log('Audio access removed: ' + report.audioAccessRemoved);
  console.log('-'.repeat(70));
  console.log('Errors: ' + report.errors.length);
  if (report.errors.length > 0) {
    console.log('\nErrors:');
    report.errors.slice(0, 5).forEach(e => console.log('   - ' + e));
    if (report.errors.length > 5) {
      console.log('   ... and ' + (report.errors.length - 5) + ' more');
    }
  }
  console.log('='.repeat(70));

  const reportPath = path.join(
    process.cwd(), 
    '..', 
    'moc-old-data', 
    'final-sync-report-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('\nReport saved to: ' + reportPath);

  console.log('\nFinal sync complete!');
  await prisma.$disconnect();
}

async function createNewUser(jsonUser: JsonUser) {
  const username = jsonUser.username || 
    (jsonUser.firstName + ' ' + jsonUser.lastName).trim() || 
    'user-' + (jsonUser.phone || Date.now());

  const normalizedPhone = normalizePhone(jsonUser.phone);

  // Check if phone already exists (any role)
  if (normalizedPhone) {
    const existingUser = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
      select: { id: true, phone: true, role: true },
    });

    if (existingUser) {
      throw new Error(`Phone ${normalizedPhone} already exists (user ID: ${existingUser.id}, role: ${existingUser.role})`);
    }
  }

  const randomPassword = Math.random().toString(36).slice(-8);
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const user = await prisma.user.create({
    data: {
      id: jsonUser.id,
      email: jsonUser.email,
      phone: normalizedPhone,
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

  if (jsonUser.purchasedCourses && jsonUser.purchasedCourses.length > 0) {
    for (const courseId of jsonUser.purchasedCourses) {
      try {
        await prisma.courseEnrollment.create({
          data: { userId: user.id, courseId: courseId },
        });
      } catch (e) { }
    }
  }

  if (jsonUser.videoAccessIds && jsonUser.videoAccessIds.length > 0) {
    for (const videoId of jsonUser.videoAccessIds) {
      try {
        await prisma.videoAccess.create({
          data: { userId: user.id, videoId: videoId },
        });
      } catch (e) { }
    }
  }

  if (jsonUser.audioAccessIds && jsonUser.audioAccessIds.length > 0) {
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

async function syncExistingUser(dbUser: any, jsonUser: JsonUser) {
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

  const jsonCourseIds = new Set<string>(jsonUser.purchasedCourses || []);
  const dbCourseIds = new Set<string>(dbUser.purchasedCourses.map((e: any) => e.courseId));

  const toAdd = Array.from(jsonCourseIds).filter(id => !dbCourseIds.has(id));
  const toRemove = Array.from(dbCourseIds).filter(id => !jsonCourseIds.has(id)) as string[];

  if (toRemove.length > 0) {
    await prisma.courseEnrollment.deleteMany({
      where: { userId: dbUser.id, courseId: { in: toRemove } },
    });
    result.coursesRemoved += toRemove.length;
  }

  if (toAdd.length > 0) {
    for (const courseId of toAdd) {
      try {
        await prisma.courseEnrollment.create({
          data: { userId: dbUser.id, courseId: courseId },
        });
        result.coursesAdded++;
      } catch (e) { }
    }
  }

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

  if (videosToAdd.length > 0) {
    for (const videoId of videosToAdd) {
      try {
        await prisma.videoAccess.create({
          data: { userId: dbUser.id, videoId: videoId },
        });
        result.videoAccessAdded++;
      } catch (e) { }
    }
  }

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

  if (audiosToAdd.length > 0) {
    for (const audioId of audiosToAdd) {
      try {
        await prisma.audioAccess.create({
          data: { userId: dbUser.id, audioId: audioId },
        });
        result.audioAccessAdded++;
      } catch (e) { }
    }
  }

  return result;
}

fullSync().catch((error: any) => {
  console.error('Script failed:', error);
  process.exit(1);
});
