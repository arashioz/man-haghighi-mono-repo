import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ✅ 1. Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@haghighi.com' },
    update: {},
    create: {
      email: 'admin@haghighi.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'ادمین',
      lastName: 'سیستم',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  // ✅ 2. Create Sample Users
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const user = await prisma.user.upsert({
      where: { email: `user${i}@test.com` },
      update: {},
      create: {
        email: `user${i}@test.com`,
        username: `user${i}`,
        password: hashedPassword,
        firstName: `کاربر`,
        lastName: `تست ${i}`,
        role: 'USER',
        isActive: true,
      },
    });
    users.push(user);
  }
  console.log(`✅ ${users.length} sample users created`);

  // ✅ 3. Create Sliders
  const sliders = [
    {
      title: 'خوش آمدید به پلتفرم آموزشی',
      description: 'بهترین دوره‌های آموزشی را با ما تجربه کنید',
      image: '/images/slider1.jpg',
      order: 1,
      isActive: true,
    },
    {
      title: 'دوره‌های جدید',
      description: 'دوره‌های جدید و به‌روز برای شما',
      image: '/images/slider2.jpg',
      order: 2,
      isActive: true,
    },
    {
      title: 'مشاوره رایگان',
      description: 'مشاوره رایگان با بهترین اساتید',
      image: '/images/slider3.jpg',
      order: 3,
      isActive: true,
    },
  ];

  for (const slider of sliders) {
    await prisma.slider.create({ data: slider });
  }
  console.log(`✅ ${sliders.length} sliders created`);

  // ✅ 4. Create Articles
  const articles = [
    {
      title: 'راهنمای شروع کسب و کار اینترنتی',
      slug: 'online-business-guide',
      content: 'محتوای کامل مقاله در اینجا قرار می‌گیرد...',
      excerpt: 'در این مقاله به بررسی نکات کلیدی برای شروع کسب و کار اینترنتی می‌پردازیم',
      published: true,
      publishedAt: new Date(),
    },
    {
      title: 'استراتژی‌های موفق در بازاریابی دیجیتال',
      slug: 'digital-marketing-strategies',
      content: 'محتوای کامل مقاله در اینجا قرار می‌گیرد...',
      excerpt: 'بهترین استراتژی‌ها برای موفقیت در بازاریابی دیجیتال',
      published: true,
      publishedAt: new Date(),
    },
    {
      title: 'چگونه یک برند قوی بسازیم؟',
      slug: 'building-strong-brand',
      content: 'محتوای کامل مقاله در اینجا قرار می‌گیرد...',
      excerpt: 'نکات طلایی برای ساخت یک برند قدرتمند',
      published: true,
      publishedAt: new Date(),
    },
  ];

  for (const article of articles) {
    await prisma.article.create({ data: article });
  }
  console.log(`✅ ${articles.length} articles created`);

  // ✅ 5. Create Podcasts
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
    await prisma.podcast.create({ data: podcast });
  }
  console.log(`✅ ${podcasts.length} podcasts created`);

  // ✅ 6. Create Courses
  const courses = [
    {
      title: 'دوره جامع بازاریابی دیجیتال',
      description: 'آموزش کامل بازاریابی دیجیتال از صفر تا صد',
      price: 2500000,
      thumbnail: '/images/course1.jpg',
      courseVideos: ['/videos/course1-1.mp4', '/videos/course1-2.mp4'],
      attachments: ['/files/course1-material.pdf'],
      published: true,
    },
    {
      title: 'آموزش فروش حرفه‌ای',
      description: 'تکنیک‌های پیشرفته فروش',
      price: 1800000,
      thumbnail: '/images/course2.jpg',
      courseVideos: ['/videos/course2-1.mp4'],
      attachments: [],
      published: true,
    },
    {
      title: 'راه‌اندازی استارتاپ',
      description: 'همه چیز درباره راه‌اندازی استارتاپ',
      price: 3500000,
      thumbnail: '/images/course3.jpg',
      courseVideos: ['/videos/course3-1.mp4', '/videos/course3-2.mp4', '/videos/course3-3.mp4'],
      attachments: ['/files/course3-guide.pdf'],
      published: true,
    },
  ];

  for (const course of courses) {
    await prisma.course.create({ data: course });
  }
  console.log(`✅ ${courses.length} courses created`);

  // ✅ 7. Create Workshops
  const workshops = [
    {
      title: 'کارگاه عملی فروش',
      description: 'کارگاه عملی تکنیک‌های فروش حرفه‌ای',
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours
      capacity: 30,
      price: 500000,
      location: 'سالن همایش تهران',
      creatorId: adminUser.id,
      published: true,
    },
    {
      title: 'وبینار بازاریابی محتوا',
      description: 'آموزش بازاریابی محتوا به صورت آنلاین',
      startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours
      capacity: 100,
      price: 300000,
      location: 'آنلاین',
      creatorId: adminUser.id,
      published: true,
    },
  ];

  for (const workshop of workshops) {
    await prisma.workshop.create({ data: workshop });
  }
  console.log(`✅ ${workshops.length} workshops created`);

  // ✅ 8. Create Videos
  const videos = [
    {
      title: 'معرفی پلتفرم',
      description: 'ویدیو معرفی پلتفرم آموزشی',
      videoFile: '/videos/intro.mp4',
      thumbnail: '/images/video1.jpg',
      duration: 600,
      category: 'INTRO',
      isFree: true,
      published: true,
      publishedAt: new Date(),
    },
    {
      title: 'اصول فروش',
      description: 'آموزش اصول فروش حرفه‌ای',
      videoFile: '/videos/sales-basics.mp4',
      thumbnail: '/images/video2.jpg',
      duration: 1200,
      category: 'TRAINING',
      isFree: false,
      published: true,
      publishedAt: new Date(),
    },
    {
      title: 'مدیریت تیم فروش',
      description: 'مدیریت حرفه‌ای تیم فروش',
      videoFile: '/videos/sales-team.mp4',
      thumbnail: '/images/video3.jpg',
      duration: 900,
      category: 'TRAINING',
      isFree: false,
      published: true,
      publishedAt: new Date(),
    },
  ];

  for (const video of videos) {
    await prisma.video.create({ data: video });
  }
  console.log(`✅ ${videos.length} videos created`);

  // ✅ 9. Create Audios
  const audios = [
    {
      title: 'تله‌های فروش',
      description: 'شناخت تله‌های رایج در فروش',
      audioFile: '/audios/sales-traps.mp3',
      thumbnail: '/images/audio1.jpg',
      duration: 1500,
      category: 'TRAINING',
      isFree: true,
      published: true,
      publishedAt: new Date(),
    },
    {
      title: 'روانشناسی مشتری',
      description: 'درک روانشناسی مشتری',
      audioFile: '/audios/customer-psychology.mp3',
      thumbnail: '/images/audio2.jpg',
      duration: 1800,
      category: 'TRAINING',
      isFree: false,
      published: true,
      publishedAt: new Date(),
    },
  ];

  for (const audio of audios) {
    await prisma.audio.create({ data: audio });
  }
  console.log(`✅ ${audios.length} audios created`);

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
