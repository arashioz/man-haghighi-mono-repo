import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function viewOldProducts() {
  console.log('📦 Viewing Old Products and their potential course mappings...\n');

  // 1. Get all old products grouped by productId
  const oldProducts = await prisma.oldProduct.findMany({
    include: {
      user: {
        select: {
          id: true,
          phone: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      productId: 'asc',
    },
  });

  console.log(`Total old products: ${oldProducts.length}\n`);

  // 2. Get all courses for comparison
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      description: true,
    },
  });

  console.log(`Available courses (${courses.length}):`);
  courses.forEach(c => {
    console.log(`  - ${c.id}: ${c.title}`);
  });
  console.log('');

  // 3. Group by productId
  const productGroups = new Map<string, typeof oldProducts>();
  
  for (const op of oldProducts) {
    if (!productGroups.has(op.productId)) {
      productGroups.set(op.productId, []);
    }
    productGroups.get(op.productId)!.push(op);
  }

  // 4. Show each unique product with potential course matches
  console.log('═'.repeat(80));
  console.log('OLD PRODUCTS ANALYSIS');
  console.log('═'.repeat(80));

  const analysis: Array<{
    productId: string;
    productName: string;
    productCategory: string;
    userCount: number;
    potentialCourseMatches: string[];
    sampleUsers: string[];
  }> = [];

  for (const [productId, products] of productGroups) {
    const sample = products[0];
    const userCount = products.length;
    
    // Find potential course matches by name similarity
    const potentialMatches = courses
      .filter(c => 
        sample.productName.toLowerCase().includes(c.title.toLowerCase()) ||
        c.title.toLowerCase().includes(sample.productName.toLowerCase()) ||
        sample.productCategory.toLowerCase().includes(c.title.toLowerCase())
      )
      .map(c => `${c.id}: ${c.title}`);

    const sampleUsers = products.slice(0, 3).map(p => 
      `${p.user.phone || p.user.username} (${p.user.firstName} ${p.user.lastName})`
    );

    analysis.push({
      productId,
      productName: sample.productName,
      productCategory: sample.productCategory,
      userCount,
      potentialCourseMatches: potentialMatches,
      sampleUsers,
    });

    console.log(`\n🆔 Product ID: ${productId}`);
    console.log(`📛 Name: ${sample.productName}`);
    console.log(`📂 Category: ${sample.productCategory}`);
    console.log(`👥 Users with this product: ${userCount}`);
    
    if (potentialMatches.length > 0) {
      console.log(`🎯 Potential course matches:`);
      potentialMatches.forEach(m => console.log(`   ✓ ${m}`));
    } else {
      console.log(`⚠️ No automatic course match found`);
    }
    
    console.log(`👤 Sample users:`);
    sampleUsers.forEach(u => console.log(`   - ${u}`));
    if (userCount > 3) {
      console.log(`   ... and ${userCount - 3} more`);
    }
    
    console.log('─'.repeat(80));
  }

  // 5. Summary statistics
  console.log('\n' + '═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Unique old products: ${productGroups.size}`);
  console.log(`Total assignments (user+product): ${oldProducts.length}`);
  
  const productsWithMatches = analysis.filter(a => a.potentialCourseMatches.length > 0);
  console.log(`Products with potential course matches: ${productsWithMatches.length}/${productGroups.size}`);
  console.log('');

  // 6. Save detailed report
  const reportPath = path.join(
    process.cwd(),
    '..',
    'moc-old-data',
    `old-products-analysis-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  console.log(`📝 Detailed report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

viewOldProducts()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
