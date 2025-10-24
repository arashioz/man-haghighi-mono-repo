import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@haghighi.com' },
    update: {},
    create: {
      email: 'admin@haghighi.com',
      username: 'admin',
      password: adminPassword,
      firstName: 'مدیر',
      lastName: 'سیستم',
      role: 'ADMIN',
    },
  });

  console.log('👤 Admin user created:', admin.email);

  // Create sales manager
  const salesManagerPassword = await bcrypt.hash('sales123', 10);
  const salesManager = await prisma.user.upsert({
    where: { phone: '09123456789' },
    update: {},
    create: {
      email: 'sales_manager@haghighi.com', // Add email for sales manager
      phone: '09123456789',
      username: 'sales_manager',
      password: salesManagerPassword,
      firstName: 'مدیر',
      lastName: 'فروش',
      role: 'SALES_MANAGER',
    },
  });

  console.log('👤 Sales Manager created:', salesManager.phone);

  // Create sales person
  const salesPersonPassword = await bcrypt.hash('sales123', 10);
  const salesPerson = await prisma.user.upsert({
    where: { phone: '09123456790' },
    update: {},
    create: {
      email: 'sales_person@haghighi.com', // Add email for sales person
      phone: '09123456790',
      username: 'sales_person',
      password: salesPersonPassword,
      firstName: 'فروشنده',
      lastName: 'نمونه',
      role: 'SALES_PERSON',
      parentId: salesManager.id,
    },
  });

  console.log('👤 Sales Person created:', salesPerson.phone);

  // Create regular user
  const regularUserPassword = await bcrypt.hash('user123', 10);
  const regularUser = await prisma.user.upsert({
    where: { phone: '09123456791' },
    update: {},
    create: {
      phone: '09123456791',
      username: 'regular_user',
      password: regularUserPassword,
      firstName: 'کاربر',
      lastName: 'نمونه',
      role: 'USER',
    },
  });

  console.log('👤 Regular User created:', regularUser.phone);

  // Create sample sliders
  const sliders = await Promise.all([
    prisma.slider.create({
      data: {
        title: 'به بزرگترین مرکز آموزشی کوچینگ توسعه فردی و کسب و کار خوش آمدید',
        description: 'با منی حقیقی و فراز قورچیان، سفر خود را به سوی موفقیت آغاز کنید',
        image: 'Header-Site-1.jpg',
        link: '/courses',
        order: 1,
        isActive: true,
      },
    }),
    prisma.slider.create({
      data: {
        title: 'انرژی پول - فراز قورچیان',
        description: 'رازهای موفقیت مالی و انرژی مثبت برای کسب ثروت',
        image: 'book.png',
        link: '/courses',
        order: 2,
        isActive: true,
      },
    }),
  ]);

  console.log('🎠 Sliders created:', sliders.length);

  // Create sample course
  const course = await prisma.course.create({
    data: {
      title: 'انرژی پول - فراز قورچیان',
      description: 'رازهای موفقیت مالی و انرژی مثبت برای کسب ثروت و رسیدن به استقلال مالی',
      price: 299.99,
      thumbnail: 'book.png',
      published: true,
    },
  });

  console.log('📚 Course created:', course.title);

  // Create sample videos
  const videos = await Promise.all([
    prisma.video.create({
      data: {
        title: 'مقدمه‌ای بر انرژی پول',
        description: 'درک مفاهیم اولیه انرژی پول و تأثیر آن بر موفقیت مالی',
        videoFile: 'enerzhi-pool-intro.mp4',
        thumbnail: 'book.png',
        duration: 1800,
        order: 1,
        courseId: course.id,
        published: true,
      },
    }),
    prisma.video.create({
      data: {
        title: 'رازهای ذهنیت ثروت',
        description: 'تغییر ذهنیت و ایجاد باورهای مثبت برای کسب ثروت',
        videoFile: 'wealth-mindset.mp4',
        thumbnail: 'book.png',
        duration: 2100,
        order: 2,
        courseId: course.id,
        published: true,
      },
    }),
  ]);

  console.log('🎥 Videos created:', videos.length);

  // Create sample article
  const article = await prisma.article.create({
    data: {
      title: 'رازهای موفقیت مالی',
      slug: `secrets-of-financial-success-${Date.now()}`,
      content: 'این راهنمای جامعی برای رسیدن به موفقیت مالی و استقلال اقتصادی است. در این مقاله با اصول اولیه مدیریت پول، سرمایه‌گذاری هوشمند و ایجاد درآمدهای متعدد آشنا می‌شوید...',
      excerpt: 'اصول موفقیت مالی را یاد بگیرید و سفر خود را به سوی استقلال اقتصادی آغاز کنید.',
      featuredImage: 'book.png',
      published: true,
      publishedAt: new Date(),
    },
  });

  console.log('📝 Article created:', article.title);

  // Create sample podcast
  const podcast = await prisma.podcast.create({
    data: {
      title: 'انرژی پول - قسمت اول',
      description: 'نکات ضروری برای تغییر ذهنیت مالی و ایجاد انرژی مثبت برای کسب ثروت',
      audioFile: 'enerzhi-pool-episode-1.mp3',
      duration: 1800,
      published: true,
      publishedAt: new Date(),
    },
  });

  console.log('🎧 Podcast created:', podcast.title);

  // Create sample workshops
  const workshops = await Promise.all([
    prisma.workshop.create({
      data: {
        title: 'کارگاه انرژی پول و موفقیت مالی',
        description: 'در این کارگاه با اصول اولیه انرژی پول، ذهنیت ثروت و راهکارهای عملی برای رسیدن به استقلال مالی آشنا می‌شوید.',
        date: '1403/09/30 10:00',
        location: 'تهران - سالن همایش‌های پارک فناوری',
        maxParticipants: 50,
        price: 500000,
        isActive: true,
        createdBy: salesManager.id,
      },
    }),
    prisma.workshop.create({
      data: {
        title: 'کارگاه کوچینگ توسعه فردی',
        description: 'آموزش تکنیک‌های کوچینگ برای توسعه فردی و رسیدن به اهداف شخصی و حرفه‌ای.',
        date: '1403/10/05 14:00',
        location: 'تهران - مرکز آموزش‌های تخصصی',
        maxParticipants: 30,
        price: 750000,
        isActive: true,
        createdBy: salesManager.id,
      },
    }),
    prisma.workshop.create({
      data: {
        title: 'کارگاه رهبری و مدیریت تیم',
        description: 'مهارت‌های ضروری برای رهبری مؤثر و مدیریت تیم‌های کاری موفق.',
        date: '1403/10/16 09:00',
        location: 'تهران - هتل اسپیناس پالاس',
        maxParticipants: 40,
        price: 600000,
        isActive: true,
        createdBy: admin.id,
      },
    }),
    prisma.workshop.create({
      data: {
        title: 'کارگاه ارتباطات مؤثر',
        description: 'تکنیک‌های برقراری ارتباط مؤثر در محیط کار و زندگی شخصی.',
        date: '1403/10/26 16:00',
        location: 'تهران - مرکز همایش‌های بین‌المللی',
        maxParticipants: 60,
        price: 400000,
        isActive: false, // غیرفعال برای تست
        createdBy: salesManager.id,
      },
    }),
  ]);

  console.log('🎓 Workshops created:', workshops.length);

  // Grant sales person access to some workshops
  await prisma.salesPersonWorkshopAccess.create({
    data: {
      salesPersonId: salesPerson.id,
      workshopId: workshops[0].id,
      grantedBy: salesManager.id,
      isActive: true,
    },
  });

  await prisma.salesPersonWorkshopAccess.create({
    data: {
      salesPersonId: salesPerson.id,
      workshopId: workshops[1].id,
      grantedBy: salesManager.id,
      isActive: true,
    },
  });

  console.log('🔐 Sales person access granted to workshops');

  // Create some workshop participants
  await prisma.workshopParticipant.create({
    data: {
      workshopId: workshops[0].id,
      customerPhone: '09123456792',
      customerName: 'علی احمدی',
      prepaymentAmount: 100000,
      paymentStatus: 'PENDING',
      createdBy: salesPerson.id,
    },
  });

  await prisma.workshopParticipant.create({
    data: {
      workshopId: workshops[0].id,
      customerPhone: '09123456793',
      customerName: 'فاطمه محمدی',
      prepaymentAmount: 150000,
      paymentStatus: 'PAID',
      createdBy: salesPerson.id,
    },
  });

  console.log('👥 Workshop participants created');

  // Enroll sales person in course
  await prisma.courseEnrollment.create({
    data: {
      userId: salesPerson.id,
      courseId: course.id,
    },
  });

  console.log('✅ Sales person enrolled in course');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
