# 🔧 رفع مشکل Duplicate CORS Headers

## 🔴 مشکل

خطای CORS در مرورگر:
```
Access to XMLHttpRequest at 'https://api.manehaghighi.com/api/sliders/active' 
from origin 'https://manehaghighi.com' has been blocked by CORS policy: 
The 'Access-Control-Allow-Origin' header contains multiple values 
'https://manehaghighi.com, *', but only one is allowed.
```

## 🔍 علت

مشکل این است که **هم backend (NestJS) و هم nginx** CORS headers را اضافه می‌کنند:

1. **Backend** (NestJS): `Access-Control-Allow-Origin: https://manehaghighi.com`
2. **Nginx**: `Access-Control-Allow-Origin: *`

که نتیجه می‌شود: `Access-Control-Allow-Origin: https://manehaghighi.com, *`

مرورگر فقط یک مقدار را می‌پذیرد، بنابراین خطا می‌دهد.

## ✅ راه‌حل

CORS headers باید **فقط در یک جا** تنظیم شوند. چون backend (NestJS) خودش CORS را handle می‌کند، باید CORS headers را از nginx **حذف** کنیم.

### تغییرات انجام شده:

✅ **`server-config/nginx/api.conf`** - CORS headers حذف شدند

### مراحل اعمال روی سرور:

```bash
# 1. SSH به سرور
ssh root@185.231.112.84

# 2. برو به دایرکتوری پروژه
cd ~/man-haghighi-mono-repo

# 3. Pull تغییرات (اگر از git استفاده می‌کنید)
git pull

# 4. کپی nginx config به سرور (اگر نیاز است)
# بررسی کنید که nginx configs در /etc/nginx/sites-available/ هستند
ls -la /etc/nginx/sites-available/ | grep manehaghighi

# 5. اگر configs در repo هستند، آنها را کپی کنید:
sudo cp server-config/nginx/api.conf /etc/nginx/sites-available/api.manehaghighi.com

# 6. Test nginx configuration
sudo nginx -t

# 7. Reload nginx
sudo systemctl reload nginx

# 8. Restart backend (برای اطمینان)
docker-compose restart backend
```

## 🔍 بررسی

### 1. بررسی nginx config:

```bash
# بررسی که CORS headers حذف شده‌اند
sudo grep -i "access-control" /etc/nginx/sites-available/api.manehaghighi.com

# باید فقط کامنت باشد یا هیچ چیزی نباشد
```

### 2. تست CORS از command line:

```bash
# Test CORS
curl -H "Origin: https://manehaghighi.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     https://api.manehaghighi.com/api/health \
     -v 2>&1 | grep -i "access-control"

# باید فقط یک Access-Control-Allow-Origin ببینید:
# < Access-Control-Allow-Origin: https://manehaghighi.com
```

### 3. بررسی در مرورگر:

1. Developer Tools → Network
2. یک درخواست انجام دهید
3. Response Headers را بررسی کنید
4. باید فقط **یک** `Access-Control-Allow-Origin` ببینید

## 📋 چک‌لیست

- [ ] CORS headers از nginx config حذف شده‌اند
- [ ] nginx config test شده (`nginx -t`)
- [ ] nginx reload شده
- [ ] Backend restart شده
- [ ] فقط یک `Access-Control-Allow-Origin` header وجود دارد
- [ ] Browser cache پاک شده

## ⚠️ نکات مهم

1. **CORS باید فقط در backend تنظیم شود** - NestJS خودش این کار را انجام می‌دهد
2. **Nginx فقط proxy می‌کند** - نباید CORS headers اضافه کند
3. **بعد از تغییر nginx config، حتماً reload کنید** - `systemctl reload nginx`
4. **Browser cache را پاک کنید** - Ctrl+Shift+R

## 🐛 اگر هنوز مشکل دارید

### بررسی که nginx config درست اعمال شده:

```bash
# بررسی nginx config
sudo nginx -T | grep -A 20 "api.manehaghighi.com"

# باید CORS headers را نبینید
```

### بررسی response headers:

```bash
# از command line
curl -I -H "Origin: https://manehaghighi.com" \
     https://api.manehaghighi.com/api/health

# بررسی کنید که فقط یک Access-Control-Allow-Origin وجود دارد
```

### بررسی backend logs:

```bash
docker-compose logs backend | grep CORS
```

## ✅ نتیجه

بعد از اعمال این تغییرات:
- ✅ فقط یک `Access-Control-Allow-Origin` header وجود دارد
- ✅ CORS از backend (NestJS) مدیریت می‌شود
- ✅ خطای duplicate headers برطرف می‌شود

