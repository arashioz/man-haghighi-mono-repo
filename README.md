# Haghighi Platform

یک پلتفرم جامع برای مدیریت دوره‌ها، کارگاه‌ها، و محتوای آموزشی.

## 🚀 شروع سریع

### پیش‌نیازها
- Docker و Docker Compose

### نصب و اجرا

1. کپی کردن فایل environment:
```bash
cp .env.example .env
```

2. ویرایش `.env` و تنظیم مقادیر:
```bash
nano .env
```

3. اجرای پروژه:
```bash
docker-compose up -d
```

4. چک کردن وضعیت:
```bash
docker-compose ps
```

### دسترسی به سرویس‌ها

- 🌐 **Frontend**: http://localhost:3002
- 👤 **Admin Panel**: http://localhost:3001  
- 🔌 **Backend API**: http://localhost:3000/api
- 📚 **API Docs**: http://localhost:3000/api/docs

## 🛠️ دستورات مفید

### مشاهده لاگ‌ها
```bash
# همه سرویس‌ها
docker-compose logs -f

# یک سرویس خاص
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f admin
```

### ری‌استارت
```bash
# همه
docker-compose restart

# یک سرویس
docker-compose restart backend
```

### متوقف و حذف
```bash
# متوقف کردن
docker-compose down

# حذف با volumes
docker-compose down -v
```

### Rebuild
```bash
# Build مجدد بدون cache
docker-compose build --no-cache

# Build و اجرا
docker-compose up -d --build
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
