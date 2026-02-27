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

interface ImportReport {
  timestamp: string;
  totalUsers: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  coursesAdded: number;
  videoAccessAdded: number;
  audioAccessAdded: number;
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

async function importFromBackup() {
  console.log('🚀 Starting import from backup file...\n');

  const report: ImportReport = {
    timestamp: new Date().toISOString(),
    totalUsers: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    coursesAdded: 0,
    videoAccessAdded: 0,
    audioAccessAdded: 0,
  };

  const jsonPath = path.join(process.cwd(), 'moc-old-data', 'users_update_phone_username_fix_2026-02-26.json');
  console.log('📁 Reading: ' + jsonPath);

  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON file not found!');
    process.exit(1);
  }

  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const jsonUsers: JsonUser[] = JSON.parse(jsonContent);
  report.totalUsers = jsonUsers.length;
  console.log(`📊 Found ${jsonUsers.length} users in backup\n`);

  let processed = 0;
  const total = jsonUsers.length;

  for (const jsonUser of jsonUsers) {
    processed++;
    if (processed % 100 === 0 || processed === total) {
      console.log(`   Progress: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
    }

    try {
      const normalizedPhone = normalizePhone(jsonUser.phone);

      // Check if user exists by ID or phone
      let existingUser = await prisma.user.findUnique({
        where: { id: jsonUser.id },
        include: {
          purchasedCourses: { select: { courseId: true } },
          videoAccess: { select: { videoId: true } },
          audioAccess: { select: { audioId: true } },
        },
      });

      if (!existingUser && normalizedPhone) {
        existingUser = await prisma.user.findFirst({
          where: { phone: normalizedPhone },
          include: {
            purchasedCourses: { select: { courseId: true } },
            videoAccess: { select: { videoId: true } },
            audioAccess: { select: { audioId: true } },
          },
        });
      }

      if (existingUser) {
        // UPDATE existing user
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email: jsonUser.email ?? existingUser.email,
            username: jsonUser.username ?? existingUser.username,
            firstName: jsonUser.firstName ?? existingUser.firstName,
            lastName: jsonUser.lastName ?? existingUser.lastName,
            isActive: jsonUser.isActive ?? existingUser.isActive,
            isOld: jsonUser.isOld ?? existingUser.isOld,
            isBlocked: jsonUser.isBlocked ?? existingUser.isBlocked,
            education: jsonUser.education ?? existingUser.education,
            university: jsonUser.university ?? existingUser.university,
            job: jsonUser.job ?? existingUser.job,
            state: jsonUser.state ?? existingUser.state,
            gender: jsonUser.gender ?? existingUser.gender,
          },
        });

        // Add missing courses
        const existingCourseIds = new Set(existingUser.purchasedCourses.map(c => c.courseId));
        const coursesToAdd = (jsonUser.purchasedCourses || []).filter(id => !existingCourseIds.has(id));

        for (const courseId of coursesToAdd) {
          try {
            await prisma.courseEnrollment.create({
              data: { userId: existingUser.id, courseId },
            });
            report.coursesAdded++;
          } catch (e) { /* Skip duplicates */ }
        }

        // Add missing video access
        const existingVideoIds = new Set(existingUser.videoAccess.map(v => v.videoId));
        const videosToAdd = (jsonUser.videoAccessIds || []).filter(id => !existingVideoIds.has(id));

        for (const videoId of videosToAdd) {
          try {
            await prisma.videoAccess.create({
              data: { userId: existingUser.id, videoId },
            });
            report.videoAccessAdded++;
          } catch (e) { /* Skip duplicates */ }
        }

        // Add missing audio access
        const existingAudioIds = new Set(existingUser.audioAccess.map(a => a.audioId));
        const audiosToAdd = (jsonUser.audioAccessIds || []).filter(id => !existingAudioIds.has(id));

        for (const audioId of audiosToAdd) {
          try {
            await prisma.audioAccess.create({
              data: { userId: existingUser.id, audioId },
            });
            report.audioAccessAdded++;
          } catch (e) { /* Skip duplicates */ }
        }

        report.updated++;
      } else {
        // CREATE new user
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const newUser = await prisma.user.create({
          data: {
            id: jsonUser.id,
            email: jsonUser.email,
            phone: normalizedPhone,
            username: jsonUser.username || `${jsonUser.firstName || ''} ${jsonUser.lastName || ''}`.trim() || `user-${normalizedPhone}`,
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
                data: { userId: newUser.id, courseId },
              });
              report.coursesAdded++;
            } catch (e) { /* Skip duplicates */ }
          }
        }

        // Add video access
        if (jsonUser.videoAccessIds?.length > 0) {
          for (const videoId of jsonUser.videoAccessIds) {
            try {
              await prisma.videoAccess.create({
                data: { userId: newUser.id, videoId },
              });
              report.videoAccessAdded++;
            } catch (e) { /* Skip duplicates */ }
          }
        }

        // Add audio access
        if (jsonUser.audioAccessIds?.length > 0) {
          for (const audioId of jsonUser.audioAccessIds) {
            try {
              await prisma.audioAccess.create({
                data: { userId: newUser.id, audioId },
              });
              report.audioAccessAdded++;
            } catch (e) { /* Skip duplicates */ }
          }
        }

        report.created++;
      }
    } catch (error: any) {
      const errorMsg = `Error processing ${jsonUser.phone}: ${error.message}`;
      console.error(`   ❌ ${errorMsg}`);
      report.errors.push(errorMsg);
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 IMPORT COMPLETE - SUMMARY');
  console.log('═'.repeat(70));
  console.log(`Total users in backup: ${report.totalUsers}`);
  console.log(`Created: ${report.created}`);
  console.log(`Updated: ${report.updated}`);
  console.log(`Errors: ${report.errors.length}`);
  console.log('-'.repeat(70));
  console.log(`Courses added: ${report.coursesAdded}`);
  console.log(`Video access added: ${report.videoAccessAdded}`);
  console.log(`Audio access added: ${report.audioAccessAdded}`);
  console.log('═'.repeat(70));

  // Save report
  const fs = require('fs');
  const path = require('path');

  const outputDir = '/app/scripts-output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportPath = path.join(outputDir, `import-backup-report-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

importFromBackup()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
