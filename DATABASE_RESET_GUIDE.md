# راهنمای Reset دیتابیس و Migration

## وضعیت فعلی
تمام migration های قبلی پاک شدند تا تداخل‌ها برطرف شوند.

## راه حل نهایی - استفاده از Prisma DB Push

### روش 1: استفاده از Docker (توصیه می‌شود)

```bash
# 1. Docker daemon را اجرا کنید
# در macOS: Docker Desktop را باز کنید

# 2. دیتابیس را راه‌اندازی کنید
cd /path/to/project
docker-compose up -d postgres

# 3. صبر کنید تا دیتابیس آماده شود (30 ثانیه)
sleep 30

# 4. Schema را مستقیماً push کنید (تمام جداول را ایجاد می‌کند)
cd backend
npx prisma db push --force-reset

# 5. Prisma client را regenerate کنید
npx prisma generate

# 6. تست کنید
npm run build
```

### روش 2: بدون Docker (اگر دیتابیس مستقر دارید)

```bash
# اگر دیتابیس PostgreSQL مستقر دارید
cd backend

# Schema را push کنید
npx prisma db push --force-reset

# Prisma client را regenerate کنید
npx prisma generate

# تست build
npm run build
```

### روش 3: استفاده از Migration جدید (اگر Docker مشکل دارد)

```bash
cd backend

# Migration جدیدی برای همه چیز ایجاد کنید
npx prisma migrate dev --name complete_schema

# یا اگر دیتابیس اجرا نمی‌شود، بعداً اجرا کنید
```

## آنچه اتفاق می‌افتد

### با `prisma db push --force-reset`:
- ✅ تمام جداول موجود پاک می‌شوند
- ✅ جداول جدید بر اساس schema ایجاد می‌شوند
- ✅ تمام فیلدهای settings (شامل gateway) ایجاد می‌شوند
- ✅ فیلدهای گزارش‌گیری payment_links اضافه می‌شوند
- ✅ هیچ migration file اضافه نمی‌شود

### جداول ایجاد شده:
- ✅ `users` - با تمام فیلدها
- ✅ `settings` - با فیلدهای gateway
- ✅ `payment_links` - با فیلدهای گزارش‌گیری
- ✅ تمام جداول دیگر (courses, videos, etc.)

## تست نهایی

```bash
# Backend
cd backend && npm run build

# Admin Panel
cd ../admin-panel && npm run build

# اگر موفق بود، سیستم آماده است!
```

## نکات مهم

1. **تمام داده‌ها پاک می‌شوند** - از داده‌های مهم backup بگیرید
2. **برای production استفاده نکنید** - فقط برای development
3. **migration files پاک شده‌اند** - اگر نیاز به deploy دارید، migration های جدید ایجاد کنید

## اگر باز هم مشکل داشت

اگر باز هم با مشکل مواجه شدید:

```bash
# پاک کردن کامل node_modules و reinstall
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../admin-panel
rm -rf node_modules package-lock.json
npm install
```

## نتیجه

بعد از اجرای این مراحل:
- ✅ تمام مشکلات migration برطرف می‌شوند
- ✅ دیتابیس کاملاً تمیز و بروز است
- ✅ سیستم گزارش‌گیری آماده است
- ✅ پنل تنظیمات کار می‌کند

**سیستم آماده استفاده است! 🚀**

