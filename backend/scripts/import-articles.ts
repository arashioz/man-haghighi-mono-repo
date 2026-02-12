import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const BATCH_SIZE = 100; // Process articles in batches

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');
}

async function importArticles() {
  const filePath = path.join(__dirname, 'processed-articles.json');
  
  if (!fs.existsSync(filePath)) {
    console.error('Processed articles file not found. Run process-posts-to-articles.ts first.');
    process.exit(1);
  }

  console.log('Reading processed articles...');
  const articlesData = fs.readFileSync(filePath, 'utf8');
  const articles: Array<{
    title: string;
    content: string;
  }> = JSON.parse(articlesData);

  console.log(`Found ${articles.length} articles to import`);

  let importedCount = 0;
  const batches = Math.ceil(articles.length / BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const start = i * BATCH_SIZE;
    const end = start + BATCH_SIZE;
    const batch = articles.slice(start, end);

    try {
      await prisma.$transaction(
        batch.map(article => {
          const slug = generateSlug(article.title);
          return prisma.article.upsert({
            where: { slug },
            create: {
              title: article.title,
              content: article.content,
              slug
            },
            update: {
              title: article.title,
              content: article.content,
              slug
            }
          });
        })
      );

      importedCount += batch.length;
      console.log(`Imported batch ${i + 1}/${batches} (${importedCount}/${articles.length})`);
    } catch (error) {
      console.error(`Error importing batch ${i + 1}:`, error);
    }
  }

  console.log('Import completed');
  await prisma.$disconnect();
}

importArticles()
  .catch(e => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });