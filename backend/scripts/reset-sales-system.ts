import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetSalesSystem() {
  console.log('🔄 شروع بازنشانی سیستم فروش...');

  try {
    // آمار قبل از پاک کردن
    const [paymentLinksCount, salesTeamMembersCount, salesTeamsCount] = await Promise.all([
      prisma.paymentLink.count(),
      prisma.salesTeamMember.count({ where: { isActive: true } }),
      prisma.salesTeam.count()
    ]);

    console.log(`📊 آمار فعلی:`);
    console.log(`   - لینک‌های پرداخت: ${paymentLinksCount}`);
    console.log(`   - اعضای تیم فروش فعال: ${salesTeamMembersCount}`);
    console.log(`   - تیم‌های فروش: ${salesTeamsCount}`);

    // پاک کردن تمام لینک‌های پرداخت
    console.log('\n🗑️  پاک کردن تمام لینک‌های پرداخت...');
    const deletedPaymentLinks = await prisma.paymentLink.deleteMany({});
    console.log(`✅ ${deletedPaymentLinks.count} لینک پرداخت پاک شد`);

    // پاک کردن تمام اعضای تیم فروش (غیرفعال کردن)
    console.log('\n👥 غیرفعال کردن تمام اعضای تیم فروش...');
    const deactivatedMembers = await prisma.salesTeamMember.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });
    console.log(`✅ ${deactivatedMembers.count} عضو تیم فروش غیرفعال شد`);

    // پاک کردن تمام تیم‌های فروش
    console.log('\n🏢 پاک کردن تمام تیم‌های فروش...');
    const deletedTeams = await prisma.salesTeam.deleteMany({});
    console.log(`✅ ${deletedTeams.count} تیم فروش پاک شد`);

    // پاک کردن تمام فاکتورها (اختیاری - اگر لینک‌ها پاک شوند، فاکتورها هم باید پاک شوند)
    console.log('\n📄 پاک کردن تمام فاکتورها...');
    const deletedInvoices = await prisma.invoice.deleteMany({});
    console.log(`✅ ${deletedInvoices.count} فاکتور پاک شد`);

    // پاک کردن تمام تراکنش‌ها
    console.log('\n💳 پاک کردن تمام تراکنش‌ها...');
    const deletedTransactions = await prisma.transaction.deleteMany({});
    console.log(`✅ ${deletedTransactions.count} تراکنش پاک شد`);

    // آمار نهایی
    const [finalPaymentLinksCount, finalSalesTeamMembersCount, finalSalesTeamsCount] = await Promise.all([
      prisma.paymentLink.count(),
      prisma.salesTeamMember.count({ where: { isActive: true } }),
      prisma.salesTeam.count()
    ]);

    console.log('\n📊 آمار نهایی:');
    console.log(`   - لینک‌های پرداخت: ${finalPaymentLinksCount}`);
    console.log(`   - اعضای تیم فروش فعال: ${finalSalesTeamMembersCount}`);
    console.log(`   - تیم‌های فروش: ${finalSalesTeamsCount}`);

    console.log('\n🎉 سیستم فروش با موفقیت بازنشانی شد!');
    console.log('💡 حالا می‌توانید تیم‌های فروش و لینک‌های پرداخت را از ابتدا بسازید.');

  } catch (error) {
    console.error('❌ خطا در بازنشانی سیستم فروش:', error);
    process.exit(1);
  }
}

resetSalesSystem()
  .catch((error) => {
    console.error('❌ اجرای اسکریپت شکست خورد:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
