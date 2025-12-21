# 🔧 راهنمای کامل رفع مشکل CORS

## 🔴 مشکل

خطای CORS برای همه endpoints (login, register, و غیره):
```
Access to XMLHttpRequest at 'https://api.manehaghighi.com/api/auth/...' 
from origin 'https://manehaghighi.com' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🔍 علت

این خطا یعنی:
1. **Preflight request (OPTIONS) درست handle نمی‌شود**
2. یا **CORS headers در response وجود ندارند**
3. یا **Backend متغیر CORS_ORIGINS را نمی‌خواند**

## ✅ راه‌حل کامل

### روش 1: استفاده از اسکریپت (توصیه می‌شود)

```bash
# روی سرور
cd ~/man-haghighi-mono-repo
./COMPLETE-CORS-FIX.sh
```

این اسکریپت:
- ✅ فایل `.env` را بررسی و ایجاد می‌کند
- ✅ `CORS_ORIGINS` را تنظیم می‌کند
- ✅ Backend را rebuild می‌کند
- ✅ Backend را restart می‌کند
- ✅ CORS را تست می‌کند

### روش 2: دستی

#### مرحله 1: بررسی و ایجاد .env

```bash
# بررسی وجود .env
ls -la .env

# اگر وجود ندارد، ایجاد کنید
cp server.env .env

# بررسی CORS_ORIGINS
grep CORS_ORIGINS .env

# باید این باشد:
# CORS_ORIGINS=https://manehaghighi.com,https://www.manehaghighi.com,https://admin.manehaghighi.com,https://api.manehaghighi.com
```

#### مرحله 2: اصلاح CORS_ORIGINS (اگر نیاز است)

```bash
# اگر CORS_ORIGINS درست نیست، اصلاح کنید
sed -i.bak 's|^CORS_ORIGINS=.*|CORS_ORIGINS=https://manehaghighi.com,https://www.manehaghighi.com,https://admin.manehaghighi.com,https://api.manehaghighi.com|' .env

# بررسی
cat .env | grep CORS_ORIGINS
```

#### مرحله 3: Rebuild Backend

```bash
# Rebuild (این مهم است!)
docker-compose build --no-cache backend

# Restart
docker-compose restart backend

# صبر کنید تا backend شروع شود
sleep 10
```

#### مرحله 4: بررسی لاگ‌ها

```bash
# بررسی CORS configuration
docker-compose logs backend | grep -i "CORS"

# باید ببینید:
# 🔐 CORS origins: https://manehaghighi.com, https://www.manehaghighi.com, ...
# یا
# ✅ CORS enabled for 4 origin(s)
```

#### مرحله 5: تست CORS

```bash
# تست preflight (OPTIONS)
curl -H "Origin: https://manehaghighi.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     http://localhost:3000/api/auth/register \
     -v 2>&1 | grep -i "access-control"

# باید ببینید:
# < HTTP/1.1 204 No Content
# < access-control-allow-origin: https://manehaghighi.com
# < access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD
# < access-control-allow-headers: Content-Type,Authorization,...
```

## 🔍 عیب‌یابی

### مشکل 1: Backend CORS_ORIGINS را نمی‌خواند

```bash
# بررسی که .env درست است
cat .env | grep CORS_ORIGINS

# بررسی که docker-compose از .env استفاده می‌کند
docker-compose config | grep CORS_ORIGINS

# اگر خالی بود، مطمئن شوید که docker-compose.yml از env_file استفاده می‌کند
grep env_file docker-compose.yml
```

### مشکل 2: Preflight request fail می‌شود

```bash
# تست مستقیم از backend container
docker-compose exec backend curl -H "Origin: https://manehaghighi.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:3000/api/auth/register \
     -v

# اگر کار کرد، مشکل از nginx است
# اگر کار نکرد، مشکل از backend است
```

### مشکل 3: Backend در حال اجرا نیست

```bash
# بررسی status
docker-compose ps backend

# اگر running نیست، start کنید
docker-compose up -d backend

# بررسی logs
docker-compose logs backend | tail -50
```

### مشکل 4: nginx در حال block کردن است

```bash
# بررسی nginx config
sudo grep -i "access-control" /etc/nginx/sites-available/api.manehaghighi.com

# اگر چیزی پیدا کردید، حذف کنید
sudo sed -i '/Access-Control-Allow-Origin/d' /etc/nginx/sites-available/api.manehaghighi.com
sudo nginx -t
sudo systemctl reload nginx
```

## 📋 چک‌لیست کامل

- [ ] فایل `.env` وجود دارد
- [ ] `CORS_ORIGINS` در `.env` تنظیم شده
- [ ] `CORS_ORIGINS` شامل تمام origins لازم است
- [ ] Backend container در حال اجرا است
- [ ] Backend rebuild شده است
- [ ] Backend restart شده است
- [ ] لاگ‌های backend نشان می‌دهند CORS enabled است
- [ ] Preflight (OPTIONS) request کار می‌کند
- [ ] CORS headers در response وجود دارند
- [ ] Browser cache پاک شده

## ⚠️ نکات مهم

1. **بعد از تغییر `.env`، حتماً backend را rebuild کنید** - فقط restart کافی نیست!
2. **Preflight request باید 204 یا 200 برگرداند**
3. **CORS headers باید در response وجود داشته باشند**
4. **Browser cache را پاک کنید** - Ctrl+Shift+R
5. **اگر از Cloudflare استفاده می‌کنید**، مطمئن شوید SSL mode درست است

## 🧪 تست کامل

```bash
# تست برای register
./test-admin-cors.sh http://localhost:3000/api/auth/register https://manehaghighi.com

# تست برای login
./test-admin-cors.sh http://localhost:3000/api/auth/login https://admin.manehaghighi.com
```

## ✅ نتیجه

بعد از اعمال این تغییرات:
- ✅ Preflight (OPTIONS) requests کار می‌کنند
- ✅ CORS headers در response وجود دارند
- ✅ تمام origins مجاز هستند
- ✅ Register و Login کار می‌کنند
- ✅ تمام API endpoints از CORS استفاده می‌کنند

