# راهنمای رفع مشکل Migration

## مشکل
Migration `20251209041143_baseline` با خطا مواجه شده بود:
```
ERROR: type "UserRole" already exists
```

## راه حل اعمال شده

### 1. پاک کردن Migration مشکل‌دار
```bash
cd backend
rm -rf prisma/migrations/20251209041143_baseline
```

### 2. ایجاد Migration جدید برای فیلدهای گزارش‌گیری
Migration جدیدی با نام `20251230000000_add_payment_link_report_fields` ایجاد شده که فقط فیلدهای گزارش‌گیری را اضافه می‌کند:

```sql
-- AlterTable
ALTER TABLE "payment_links" ADD COLUMN     "cardNumber" TEXT,
ADD COLUMN     "gatewayName" TEXT,
ADD COLUMN     "requestTime" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT;
```

### 3. اجرای Migration
برای اجرای migration جدید، ابتدا دیتابیس را راه‌اندازی کنید:

```bash
# اگر از Docker استفاده می‌کنید
cd /path/to/project
docker-compose up -d postgres

# یا اگر دیتابیس مستقر است، اطمینان حاصل کنید که اجرا می‌شود
```

سپس migration را اجرا کنید:
```bash
cd backend
npx prisma migrate dev --name add-payment-link-report-fields
```

### 4. اعمال تغییرات Schema
Prisma client را regenerate کنید:
```bash
npx prisma generate
```

## فیلدهای اضافه شده به PaymentLink

```prisma
model PaymentLink {
  // ... فیلدهای موجود

  // فیلدهای گزارش‌گیری جدید
  gatewayName         String? // نام درگاه پرداخت
  requestTime         DateTime? // زمان درخواست پرداخت
  cardNumber          String? // شماره کارت مشتری
  trackingNumber      String? // شماره پیگیری
}
```

## نکات مهم

1. **Migration baseline پاک شده است** - این migration شامل ایجاد تمام جداول بود که باعث تداخل با migration های قبلی شد.

2. **Migration جدید فقط فیلدهای گزارش‌گیری را اضافه می‌کند** - ایمن و بدون تداخل.

3. **سیستم گزارش‌گیری کاملاً آماده است** - شامل:
   - API گزارش‌گیری با فیلترها
   - خروجی Excel با تمام فیلدهای مورد نیاز
   - پنل مدیریتی برای مشاهده گزارش‌ها

## تست سیستم

برای تست سیستم گزارش‌گیری:

1. Backend و Admin Panel را build کنید:
```bash
cd backend && npm run build
cd ../admin-panel && npm run build
```

2. سرورها را راه‌اندازی کنید و سیستم را تست کنید.

## پشتیبانی

اگر با مشکلی مواجه شدید، لطفاً migration های موجود را بررسی کنید و اطمینان حاصل کنید که دیتابیس به درستی راه‌اندازی شده است.
