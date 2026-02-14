import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
// import { parse } from 'json2csv'; // Removed unused import

interface LegacyPost {
  ID: string;
  post_title: string;
  post_content: string;
  post_excerpt: string;
  post_name: string;
  post_status: string;
  post_date: string;
  post_modified: string;
  // سایر فیلدهای قدیمی
}

interface NewArticle {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  focusKeyword?: string;
  author?: string;
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// تنظیمات اولیه
const INPUT_FILE = path.join(__dirname, './moc-old-data/5pOOisH_posts.json');
const OUTPUT_FILE = path.join(__dirname, './moc-old-data/processed-articles.json');
const BATCH_SIZE = 100; // تعداد رکوردها در هر بسته

const prisma = new PrismaClient();

async function processLegacyPosts() {
  try {
    console.log('Starting legacy posts processing...');
    
    // ایجاد یک readable stream برای فایل ورودی
    const readStream = fs.createReadStream(INPUT_FILE, { encoding: 'utf8' });
    
    let buffer = '';
    let recordsProcessed = 0;
    const processedArticles: NewArticle[] = [];

    readStream.on('data', (chunk) => {
      buffer += chunk;
      
      // پردازش رکوردهای کامل
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // نگه داشتن خط ناقص برای پردازش بعدی
      
      lines.forEach(line => {
        if (!line.trim()) return;
        
        try {
          const legacyPost: LegacyPost = JSON.parse(line);
          const newArticle = transformPost(legacyPost);
          processedArticles.push(newArticle);
          recordsProcessed++;
          
          // ذخیره دسته‌ای
          if (processedArticles.length >= BATCH_SIZE) {
            saveBatch([...processedArticles]);
            processedArticles.length = 0; // پاک کردن آرایه
          }
        } catch (err) {
          console.error('Error parsing JSON line:', err);
        }
      });
    });

    readStream.on('end', () => {
      // پردازش آخرین رکوردهای باقیمانده
      if (buffer.trim()) {
        try {
          const legacyPost: LegacyPost = JSON.parse(buffer);
          const newArticle = transformPost(legacyPost);
          processedArticles.push(newArticle);
          recordsProcessed++;
        } catch (err) {
          console.error('Error parsing final JSON line:', err);
        }
      }
      
      // ذخیره آخرین دسته
      if (processedArticles.length > 0) {
        saveBatch(processedArticles);
      }
      
      console.log(`Processing complete. ${recordsProcessed} records processed.`);
    });

    readStream.on('error', (err) => {
      console.error('Error reading file:', err);
    });
  } catch (err) {
    console.error('Error in processLegacyPosts:', err);
  } finally {
    await prisma.$disconnect();
  }
}

function transformPost(legacyPost: LegacyPost): NewArticle {
  // استخراج تصویر شاخص از محتوا (اگر وجود دارد)
  const featuredImage = extractFeaturedImage(legacyPost.post_content);
  
  // پاکسازی محتوا
  const cleanContent = cleanHtmlContent(legacyPost.post_content);
  const cleanExcerpt = legacyPost.post_excerpt ? cleanHtmlContent(legacyPost.post_excerpt) : undefined;
  
  return {
    title: legacyPost.post_title,
    slug: legacyPost.post_name || generateSlug(legacyPost.post_title),
    content: cleanContent,
    excerpt: cleanExcerpt,
    featuredImage,
    metaTitle: legacyPost.post_title,
    metaDescription: cleanExcerpt,
    published: legacyPost.post_status === 'publish',
    publishedAt: legacyPost.post_status === 'publish' ? 
      new Date(legacyPost.post_date) : undefined,
    createdAt: new Date(legacyPost.post_date),
    updatedAt: new Date(legacyPost.post_modified)
  };
}

function saveBatch(articles: NewArticle[]) {
  try {
    // ذخیره در فایل
    const output = fs.existsSync(OUTPUT_FILE) ? 
      JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')) : [];
    
    output.push(...articles);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    
    console.log(`Saved batch of ${articles.length} articles to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('Error saving batch:', err);
  }
}

// Helper functions
function extractFeaturedImage(content: string): string | undefined {
  const imgRegex = /<img[^>]+src="([^">]+)"/;
  const match = content.match(imgRegex);
  return match ? match[1] : undefined;
}

function cleanHtmlContent(html: string): string {
  // حذف تگ‌های اسکریپت و استایل
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // جایگزینی تگ‌های div با خطوط جدید
  cleaned = cleaned.replace(/<\/div>/gi, '\n');
  
  // حذف سایر تگ‌های HTML
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  
  // نرمال سازی فاصله‌ها
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// اجرای اسکریپت
processLegacyPosts()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });