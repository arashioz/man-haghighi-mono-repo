# 🔍 راهنمای جستجوی CORS Headers در nginx

## روش 1: استفاده از اسکریپت (توصیه می‌شود)

```bash
# روی سرور
cd ~/man-haghighi-mono-repo
sudo ./find-cors-headers-on-server.sh
```

این اسکریپت در تمام فایل‌های nginx جستجو می‌کند.

---

## روش 2: دستورات دستی

### جستجو در یک دایرکتوری خاص:

```bash
# جستجو در sites-available
sudo grep -ri "access-control" /etc/nginx/sites-available/

# جستجو در sites-enabled
sudo grep -ri "access-control" /etc/nginx/sites-enabled/

# جستجو در conf.d
sudo grep -ri "access-control" /etc/nginx/conf.d/
```

### جستجو در تمام فایل‌های nginx:

```bash
# جستجو در تمام فایل‌های .conf
sudo find /etc/nginx -type f -name "*.conf" -exec grep -l "access-control" {} \;

# جستجو با نمایش خطوط
sudo find /etc/nginx -type f -name "*.conf" -exec grep -Hn "access-control" {} \;
```

### جستجوی خاص برای wildcard (*):

```bash
# پیدا کردن فایل‌هایی که Access-Control-Allow-Origin: * دارند
sudo find /etc/nginx -type f -name "*.conf" -exec grep -l "Access-Control-Allow-Origin.*\*" {} \;

# نمایش خطوط با شماره خط
sudo find /etc/nginx -type f -name "*.conf" -exec grep -Hn "Access-Control-Allow-Origin.*\*" {} \;
```

---

## روش 3: جستجوی دقیق‌تر

### پیدا کردن فایل config مربوط به API:

```bash
# پیدا کردن فایلی که api.manehaghighi.com را handle می‌کند
sudo grep -r "api.manehaghighi.com" /etc/nginx/

# یا
sudo find /etc/nginx -type f -name "*.conf" -exec grep -l "api.manehaghighi.com" {} \;
```

### دیدن محتوای کامل یک فایل:

```bash
# دیدن محتوای فایل
sudo cat /etc/nginx/sites-available/api.manehaghighi.com

# یا با less برای scroll
sudo less /etc/nginx/sites-available/api.manehaghighi.com
```

---

## روش 4: جستجو با nginx -T

```bash
# دیدن تمام config های فعال nginx (شامل include ها)
sudo nginx -T | grep -i "access-control"

# یا فقط برای api.manehaghighi.com
sudo nginx -T | grep -A 50 "api.manehaghighi.com" | grep -i "access-control"
```

---

## مثال‌های عملی

### مثال 1: پیدا کردن همه CORS headers

```bash
sudo grep -r "Access-Control" /etc/nginx/ --include="*.conf"
```

### مثال 2: پیدا کردن فقط wildcard

```bash
sudo grep -r "Access-Control-Allow-Origin.*\*" /etc/nginx/ --include="*.conf"
```

### مثال 3: پیدا کردن با نمایش شماره خط

```bash
sudo grep -rn "Access-Control" /etc/nginx/ --include="*.conf"
```

### مثال 4: پیدا کردن و نمایش context (خطوط قبل و بعد)

```bash
sudo grep -rn -A 2 -B 2 "Access-Control" /etc/nginx/ --include="*.conf"
```

---

## دستورات مفید دیگر

### دیدن ساختار فایل‌های nginx:

```bash
# لیست تمام فایل‌های config
sudo find /etc/nginx -type f -name "*.conf" | sort

# دیدن سایز و تاریخ فایل‌ها
sudo ls -lah /etc/nginx/sites-available/
sudo ls -lah /etc/nginx/sites-enabled/
```

### بررسی که کدام فایل‌ها include شده‌اند:

```bash
# دیدن config کامل nginx
sudo nginx -T

# یا فقط server blocks
sudo nginx -T | grep -A 20 "server {"
```

---

## بعد از پیدا کردن

بعد از اینکه فایل را پیدا کردید:

### 1. Backup بگیرید:

```bash
sudo cp /etc/nginx/sites-available/api.manehaghighi.com \
       /etc/nginx/sites-available/api.manehaghighi.com.backup
```

### 2. CORS headers را حذف کنید:

```bash
sudo sed -i '/Access-Control-Allow-Origin/d' /etc/nginx/sites-available/api.manehaghighi.com
sudo sed -i '/Access-Control-Allow-Methods/d' /etc/nginx/sites-available/api.manehaghighi.com
sudo sed -i '/Access-Control-Allow-Headers/d' /etc/nginx/sites-available/api.manehaghighi.com
```

### 3. Test کنید:

```bash
sudo nginx -t
```

### 4. Reload کنید:

```bash
sudo systemctl reload nginx
```

---

## نکات مهم

1. **همیشه backup بگیرید** قبل از تغییر
2. **از `nginx -t` استفاده کنید** برای test کردن config
3. **بعد از تغییر، reload کنید** نه restart (reload graceful است)
4. **اگر فایل در sites-available است**، مطمئن شوید که در sites-enabled هم symlink شده

---

## عیب‌یابی

### اگر فایل پیدا نشد:

```bash
# بررسی که nginx نصب است
which nginx
nginx -v

# پیدا کردن مسیر nginx config
nginx -t 2>&1 | grep "configuration file"

# یا
sudo find /etc -name "nginx.conf" 2>/dev/null
```

### اگر permission denied:

```bash
# استفاده از sudo
sudo grep -r "access-control" /etc/nginx/
```

---

## خلاصه دستورات سریع

```bash
# پیدا کردن همه CORS headers
sudo grep -r "Access-Control" /etc/nginx/ --include="*.conf"

# پیدا کردن wildcard
sudo grep -r "Access-Control-Allow-Origin.*\*" /etc/nginx/ --include="*.conf"

# پیدا کردن فایل config API
sudo find /etc/nginx -name "*api*" -type f

# دیدن config کامل
sudo nginx -T | grep -i "access-control"
```

