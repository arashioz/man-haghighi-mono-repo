import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeAllSalesTeams() {
  console.log('🔄 Starting to remove all sales team memberships...');

  try {
    // Get count before update
    const countBefore = await prisma.salesTeamMember.count({
      where: { isActive: true }
    });

    console.log(`📊 Found ${countBefore} active sales team memberships`);

    if (countBefore === 0) {
      console.log('✅ No active sales team memberships found. Nothing to remove.');
      return;
    }

    // Update all active memberships to inactive
    const result = await prisma.salesTeamMember.updateMany({
      where: {
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    // Get count after update to verify
    const countAfter = await prisma.salesTeamMember.count({
      where: { isActive: true }
    });

    console.log(`✅ Successfully deactivated ${result.count} sales team memberships`);
    console.log(`📊 Active memberships remaining: ${countAfter}`);

    if (countAfter === 0) {
      console.log('🎉 All sales team memberships have been removed from all users!');
    } else {
      console.log('⚠️  Warning: Some memberships may still be active');
    }

  } catch (error) {
    console.error('❌ Failed to remove sales team memberships:', error);
    process.exit(1);
  }
}

removeAllSalesTeams()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
