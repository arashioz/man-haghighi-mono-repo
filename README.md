# Haghighi Platform

یک پلتفرم جامع برای مدیریت دوره‌ها، کارگاه‌ها، و محتوای آموزشی.

## 🚀 شروع سریع

### پیش‌نیازها
- Docker و Docker Compose
- Node.js (اختیاری - فقط برای npm scripts)

### نصب و اجرا

**روش 1: با npm (توصیه می‌شه!) ⭐**

```bash
# نصب و راه‌اندازی
npm run setup

# اجرای برنامه
npm start
```

**همین! یک دستور و همه چی آماده است** 🎉

---

**روش 2: دستی با Docker Compose**

```bash
# 1. کپی کردن فایل environment
cp local.env .env

# 2. ساخت پوشه uploads
mkdir -p uploads && chmod 777 uploads

# 3. اجرای پروژه
docker-compose up -d

# 4. چک کردن وضعیت
docker-compose ps
```

### دسترسی به سرویس‌ها

- 🌐 **Frontend**: http://localhost:3002
- 👤 **Admin Panel**: http://localhost:3001  
- 🔌 **Backend API**: http://localhost:3000/api
- 📚 **API Docs**: http://localhost:3000/api/docs

## 🛠️ دستورات مفید

### دستورات اصلی

```bash
npm start              # شروع برنامه (docker-compose up)
npm run docker:down    # متوقف کردن
npm run docker:restart # ری‌استارت همه سرویس‌ها
npm run docker:logs    # مشاهده لاگ‌های همه سرویس‌ها
npm run docker:ps      # وضعیت containers
```

### دستورات Build

```bash
npm run docker:build    # Build کردن images
npm run docker:rebuild  # Build مجدد بدون cache
npm run fresh:start     # پاک کردن همه چیز و شروع از صفر
```

### مشاهده لاگ‌های جداگانه

```bash
npm run backend:logs   # لاگ backend
npm run frontend:logs  # لاگ frontend
npm run admin:logs     # لاگ admin panel
npm run postgres:logs  # لاگ database
```

### دسترسی به Shell

```bash
npm run backend:shell   # Shell backend container
npm run postgres:shell  # PostgreSQL shell
```

### دیتابیس

```bash
npm run db:push    # اعمال schema به database
npm run db:seed    # Seed کردن دیتا
npm run db:studio  # باز کردن Prisma Studio
```

### تست

```bash
npm run test:api   # تست سریع API endpoints
```

### پاک‌سازی

```bash
npm run docker:clean  # پاک کردن volumes و containers
npm run clean:all     # پاک کردن کامل (images هم پاک میشه)
```

## 📁 ساختار پروژه

```
.
├── backend/          # NestJS API
├── frontend/         # React Frontend
├── admin-panel/      # React Admin Panel
├── uploads/          # فایل‌های آپلود شده
└── docker-compose.yml
```

## 🔧 توسعه

### Backend
```bash
cd backend
npm install
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### Admin Panel
```bash
cd admin-panel
npm install
npm start
```

## 📝 نکات

- پسورد دیتابیس و JWT_SECRET رو حتماً تغییر بدید
- برای production از یک `.env` جداگانه استفاده کنید
- فایل‌های آپلود شده در پوشه `uploads` ذخیره می‌شن

## 🐛 عیب‌یابی

### دیتابیس وصل نمیشه
```bash
docker-compose restart postgres
docker-compose logs postgres
```

### Backend اجرا نمیشه
```bash
docker-compose logs backend
docker-compose restart backend
```

### Frontend/Admin لود نمیشه
```bash
docker-compose restart frontend admin
docker-compose logs frontend admin
```

## 🚀 Deploy روی سرور

برای deploy کردن روی سرور با IP:

```bash
# روی سرور
git clone <repository-url>
cd new-haghighi

# تنظیم environment
cp server.env .env
nano .env  # IP سرور و پسوردها رو تغییر بدید

# Deploy
./deploy.sh
```

راهنمای کامل در فایل [DEPLOY.md](./DEPLOY.md)

## 📞 پشتیبانی

برای گزارش مشکل یا سوال، یک Issue باز کنید.
