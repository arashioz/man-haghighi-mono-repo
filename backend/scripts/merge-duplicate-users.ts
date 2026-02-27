import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MergeReport {
  timestamp: string;
  duplicateGroupsFound: number;
  totalDuplicates: number;
  merged: number;
  deleted: number;
  errors: string[];
  details: Array<{
    keptUserId: string;
    keptUsername: string;
    keptPhone: string | null;
    deletedUserId: string;
    deletedUsername: string;
    deletedPhone: string | null;
    reason: string;
    coursesTransferred: number;
  }>;
}

// Normalize phone: check if valid and starts with 0
function normalizePhone(phone: string | null): { isValid: boolean; normalized: string | null } {
  if (!phone) return { isValid: false, normalized: null };
  
  let normalized = phone.trim();
  
  // Remove spaces and dashes
  normalized = normalized.replace(/[\s-]/g, '');
  
  // Check if starts with 0
  const hasZeroPrefix = normalized.startsWith('0');
  
  // Valid Iranian mobile: starts with 09 and has 11 digits
  const isValid = /^09\d{9}$/.test(normalized);
  
  return { isValid, normalized: isValid ? normalized : null };
}

// Score a user - higher score = better candidate to keep
function scoreUser(user: any): number {
  let score = 0;
  
  const phoneCheck = normalizePhone(user.phone);
  
  // Has valid phone with 0 prefix: +10 points
  if (phoneCheck.isValid && phoneCheck.normalized?.startsWith('0')) {
    score += 10;
  }
  // Has phone but not valid format: +3 points
  else if (user.phone) {
    score += 3;
  }
  
  // Has courses: +5 points
  if (user.purchasedCourses && user.purchasedCourses.length > 0) {
    score += 5;
  }
  
  // Has video access: +3 points
  if (user.videoAccess && user.videoAccess.length > 0) {
    score += 3;
  }
  
  // Has audio access: +3 points
  if (user.audioAccess && user.audioAccess.length > 0) {
    score += 3;
  }
  
  // Has old products: +2 points
  if (user.oldProducts && user.oldProducts.length > 0) {
    score += 2;
  }
  
  // Is active: +1 point
  if (user.isActive) {
    score += 1;
  }
  
  return score;
}

async function mergeDuplicateUsers() {
  console.log('🔍 Finding duplicate users by username...\n');

  const report: MergeReport = {
    timestamp: new Date().toISOString(),
    duplicateGroupsFound: 0,
    totalDuplicates: 0,
    merged: 0,
    deleted: 0,
    errors: [],
    details: [],
  };

  // 1. Find all users with their relations
  const allUsers = await prisma.user.findMany({
    where: {
      role: 'USER', // Only regular users
    },
    select: {
      id: true,
      username: true,
      phone: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      purchasedCourses: {
        select: {
          id: true,
          courseId: true,
        },
      },
      videoAccess: {
        select: {
          id: true,
          videoId: true,
        },
      },
      audioAccess: {
        select: {
          id: true,
          audioId: true,
        },
      },
      oldProducts: {
        select: {
          id: true,
        },
      },
      transactions: {
        select: {
          id: true,
        },
      },
      invoices: {
        select: {
          id: true,
        },
      },
      createdAt: true,
    },
  });

  console.log(`📊 Total users checked: ${allUsers.length}\n`);

  // 2. Group by username
  const usersByUsername = new Map<string, typeof allUsers>();
  
  for (const user of allUsers) {
    const username = user.username.toLowerCase().trim();
    if (!usersByUsername.has(username)) {
      usersByUsername.set(username, []);
    }
    usersByUsername.get(username)!.push(user);
  }

  // 3. Find duplicates (groups with more than 1 user)
  const duplicateGroups: typeof allUsers[] = [];
  for (const [username, users] of usersByUsername) {
    if (users.length > 1) {
      duplicateGroups.push(users);
    }
  }

  report.duplicateGroupsFound = duplicateGroups.length;
  report.totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.length, 0) - duplicateGroups.length;

  console.log(`🎯 Found ${duplicateGroups.length} duplicate groups`);
  console.log(`📈 Total duplicate accounts: ${report.totalDuplicates}\n`);

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicates found!');
    await prisma.$disconnect();
    return;
  }

  // 4. Show duplicates
  for (let i = 0; i < duplicateGroups.length; i++) {
    const group = duplicateGroups[i];
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`Group ${i + 1}: "${group[0].username}" (${group.length} accounts)`);
    console.log(`${'═'.repeat(70)}`);
    
    for (const user of group) {
      const phoneCheck = normalizePhone(user.phone);
      const score = scoreUser(user);
      console.log(`  ID: ${user.id}`);
      console.log(`  Phone: ${user.phone || 'N/A'} ${phoneCheck.isValid ? '✓' : phoneCheck.normalized ? '⚠️' : '✗'}`);
      console.log(`  Courses: ${user.purchasedCourses.length} | Videos: ${user.videoAccess.length} | Audios: ${user.audioAccess.length}`);
      console.log(`  Score: ${score} points`);
      console.log(`  ${'─'.repeat(60)}`);
    }
  }

  // Confirm
  console.log(`\n⚠️  Will merge ${report.totalDuplicates} duplicate accounts`);
  console.log('Set DRY_RUN=false to actually merge\n');

  const dryRun = process.env.DRY_RUN !== 'false';

  if (dryRun) {
    console.log('🏃 DRY RUN MODE - No changes will be made');
    console.log('Run with DRY_RUN=false to merge duplicates');
    await prisma.$disconnect();
    return;
  }

  // 5. Merge duplicates
  console.log('\n🔄 Starting merge process...\n');

  for (const group of duplicateGroups) {
    // Sort by score (highest first)
    const sortedUsers = group.sort((a, b) => scoreUser(b) - scoreUser(a));
    
    // Keep the first one (highest score), delete others
    const userToKeep = sortedUsers[0];
    const usersToDelete = sortedUsers.slice(1);
    
    const keptPhoneCheck = normalizePhone(userToKeep.phone);
    
    for (const userToDelete of usersToDelete) {
      try {
        const deletedPhoneCheck = normalizePhone(userToDelete.phone);
        
        // Merge courses
        let coursesTransferred = 0;
        for (const enrollment of userToDelete.purchasedCourses) {
          try {
            await prisma.courseEnrollment.upsert({
              where: {
                userId_courseId: {
                  userId: userToKeep.id,
                  courseId: enrollment.courseId,
                },
              },
              update: {},
              create: {
                userId: userToKeep.id,
                courseId: enrollment.courseId,
              },
            });
            coursesTransferred++;
          } catch (e) {
            // Course already exists
          }
        }
        
        // Merge video access
        for (const access of userToDelete.videoAccess) {
          try {
            await prisma.videoAccess.upsert({
              where: {
                userId_videoId: {
                  userId: userToKeep.id,
                  videoId: access.videoId,
                },
              },
              update: {},
              create: {
                userId: userToKeep.id,
                videoId: access.videoId,
              },
            });
          } catch (e) {
            // Access already exists
          }
        }
        
        // Merge audio access
        for (const access of userToDelete.audioAccess) {
          try {
            await prisma.audioAccess.upsert({
              where: {
                userId_audioId: {
                  userId: userToKeep.id,
                  audioId: access.audioId,
                },
              },
              update: {},
              create: {
                userId: userToKeep.id,
                audioId: access.audioId,
              },
            });
          } catch (e) {
            // Access already exists
          }
        }
        
        // Update userToKeep with better phone if needed
        if (!keptPhoneCheck.isValid && deletedPhoneCheck.isValid) {
          await prisma.user.update({
            where: { id: userToKeep.id },
            data: { phone: deletedPhoneCheck.normalized },
          });
        }
        
        // Transfer transactions
        await prisma.transaction.updateMany({
          where: { userId: userToDelete.id },
          data: { userId: userToKeep.id },
        });
        
        // Transfer invoices
        await prisma.invoice.updateMany({
          where: { userId: userToDelete.id },
          data: { userId: userToKeep.id },
        });
        
        // Transfer old products
        await prisma.oldProduct.updateMany({
          where: { userId: userToDelete.id },
          data: { userId: userToKeep.id },
        });
        
        // Delete the duplicate user
        await prisma.user.delete({
          where: { id: userToDelete.id },
        });
        
        report.merged++;
        report.deleted++;
        
        const reason = `Kept: ${keptPhoneCheck.isValid ? 'valid phone' : 'more data'} (${scoreUser(userToKeep)} pts) vs (${scoreUser(userToDelete)} pts)`;
        
        report.details.push({
          keptUserId: userToKeep.id,
          keptUsername: userToKeep.username,
          keptPhone: userToKeep.phone,
          deletedUserId: userToDelete.id,
          deletedUsername: userToDelete.username,
          deletedPhone: userToDelete.phone,
          reason,
          coursesTransferred,
        });
        
        console.log(`✅ Merged: ${userToDelete.username} (${userToDelete.id}) → ${userToKeep.username} (${userToKeep.id})`);
        
      } catch (error: any) {
        const errorMsg = `Error merging user ${userToDelete.id}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        report.errors.push(errorMsg);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL REPORT');
  console.log('='.repeat(70));
  console.log(`Duplicate groups found: ${report.duplicateGroupsFound}`);
  console.log(`Total duplicate accounts: ${report.totalDuplicates}`);
  console.log(`Successfully merged: ${report.merged}`);
  console.log(`Accounts deleted: ${report.deleted}`);
  console.log(`Errors: ${report.errors.length}`);
  console.log('='.repeat(70));

  if (report.errors.length > 0) {
    console.log('\n❌ Errors:');
    report.errors.forEach(e => console.log(`   - ${e}`));
  }

  // Save report
  const fs = await import('fs');
  const path = await import('path');
  const reportPath = path.join(
    process.cwd(),
    '..',
    'moc-old-data',
    `merge-duplicates-report-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

mergeDuplicateUsers()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
