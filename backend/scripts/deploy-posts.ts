import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

interface PostData {
  id?: string;
  title?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
}

const prisma = new PrismaClient();
const postsFile = path.join(__dirname, '../post-content/all_posts.json');

async function deployPosts() {
  try {
    const fileContent = fs.readFileSync(postsFile, 'utf8');
    const allPosts: PostData[] = JSON.parse(fileContent);
    
    let successCount = 0;
    let errorCount = 0;

    for (const postData of allPosts) {
      try {
        //@ts-ignore
        await prisma.post.create({
          data: {
            title: postData.title || '',
            content: postData.content || '',
            slug: postData.title ? 
              postData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') : 
              `post-${Date.now()}`,
            createdAt: new Date(postData.createdAt || Date.now()),
            updatedAt: new Date(postData.updatedAt || Date.now())
          }
        });
        
        successCount++;
        console.log(`Deployed post: ${postData.title || 'Untitled'}`);
      } catch (error) {
        errorCount++;
        console.error(`Error deploying post:`, error);
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
    process.exit(0);
  }
}

deployPosts();