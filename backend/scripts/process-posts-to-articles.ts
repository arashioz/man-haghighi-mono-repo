import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

interface WordPressPost {
  ID: string;
  post_title: string;
  post_content: string;
  post_excerpt: string;
  post_name: string;
  post_status: string;
  post_date: string;
  // Other WordPress fields we might need
}

interface ProcessedArticle {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  metaTitle?: string;
  metaDescription?: string;
}

function processPost(post: WordPressPost): ProcessedArticle | null {
  if (!post.post_title || !post.post_content) {
    return null;
  }

  return {
    title: post.post_title,
    slug: post.post_name || post.post_title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
    content: post.post_content,
    excerpt: post.post_excerpt,
    // Add other field mappings as needed
  };
}

async function main() {
  const inputPath = path.join(__dirname, '../../5pOOisH_posts.json');
  const outputPath = path.join(__dirname, 'processed-articles.json');

  console.log(`Processing WordPress export file: ${inputPath}`);

  const fileContent = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(fileContent);
  
  // Find the table data containing posts
  const postsTable = data.find((item: any) => 
    item.type === 'table' && item.name === '5pOOisH_posts'
  );

  if (!postsTable || !postsTable.data) {
    console.error('Could not find posts data in the export file');
    process.exit(1);
  }

  const writeStream = fs.createWriteStream(outputPath);
  writeStream.write('[');
  
  let first = true;
  let processedCount = 0;
  let skippedCount = 0;

  for (const post of postsTable.data) {
    try {
      const article = processPost(post);
      
      if (!article) {
        skippedCount++;
        continue;
      }

      if (!first) {
        writeStream.write(',\n');
      } else {
        first = false;
      }
      writeStream.write(JSON.stringify(article));
      processedCount++;
    } catch (err) {
      console.error('Error processing post:', post.ID);
      skippedCount++;
    }
  }

  writeStream.write(']');
  writeStream.end();
  console.log(`Finished processing. Processed ${processedCount} articles, skipped ${skippedCount}. Output written to ${outputPath}`);
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});