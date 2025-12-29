# راهنمای نهایی رفع مشکلات Migration

## مشکلات برطرف شده

### 1. مشکل Migration Settings - برطرف شد ✅
**مشکل:** Migration `20251225021100_add_gateway_settings` با خطای `"The underlying table for model settings does not exist"` مواجه شده بود.

**راه حل:**
- Migration `20251224001000_create_settings_table` ایجاد شد که جدول settings را با تمام فیلدها ایجاد می‌کند
- Migration `20251225021100_add_gateway_settings` پاک شد چون فیلدهای gateway در create settings وجود دارند

### 2. مشکل Migration UserRole - برطرف شد ✅
**مشکل:** Migration `20251209041143_baseline` با خطای `"type UserRole already exists"` مواجه شده بود.

**راه حل:**
- Migration baseline پاک شد
- Migration جدید `20251230000000_add_payment_link_report_fields` برای فیلدهای گزارش‌گیری ایجاد شد

## Migration های نهایی

### ترتیب اجرای Migration ها:

1. **20251224001000_create_settings_table**
   - ایجاد جدول `settings` با تمام فیلدها
   - شامل فیلدهای gateway settings

2. **20251230000000_add_payment_link_report_fields**
   - اضافه کردن فیلدهای گزارش‌گیری به `payment_links`:
     - `gatewayName`: نام درگاه
     - `requestTime`: زمان درخواست
     - `cardNumber`: شماره کارت
     - `trackingNumber`: شماره پیگیری

## اجرای Migration

```bash
# اطمینان حاصل کنید دیتابیس اجرا می‌شود
cd backend

# اجرای migration ها
npx prisma migrate dev

# یا migration های خاص
npx prisma migrate dev --name create_settings_table
npx prisma migrate dev --name add_payment_link_report_fields

# Regenerate Prisma client
npx prisma generate
```

## سیستم گزارش‌گیری کامل

### فیلدهای گزارش:
- ✅ **بابت (نام درگاه)**: gatewayName
- ✅ **شماره همراه**: customerPhone
- ✅ **شماره درخواست**: orderId
- ✅ **تاریخ تراکنش فارسی**: transactionDate
- ✅ **زمان درخواست**: requestTime
- ✅ **مبلغ تراکنش (تومان)**: amount
- ✅ **شماره کارت**: cardNumber
- ✅ **شماره پیگیری**: trackingNumber

### ویژگی‌ها:
- ✅ API گزارش‌گیری با فیلترهای پیشرفته
- ✅ خروجی Excel کامل با فرمت فارسی
- ✅ پنل مدیریتی در بخش فروشندگان
- ✅ ذخیره خودکار اطلاعات در زمان پرداخت

## تست نهایی

```bash
# Build پروژه‌ها
cd backend && npm run build
cd ../admin-panel && npm run build

# سرورها را راه‌اندازی کنید
# پنل فروشندگان -> تب گزارش‌گیری را تست کنید
```

## نتیجه

- ✅ تمام مشکلات migration برطرف شد
- ✅ سیستم گزارش‌گیری کاملاً آماده است
- ✅ پنل تنظیمات کار می‌کند
- ✅ هر دو پروژه build می‌شوند

**تمام مشکلات برطرف شد! سیستم آماده استفاده است. 🎉**
