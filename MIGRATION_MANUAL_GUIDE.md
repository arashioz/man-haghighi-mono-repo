# راهنمای اجرای دستی مایگریشن‌ها

این راهنما مراحل اجرای دستی مایگریشن‌ها را به صورت مرحله به مرحله توضیح می‌دهد.

## مرحله 1: راه‌اندازی دیتابیس

```bash
# بررسی وضعیت container های Docker
docker ps -a

# راه‌اندازی فقط دیتابیس (بدون backend)
docker-compose -f docker-compose-alt-ports.yml up -d postgres

# بررسی آماده بودن دیتابیس
docker exec haghighi_postgres pg_isready -U haghighi_user -d haghighi_db

# یا بررسی لاگ‌ها
docker logs haghighi_postgres --tail 20
```

**نکته**: منتظر بمانید تا دیتابیس کاملاً آماده شود (معمولاً 10-15 ثانیه)

## مرحله 2: بررسی اتصال به دیتابیس

```bash
# بررسی متغیرهای محیطی
docker exec haghighi_backend env | grep DATABASE_URL

# تست اتصال دستی
docker exec haghighi_backend npx prisma db execute --stdin <<EOF
SELECT version();
EOF
```

اگر خطا داد، بررسی کنید:
- آیا postgres container در حال اجرا است؟
- آیا DATABASE_URL درست است؟
- آیا network درست تنظیم شده است؟

## مرحله 3: بررسی وضعیت مایگریشن‌ها

```bash
# بررسی وضعیت مایگریشن‌ها
docker exec haghighi_backend npx prisma migrate status

# بررسی مایگریشن‌های موجود در دیتابیس
docker exec haghighi_postgres psql -U haghighi_user -d haghighi_db -c "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name;"

# بررسی فایل‌های مایگریشن
docker exec haghighi_backend ls -1 /app/prisma/migrations/ | grep -E "^[0-9]" | sort
```

## مرحله 4: حل مشکلات مایگریشن‌های ناموفق

اگر مایگریشن‌های ناموفق وجود دارند:

```bash
# لیست مایگریشن‌های ناموفق
docker exec haghighi_backend npx prisma migrate status | grep -i failed

# حل کردن یک مایگریشن ناموفق (به عنوان rolled-back)
docker exec haghighi_backend npx prisma migrate resolve --rolled-back <migration_name>

# مثال:
docker exec haghighi_backend npx prisma migrate resolve --rolled-back 20250120000000_add_rate_limiting_fields
```

## مرحله 5: هماهنگ کردن نام مایگریشن‌ها

اگر نام مایگریشن در دیتابیس با فایل‌ها متفاوت است:

### گزینه 1: تغییر نام فایل‌ها (توصیه می‌شود)

```bash
# وارد شدن به container
docker exec -it haghighi_backend sh

# تغییر نام فایل‌ها
cd /app/prisma/migrations

# اگر فایل 20251020000000 وجود دارد اما در دیتابیس 20250120000000 است:
mv 20251020000000_add_rate_limiting_fields 20250120000000_add_rate_limiting_fields

# همین کار برای سایر مایگریشن‌ها
mv 20251021000000_add_must_change_password 20250121000000_add_must_change_password
mv 20251015000000_add_otp_fields 20250115000000_add_otp_fields

# خروج
exit
```

### گزینه 2: تغییر نام در دیتابیس

```bash
docker exec haghighi_postgres psql -U haghighi_user -d haghighi_db <<EOF
UPDATE _prisma_migrations 
SET migration_name = '20251020000000_add_rate_limiting_fields' 
WHERE migration_name = '20250120000000_add_rate_limiting_fields';
EOF
```

## مرحله 6: اجرای مایگریشن‌ها

```bash
# اجرای مایگریشن‌ها
docker exec haghighi_backend ./scripts/migrate.sh

# یا مستقیم:
docker exec haghighi_backend npx prisma migrate deploy
```

**نکته**: اگر خطا داد، خطا را بررسی کنید و مایگریشن مشکل‌دار را resolve کنید.

## مرحله 7: بررسی نتیجه

```bash
# بررسی وضعیت نهایی
docker exec haghighi_backend npx prisma migrate status

# بررسی وجود جدول‌های ضروری
docker exec haghighi_backend npx prisma db execute --stdin <<EOF
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'logs', 'podcasts')
ORDER BY table_name;
EOF
```

## مرحله 8: راه‌اندازی Backend

```bash
# راه‌اندازی backend
docker-compose -f docker-compose-alt-ports.yml up -d backend

# بررسی لاگ‌ها
docker logs haghighi_backend --tail 50 -f
```

## مرحله 9: اجرای Seed (اختیاری)

```bash
# اجرای seed
docker exec haghighi_backend ./scripts/seed-with-migration.sh

# یا فقط seed:
docker exec haghighi_backend npm run prisma:seed
```

## دستورات سریع

```bash
# همه چیز در یک خط (بعد از آماده شدن دیتابیس)
docker exec haghighi_backend npx prisma migrate deploy && \
docker exec haghighi_backend npx prisma generate && \
docker-compose -f docker-compose-alt-ports.yml up -d backend

# بررسی وضعیت
docker exec haghighi_backend npx prisma migrate status
docker logs haghighi_backend --tail 20
```

## عیب‌یابی

### مشکل: Cannot connect to database

```bash
# بررسی postgres
docker ps | grep postgres
docker logs haghighi_postgres --tail 20

# بررسی network
docker network ls
docker network inspect new-haghighi_backend_network

# تست اتصال از backend به postgres
docker exec haghighi_backend ping -c 3 postgres
```

### مشکل: Migration not found locally

```bash
# بررسی فایل‌های موجود
docker exec haghighi_backend ls -la /app/prisma/migrations/

# اگر فایل وجود ندارد، از host کپی کنید
docker cp backend/prisma/migrations/<migration_name> haghighi_backend:/app/prisma/migrations/
```

### مشکل: Migration failed

```bash
# بررسی خطا
docker exec haghighi_backend npx prisma migrate deploy 2>&1 | head -20

# Resolve کردن
docker exec haghighi_backend npx prisma migrate resolve --rolled-back <migration_name>
```

## نکات مهم

1. **همیشه ابتدا دیتابیس را راه‌اندازی کنید** قبل از backend
2. **بررسی کنید مایگریشن‌ها هماهنگ هستند** بین دیتابیس و فایل‌ها
3. **لاگ‌ها را بررسی کنید** برای تشخیص مشکلات
4. **از backup استفاده کنید** قبل از تغییرات مهم

