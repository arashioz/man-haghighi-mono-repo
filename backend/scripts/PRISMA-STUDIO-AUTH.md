# 🔐 Prisma Studio با Authentication

این اسکریپت Prisma Studio را با Basic Authentication اجرا می‌کند تا دسترسی به دیتابیس را امن‌تر کند.

## 📋 نحوه استفاده

### 1. تنظیم رمز عبور در `.env`

فایل `.env` در root پروژه را باز کنید و این متغیرها را اضافه کنید:

```env
PRISMA_STUDIO_USERNAME=admin
PRISMA_STUDIO_PASSWORD=your-secure-password-here
PRISMA_STUDIO_PORT=5555  # اختیاری، پیش‌فرض: 5555
```

### 2. اجرای Prisma Studio با Authentication

```bash
# از root پروژه
cd backend
npm run prisma:studio:auth
```

یا مستقیماً:

```bash
node backend/scripts/prisma-studio-auth.js
```

### 3. دسترسی به Prisma Studio

بعد از اجرای اسکریپت، به آدرس زیر بروید:

```
http://localhost:5555
```

مرورگر از شما username و password می‌خواهد:
- **Username**: همان `PRISMA_STUDIO_USERNAME` که در `.env` تنظیم کردید
- **Password**: همان `PRISMA_STUDIO_PASSWORD` که در `.env` تنظیم کردید

## ⚠️ نکات امنیتی

1. **هرگز رمز عبور پیش‌فرض را در production استفاده نکنید!**
   - رمز عبور پیش‌فرض: `changeme`
   - حتماً در `.env` یک رمز قوی تنظیم کنید

2. **در production از nginx با SSL استفاده کنید**
   - این اسکریپت فقط Basic Auth اضافه می‌کند
   - برای امنیت بیشتر، از HTTPS استفاده کنید

3. **فقط در شبکه‌های امن اجرا کنید**
   - Prisma Studio را در معرض اینترنت قرار ندهید
   - از firewall استفاده کنید

## 🔧 تنظیمات پیشرفته

### تغییر پورت

```env
PRISMA_STUDIO_PORT=8080
```

### اجرا در Docker

اگر backend در Docker اجرا می‌شود:

```bash
# داخل container
docker exec -it haghighi_backend npm run prisma:studio:auth

# یا از host
docker exec -it haghighi_backend node scripts/prisma-studio-auth.js
```

**نکته:** در Docker باید پورت را به host map کنید:

```yaml
# docker-compose.yml
services:
  backend:
    ports:
      - "5555:5555"  # برای Prisma Studio
```

## 🛑 توقف

برای توقف Prisma Studio، `Ctrl+C` را بزنید.

## 📝 تفاوت با Prisma Studio عادی

- **Prisma Studio عادی**: `npm run prisma:studio` - بدون رمز عبور
- **Prisma Studio با Auth**: `npm run prisma:studio:auth` - با رمز عبور

هر دو به یک دیتابیس متصل می‌شوند، فقط یکی امنیت بیشتری دارد.

