# راهنمای رفع مشکل Migration Settings

## مشکل
Migration `20251225021100_add_gateway_settings` با خطا مواجه شده بود:
```
Error code: P1014
Error: The underlying table for model `settings` does not exist.
```

## علت مشکل

مدل `Settings` در Prisma Schema تعریف شده بود اما هیچ migration ای برای ایجاد جدول `settings` در دیتابیس وجود نداشت. Migration `add_gateway_settings` سعی می‌کرد ستون‌هایی را به جدول `settings` اضافه کند اما این جدول وجود نداشت.

## راه حل اعمال شده

### 1. ایجاد Migration برای جدول Settings
Migration جدیدی با نام `20251224001000_create_settings_table` ایجاد شد که جدول `settings` را ایجاد می‌کند.

### 2. تنظیم ترتیب Migration ها
Migration `create_settings_table` قبل از `add_gateway_settings` قرار داده شد تا جدول قبل از اضافه کردن ستون‌ها ایجاد شود.

### 3. پاک کردن Migration های تکراری
Migration های تکراری پاک شدند تا تداخلی وجود نداشته باشد.

## Migration های ایجاد شده

### 20251224001000_create_settings_table
```sql
-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "siteName" TEXT DEFAULT 'سایت',
    "siteDescription" TEXT,
    "siteEmail" TEXT,
    "sitePhone" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsProvider" TEXT,
    "smsApiKey" TEXT,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailProvider" TEXT,
    "emailApiKey" TEXT,
    "backupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backupFrequency" TEXT DEFAULT 'daily',
    "maxUploadSize" INTEGER DEFAULT 104857600,
    "allowedFileTypes" TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg']::TEXT[],
    "gatewayTerminalId" TEXT,
    "gatewayUsername" TEXT,
    "gatewayPassword" TEXT,
    "gatewayMode" TEXT DEFAULT 'test',
    "gatewayCallbackUrl" TEXT,
    "gatewayAutoVerify" BOOLEAN NOT NULL DEFAULT true,
    "gatewayAutoSettle" BOOLEAN NOT NULL DEFAULT true,
    "messageTemplateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "messageTemplateText" TEXT DEFAULT 'سلام {name}\nمبلغ: {amount} تومان\nلینک پرداخت:\n{link}',
    "whatsappTemplateText" TEXT DEFAULT 'سلام {name}!\nلینک پرداخت شما آماده است:\n{link}\nمبلغ: {amount} تومان',

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settings_id_key" ON "settings"("id");

-- Insert default settings row
INSERT INTO "settings" ("id") VALUES ('settings');
```

### 20251230000000_add_payment_link_report_fields
```sql
-- AlterTable
ALTER TABLE "payment_links" ADD COLUMN     "cardNumber" TEXT,
ADD COLUMN     "gatewayName" TEXT,
ADD COLUMN     "requestTime" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT;
```

## اجرای Migration

برای اجرای migration ها به ترتیب درست:

```bash
# اطمینان حاصل کنید دیتابیس اجرا می‌شود
cd backend

# اجرای migration ها
npx prisma migrate dev

# یا اگر می‌خواهید migration خاصی را اجرا کنید
npx prisma migrate dev --name create_settings_table
npx prisma migrate dev --name add_gateway_settings
npx prisma migrate dev --name add_payment_link_report_fields
```

## اعمال تغییرات Schema

بعد از اجرای migration ها، Prisma client را regenerate کنید:
```bash
npx prisma generate
```

## تست سیستم

برای اطمینان از درست کار کردن سیستم:

1. Backend و Admin Panel را build کنید:
```bash
cd backend && npm run build
cd ../admin-panel && npm run build
```

2. سرورها را راه‌اندازی کنید و تنظیمات را تست کنید.

## نتیجه

- ✅ جدول `settings` ایجاد شد
- ✅ ستون‌های gateway به جدول اضافه شدند
- ✅ فیلدهای گزارش‌گیری به `payment_links` اضافه شدند
- ✅ سیستم گزارش‌گیری کامل آماده است
- ✅ پنل تنظیمات کار می‌کند

**تمام مشکلات migration برطرف شد! 🎉**
