# 🚀 راهنمای نصب و راه‌اندازی

## 📋 پیش‌نیازها

- **Docker**: نسخه 20.10 یا بالاتر
- **Docker Compose**: نسخه 2.0 یا بالاتر
- **Git**: برای clone کردن پروژه

## 🔧 نصب

### 1️⃣ Clone کردن پروژه

```bash
git clone <repository-url>
cd new-haghighi
```

### 2️⃣ ساخت فایل Environment

```bash
cp local.env .env
```

یا دستی یک فایل `.env` بسازید با این محتوا:

```env
# Database
POSTGRES_DB=haghighi_db
POSTGRES_USER=haghighi_user
POSTGRES_PASSWORD=SecurePassword123

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Backend
PORT=3000
NODE_ENV=development
MAX_FILE_SIZE=10737418240
UPLOAD_PATH=/app/uploads

# Database URL
DATABASE_URL=postgresql://haghighi_user:SecurePassword123@postgres:5432/haghighi_db?schema=public

# API URL
REACT_APP_API_URL=http://localhost:3000/api
```

### 3️⃣ ساخت پوشه uploads

```bash
mkdir -p uploads
chmod 777 uploads
```

### 4️⃣ اجرای Docker Compose

```bash
docker-compose up -d
```

اولین بار کمی طول می‌کشه چون باید image‌ها رو build کنه.

### 5️⃣ چک کردن وضعیت

```bash
docker-compose ps
```

باید 4 container ببینید:
- `haghighi_postgres` - دیتابیس
- `haghighi_backend` - API
- `haghighi_frontend` - وب‌سایت
- `haghighi_admin` - پنل ادمین

### 6️⃣ مشاهده لاگ‌ها

```bash
docker-compose logs -f
```

منتظر بمانید تا همه سرویس‌ها start بشن.

## 🌐 دسترسی به برنامه

بعد از اینکه همه چیز آماده شد:

| سرویس | آدرس | توضیحات |
|-------|------|---------|
| Frontend | http://localhost:3002 | وب‌سایت اصلی |
| Admin Panel | http://localhost:3001 | پنل مدیریت |
| Backend API | http://localhost:3000/api | API endpoint |
| API Docs | http://localhost:3000/api/docs | مستندات Swagger |

## 🎯 اولین استفاده

### ساخت Admin اول

Backend به صورت خودکار دیتابیس رو setup می‌کنه. برای ساخت کاربر ادمین اول:

```bash
docker exec -it haghighi_backend sh
npx prisma db seed
exit
```

یا اگر seed script ندارید، می‌تونید از API ثبت‌نام استفاده کنید.

### تست API

```bash
# Health check
curl http://localhost:3000/api/health

# یا از مرورگر
open http://localhost:3000/api/docs
```

## 🛠️ توسعه محلی

### Backend Development

```bash
cd backend
npm install
npm run start:dev
```

Backend روی http://localhost:3000 اجرا می‌شه.

### Frontend Development

```bash
cd frontend
npm install
npm start
```

Frontend روی http://localhost:3003 اجرا می‌شه (پورت پیش‌فرض React).

### Admin Panel Development

```bash
cd admin-panel
npm install
npm start
```

Admin روی http://localhost:3004 اجرا می‌شه.

## 🔄 دستورات مفید

### مشاهده وضعیت
```bash
docker-compose ps
```

### مشاهده لاگ‌ها
```bash
# همه سرویس‌ها
docker-compose logs -f

# یک سرویس خاص
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f admin
docker-compose logs -f postgres
```

### ری‌استارت سرویس‌ها
```bash
# همه
docker-compose restart

# یکی
docker-compose restart backend
```

### متوقف کردن
```bash
docker-compose down
```

### متوقف کردن و حذف volumes (پاک کردن دیتابیس)
```bash
docker-compose down -v
```

### Build مجدد
```bash
# همه
docker-compose build --no-cache

# یکی
docker-compose build --no-cache backend
```

### اجرا با rebuild
```bash
docker-compose up -d --build
```

## 🐛 عیب‌یابی

### مشکل: پورت قبلاً استفاده شده

```bash
# پیدا کردن process
lsof -i :3000
lsof -i :3001
lsof -i :3002

# کشتن process
kill -9 <PID>
```

### مشکل: دیتابیس وصل نمیشه

```bash
# چک لاگ
docker-compose logs postgres

# ری‌استارت
docker-compose restart postgres

# اگر کار نکرد، پاک کردن volume
docker-compose down -v
docker-compose up -d
```

### مشکل: Backend اجرا نمیشه

```bash
# لاگ
docker-compose logs backend

# دسترسی به shell
docker exec -it haghighi_backend sh

# چک Prisma
npx prisma db push
npx prisma generate
```

### مشکل: Frontend/Admin build نمیشه

```bash
# پاک کردن و build مجدد
docker-compose down
docker rmi haghighi_frontend haghighi_admin
docker-compose build --no-cache frontend admin
docker-compose up -d
```

### مشکل: حافظه کم

```bash
# پاک کردن images و containers استفاده نشده
docker system prune -a

# پاک کردن volumes استفاده نشده
docker volume prune
```

## 🔒 نکات امنیتی

### برای Production

1. **تغییر پسوردها:**
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`

2. **تنظیم NODE_ENV:**
   ```env
   NODE_ENV=production
   ```

3. **تنظیم CORS:**
   در `backend/src/main.ts`:
   ```typescript
   app.enableCors({
     origin: 'https://yourdomain.com',
     credentials: true,
   });
   ```

4. **استفاده از HTTPS**

5. **محدود کردن دسترسی به پورت‌ها**

## 📚 منابع بیشتر

- [Docker Documentation](https://docs.docker.com/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)

## 🆘 کمک

اگر مشکلی داشتید:

1. لاگ‌های کامل رو ببینید: `docker-compose logs > logs.txt`
2. وضعیت containers رو چک کنید: `docker-compose ps`
3. یک Issue باز کنید با جزئیات کامل

---

**آخرین به‌روزرسانی:** 2025-10-28

