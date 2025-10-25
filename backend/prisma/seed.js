const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

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
      email: 'sales_manager@haghighi.com',
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
      email: 'sales_person@haghighi.com',
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

  // Create sample sliders (with error handling)
  let sliders = [];
  try {
    sliders = await Promise.all([
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
  } catch (error) {
    console.log('⚠️ Sliders table not found, skipping slider creation');
  }

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
        title: 'مقدمه دوره انرژی پول',
        description: 'آشنایی با مفاهیم اولیه انرژی پول و موفقیت مالی',
        videoFile: 'video-1760395629334-521819724.mp4',
        thumbnail: 'thumbnail-1760147824308-101038153.png',
        duration: 1200, // 20 minutes
        order: 1,
        courseId: course.id,
        published: true,
      },
    }),
    prisma.video.create({
      data: {
        title: 'رازهای ذهن ثروتمند',
        description: 'نحوه تغییر ذهنیت برای جذب ثروت و موفقیت',
        videoFile: 'video-1760396128325-423588410.mp4',
        thumbnail: 'thumbnail-1760148279912-399946551.png',
        duration: 1800, // 30 minutes
        order: 2,
        courseId: course.id,
        published: true,
      },
    }),
    prisma.video.create({
      data: {
        title: 'استراتژی‌های سرمایه‌گذاری',
        description: 'راه‌های مختلف سرمایه‌گذاری و مدیریت ریسک',
        videoFile: 'video-1760396386754-355493479.mp4',
        thumbnail: 'thumbnail-1760396100887-327500662.jpg',
        duration: 2400, // 40 minutes
        order: 3,
        courseId: course.id,
        published: true,
      },
    }),
  ]);

  console.log('🎥 Videos created:', videos.length);

  // Create sample audios
  const audios = await Promise.all([
    prisma.audio.create({
      data: {
        title: 'مدیتیشن انرژی پول',
        description: 'مدیتیشن هدایت شده برای جذب انرژی مثبت پول',
        audioFile: 'audio-meditation.mp3',
        thumbnail: 'thumbnail-1760396125768-116614639.jpg',
        duration: 900, // 15 minutes
        order: 1,
        courseId: course.id,
        published: true,
      },
    }),
    prisma.audio.create({
      data: {
        title: 'تکرارهای مثبت برای ثروت',
        description: 'تکرار عبارات مثبت برای برنامه‌ریزی ذهن ناخودآگاه',
        audioFile: 'audio-affirmations.mp3',
        thumbnail: 'thumbnail-1760396384537-720831904.jpg',
        duration: 600, // 10 minutes
        order: 2,
        courseId: course.id,
        published: true,
      },
    }),
  ]);

  console.log('🎵 Audios created:', audios.length);

  // Create sample articles
  const articles = await Promise.all([
    prisma.article.create({
      data: {
        title: 'رازهای موفقیت مالی از زبان فراز قورچیان',
        slug: 'financial-success-secrets',
        content: `
          <h2>مقدمه</h2>
          <p>موفقیت مالی یکی از مهم‌ترین اهداف زندگی هر فردی است. در این مقاله، رازهای موفقیت مالی را از زبان فراز قورچیان بررسی می‌کنیم.</p>
          
          <h2>نکات کلیدی</h2>
          <ul>
            <li>تغییر ذهنیت نسبت به پول</li>
            <li>ایجاد عادات مالی مثبت</li>
            <li>سرمایه‌گذاری هوشمند</li>
            <li>مدیریت ریسک</li>
          </ul>
          
          <h2>نتیجه‌گیری</h2>
          <p>موفقیت مالی نیازمند تغییر در نگرش و رفتارهای مالی است.</p>
        `,
        excerpt: 'رازهای موفقیت مالی از زبان فراز قورچیان - راهنمای جامع برای رسیدن به استقلال مالی',
        featuredImage: 'article-financial-success.jpg',
        published: true,
        publishedAt: new Date(),
      },
    }),
    prisma.article.create({
      data: {
        title: 'انرژی مثبت و تأثیر آن بر موفقیت',
        slug: 'positive-energy-success',
        content: `
          <h2>انرژی مثبت چیست؟</h2>
          <p>انرژی مثبت یکی از مهم‌ترین عوامل موفقیت در زندگی است.</p>
          
          <h2>راه‌های ایجاد انرژی مثبت</h2>
          <ul>
            <li>مدیتیشن روزانه</li>
            <li>تکرار عبارات مثبت</li>
            <li>ورزش و تغذیه سالم</li>
            <li>ارتباط با افراد مثبت</li>
          </ul>
        `,
        excerpt: 'راهنمای کامل برای ایجاد و حفظ انرژی مثبت در زندگی',
        featuredImage: 'article-positive-energy.jpg',
        published: true,
        publishedAt: new Date(),
      },
    }),
  ]);

  console.log('📰 Articles created:', articles.length);

  // Create sample podcasts
  const podcasts = await Promise.all([
    prisma.podcast.create({
      data: {
        title: 'رادیو انرژی پول - قسمت اول',
        description: 'اولین قسمت از مجموعه پادکست‌های انرژی پول با موضوع ذهنیت ثروت',
        audioFile: 'podcast-episode-1.mp3',
        duration: 1800, // 30 minutes
        published: true,
        publishedAt: new Date(),
      },
    }),
    prisma.podcast.create({
      data: {
        title: 'رادیو انرژی پول - قسمت دوم',
        description: 'دومین قسمت با موضوع استراتژی‌های سرمایه‌گذاری',
        audioFile: 'podcast-episode-2.mp3',
        duration: 2100, // 35 minutes
        published: true,
        publishedAt: new Date(),
      },
    }),
  ]);

  console.log('🎙️ Podcasts created:', podcasts.length);

  // Create sample workshop
  const workshop = await prisma.workshop.create({
    data: {
      title: 'کارگاه انرژی پول - تهران',
      description: 'کارگاه حضوری انرژی پول با حضور فراز قورچیان در تهران',
      date: '1403/09/15 14:30',
      location: 'تهران - سالن همایش‌های بین‌المللی',
      maxParticipants: 100,
      price: 500.00,
      thumbnail: 'workshop-tehran.jpg',
      isActive: true,
      createdBy: admin.id,
    },
  });

  console.log('🏢 Workshop created:', workshop.title);

  // Create sample workshop participants
  const participants = await Promise.all([
    prisma.workshopParticipant.create({
      data: {
        workshopId: workshop.id,
        customerPhone: '09123456792',
        customerName: 'علی احمدی',
        prepaymentAmount: 100.00,
        paymentStatus: 'PAID',
        paymentLink: 'https://payment.example.com/123',
        invitationCard: 'invitation-card-1.jpg',
        createdBy: admin.id,
      },
    }),
    prisma.workshopParticipant.create({
      data: {
        workshopId: workshop.id,
        customerPhone: '09123456793',
        customerName: 'فاطمه محمدی',
        prepaymentAmount: 150.00,
        paymentStatus: 'PENDING',
        paymentLink: 'https://payment.example.com/124',
        invitationCard: 'invitation-card-2.jpg',
        createdBy: salesManager.id,
      },
    }),
  ]);

  console.log('👥 Workshop participants created:', participants.length);

  // Create sales team
  const salesTeam = await prisma.salesTeam.create({
    data: {
      name: 'تیم فروش تهران',
      managerId: salesManager.id,
      description: 'تیم فروش فعال در منطقه تهران',
      isActive: true,
    },
  });

  console.log('👥 Sales team created:', salesTeam.name);

  // Add sales person to team
  await prisma.salesTeamMember.create({
    data: {
      teamId: salesTeam.id,
      salesPersonId: salesPerson.id,
      isActive: true,
    },
  });

  console.log('👤 Sales person added to team');

  // Grant workshop access to sales person
  await prisma.salesPersonWorkshopAccess.create({
    data: {
      salesPersonId: salesPerson.id,
      workshopId: workshop.id,
      isActive: true,
      grantedBy: salesManager.id,
    },
  });

  console.log('🔓 Workshop access granted to sales person');

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
