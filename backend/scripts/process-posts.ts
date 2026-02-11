import fs from 'fs';
import path from 'path';

interface PostData {
  id?: string;
  title?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  // Add other fields as needed
}

// Create output directory if not exists
const outputDir = path.join(__dirname, '../post-content');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function processLargeJson(inputFile: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const allPosts: PostData[] = [];
    let lineNumber = 0;
    
    const readStream = fs.createReadStream(inputFile, { encoding: 'utf8' });
    
    readStream.on('data', (chunk) => {
      buffer += chunk;
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        lineNumber++;
        try {
          if (line.trim() === '') continue;
          
          const postData = JSON.parse(line.trim()) as PostData;
          allPosts.push(postData);
        } catch (error) {
          console.error(`Error parsing line ${lineNumber}:`, error);
          console.error(`Problematic line content:`, line);
        }
      }
    });

    readStream.on('end', () => {
      if (buffer.trim() !== '') {
        lineNumber++;
        try {
          const postData = JSON.parse(buffer.trim()) as PostData;
          allPosts.push(postData);
        } catch (error) {
          console.error(`Error parsing final line ${lineNumber}:`, error);
          console.error(`Problematic line content:`, buffer);
        }
      }

      // Write all posts to single file
      const outputFile = path.join(outputDir, 'all_posts.json');
      fs.writeFileSync(outputFile, JSON.stringify(allPosts, null, 2));
      resolve(allPosts.length);
    });

    readStream.on('error', (error) => {
      console.error('File read error:', error);
      reject(error);
    });
  });
}

// Main execution
(async () => {
  try {
    const inputFile = path.join(__dirname, '../../5pOOisH_posts.json');
    const count = await processLargeJson(inputFile);
    console.log(`Successfully processed ${count} posts`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();