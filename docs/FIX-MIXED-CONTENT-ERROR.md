# 🔒 رفع خطای Mixed Content (ERR_CERT_AUTHORITY_INVALID)

## 🔴 مشکل

خطای زیر در مرورگر نمایش داده می‌شد:
```
Mixed Content: The page at 'https://admin.manehaghighi.com/login' was loaded over HTTPS, 
but requested an insecure XMLHttpRequest endpoint 'http://185.231.112.84:8080/api/auth/login'. 
This request has been blocked; the content must be served over HTTPS.
```

**علت:** برخی فایل‌ها به جای استفاده از دامنه HTTPS، از IP آدرس HTTP استفاده می‌کردند.

---

## ✅ تغییرات انجام شده

### 1. فایل‌های اصلاح شده:

#### `admin-panel/src/pages/Courses.tsx`
- ❌ **قبل:** `const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://185.231.112.84:8080/api';`
- ✅ **بعد:** استفاده از `API_ORIGIN` از سرویس API

#### `admin-panel/src/pages/Workshops.tsx`
- ❌ **قبل:** `${process.env.REACT_APP_API_URL || 'http://185.231.112.84:8080'}/uploads/...`
- ✅ **بعد:** استفاده از `${API_ORIGIN}/uploads/...` (2 مورد اصلاح شد)

### 2. مزایای استفاده از `API_ORIGIN`:

- ✅ به صورت خودکار HTTP را به HTTPS تبدیل می‌کند
- ✅ از دامنه به جای IP استفاده می‌کند
- ✅ با تغییرات محیط (development/production) سازگار است

---

## 🚀 مراحل اعمال تغییرات

### روی سرور:

```bash
# 1. SSH به سرور
ssh root@185.231.112.84

# 2. برو به دایرکتوری پروژه
cd ~/man-haghighi-mono-repo

# 3. Pull آخرین تغییرات (اگر از git استفاده می‌کنید)
git pull

# 4. Rebuild admin panel
./rebuild-admin-panel.sh

# یا به صورت دستی:
docker-compose build --no-cache admin
docker-compose up -d admin
```

### بررسی:

```bash
# چک کردن لاگ‌ها
docker-compose logs -f admin

# تست دسترسی
curl -I http://localhost:3001/
```

---

## 🔍 بررسی نهایی

### 1. در مرورگر:

1. **Cache را پاک کنید:**
   - Chrome/Edge: `Ctrl+Shift+Delete` (Windows) یا `Cmd+Shift+Delete` (Mac)
   - یا از حالت Incognito/Private استفاده کنید

2. **Developer Tools را باز کنید:**
   - `F12` یا `Ctrl+Shift+I`
   - به تب **Network** بروید

3. **صفحه را Refresh کنید:**
   - `Ctrl+Shift+R` یا `Cmd+Shift+R`

4. **بررسی کنید:**
   - تمام درخواست‌ها باید به `https://api.manehaghighi.com/api/...` بروند
   - هیچ درخواستی نباید به `http://185.231.112.84:8080` برود

### 2. بررسی کد:

```bash
# بررسی که IP هاردکد شده وجود ندارد
grep -r "185.231.112.84" admin-panel/src/

# باید هیچ نتیجه‌ای ندهد (یا فقط در کامنت‌ها)
```

---

## 📋 نکات مهم

### ✅ چیزهایی که درست هستند:

1. **`server.env`** - متغیر `REACT_APP_API_URL` به درستی تنظیم شده:
   ```
   REACT_APP_API_URL=https://api.manehaghighi.com/api
   ```

2. **`admin-panel/src/services/api.ts`** - منطق تبدیل HTTP به HTTPS وجود دارد

3. **Dockerfile** - متغیر محیطی در build time پاس داده می‌شود

### ⚠️ چیزهایی که باید بررسی شوند:

1. **فایل `.env` در سرور:**
   - مطمئن شوید که `REACT_APP_API_URL=https://api.manehaghighi.com/api` تنظیم شده

2. **Rebuild بعد از تغییرات:**
   - هر بار که کد تغییر می‌کند، باید rebuild شود

3. **Cache مرورگر:**
   - بعد از rebuild، cache مرورگر را پاک کنید

---

## 🐛 عیب‌یابی

### اگر هنوز خطا دارید:

1. **بررسی متغیر محیطی:**
   ```bash
   # در سرور
   grep REACT_APP_API_URL .env
   ```

2. **بررسی build:**
   ```bash
   # چک کردن که build با متغیر درست انجام شده
   docker-compose build admin
   docker-compose logs admin | grep REACT_APP_API_URL
   ```

3. **بررسی Network در مرورگر:**
   - Developer Tools → Network
   - ببینید درخواست‌ها به کجا می‌روند

4. **بررسی SSL Certificate:**
   - مطمئن شوید که `https://api.manehaghighi.com` SSL معتبر دارد
   - اگر خطای SSL دارید، به `docs/FIX-SSL-CERTIFICATE-ERROR.md` مراجعه کنید

---

## ✅ نتیجه

بعد از اعمال این تغییرات و rebuild:

- ✅ تمام درخواست‌ها از HTTPS استفاده می‌کنند
- ✅ از دامنه به جای IP استفاده می‌شود
- ✅ خطای Mixed Content برطرف می‌شود
- ✅ امنیت افزایش می‌یابد

---

## 📞 اگر مشکل حل نشد

1. لاگ‌های مرورگر را بررسی کنید (Console tab)
2. لاگ‌های سرور را بررسی کنید:
   ```bash
   docker-compose logs admin
   ```
3. Network requests را در Developer Tools بررسی کنید

