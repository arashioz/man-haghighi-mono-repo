const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const postsFile = path.join(__dirname, '../post-content/all_posts.json');

async function deployPosts() {
  try {
    // Read the combined posts file
    const allPosts = JSON.parse(fs.readFileSync(postsFile, 'utf8'));
    
    let successCount = 0;
    let errorCount = 0;

    // Process each post
    for (const postData of allPosts) {
      try {
        // Customize this based on your Post model structure
        await prisma.post.create({
          data: {
            title: postData.title || '',
            content: postData.content || '',
            // Add other fields as needed
            createdAt: new Date(postData.createdAt || Date.now()),
            updatedAt: new Date(postData.updatedAt || Date.now())
          }
        });
        
        successCount++;
        console.log(`Deployed post: ${postData.title || 'Untitled'}`);
      } catch (error) {
        errorCount++;
        console.error(`Error deploying post:`, error.message);
      }
    }

    console.log(`\nDeployment completed:`);
    console.log(`- Successfully deployed: ${successCount} posts`);
    console.log(`- Failed to deploy: ${errorCount} posts`);

  } catch (error) {
    console.error('Deployment error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deployPosts();