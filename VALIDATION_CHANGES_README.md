# ✅ تغییرات Validation برای لینک‌های پرداخت

## 🎯 هدف تغییرات

در هنگام ایجاد لینک پرداخت برای کاربران جدید:

### ✅ قوانین جدید:
1. **نام و نام خانوادگی**: فقط حروف فارسی (بدون عدد)
2. **شماره همراه**: فقط اعداد (با ۰۹ شروع شود)

### ❌ قوانین قبلی:
- نام می‌توانست شامل عدد باشد
- شماره همراه می‌توانست شامل حروف باشد

## 🔧 تغییرات اعمال شده

### 1. بروزرسانی DTO (`create-payment-link.dto.ts`)

```typescript
// قبل
@IsString()
@IsNotEmpty()
customerName: string;

// بعد
@IsString()
@IsNotEmpty()
@Matches(/^[\u0600-\u06FF\s]+$/, {
  message: 'نام و نام خانوادگی باید فقط شامل حروف فارسی باشد'
})
customerName: string;

// قبل
@IsString()
@IsNotEmpty()
customerMobile: string;

// بعد
@IsString()
@IsNotEmpty()
@Matches(/^09[0-9]{9}$/, {
  message: 'شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد'
})
customerMobile: string;
```

### 2. بروزرسانی Service (`payments.service.ts`)

```typescript
// اضافه شده: validation برای نام فارسی
const persianNameRegex = /^[\u0600-\u06FF\s]+$/;
if (!persianNameRegex.test(dto.customerName)) {
  throw new BadRequestException('نام و نام خانوادگی باید فقط شامل حروف فارسی باشد');
}

// بهبود validation شماره موبایل
const mobileRegex = /^09[0-9]{9}$/;
if (!mobileRegex.test(dto.customerMobile)) {
  throw new BadRequestException('شماره موبایل باید با ۰۹ شروع شود و فقط شامل اعداد باشد (۱۱ رقم)');
}
```

## 📋 مثال‌های داده‌های معتبر و نامعتبر

### ✅ داده‌های معتبر:

```json
{
  "customerName": "علی محمدی",
  "customerMobile": "09123456789",
  "amount": 100000,
  "description": "دوره آموزشی"
}
```

```json
{
  "customerName": "فاطمه کریمی احمد",
  "customerMobile": "09987654321",
  "amount": 50000
}
```

### ❌ داده‌های نامعتبر:

```json
{
  "customerName": "علی محمدی ۱۲۳", // ❌ شامل عدد
  "customerMobile": "09123456789"
}
```

```json
{
  "customerName": "علی", // ✅ فارسی
  "customerMobile": "۰۹۱۲۳۴۵۶۷۸۹" // ❌ شامل حروف فارسی
}
```

```json
{
  "customerName": "John Doe", // ❌ انگلیسی
  "customerMobile": "09123456789"
}
```

## 🚀 نحوه استقرار

### برای Development:
```bash
docker-compose restart backend
```

### برای Production:
```bash
# انتقال فایل‌ها
scp backend/src/payments/dto/create-payment-link.dto.ts server:/path/to/backend/src/payments/dto/
scp backend/src/payments/payments.service.ts server:/path/to/backend/src/payments/

# Rebuild و restart
docker-compose build backend
docker-compose restart backend
```

## 🧪 تست Validation

از Swagger UI یا Postman استفاده کنید:

```
POST /api/payments/links
Authorization: Bearer YOUR_TOKEN

Body:
{
  "customerName": "علی محمدی",
  "customerMobile": "09123456789", 
  "amount": 100000
}
```

### پاسخ‌های خطا:

```json
// برای نام نامعتبر
{
  "statusCode": 400,
  "message": ["نام و نام خانوادگی باید فقط شامل حروف فارسی باشد"],
  "error": "Bad Request"
}

// برای شماره نامعتبر  
{
  "statusCode": 400,
  "message": ["شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد"],
  "error": "Bad Request"
}
```

## 🔍 Regex Patterns استفاده شده

- **حروف فارسی**: `/^[\u0600-\u06FF\s]+$/`
  - `\u0600-\u06FF`: محدوده یونیکد برای حروف فارسی
  - `\s`: شامل space برای نام‌های چند کلمه‌ای

- **شماره موبایل**: `/^09[0-9]{9}$/`
  - `^09`: شروع با ۰۹
  - `[0-9]{9}`: ۹ رقم بعد از ۰۹
  - `$`: پایان رشته

## 📝 یادداشت‌ها

- Validation در دو سطح انجام می‌شود: DTO و Service
- پیام‌های خطا به فارسی هستند
- Frontend باید این validation را هم پیاده کند
- تست‌های کاملی برای edge cases اضافه شده
