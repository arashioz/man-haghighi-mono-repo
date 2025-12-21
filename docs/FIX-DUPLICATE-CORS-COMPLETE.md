# 🔧 رفع کامل مشکل Duplicate CORS Headers

## 🔴 مشکل

در response headers دو تا `Access-Control-Allow-Origin` وجود دارد:
1. `Access-Control-Allow-Origin: https://manehaghighi.com` (از backend)
2. `Access-Control-Allow-Origin: *` (از nginx یا جای دیگر)

## 🔍 علت

مشکل از **nginx روی سرور** است که هنوز CORS headers با `*` اضافه می‌کند.

## ✅ راه‌حل کامل

### روش 1: استفاده از اسکریپت (توصیه می‌شود)

```bash
# روی سرور
cd ~/man-haghighi-mono-repo
sudo ./fix-all-cors-duplicates.sh
```

### روش 2: دستی

#### مرحله 1: بررسی nginx config

```bash
# روی سرور
sudo grep -i "access-control" /etc/nginx/sites-available/api.manehaghighi.com
# یا
sudo grep -i "access-control" /etc/nginx/sites-enabled/api.manehaghighi.com
```

اگر چیزی پیدا کردید، ادامه دهید.

#### مرحله 2: Backup و حذف CORS headers از nginx

```bash
# Backup
sudo cp /etc/nginx/sites-available/api.manehaghighi.com \
       /etc/nginx/sites-available/api.manehaghighi.com.backup.$(date +%Y%m%d_%H%M%S)

# حذف CORS headers
sudo sed -i '/Access-Control-Allow-Origin/d' /etc/nginx/sites-available/api.manehaghighi.com
sudo sed -i '/Access-Control-Allow-Methods/d' /etc/nginx/sites-available/api.manehaghighi.com
sudo sed -i '/Access-Control-Allow-Headers/d' /etc/nginx/sites-available/api.manehaghighi.com
sudo sed -i '/if ($request_method = OPTIONS)/,/return 204;/d' /etc/nginx/sites-available/api.manehaghighi.com
```

#### مرحله 3: کپی config جدید از repo

```bash
# اگر config در repo به‌روز شده
cd ~/man-haghighi-mono-repo
sudo cp server-config/nginx/api.conf /etc/nginx/sites-available/api.manehaghighi.com
```

#### مرحله 4: Test و Reload nginx

```bash
# Test
sudo nginx -t

# اگر OK بود، reload
sudo systemctl reload nginx
```

#### مرحله 5: Rebuild و Restart Backend

```bash
cd ~/man-haghighi-mono-repo

# Rebuild
docker-compose build --no-cache backend

# Restart
docker-compose restart backend

# بررسی لاگ‌ها
docker-compose logs backend | grep "CORS origins"
```

## 🧪 تست

### از Command Line:

```bash
# Test CORS
curl -H "Origin: https://manehaghighi.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     https://api.manehaghighi.com/api/courses/homepage \
     -v 2>&1 | grep -i "access-control-allow-origin"

# باید فقط یک header ببینید:
# < access-control-allow-origin: https://manehaghighi.com
```

### از Browser:

1. Developer Tools → Network
2. یک درخواست انجام دهید
3. Response Headers را بررسی کنید
4. باید فقط **یک** `Access-Control-Allow-Origin` ببینید

## 🔍 بررسی نهایی

### بررسی nginx:

```bash
# باید هیچ CORS header نباشد
sudo grep -i "access-control" /etc/nginx/sites-available/api.manehaghighi.com

# باید فقط کامنت باشد یا هیچ چیزی نباشد
```

### بررسی backend:

```bash
# بررسی لاگ‌ها
docker-compose logs backend | grep "CORS origins"

# باید ببینید:
# 🔐 CORS origins: https://manehaghighi.com, https://www.manehaghighi.com, ...
```

### بررسی response:

```bash
# از سرور
curl -I -H "Origin: https://manehaghighi.com" \
     https://api.manehaghighi.com/api/health

# باید فقط یک Access-Control-Allow-Origin ببینید
```

## 📋 چک‌لیست

- [ ] nginx config بررسی شده
- [ ] CORS headers از nginx حذف شده‌اند
- [ ] nginx config test شده
- [ ] nginx reload شده
- [ ] Backend rebuild شده
- [ ] Backend restart شده
- [ ] فقط یک `Access-Control-Allow-Origin` header وجود دارد
- [ ] Browser cache پاک شده

## ⚠️ نکات مهم

1. **nginx config روی سرور** باید به‌روز شود
2. **Backend باید rebuild شود** تا تغییرات کد اعمال شود
3. **Browser cache را پاک کنید** - Ctrl+Shift+R
4. **بعد از هر تغییر، nginx را reload کنید**

## 🐛 اگر هنوز مشکل دارید

### بررسی دقیق‌تر:

```bash
# بررسی تمام nginx configs
sudo find /etc/nginx -name "*.conf" -exec grep -l "Access-Control" {} \;

# بررسی response headers دقیق
curl -v -H "Origin: https://manehaghighi.com" \
     https://api.manehaghighi.com/api/courses/homepage 2>&1 | grep -i "access-control"
```

### بررسی که nginx config درست اعمال شده:

```bash
# بررسی nginx config کامل
sudo nginx -T | grep -A 30 "api.manehaghighi.com"
```

### بررسی backend container:

```bash
# بررسی که backend در حال اجرا است
docker-compose ps backend

# بررسی لاگ‌های کامل
docker-compose logs backend | tail -50
```

## ✅ نتیجه

بعد از اعمال این تغییرات:
- ✅ فقط یک `Access-Control-Allow-Origin` header وجود دارد
- ✅ CORS فقط از backend (NestJS) مدیریت می‌شود
- ✅ nginx فقط proxy می‌کند و CORS header اضافه نمی‌کند
- ✅ خطای duplicate headers برطرف می‌شود

