# 🔧 رفع مشکل CORS در Admin Login

## 🔴 مشکل

خطای CORS هنگام ورود به پنل ادمین:
```
Access to XMLHttpRequest at 'https://api.manehaghighi.com/api/auth/login' 
from origin 'https://admin.manehaghighi.com' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🔍 علت

این خطا یعنی:
1. **Preflight request (OPTIONS) درست handle نمی‌شود**
2. یا **CORS headers در response وجود ندارند**
3. یا **backend متغیر CORS_ORIGINS را نمی‌خواند**

## ✅ راه‌حل

### روش 1: استفاده از اسکریپت (توصیه می‌شود)

```bash
# روی سرور
cd ~/man-haghighi-mono-repo
./fix-admin-login-cors.sh
```

### روش 2: دستی

#### مرحله 1: بررسی .env file

```bash
# بررسی CORS_ORIGINS
grep CORS_ORIGINS .env

# باید شامل admin.manehaghighi.com باشد:
# CORS_ORIGINS=https://manehaghighi.com,https://www.manehaghighi.com,https://admin.manehaghighi.com,https://api.manehaghighi.com
```

اگر نیست، اضافه کنید:
```bash
# اگر .env وجود ندارد
cp server.env .env

# بررسی و اصلاح CORS_ORIGINS
sed -i.bak 's|^CORS_ORIGINS=.*|CORS_ORIGINS=https://manehaghighi.com,https://www.manehaghighi.com,https://admin.manehaghighi.com,https://api.manehaghighi.com|' .env
```

#### مرحله 2: بررسی Backend Container

```bash
# بررسی که backend در حال اجرا است
docker-compose ps backend

# بررسی لاگ‌ها
docker-compose logs backend | grep "CORS origins"

# باید ببینید:
# 🔐 CORS origins: https://manehaghighi.com, https://www.manehaghighi.com, https://admin.manehaghighi.com, ...
```

#### مرحله 3: Rebuild و Restart Backend

```bash
# Rebuild
docker-compose build --no-cache backend

# Restart
docker-compose restart backend

# بررسی لاگ‌ها
docker-compose logs -f backend
```

#### مرحله 4: تست CORS

```bash
# تست preflight (OPTIONS)
curl -H "Origin: https://admin.manehaghighi.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     http://localhost:3000/api/auth/login \
     -v

# باید header های زیر را ببینید:
# < HTTP/1.1 204 No Content
# < Access-Control-Allow-Origin: https://admin.manehaghighi.com
# < Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD
# < Access-Control-Allow-Headers: Content-Type,Authorization,...
```

## 🧪 تست کامل

```bash
# استفاده از اسکریپت تست
./test-admin-cors.sh

# یا دستی
./test-admin-cors.sh http://localhost:3000/api/auth/login https://admin.manehaghighi.com
```

## 🔍 عیب‌یابی

### مشکل 1: Backend CORS_ORIGINS را نمی‌خواند

```bash
# بررسی که .env درست است
cat .env | grep CORS_ORIGINS

# بررسی که docker-compose از .env استفاده می‌کند
docker-compose config | grep CORS_ORIGINS
```

### مشکل 2: Preflight request fail می‌شود

```bash
# تست مستقیم از backend container
docker-compose exec backend curl -H "Origin: https://admin.manehaghighi.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:3000/api/auth/login \
     -v
```

### مشکل 3: nginx در حال block کردن است

```bash
# بررسی nginx config
sudo grep -i "access-control" /etc/nginx/sites-available/api.manehaghighi.com

# اگر چیزی پیدا کردید، حذف کنید
sudo sed -i '/Access-Control-Allow-Origin/d' /etc/nginx/sites-available/api.manehaghighi.com
sudo nginx -t
sudo systemctl reload nginx
```

## 📋 چک‌لیست

- [ ] فایل `.env` وجود دارد
- [ ] `CORS_ORIGINS` شامل `https://admin.manehaghighi.com` است
- [ ] Backend container در حال اجرا است
- [ ] Backend rebuild شده است
- [ ] Backend restart شده است
- [ ] لاگ‌های backend نشان می‌دهند CORS origins درست است
- [ ] Preflight (OPTIONS) request کار می‌کند
- [ ] Browser cache پاک شده

## ⚠️ نکات مهم

1. **بعد از تغییر `.env`، حتماً backend را rebuild کنید**
2. **Preflight request باید 204 یا 200 برگرداند**
3. **CORS headers باید در response وجود داشته باشند**
4. **Browser cache را پاک کنید** - Ctrl+Shift+R

## ✅ نتیجه

بعد از اعمال این تغییرات:
- ✅ Preflight (OPTIONS) request کار می‌کند
- ✅ CORS headers در response وجود دارند
- ✅ `https://admin.manehaghighi.com` در allowed origins است
- ✅ Login در admin panel کار می‌کند

