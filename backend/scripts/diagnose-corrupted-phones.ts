import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CorruptedUser {
  id: string;
  username: string | null;
  phone: string;
  pattern: string;
  extractedPhone: string | null;
  courseCount: number;
  videoAccessCount: number;
  audioAccessCount: number;
}

interface CleanUser {
  id: string;
  username: string | null;
  phone: string;
  courseCount: number;
  videoAccessCount: number;
  audioAccessCount: number;
}

interface AnalysisResult {
  corruptedUser: CorruptedUser;
  cleanUser: CleanUser | null;
  corruptedHasData: boolean;
  cleanHasData: boolean;
  action: 'MERGE_TO_CLEAN' | 'MERGE_TO_CORRUPTED' | 'DELETE_CORRUPTED' | 'MANUAL';
  reason: string;
}

// Extract clean phone from corrupted patterns
function extractPhone(phone: string): string | null {
  // Pattern 1: _xxxxx_2_09123456789 (prefix before phone)
  const prefixMatch = phone.match(/_?[a-zA-Z0-9]+_2_?(\d{11})$/);
  if (prefixMatch) return prefixMatch[1];

  // Pattern 2: 09123456789_xxxxx_2 (suffix after phone)
  const suffixMatch = phone.match(/^(\d{11})_[a-zA-Z0-9]+_2$/);
  if (suffixMatch) return suffixMatch[1];

  // Pattern 3: 09123456789_2 (simple suffix)
  const simpleMatch = phone.match(/^(\d{11})_2$/);
  if (simpleMatch) return simpleMatch[1];

  // Pattern 4: _09123456789 (just underscore prefix)
  const underscoreMatch = phone.match(/^_(\d{11})$/);
  if (underscoreMatch) return underscoreMatch[1];

  return null;
}

// Check if phone looks corrupted (has underscore or non-digit chars)
function isCorrupted(phone: string): boolean {
  // Has underscore or other non-digit characters (except valid 11-digit phones)
  return /[^\d]/.test(phone) || phone.length !== 11;
}

async function diagnoseCorruptedPhones() {
  console.log('🔍 Diagnosing users with corrupted phone numbers...\n');

  // Get all users
  const allUsers = await prisma.user.findMany({
    where: {
      phone: { not: null },
    },
    select: {
      id: true,
      username: true,
      phone: true,
    },
  });

  console.log(`Total users in database: ${allUsers.length}`);

  // Find corrupted users
  const corruptedUsers: CorruptedUser[] = [];

  for (const user of allUsers) {
    if (!user.phone) continue;

    const extracted = extractPhone(user.phone);
    const looksCorrupted = isCorrupted(user.phone);

    // Skip if phone looks clean and is 11 digits
    if (!looksCorrupted && user.phone.length === 11 && /^\d{11}$/.test(user.phone)) {
      continue;
    }

    // Get counts
    const [courseCount, videoAccessCount, audioAccessCount] = await Promise.all([
      prisma.courseEnrollment.count({ where: { userId: user.id } }),
      prisma.videoAccess.count({ where: { userId: user.id } }),
      prisma.audioAccess.count({ where: { userId: user.id } }),
    ]);

    corruptedUsers.push({
      id: user.id,
      username: user.username,
      phone: user.phone,
      pattern: extracted ? 'extractable' : 'unknown',
      extractedPhone: extracted,
      courseCount,
      videoAccessCount,
      audioAccessCount,
    });
  }

  console.log(`Found ${corruptedUsers.length} users with corrupted phone numbers\n`);

  if (corruptedUsers.length === 0) {
    console.log('✅ No corrupted phone numbers found!');
    await prisma.$disconnect();
    return;
  }

  // Analyze each corrupted user
  const results: AnalysisResult[] = [];

  for (const corrupted of corruptedUsers) {
    let cleanUser: CleanUser | null = null;
    let action: AnalysisResult['action'] = 'MANUAL';
    let reason = '';

    if (corrupted.extractedPhone) {
      // Find clean user with extracted phone
      const clean = await prisma.user.findFirst({
        where: {
          phone: corrupted.extractedPhone,
        },
        select: {
          id: true,
          username: true,
          phone: true,
        },
      });

      if (clean) {
        const [courseCount, videoAccessCount, audioAccessCount] = await Promise.all([
          prisma.courseEnrollment.count({ where: { userId: clean.id } }),
          prisma.videoAccess.count({ where: { userId: clean.id } }),
          prisma.audioAccess.count({ where: { userId: clean.id } }),
        ]);

        cleanUser = {
          id: clean.id,
          username: clean.username,
          phone: clean.phone,
          courseCount,
          videoAccessCount,
          audioAccessCount,
        };

        const corruptedHasData = corrupted.courseCount > 0 || corrupted.videoAccessCount > 0 || corrupted.audioAccessCount > 0;
        const cleanHasData = cleanUser.courseCount > 0 || cleanUser.videoAccessCount > 0 || cleanUser.audioAccessCount > 0;

        if (corruptedHasData && !cleanHasData) {
          // Corrupted has data, clean is empty -> fix corrupted phone, delete clean
          action = 'MERGE_TO_CORRUPTED';
          reason = `Corrupted user has data (${corrupted.courseCount} courses), clean user is empty -> Keep corrupted, fix phone, delete clean`;
        } else if (!corruptedHasData && cleanHasData) {
          // Corrupted is empty, clean has data -> delete corrupted
          action = 'DELETE_CORRUPTED';
          reason = `Corrupted user is empty, clean user has data (${cleanUser.courseCount} courses) -> Delete corrupted`;
        } else if (corruptedHasData && cleanHasData) {
          // Both have data -> merge corrupted into clean
          action = 'MERGE_TO_CLEAN';
          reason = `Both have data -> Merge corrupted (${corrupted.courseCount} courses) into clean (${cleanUser.courseCount} courses)`;
        } else {
          // Both empty -> delete corrupted
          action = 'DELETE_CORRUPTED';
          reason = 'Both users are empty -> Delete corrupted';
        }
      } else {
        // No clean user found - just fix the phone
        action = 'MERGE_TO_CORRUPTED';
        reason = 'No clean user found -> Just fix the phone number';
      }
    } else {
      action = 'MANUAL';
      reason = 'Cannot extract clean phone number from this pattern';
    }

    results.push({
      corruptedUser: corrupted,
      cleanUser,
      corruptedHasData: corrupted.courseCount > 0 || corrupted.videoAccessCount > 0 || corrupted.audioAccessCount > 0,
      cleanHasData: cleanUser ? cleanUser.courseCount > 0 || cleanUser.videoAccessCount > 0 || cleanUser.audioAccessCount > 0 : false,
      action,
      reason,
    });
  }

  // Display results
  console.log('═'.repeat(90));
  console.log('📊 ANALYSIS RESULTS');
  console.log('═'.repeat(90));

  const mergeToCorrupted = results.filter(r => r.action === 'MERGE_TO_CORRUPTED');
  const mergeToClean = results.filter(r => r.action === 'MERGE_TO_CLEAN');
  const deleteCorrupted = results.filter(r => r.action === 'DELETE_CORRUPTED');
  const manual = results.filter(r => r.action === 'MANUAL');

  console.log(`\nTotal corrupted users: ${results.length}`);
  console.log(`  - Fix corrupted phone + delete clean: ${mergeToCorrupted.length}`);
  console.log(`  - Merge corrupted into clean: ${mergeToClean.length}`);
  console.log(`  - Delete corrupted (clean exists): ${deleteCorrupted.length}`);
  console.log(`  - Manual check needed: ${manual.length}`);

  if (mergeToCorrupted.length > 0) {
    console.log('\n' + '─'.repeat(90));
    console.log('🔀 FIX CORRUPTED PHONE + DELETE CLEAN USER (corrupted has data, clean is empty)');
    console.log('─'.repeat(90));

    for (const result of mergeToCorrupted) {
      const c = result.corruptedUser;
      const cl = result.cleanUser;

      console.log(`\n👤 ${c.username || 'Unknown'}`);
      console.log(`   Corrupted: "${c.phone}" (ID: ${c.id})`);
      console.log(`   Extracted: "${c.extractedPhone}"`);
      console.log(`   Has: ${c.courseCount} courses, ${c.videoAccessCount} videos, ${c.audioAccessCount} audios`);

      if (cl) {
        console.log(`   Clean: "${cl.phone}" (ID: ${cl.id}) - WILL BE DELETED`);
        console.log(`   Clean has: ${cl.courseCount} courses, ${cl.videoAccessCount} videos, ${cl.audioAccessCount} audios`);
      } else {
        console.log(`   No clean user found - just fixing phone to "${c.extractedPhone}"`);
      }
    }
  }

  if (mergeToClean.length > 0) {
    console.log('\n' + '─'.repeat(90));
    console.log('🔀 MERGE CORRUPTED INTO CLEAN (both have data)');
    console.log('─'.repeat(90));

    for (const result of mergeToClean) {
      const c = result.corruptedUser;
      const cl = result.cleanUser!;

      console.log(`\n👤 ${c.username || 'Unknown'}`);
      console.log(`   Corrupted: "${c.phone}" (ID: ${c.id}) - WILL BE DELETED`);
      console.log(`   Has: ${c.courseCount} courses -> merging to clean user`);
      console.log(`   Clean: "${cl.phone}" (ID: ${cl.id}) - WILL KEEP`);
      console.log(`   Clean has: ${cl.courseCount} courses`);
    }
  }

  if (deleteCorrupted.length > 0) {
    console.log('\n' + '─'.repeat(90));
    console.log('🗑️  DELETE CORRUPTED (clean user has data)');
    console.log('─'.repeat(90));

    for (const result of deleteCorrupted) {
      const c = result.corruptedUser;
      const cl = result.cleanUser;

      console.log(`\n👤 ${c.username || 'Unknown'}`);
      console.log(`   Corrupted: "${c.phone}" (ID: ${c.id}) - WILL BE DELETED`);
      console.log(`   Has: ${c.courseCount} courses, ${c.videoAccessCount} videos, ${c.audioAccessCount} audios`);
      if (cl) {
        console.log(`   Clean: "${cl.phone}" (ID: ${cl.id}) - HAS DATA - WILL KEEP`);
      }
    }
  }

  if (manual.length > 0) {
    console.log('\n' + '─'.repeat(90));
    console.log('⚠️  MANUAL CHECK NEEDED (unknown pattern)');
    console.log('─'.repeat(90));

    for (const result of manual) {
      const c = result.corruptedUser;
      console.log(`\n👤 ${c.username || 'Unknown'}`);
      console.log(`   Phone: "${c.phone}" (ID: ${c.id})`);
      console.log(`   Cannot extract clean phone number`);
      console.log(`   Has: ${c.courseCount} courses, ${c.videoAccessCount} videos, ${c.audioAccessCount} audios`);
    }
  }

  // Save report
  const fs = require('fs');
  const path = require('path');

  const outputDir = '/app/scripts-output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportPath = path.join(outputDir, `diagnose-corrupted-phones-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalCorrupted: results.length,
      fixCorrupted: mergeToCorrupted.length,
      mergeToClean: mergeToClean.length,
      deleteCorrupted: deleteCorrupted.length,
      manual: manual.length,
      generatedAt: new Date().toISOString(),
    },
    results,
  }, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);

  const fixable = mergeToCorrupted.length + mergeToClean.length + deleteCorrupted.length;
  if (fixable > 0) {
    console.log('\n💡 To fix these issues, run:');
    console.log('   npx ts-node scripts/fix-corrupted-phones.ts --confirm');
  }

  await prisma.$disconnect();
}

diagnoseCorruptedPhones()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
