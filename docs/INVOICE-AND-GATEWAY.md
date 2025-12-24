# مستندات سیستم فاکتور و درگاه پرداخت (بانک ملت)

این پروژه از سیستم فاکتوردهی داخلی و اتصال مستقیم به درگاه به‌پرداخت ملت (Behpardakht Mellat) برای مدیریت تراکنش‌های مالی استفاده می‌کند.

## ۱. ساختار داده‌ها (Prisma Schema)

- **Invoice**: مدل اصلی فاکتور.
  - شامل `invoiceNumber` (یکتا)، `amount` (مبلغ به ریال/تومان)، `status` (PENDING, PAID, FAILED) و `type` (COURSE_PURCHASE, WALLET_CHARGE, PAYMENT_LINK).
- **Transaction**: تاریخچه تلاش‌ها برای پرداخت.
  - شامل کدهای پیگیری بانک (`refId`, `saleOrderId`, `saleReferenceId`) و پاسخ‌های خام دریافتی از بانک برای عیب‌یابی.
- **Wallet**: کیف پول داخلی هر کاربر که موجودی در آن نگهداری می‌شود.

## ۲. جریان پرداخت (Payment Flow)

### الف) شروع پرداخت (Initiation)
1. در فرانت‌اِند، متد `initiateCoursePayment` فراخوانی می‌شود.
2. بک‌اِند موجودی کیف پول کاربر را بررسی می‌کند:
   - اگر موجودی کافی باشد -> مبلغ کسر شده و دوره بلافاصله فعال می‌شود.
   - اگر موجودی کافی نباشد -> یک فاکتور ایجاد شده و درخواست به وب‌سرویس بانک ملت ارسال می‌شود.
3. بانک یک `RefId` برمی‌گرداند. فرانت‌اِند کاربر را با یک فرم POST مخفی به سمت درگاه بانک هدایت می‌کند.

### ب) بازگشت از بانک (Callback)
1. کاربر در درگاه بانک پرداخت را انجام می‌دهد.
2. بانک اطلاعات تراکنش را به `/api/payments/callback` ارسال می‌کند.
3. متد `processPaymentCallback` در بک‌اِند مراحل زیر را طی می‌کند:
   - **Verify**: تایید تراکنش با متد `bpVerifyRequest` بانک.
   - **Settle**: نهایی کردن تراکنش با متد `bpSettleRequest`.
   - **Reversal**: در صورت بروز هرگونه خطا در تایید، مبلغ به کاربر بازگردانده می‌شود.
4. در صورت موفقیت، فاکتور `PAID` شده و کاربر به صفحه `/payment/success` در سایت هدایت می‌شود.

## ۳. صفحات جدید در فرانت‌اِند

- `/payment/success`: نمایش پیام موفقیت و شماره تراکنش.
- `/payment/error`: نمایش خطای بازگشتی از بانک.
- پنل ادمین -> فاکتورها: لیست تمام تراکنش‌های مالی سیستم.

## ۴. تنظیمات مورد نیاز (Environment Variables)

برای فعال‌سازی درگاه در فایل `.env` بک‌اِند:
```env
GATEWAY_TERMINAL_ID=your_terminal_id
GATEWAY_USERNAME=your_username
GATEWAY_PASSWORD=your_password
GATEWAY_CALLBACK_URL=https://your-domain.com/api/payments/callback
```

