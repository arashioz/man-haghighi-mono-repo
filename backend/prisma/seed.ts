import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ✅ 1. Create Admin User
  const hashedAdminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@haghighi.com' },
    update: {},
    create: {
      email: 'admin@haghighi.com',
      username: 'admin',
      password: hashedAdminPassword,
      firstName: 'ادمین',
      lastName: 'سیستم',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  // Hash password for regular users
  const hashedUserPassword = await bcrypt.hash('user123', 10);

  // ✅ 2. Create Sample Users with Email
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const user = await prisma.user.upsert({
      where: { email: `user${i}@test.com` },
      update: {},
      create: {
        email: `user${i}@test.com`,
        username: `user${i}`,
        password: hashedUserPassword,
        firstName: `کاربر`,
        lastName: `تست ${i}`,
        role: 'USER',
        isActive: true,
      },
    });
    users.push(user);
  }
  console.log(`✅ ${users.length} sample users with email created`);

  // ✅ 3. Create Sample Users with Phone Number
  const phoneUsers = [
    { phone: '09123456789', username: 'phone_user1', firstName: 'علی', lastName: 'احمدی' },
    { phone: '09123456790', username: 'phone_user2', firstName: 'محمد', lastName: 'محمدی' },
    { phone: '09123456791', username: 'phone_user3', firstName: 'رضا', lastName: 'رضایی' },
    { phone: '09123456792', username: 'phone_user4', firstName: 'حسین', lastName: 'حسینی' },
    { phone: '09123456793', username: 'phone_user5', firstName: 'مهدی', lastName: 'مهدوی' },
  ];

  for (const phoneUser of phoneUsers) {
    const user = await prisma.user.upsert({
      where: { phone: phoneUser.phone },
      update: {},
      create: {
        phone: phoneUser.phone,
        username: phoneUser.username,
        password: hashedUserPassword, // password: user123
        firstName: phoneUser.firstName,
        lastName: phoneUser.lastName,
        role: 'USER',
        isActive: true,
      },
    });
    users.push(user);
  }
  console.log(`✅ ${phoneUsers.length} sample users with phone created`);

  // ✅ 4. Create Sliders
  const sliders = [
    {
      title: 'خوش آمدید به پلتفرم آموزشی',
      description: 'بهترین دوره‌های آموزشی را با ما تجربه کنید',
      image: 'https://via.placeholder.com/1200x400/4F46E5/FFFFFF?text=Welcome+to+Haghighi+Platform',
      order: 1,
      isActive: true,
    },
    {
      title: 'دوره‌های جدید',
      description: 'دوره‌های جدید و به‌روز برای شما',
      image: 'https://via.placeholder.com/1200x400/10B981/FFFFFF?text=New+Courses',
      order: 2,
      isActive: true,
    },
    {
      title: 'مشاوره رایگان',
      description: 'مشاوره رایگان با بهترین اساتید',
      image: 'https://via.placeholder.com/1200x400/F59E0B/FFFFFF?text=Free+Consultation',
      order: 3,
      isActive: true,
    },
  ];

  for (const slider of sliders) {
    await prisma.slider.create({ data: slider }).catch(() => {
      // If already exists (by order or title), skip
      console.log(`⚠️ Slider "${slider.title}" might already exist, skipping...`);
    });
  }
  console.log(`✅ ${sliders.length} sliders processed`);

  // ✅ 5. Create Articles
  const articles = [
    {
      title: 'راهنمای شروع کسب و کار اینترنتی',
      slug: 'online-business-guide',
      content: 'محتوای کامل مقاله در اینجا قرار می‌گیرد...',
      excerpt: 'در این مقاله به بررسی نکات کلیدی برای شروع کسب و کار اینترنتی می‌پردازیم',
      featuredImage: 'https://via.placeholder.com/800x450/3B82F6/FFFFFF?text=Online+Business',
      published: true,
      publishedAt: new Date(),
    },
    {
      title: 'استراتژی‌های موفق در بازاریابی دیجیتال',
      slug: 'digital-marketing-strategies',
      content: 'محتوای کامل مقاله در اینجا قرار می‌گیرد...',
      excerpt: 'بهترین استراتژی‌ها برای موفقیت در بازاریابی دیجیتال',
      featuredImage: 'https://via.placeholder.com/800x450/10B981/FFFFFF?text=Marketing+Strategies',
      published: true,
      publishedAt: new Date(),
    },
    {
      title: 'چگونه یک برند قوی بسازیم؟',
      slug: 'building-strong-brand',
      content: 'محتوای کامل مقاله در اینجا قرار می‌گیرد...',
      excerpt: 'نکات طلایی برای ساخت یک برند قدرتمند',
      featuredImage: 'https://via.placeholder.com/800x450/F59E0B/FFFFFF?text=Strong+Brand',
      published: true,
      publishedAt: new Date(),
    },
  ];

  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: article,
      create: article,
    });
  }
  console.log(`✅ ${articles.length} articles created`);

  // ✅ 6. Create Podcasts
  const podcasts = [
    {
      title: 'راز موفقیت در فروش',
      description: 'در این قسمت به بررسی راز موفقیت در فروش می‌پردازیم',
      audioFile: '/audios/podcast1.mp3',
      duration: 1800,
      published: true,
      publishedAt: new Date(),
    },
    {
      title: 'مدیریت زمان برای کارآفرینان',
      description: 'نکات کلیدی مدیریت زمان برای کارآفرینان',
      audioFile: '/audios/podcast2.mp3',
      duration: 2400,
      published: true,
      publishedAt: new Date(),
    },
  ];

  for (const podcast of podcasts) {
    await prisma.podcast.create({ data: podcast }).catch(() => {
      // If already exists, skip
      console.log(`⚠️ Podcast "${podcast.title}" already exists, skipping...`);
    });
  }
  console.log(`✅ ${podcasts.length} podcasts created`);

  // ✅ 7. Create Courses
  const coursesData = [
    {
      title: 'دوره جامع بازاریابی دیجیتال',
      description: 'آموزش کامل بازاریابی دیجیتال از صفر تا صد',
      price: 2500000,
      thumbnail: 'https://via.placeholder.com/400x300/6366F1/FFFFFF?text=Digital+Marketing',
      courseVideos: [],
      attachments: [],
      published: true,
    },
    {
      title: 'آموزش فروش حرفه‌ای',
      description: 'تکنیک‌های پیشرفته فروش',
      price: 1800000,
      thumbnail: 'https://via.placeholder.com/400x300/EC4899/FFFFFF?text=Professional+Sales',
      courseVideos: [],
      attachments: [],
      published: true,
    },
    {
      title: 'راه‌اندازی استارتاپ',
      description: 'همه چیز درباره راه‌اندازی استارتاپ',
      price: 3500000,
      thumbnail: 'https://via.placeholder.com/400x300/14B8A6/FFFFFF?text=Startup+Launch',
      courseVideos: [],
      attachments: [],
      published: true,
    },
  ];

  const courses = [];
  for (const course of coursesData) {
    try {
      const existing = await prisma.course.findFirst({
        where: { title: course.title },
      });
      if (existing) {
        courses.push(existing);
        continue;
      }
      const created = await prisma.course.create({ data: course });
      courses.push(created);
    } catch (error) {
      console.log(`⚠️ Course "${course.title}" might already exist, skipping...`);
      // Try to find existing course
      const existing = await prisma.course.findFirst({
        where: { title: course.title },
      });
      if (existing) {
        courses.push(existing);
      }
    }
  }
  console.log(`✅ ${courses.length} courses processed`);

  // ✅ 8. Create Workshops
  const workshops = [
    {
      title: 'کارگاه عملی فروش',
      description: 'کارگاه عملی تکنیک‌های فروش حرفه‌ای',
      date: '1403/10/15 14:00',
      maxParticipants: 30,
      price: 500000,
      location: 'سالن همایش تهران',
      createdBy: adminUser.id,
      isActive: true,
    },
    {
      title: 'وبینار بازاریابی محتوا',
      description: 'آموزش بازاریابی محتوا به صورت آنلاین',
      date: '1403/10/22 16:00',
      maxParticipants: 100,
      price: 300000,
      location: 'آنلاین',
      createdBy: adminUser.id,
      isActive: true,
    },
  ];

  for (const workshop of workshops) {
    await prisma.workshop.create({ data: workshop }).catch(() => {
      // If already exists, skip
      console.log(`⚠️ Workshop "${workshop.title}" already exists, skipping...`);
    });
  }
  console.log(`✅ ${workshops.length} workshops processed`);

  // ✅ 9. Create Videos (linked to courses)
  const videos = [
    {
      title: 'معرفی پلتفرم',
      description: 'ویدیو معرفی پلتفرم آموزشی',
      videoFile: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnail: 'https://via.placeholder.com/640x360/8B5CF6/FFFFFF?text=Platform+Intro',
      duration: 600,
      courseId: courses[0].id,
      order: 1,
      published: true,
    },
    {
      title: 'اصول فروش',
      description: 'آموزش اصول فروش حرفه‌ای',
      videoFile: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      thumbnail: 'https://via.placeholder.com/640x360/EF4444/FFFFFF?text=Sales+Basics',
      duration: 1200,
      courseId: courses[1].id,
      order: 1,
      published: true,
    },
    {
      title: 'مدیریت تیم فروش',
      description: 'مدیریت حرفه‌ای تیم فروش',
      videoFile: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnail: 'https://via.placeholder.com/640x360/06B6D4/FFFFFF?text=Team+Management',
      duration: 900,
      courseId: courses[2].id,
      order: 1,
      published: true,
    },
  ];

  for (const video of videos) {
    await prisma.video.create({ data: video }).catch(() => {
      // If already exists, skip
      console.log(`⚠️ Video "${video.title}" already exists, skipping...`);
    });
  }
  console.log(`✅ ${videos.length} videos processed`);

  // ✅ 10. Create Audios (linked to courses)
  const audios = [
    {
      title: 'تله‌های فروش',
      description: 'شناخت تله‌های رایج در فروش',
      audioFile: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      thumbnail: 'https://via.placeholder.com/400x400/F97316/FFFFFF?text=Sales+Traps',
      duration: 1500,
      courseId: courses[0].id,
      order: 1,
      published: true,
    },
    {
      title: 'روانشناسی مشتری',
      description: 'درک روانشناسی مشتری',
      audioFile: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      thumbnail: 'https://via.placeholder.com/400x400/22C55E/FFFFFF?text=Customer+Psychology',
      duration: 1800,
      courseId: courses[1].id,
      order: 1,
      published: true,
    },
  ];

  for (const audio of audios) {
    await prisma.audio.create({ data: audio }).catch(() => {
      // If already exists, skip
      console.log(`⚠️ Audio "${audio.title}" already exists, skipping...`);
    });
  }
  console.log(`✅ ${audios.length} audios processed`);

  // ✅ 10. Seed old users using import-old-users.ts
  const jsonPath = path.join(process.cwd(), 'moc-old-data', 'final_merged_data.json');
  const cleanedUsersPath = path.join(process.cwd(), 'moc-old-data', 'final_merged_data_cleaned.json');
  const usersJsonPath = path.join(process.cwd(), 'moc-old-data', 'users.json');
  
  if (fs.existsSync(cleanedUsersPath) || fs.existsSync(jsonPath) || fs.existsSync(usersJsonPath)) {
    console.log('');
    console.log('🔄 Importing old users using import-old-users.ts...');
    try {
      // Import old users using import-old-users.ts
      // This will:
      // 1. Import users with their products
      // 2. Create legacy courses from old products
      // 3. Enroll users in their legacy courses
      execSync('npx ts-node scripts/import-old-users.ts', { stdio: 'inherit', cwd: process.cwd() });
      console.log('✅ Old users and legacy courses imported successfully');
    } catch (error: any) {
      console.log('⚠️  Could not import old users:', error.message || error);
      console.log('   Continuing with regular seed...');
    }
  } else {
    console.log('');
    console.log('⚠️  Old users data file not found, skipping old users import');
    console.log('   Looking for: final_merged_data_cleaned.json, final_merged_data.json or users.json in moc-old-data folder');
  }

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('📝 Login credentials:');
  console.log('   Email: admin@haghighi.com');
  console.log('   Password: admin123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
