# Haghighi Platform

یک پلتفرم کامل آموزشی با NestJS، React و PostgreSQL که شامل پنل مدیریت و فرانت‌اند کاربری می‌باشد.

## ویژگی‌ها

### فرانت‌اند کاربری
- 🏠 صفحه اصلی با اسلایدر و محتوای برجسته
- 📚 لیست دوره‌ها و جزئیات دوره
- 📝 مقالات و جزئیات مقاله
- 🎧 پادکست‌ها با پخش‌کننده صوتی
- 👤 سیستم ورود و ثبت‌نام کاربران
- 📊 داشبورد کاربری برای مدیریت دوره‌های خریداری شده
- 🎥 پخش ویدیو برای کاربران دارای دسترسی

### پنل مدیریت
- 📊 داشبورد با آمار کلی
- 👥 مدیریت کاربران
- 🎠 مدیریت اسلایدرها
- 📝 مدیریت مقالات
- 🎧 مدیریت پادکست‌ها
- 📚 مدیریت دوره‌ها
- 🎥 مدیریت ویدیوها
- 📁 سیستم بارگزاری فایل

### بک‌اند
- 🚀 NestJS با TypeScript
- 🗄️ PostgreSQL با Prisma ORM
- 🔐 سیستم احراز هویت JWT
- 📁 بارگزاری فایل با Multer
- 🖼️ پردازش تصاویر با Sharp
- 📚 مستندات API با Swagger
- 🐳 Docker Compose

## نصب و راه‌اندازی

### پیش‌نیازها
- Node.js 18+
- Docker و Docker Compose
- Git

### راه‌اندازی با Docker

1. کلون کردن پروژه:
```bash
git clone <repository-url>
cd haghighi-platform
```

2. راه‌اندازی با Docker Compose:
```bash
docker-compose up --build
```

3. دسترسی به سرویس‌ها:
- Backend API: http://localhost:3000
- Admin Panel: http://localhost:3001
- Frontend: http://localhost:3002
- Swagger Docs: http://localhost:3000/api/docs

### راه‌اندازی دستی

1. نصب وابستگی‌ها:
```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# Admin Panel
cd ../admin-panel
npm install

# Frontend
cd ../frontend
npm install
```

2. راه‌اندازی دیتابیس:
```bash
# ایجاد دیتابیس PostgreSQL
createdb haghighi_db

# اجرای migration ها
cd backend
npx prisma migrate dev
npx prisma db seed
```

3. اجرای پروژه‌ها:
```bash
# Backend
cd backend
npm run start:dev

# Admin Panel (ترمینال جدید)
cd admin-panel
npm start

# Frontend (ترمینال جدید)
cd frontend
npm start
```

## ساختار پروژه

```
haghighi-platform/
├── backend/                 # NestJS Backend
│   ├── src/
│   │   ├── auth/           # سیستم احراز هویت
│   │   ├── users/          # مدیریت کاربران
│   │   ├── sliders/        # مدیریت اسلایدرها
│   │   ├── articles/       # مدیریت مقالات
│   │   ├── podcasts/       # مدیریت پادکست‌ها
│   │   ├── courses/        # مدیریت دوره‌ها
│   │   ├── videos/         # مدیریت ویدیوها
│   │   ├── uploads/        # سیستم بارگزاری
│   │   └── common/         # سرویس‌های مشترک
│   ├── prisma/             # Prisma Schema و Migration ها
│   └── uploads/             # فایل‌های بارگزاری شده
├── admin-panel/            # پنل مدیریت React
│   ├── src/
│   │   ├── components/     # کامپوننت‌های مشترک
│   │   ├── pages/          # صفحات پنل مدیریت
│   │   ├── services/       # سرویس‌های API
│   │   └── contexts/       # Context های React
├── frontend/              # فرانت‌اند کاربری React
│   ├── src/
│   │   ├── components/     # کامپوننت‌های مشترک
│   │   ├── pages/          # صفحات فرانت‌اند
│   │   ├── services/       # سرویس‌های API
│   │   └── contexts/       # Context های React
└── docker-compose.yml     # تنظیمات Docker
```

## API Endpoints

### احراز هویت
- `POST /auth/login` - ورود کاربر
- `POST /auth/register` - ثبت‌نام کاربر
- `GET /auth/profile` - دریافت پروفایل کاربر

### کاربران
- `GET /users` - لیست کاربران (Admin)
- `GET /users/:id` - جزئیات کاربر (Admin)
- `PATCH /users/:id` - ویرایش کاربر (Admin)
- `DELETE /users/:id` - حذف کاربر (Admin)

### اسلایدرها
- `GET /sliders` - لیست اسلایدرها
- `GET /sliders/active` - اسلایدرهای فعال
- `POST /sliders` - ایجاد اسلایدر (Admin)
- `PATCH /sliders/:id` - ویرایش اسلایدر (Admin)
- `DELETE /sliders/:id` - حذف اسلایدر (Admin)

### مقالات
- `GET /articles` - لیست مقالات
- `GET /articles/published` - مقالات منتشر شده
- `GET /articles/slug/:slug` - مقاله بر اساس slug
- `POST /articles` - ایجاد مقاله (Admin)
- `PATCH /articles/:id` - ویرایش مقاله (Admin)
- `DELETE /articles/:id` - حذف مقاله (Admin)

### پادکست‌ها
- `GET /podcasts` - لیست پادکست‌ها
- `GET /podcasts/published` - پادکست‌های منتشر شده
- `POST /podcasts` - ایجاد پادکست (Admin)
- `PATCH /podcasts/:id` - ویرایش پادکست (Admin)
- `DELETE /podcasts/:id` - حذف پادکست (Admin)

### دوره‌ها
- `GET /courses` - لیست دوره‌ها
- `GET /courses/published` - دوره‌های منتشر شده
- `GET /courses/:id` - جزئیات دوره
- `POST /courses/:id/enroll` - ثبت‌نام در دوره
- `GET /courses/my-courses` - دوره‌های کاربر
- `POST /courses` - ایجاد دوره (Admin)
- `PATCH /courses/:id` - ویرایش دوره (Admin)
- `DELETE /courses/:id` - حذف دوره (Admin)

### ویدیوها
- `GET /videos` - لیست ویدیوها
- `GET /videos/my-videos` - ویدیوهای قابل دسترسی کاربر
- `GET /videos/:id/stream` - اطلاعات پخش ویدیو
- `POST /videos` - ایجاد ویدیو (Admin)
- `PATCH /videos/:id` - ویرایش ویدیو (Admin)
- `DELETE /videos/:id` - حذف ویدیو (Admin)

### بارگزاری فایل
- `POST /uploads/image` - بارگزاری تصویر (Admin)
- `POST /uploads/video` - بارگزاری ویدیو (Admin)
- `POST /uploads/audio` - بارگزاری فایل صوتی (Admin)

## حساب‌های پیش‌فرض

### Admin
- Email: admin@haghighi.com
- Password: admin123

### User
- Email: user@haghighi.com
- Password: user123

## تکنولوژی‌های استفاده شده

### Backend
- **NestJS** - Framework Node.js
- **TypeScript** - زبان برنامه‌نویسی
- **PostgreSQL** - دیتابیس
- **Prisma** - ORM
- **JWT** - احراز هویت
- **Multer** - بارگزاری فایل
- **Sharp** - پردازش تصویر
- **Swagger** - مستندات API

### Frontend
- **React** - کتابخانه UI
- **TypeScript** - زبان برنامه‌نویسی
- **Tailwind CSS** - فریمورک CSS
- **React Router** - مسیریابی
- **Axios** - درخواست‌های HTTP

### Admin Panel
- **React** - کتابخانه UI
- **TypeScript** - زبان برنامه‌نویسی
- **Material-UI** - کامپوننت‌های UI
- **React Router** - مسیریابی
- **Axios** - درخواست‌های HTTP

### DevOps
- **Docker** - کانتینری‌سازی
- **Docker Compose** - مدیریت سرویس‌ها

## مشارکت

برای مشارکت در پروژه:

1. Fork کنید
2. Branch جدید ایجاد کنید (`git checkout -b feature/amazing-feature`)
3. تغییرات را commit کنید (`git commit -m 'Add some amazing feature'`)
4. Branch را push کنید (`git push origin feature/amazing-feature`)
5. Pull Request ایجاد کنید

## لایسنس

این پروژه تحت لایسنس MIT منتشر شده است.

## تماس

برای سوالات و پشتیبانی، با ما تماس بگیرید.
