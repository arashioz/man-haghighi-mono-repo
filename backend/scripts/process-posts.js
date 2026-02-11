const fs = require('fs');
const path = require('path');

// Create output directory if not exists
const outputDir = path.join(__dirname, '../post-content');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Process large JSON file and create single output file
const processLargeJson = (inputFile) => {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const allPosts = [];
    
    const readStream = fs.createReadStream(inputFile, { encoding: 'utf8' });
    
    readStream.on('data', (chunk) => {
      buffer += chunk;
      
      // Process complete JSON objects when possible
      const posts = buffer.split('\n').filter(Boolean);
      if (posts.length > 1) {
        buffer = posts.pop(); // Keep incomplete last item
        posts.forEach(post => {
          try {
            const postData = JSON.parse(post);
            allPosts.push(postData);
          } catch (e) {
            console.error('Error parsing post:', e);
          }
        });
      }
    });

    readStream.on('end', () => {
      if (buffer) {
        try {
          const postData = JSON.parse(buffer);
          allPosts.push(postData);
        } catch (e) {
          console.error('Error parsing final post:', e);
        }
      }

      // Write all posts to single file
      const outputFile = path.join(outputDir, 'all_posts.json');
      fs.writeFileSync(outputFile, JSON.stringify(allPosts, null, 2));
      resolve(allPosts.length);
    });

    readStream.on('error', reject);
  });
};

// Main execution
(async () => {
  try {
    const inputFile = path.join(__dirname, '../../5pOOisH_posts.json');
    const count = await processLargeJson(inputFile);
    console.log(`Successfully processed ${count} posts`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();