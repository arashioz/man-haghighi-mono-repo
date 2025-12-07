# راهنمای مدیریت محیط‌های Development و Production

این راهنما توضیح می‌دهد چگونه بین محیط Development و Production جابجا شوید.

## 📋 فایل‌های محیط

- **`local.env`**: تنظیمات محیط Development (محلی)
- **`server.env`**: تنظیمات محیط Production (سرور)
- **`.env`**: فایل فعال که توسط Docker استفاده می‌شود

## 🔄 تغییر محیط

### روش 1: استفاده از اسکریپت

```bash
# تغییر به Development
./switch-env.sh dev

# تغییر به Production
./switch-env.sh prod
```

### روش 2: استفاده از npm scripts

```bash
# تغییر به Development
npm run env:dev

# تغییر به Production
npm run env:prod

# بررسی محیط فعلی
npm run env:check
```

### روش 3: دستی

```bash
# Development
cp local.env .env

# Production
cp server.env .env
```

## 🔍 بررسی محیط فعلی

برای دیدن تنظیمات فعلی:

```bash
./check-env.sh
# یا
npm run env:check
```

این دستور نشان می‌دهد:
- نوع محیط (Development/Production)
- متغیرهای مهم محیطی
- وضعیت Docker containers
- هشدارها در صورت نیاز (مثل CORS_ORIGINS در production)

## 🚀 راه‌اندازی با محیط مشخص

### Development

```bash
# راه‌اندازی با Development
npm run dev

# یا
npm run setup:dev
npm run docker:build
npm run docker:up
```

### Production

```bash
# راه‌اندازی با Production
npm run prod

# یا
npm run setup:prod
npm run docker:build
npm run docker:up
```

## ⚠️ نکات مهم

### 1. بعد از تغییر محیط

بعد از تغییر `.env`، حتماً containers را restart کنید:

```bash
docker-compose down
docker-compose up -d
```

### 2. Production Requirements

در محیط Production، این موارد الزامی هستند:

- ✅ `NODE_ENV=production`
- ✅ `CORS_ORIGINS` باید تنظیم شود (بدون wildcard)
- ✅ `JWT_SECRET` باید قوی و منحصر به فرد باشد
- ✅ `POSTGRES_PASSWORD` باید قوی باشد

### 3. تفاوت‌های کلیدی

| تنظیمات | Development | Production |
|---------|------------|------------|
| `NODE_ENV` | `development` | `production` |
| `SERVER_IP` | `localhost` | IP سرور |
| `EXTERNAL_PORT` | `3000` | `8080` (یا پورت دلخواه) |
| `CORS_ORIGINS` | اختیاری | **الزامی** |
| `JWT_SECRET` | ساده | قوی و امن |
| Logging | کامل | فقط warnings/errors |

## 📝 مثال‌های استفاده

### سناریو 1: توسعه محلی

```bash
# 1. تغییر به Development
npm run env:dev

# 2. بررسی تنظیمات
npm run env:check

# 3. راه‌اندازی
npm run docker:up
```

### سناریو 2: دیپلوی روی سرور

```bash
# 1. تغییر به Production
npm run env:prod

# 2. بررسی تنظیمات (مطمئن شوید CORS_ORIGINS تنظیم شده)
npm run env:check

# 3. Build و راه‌اندازی
npm run docker:build
npm run docker:up
```

### سناریو 3: تغییر سریع محیط

```bash
# از Development به Production
./switch-env.sh prod
docker-compose restart

# از Production به Development
./switch-env.sh dev
docker-compose restart
```

## 🔐 امنیت

- ❌ هرگز فایل `.env` را commit نکنید
- ✅ فایل‌های `local.env` و `server.env` را می‌توانید commit کنید (بدون اطلاعات حساس واقعی)
- ✅ در Production، حتماً پسوردها و secret ها را تغییر دهید
- ✅ `CORS_ORIGINS` را محدود به دامنه‌های مجاز کنید

## 🐛 عیب‌یابی

### مشکل: CORS errors در Production

**راه‌حل**: مطمئن شوید `CORS_ORIGINS` در `server.env` تنظیم شده و شامل تمام دامنه‌های لازم است.

```bash
# بررسی
npm run env:check
```

### مشکل: Backend به Database متصل نمی‌شود

**راه‌حل**: بررسی کنید `DATABASE_URL` در `.env` صحیح است و با `POSTGRES_USER` و `POSTGRES_PASSWORD` هماهنگ است.

### مشکل: Frontend به API متصل نمی‌شود

**راه‌حل**: بررسی کنید `REACT_APP_API_URL` در `.env` صحیح است و با `API_BASE_URL` هماهنگ است.

