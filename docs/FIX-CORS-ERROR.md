# 🔧 رفع خطای CORS

## 🔴 مشکل

خطای CORS در مرورگر:
```
Access to XMLHttpRequest at 'https://api.manehaghighi.com/api/...' 
from origin 'https://admin.manehaghighi.com' 
has been blocked by CORS policy
```

## ✅ راه‌حل

### روش 1: استفاده از اسکریپت (توصیه می‌شود)

```bash
# روی سرور
cd ~/man-haghighi-mono-repo
./fix-cors.sh
```

این اسکریپت:
- ✅ فایل `.env` را بررسی و ایجاد می‌کند
- ✅ `CORS_ORIGINS` را به‌روزرسانی می‌کند
- ✅ Backend container را restart می‌کند
- ✅ CORS را تست می‌کند

### روش 2: دستی

#### 1. بررسی فایل `.env`

```bash
# روی سرور
cd ~/man-haghighi-mono-repo

# بررسی وجود .env
ls -la .env

# اگر وجود ندارد، از server.env کپی کنید
cp server.env .env
```

#### 2. بررسی CORS_ORIGINS

```bash
# بررسی مقدار فعلی
grep CORS_ORIGINS .env

# باید این باشد:
# CORS_ORIGINS=https://manehaghighi.com,https://www.manehaghighi.com,https://admin.manehaghighi.com,https://api.manehaghighi.com
```

#### 3. به‌روزرسانی CORS_ORIGINS

```bash
# اگر درست نیست، اصلاح کنید:
sed -i.bak 's|^CORS_ORIGINS=.*|CORS_ORIGINS=https://manehaghighi.com,https://www.manehaghighi.com,https://admin.manehaghighi.com,https://api.manehaghighi.com|' .env
```

#### 4. Restart Backend

```bash
# Restart backend container
docker-compose restart backend

# یا force recreate
docker-compose up -d --force-recreate backend
```

#### 5. بررسی لاگ‌ها

```bash
# بررسی که CORS origins درست تنظیم شده
docker-compose logs backend | grep "CORS origins"

# باید ببینید:
# 🔐 CORS origins: https://manehaghighi.com, https://www.manehaghighi.com, https://admin.manehaghighi.com, https://api.manehaghighi.com
```

## 🔍 عیب‌یابی

### مشکل 1: CORS_ORIGINS در .env نیست

```bash
# بررسی
grep CORS_ORIGINS .env

# اگر خالی بود، اضافه کنید:
echo "CORS_ORIGINS=https://manehaghighi.com,https://www.manehaghighi.com,https://admin.manehaghighi.com,https://api.manehaghighi.com" >> .env
```

### مشکل 2: Backend متغیر محیطی را نمی‌خواند

```bash
# بررسی که backend container از .env استفاده می‌کند
docker-compose config | grep CORS_ORIGINS

# اگر خالی بود، مطمئن شوید docker-compose.yml از env_file استفاده می‌کند
```

### مشکل 3: Origin دقیقاً match نمی‌کند

CORS بسیار حساس است. Origin باید دقیقاً match کند:

✅ **درست:**
- `https://admin.manehaghighi.com` → `https://admin.manehaghighi.com`

❌ **غلط:**
- `http://admin.manehaghighi.com` → `https://admin.manehaghighi.com` (http vs https)
- `https://admin.manehaghighi.com/` → `https://admin.manehaghighi.com` (trailing slash)
- `https://ADMIN.manehaghighi.com` → `https://admin.manehaghighi.com` (case sensitivity)

### مشکل 4: Browser Cache

```bash
# Cache مرورگر را پاک کنید:
# Chrome/Edge: Ctrl+Shift+Delete
# یا از Incognito mode استفاده کنید
```

## 🧪 تست CORS

### از Command Line:

```bash
# Test CORS برای admin panel
curl -H "Origin: https://admin.manehaghighi.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     http://localhost:3000/api/health \
     -v

# باید header های زیر را ببینید:
# Access-Control-Allow-Origin: https://admin.manehaghighi.com
# Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD
# Access-Control-Allow-Headers: Content-Type,Authorization,...
```

### از Browser:

1. Developer Tools را باز کنید (F12)
2. به تب **Network** بروید
3. یک درخواست انجام دهید
4. درخواست را باز کنید و به تب **Headers** بروید
5. بررسی کنید:
   - **Request Headers** → `Origin: https://admin.manehaghighi.com`
   - **Response Headers** → `Access-Control-Allow-Origin: https://admin.manehaghighi.com`

## 📋 چک‌لیست

- [ ] فایل `.env` وجود دارد
- [ ] `CORS_ORIGINS` در `.env` تنظیم شده
- [ ] تمام origins با `https://` شروع می‌شوند
- [ ] بدون space اضافی در origins
- [ ] Backend container restart شده
- [ ] لاگ‌های backend نشان می‌دهند CORS origins درست است
- [ ] Browser cache پاک شده
- [ ] درخواست‌ها از دامنه درست می‌آیند

## 🔄 Origins مورد نیاز

برای این پروژه، این origins باید در `CORS_ORIGINS` باشند:

1. `https://manehaghighi.com` - Frontend اصلی
2. `https://www.manehaghighi.com` - Frontend با www
3. `https://admin.manehaghighi.com` - Admin Panel
4. `https://api.manehaghighi.com` - API (اگر از آنجا درخواست می‌شود)

## ⚠️ نکات مهم

1. **هیچ wildcard مجاز نیست** - باید origins را دقیقاً مشخص کنید
2. **Protocol مهم است** - `http://` و `https://` متفاوت هستند
3. **Trailing slash مهم است** - `https://example.com` ≠ `https://example.com/`
4. **بعد از تغییر `.env`، حتماً backend را restart کنید**

## 📞 اگر هنوز مشکل دارید

1. **لاگ‌های backend را بررسی کنید:**
   ```bash
   docker-compose logs -f backend
   ```

2. **Console مرورگر را بررسی کنید:**
   - خطای دقیق CORS را کپی کنید
   - Origin درخواست را بررسی کنید

3. **Network tab را بررسی کنید:**
   - درخواست OPTIONS (preflight) را بررسی کنید
   - Response headers را بررسی کنید

4. **مطمئن شوید که:**
   - Backend در حال اجرا است
   - Port 3000 در دسترس است
   - Nginx proxy درست تنظیم شده

