# راهنمای آپدیت اپلیکیشن روی سرور

این راهنما برای آپدیت کردن اپلیکیشن روی سرور که با Docker اجرا می‌شود.

## پیش‌نیازها

- دسترسی SSH به سرور
- Docker و Docker Compose نصب شده
- فایل `docker-compose-alt-ports.yml` در دسترس

## مراحل آپدیت

### 1. اتصال به سرور

```bash
ssh user@185.231.112.84
# یا با IP و user مناسب خودتان
```

### 2. رفتن به دایرکتوری پروژه

```bash
cd /path/to/new-haghighi
# مسیر دقیق پروژه روی سرور
```

### 3. Pull کردن تغییرات جدید

```bash
git pull origin master
```

### 4. متوقف کردن کانتینرها (اختیاری - برای rebuild)

```bash
docker-compose -f docker-compose-alt-ports.yml down
```

یا فقط restart کردن:

```bash
docker-compose -f docker-compose-alt-ports.yml restart
```

### 5. Rebuild کردن images (اگر تغییرات در Dockerfile یا dependencies باشد)

```bash
# Rebuild همه سرویس‌ها
docker-compose -f docker-compose-alt-ports.yml build --no-cache

# یا فقط backend
docker-compose -f docker-compose-alt-ports.yml build --no-cache backend

# یا فقط frontend
docker-compose -f docker-compose-alt-ports.yml build --no-cache frontend
```

### 6. راه‌اندازی مجدد سرویس‌ها

```bash
docker-compose -f docker-compose-alt-ports.yml up -d
```

### 7. اجرای Migration (اگر تغییرات دیتابیس باشد)

```bash
# استفاده از اسکریپت
./run-migration-seed.sh

# یا دستی
docker exec haghighi_backend sh -c "cd /app && npx prisma migrate deploy"
docker exec haghighi_backend sh -c "cd /app && npx prisma generate"
```

### 8. بررسی وضعیت کانتینرها

```bash
docker-compose -f docker-compose-alt-ports.yml ps
docker-compose -f docker-compose-alt-ports.yml logs -f --tail=50
```

## دستورات سریع (یکجا)

```bash
# آپدیت کامل
cd /path/to/new-haghighi && \
git pull origin master && \
docker-compose -f docker-compose-alt-ports.yml down && \
docker-compose -f docker-compose-alt-ports.yml build --no-cache && \
docker-compose -f docker-compose-alt-ports.yml up -d && \
docker exec haghighi_backend sh -c "cd /app && npx prisma migrate deploy" && \
docker exec haghighi_backend sh -c "cd /app && npx prisma generate" && \
docker-compose -f docker-compose-alt-ports.yml ps
```

## آپدیت بدون Downtime (Zero Downtime)

برای آپدیت بدون قطعی سرویس:

```bash
# 1. Pull تغییرات
git pull origin master

# 2. Build image جدید در background
docker-compose -f docker-compose-alt-ports.yml build backend frontend admin

# 3. Restart با image جدید
docker-compose -f docker-compose-alt-ports.yml up -d --no-deps backend frontend admin

# 4. Migration
docker exec haghighi_backend sh -c "cd /app && npx prisma migrate deploy"
```

## بررسی لاگ‌ها

```bash
# لاگ همه سرویس‌ها
docker-compose -f docker-compose-alt-ports.yml logs -f

# لاگ فقط backend
docker-compose -f docker-compose-alt-ports.yml logs -f backend

# لاگ فقط frontend
docker-compose -f docker-compose-alt-ports.yml logs -f frontend

# آخرین 100 خط لاگ
docker-compose -f docker-compose-alt-ports.yml logs --tail=100
```

## عیب‌یابی

### اگر کانتینر start نمی‌شود:

```bash
# بررسی لاگ
docker-compose -f docker-compose-alt-ports.yml logs backend

# بررسی وضعیت
docker ps -a | grep haghighi

# حذف و rebuild
docker-compose -f docker-compose-alt-ports.yml down
docker-compose -f docker-compose-alt-ports.yml build --no-cache
docker-compose -f docker-compose-alt-ports.yml up -d
```

### اگر migration مشکل دارد:

```bash
# بررسی وضعیت migration
docker exec haghighi_backend sh -c "cd /app && npx prisma migrate status"

# حل مشکل failed migration
./fix-failed-migration.sh

# یا reset migration (⚠️ مراقب باشید)
./reset-migrations-simple.sh
```

### اگر فایل‌های static لود نمی‌شوند:

```bash
# بررسی volume mount
docker inspect haghighi_backend | grep -A 10 Mounts

# بررسی وجود فایل‌ها
docker exec haghighi_backend ls -la /app/uploads
```

## نکات مهم

1. **همیشه قبل از آپدیت backup بگیرید:**
   ```bash
   # Backup دیتابیس
   docker exec haghighi_postgres pg_dump -U haghighi_user haghighi_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **بررسی .env فایل:**
   - مطمئن شوید که فایل `.env` روی سرور درست تنظیم شده است
   - مقادیر `DATABASE_URL`, `JWT_SECRET` و سایر متغیرها را بررسی کنید

3. **بررسی پورت‌ها:**
   - پورت 8080 برای backend
   - پورت 8081 برای frontend
   - پورت 8082 برای admin
   - پورت 5432 برای postgres (فقط برای debug)

4. **بررسی فایروال:**
   - مطمئن شوید که پورت‌های 8080, 8081, 8082 باز هستند

## اسکریپت خودکار آپدیت

می‌توانید یک اسکریپت `update-on-server.sh` بسازید:

```bash
#!/bin/bash
set -e

echo "🔄 Starting update process..."

cd /path/to/new-haghighi

echo "📥 Pulling latest changes..."
git pull origin master

echo "🐳 Stopping containers..."
docker-compose -f docker-compose-alt-ports.yml down

echo "🔨 Building images..."
docker-compose -f docker-compose-alt-ports.yml build --no-cache

echo "🚀 Starting containers..."
docker-compose -f docker-compose-alt-ports.yml up -d

echo "⏳ Waiting for services to start..."
sleep 10

echo "📦 Running migrations..."
docker exec haghighi_backend sh -c "cd /app && npx prisma migrate deploy" || echo "⚠️ Migration failed, check logs"

echo "✅ Update completed!"
docker-compose -f docker-compose-alt-ports.yml ps
```

سپس:
```bash
chmod +x update-on-server.sh
./update-on-server.sh
```

