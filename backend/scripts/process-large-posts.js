const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper functions
function generateSlug(title) {
  return title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

function generateExcerpt(content, length = 150) {
  return content.substring(0, length) + (content.length > length ? '...' : '');
}

async function processPosts() {
  const filePath = path.join(__dirname, '../../moc-old-data/final_merged_data_cleaned.json');
  const batchSize = 100;
  let processedCount = 0;

  try {
    // Read file stream
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    let buffer = '';

    stream.on('data', async (chunk) => {
      buffer += chunk;
      
      // Process complete JSON objects
      const objects = buffer.split('\n').filter(Boolean);
      buffer = objects.pop() || '';

      const batch = [];
      for (const objStr of objects) {
        try {
          const post = JSON.parse(objStr);
          
          const articleData = {
            title: post.title,
            slug: generateSlug(post.title),
            content: post.content,
            excerpt: post.excerpt || generateExcerpt(post.content),
            featuredImage: post.featured_image || null,
            metaTitle: post.meta_title || post.title,
            metaDescription: post.meta_description || post.excerpt,
            published: post.status === 'publish',
            publishedAt: post.date ? new Date(post.date) : new Date(),
            tags: post.tags || [],
            viewCount: parseInt(post.views) || 0
          };

          batch.push(articleData);
        } catch (err) {
          console.error('Error parsing post:', err);
        }
      }

      // Insert batch
      if (batch.length > 0) {
        try {
          await prisma.article.createMany({
            data: batch,
            skipDuplicates: true
          });
          processedCount += batch.length;
          console.log(`Processed ${processedCount} posts`);
        } catch (err) {
          console.error('Error inserting batch:', err);
        }
      }
    });

    stream.on('end', () => {
      console.log('Finished processing all data');
      prisma.$disconnect();
    });

  } catch (err) {
    console.error('Error processing posts:', err);
    prisma.$disconnect();
  }
}

processPosts();