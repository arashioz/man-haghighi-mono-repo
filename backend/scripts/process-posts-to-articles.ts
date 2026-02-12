import fs from 'fs';
import path from 'path';

interface WordPressPost {
  ID: string;
  post_title: string;
  post_content: string;
  post_excerpt: string;
  post_name: string;
  post_status: string;
  post_date: string;
}

interface ProcessedArticle {
  title: string;
  content: string;
}

function processPost(post: WordPressPost): ProcessedArticle | null {
  if (!post.post_title || !post.post_content) {
    return null;
  }

  // Remove HTML tags from content
  const cleanContent = post.post_content.replace(/<[^>]*>/g, '');

  return {
    title: post.post_title,
    content: cleanContent
  };
}

async function main() {
  const inputPath = path.join(__dirname, '../../moc-old-data/5pOOisH_posts.json');
  const outputPath = path.join(__dirname, 'processed-articles.json');

  console.log(`Processing WordPress export file: ${inputPath}`);

  const fileContent = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(fileContent);
  
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