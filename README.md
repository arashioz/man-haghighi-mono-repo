# Haghighi Platform

یک پلتفرم کامل آموزشی با NestJS، React و PostgreSQL که شامل پنل مدیریت و فرانت‌اند کاربری می‌باشد.

## 🚀 راه‌اندازی سریع (توسعه محلی)

### پیش‌نیازها
- Docker و Docker Compose
- Node.js 18+ و npm

### 🚀 راه‌اندازی سریع (توسعه محلی)

```bash
npm run dev:simple  # راه‌اندازی ساده با Docker
# یا
npm run dev         # راه‌اندازی پیشرفته با Docker (بدون nginx)
```

### 🏭 راه‌اندازی تولید (Production)

```bash
npm run start:prod  # راه‌اندازی تولید با nginx در Docker
# یا
npm run setup:nginx # راه‌اندازی nginx روی سیستم (بدون Docker)
```

### دستورات کامل

```bash
# Development (توسعه)
npm run dev              # راه‌اندازی پیشرفته (بدون nginx)
npm run dev:simple       # راه‌اندازی ساده (با nginx)
npm run stop:dev         # توقف سرویس‌های توسعه
npm run logs:dev         # لاگ‌های توسعه

# Production (تولید)
npm run start:prod       # راه‌اندازی تولید کامل
npm run setup:nginx      # راه‌اندازی nginx روی سیستم
npm run build:prod       # ساخت برای تولید
npm run logs             # لاگ‌های تولید

# General (عمومی)
npm run stop             # توقف تمام سرویس‌ها
npm run build            # ساخت تمام سرویس‌ها
npm run test             # تست تمام سرویس‌ها
```

### دسترسی به سرویس‌ها

- **وبسایت اصلی:** http://localhost
- **پنل مدیریت:** http://localhost/admin
- **مستندات API:** http://localhost/api/docs

### آپلود فایل‌ها

فایل‌ها در پوشه `backend/uploads/` ذخیره می‌شن و از طریق `http://localhost/uploads/` قابل دسترسی هستن.

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

## ساختار پروژه

```
├── backend/          # NestJS Backend
├── frontend/         # React Frontend
├── admin-panel/      # React Admin Panel
├── uploads/          # File uploads
├── docker-compose.yml # Docker services
└── nginx.conf        # Web server config
```

## 🚢 Production Deployment (راه‌اندازی تولید)

### روش 1: Docker Complete (توصیه شده)

```bash
# 1. تنظیم متغیرهای محیطی
cp production.env .env
# ویرایش .env با مقادیر واقعی

# 2. راه‌اندازی تولید
npm run start:prod
```

این روش تمام سرویس‌ها رو داخل Docker راه‌اندازی می‌کنه (شامل nginx).

### روش 2: Nginx روی سیستم

```bash
# 1. راه‌اندازی سرویس‌ها (بدون nginx)
npm run dev

# 2. تنظیم nginx
npm run setup:nginx
```

این روش nginx رو روی سیستم نصب و تنظیم می‌کنه.

### تنظیمات تولید

#### متغیرهای محیطی (production.env):
```bash
# Database
POSTGRES_PASSWORD=your-secure-password

# Security
JWT_SECRET=your-super-secure-jwt-secret

# Domain
DOMAIN_NAME=your-domain.com
API_BASE_URL=http://your-domain.com/api
REACT_APP_API_URL=http://your-domain.com/api
```

#### قبل از دیپلوی:
1. `.env` رو با مقادیر واقعی پر کنید
2. `DOMAIN_NAME` رو به دامنه واقعی تغییر بدید
3. `JWT_SECRET` رو به یک رمز قوی تغییر بدید
4. `POSTGRES_PASSWORD` رو به یک رمز قوی تغییر بدید

### بعد از دیپلوی:
- 🌐 **وبسایت:** http://your-domain.com
- 👨‍💼 **ادمین:** http://your-domain.com/admin
- 📚 **API:** http://your-domain.com/api
- 📁 **آپلودها:** http://your-domain.com/uploads/

## عیب‌یابی

**مشکل اتصال به دیتابیس:**
```bash
npm run stop
npm start  # راه‌اندازی مجدد همه چیز
```

**نیاز به بازسازی:**
```bash
npm run dev  # بازسازی و راه‌اندازی تمام سرویس‌ها
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
