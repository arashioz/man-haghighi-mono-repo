# راهنمای رفع مشکل مایگریشن Podcast Thumbnail

## مشکل
مایگریشن `20250101000000_add_podcast_thumbnail` قبل از مایگریشن اولیه اجرا می‌شد و جدول `podcasts` هنوز وجود نداشت.

## راه‌حل اعمال شده
- ✅ مایگریشن به `20251014000000_add_podcast_thumbnail` تغییر نام داده شد
- ✅ اسکریپت‌های migration به‌روزرسانی شدند
- ✅ Restart policy موقتاً غیرفعال شد تا از restart loop جلوگیری شود

## مراحل رفع مشکل روی سرور

### روش 1: استفاده از اسکریپت خودکار (توصیه می‌شود)

```bash
# 1. آپلود کد جدید به سرور (با مایگریشن جدید)
git pull  # یا روش دیگر آپلود کد

# 2. اجرای اسکریپت رفع مشکل
./fix-migration-on-server.sh
```

### روش 2: رفع دستی

```bash
# 1. متوقف کردن کانتینر
docker stop haghighi_backend

# 2. حذف رکورد مایگریشن ناموفق از دیتابیس
docker exec haghighi_postgres psql -U haghighi_user -d haghighi_db -c "DELETE FROM _prisma_migrations WHERE migration_name = '20250101000000_add_podcast_thumbnail';"

# 3. Rebuild کردن image با کد جدید
docker-compose -f docker-compose-alt-ports.yml build backend

# 4. راه‌اندازی مجدد
docker-compose -f docker-compose-alt-ports.yml up -d backend

# 5. بررسی لاگ‌ها
docker logs haghighi_backend --tail 50 -f
```

### روش 3: رفع سریع بدون rebuild (موقت)

اگر نمی‌توانید rebuild کنید:

```bash
# 1. متوقف کردن کانتینر
docker stop haghighi_backend

# 2. حذف رکورد مایگریشن ناموفق
docker exec haghighi_postgres psql -U haghighi_user -d haghighi_db -c "DELETE FROM _prisma_migrations WHERE migration_name = '20250101000000_add_podcast_thumbnail';"

# 3. راه‌اندازی موقت کانتینر و حذف فایل قدیمی
docker start haghighi_backend
sleep 3
docker exec haghighi_backend rm -rf /app/prisma/migrations/20250101000000_add_podcast_thumbnail
docker stop haghighi_backend

# 4. کپی کردن مایگریشن جدید به کانتینر (اگر volume mount ندارید)
# باید از docker cp استفاده کنید یا rebuild کنید
```

## بعد از رفع مشکل

### 1. تغییر restart policy به حالت قبل

در فایل `docker-compose-alt-ports.yml` خط 48 را تغییر دهید:

```yaml
restart: "no"  # تغییر به:
restart: unless-stopped
```

### 2. راه‌اندازی مجدد

```bash
docker-compose -f docker-compose-alt-ports.yml up -d
```

### 3. بررسی وضعیت

```bash
# بررسی لاگ‌ها
docker logs haghighi_backend --tail 50

# بررسی وضعیت مایگریشن‌ها
docker exec haghighi_backend npx prisma migrate status
```

## بررسی موفقیت

اگر همه چیز درست باشد، باید ببینید:
- ✅ کانتینر بدون خطا راه‌اندازی می‌شود
- ✅ مایگریشن‌ها به ترتیب اعمال می‌شوند
- ✅ جدول `podcasts` با ستون `thumbnail` وجود دارد

## در صورت بروز مشکل

اگر هنوز مشکل دارید:

```bash
# بررسی وضعیت مایگریشن‌ها در دیتابیس
docker exec haghighi_postgres psql -U haghighi_user -d haghighi_db -c "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name;"

# بررسی وجود جدول podcasts
docker exec haghighi_postgres psql -U haghighi_user -d haghighi_db -c "\d podcasts"

# بررسی فایل‌های مایگریشن در کانتینر
docker exec haghighi_backend ls -la /app/prisma/migrations/ | grep podcast
```



