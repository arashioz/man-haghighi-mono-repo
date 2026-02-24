# راهنمای دیپلوی با Docker و nginx

این راهنما برای سرور پروداکشن است: **حذف nginx نصب‌شده روی سرور** و بالا آوردن همه‌چیز با Docker (شامل nginx داخل کانتینر).

دامنه‌ها:
- **manehaghighi.com** و **www** → فرانت
- **admin.manehaghighi.com** → پنل ادمین
- **api.manehaghighi.com** → API بک‌اند (و آپلود تا ۲۰ گیگ)

---

## پیش‌نیاز

- Docker و Docker Compose روی سرور
- DNS هر سه دامنه (و در صورت تمایل زیردامنه sales) به IP همین سرور اشاره کند

---

## مرحله ۱: خاموش و حذف nginx از روی سرور

اگر الان nginx به‌صورت سرویس روی سرور دارید، آن را حذف کنید تا پورت ۸۰ و ۴۴۳ فقط به Docker اختصاص بگیرد.

```bash
# خاموش کردن nginx
sudo systemctl stop nginx

# غیرفعال کردن اجرای خودکار
sudo systemctl disable nginx

# حذف nginx (بسته به توزیع)
# اوبونتو/دبیان:
sudo apt-get remove --purge nginx nginx-common nginx-full -y
sudo apt-get autoremove -y

# یا فقط حذف پکیج بدون از بین بردن کانفیگ:
# sudo apt-get remove nginx
```

اگر قبلاً گواهی SSL با certbot گرفته‌اید، پوشه‌های `/etc/letsencrypt` را **حذف نکنید**؛ برای Docker همان مسیر را مپ می‌کنیم.

---

## مرحله ۲: گواهی SSL (اولین بار یا اگر نداری)

اگر هنوز گواهی برای دامنه‌ها نگرفته‌اید، اول باید پورت ۸۰ آزاد باشد (nginx خاموش است).

### روش ۱: یک گواهی برای هر دامنه (سه بار اجرا)

```bash
# نصب certbot در صورت نیاز (اوبونتو/دبیان)
sudo apt-get update && sudo apt-get install -y certbot

# گواهی برای دامنه اصلی
sudo certbot certonly --standalone -d manehaghighi.com -d www.manehaghighi.com --email admin@manehaghighi.com --agree-tos --no-eff-email

# گواهی برای ادمین
sudo certbot certonly --standalone -d admin.manehaghighi.com --email admin@manehaghighi.com --agree-tos --no-eff-email

# گواهی برای API
sudo certbot certonly --standalone -d api.manehaghighi.com --email admin@manehaghighi.com --agree-tos --no-eff-email
```

بعد از این، فایل‌ها زیر `/etc/letsencrypt/live/` قرار می‌گیرند و در Docker همان مسیر را read-only مپ می‌کنیم.

### تولید ssl-dhparams.pem (الزامی)

فایل تنظیمات SSL داخل پروژه است؛ فقط پارامتر DH را یک بار روی سرور بسازید:

```bash
sudo mkdir -p /etc/letsencrypt
sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
```

---

## مرحله ۳: پروژه و متغیرهای محیط

```bash
cd /path/to/new-haghighi

# فایل env (اگر .env.example دارید کپی کنید؛ وگرنه .env را دستی بسازید)
# cp .env.example .env
# در .env حتماً این‌ها را درست کنید:
#   DATABASE_URL="postgresql://USER:PASS@postgres:5432/DBNAME"
#   POSTGRES_USER, POSTGRES_DB, JWT_SECRET و سایر متغیرهای بک‌اند
nano .env
```

در `.env` حتماً آدرس دیتابیس را برای اجرا داخل Docker درست بگذارید؛ مثلاً با نام سرویس:

- `DATABASE_URL="postgresql://USER:PASS@postgres:5432/DBNAME"`

و در صورت نیاز:

- `REACT_APP_API_URL=https://api.manehaghighi.com/api` (برای بیلد فرانت/ادمین همین مقدار در docker-compose هم ارسال می‌شود)

---

## مرحله ۴: پوشه certbot-webroot

برای تمدید خودکار گواهی با `certbot renew --webroot` لازم است پوشه‌ای برای چالش داشته باشیم. در همین پروژه ساخته شده است:

```bash
mkdir -p certbot-webroot
# در docker-compose این پوشه به صورت read-only به nginx مپ شده است
```

---

## مرحله ۵: بالا آوردن سرویس‌ها

```bash
docker compose -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.production.yml up -d
```

بررسی وضعیت:

```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs -f nginx
docker compose -f docker-compose.production.yml logs -f backend
```

اگر nginx به خاطر نبودن فایل SSL خطا داد، مرحله ۲ را کامل کنید و دوباره `up -d` بزنید.

---

## مرحله ۶: تمدید گواهی SSL

با این setup، nginx داخل Docker پورت ۸۰ را در اختیار دارد. برای تمدید با webroot:

```bash
# یک بار پوشه را بسازید و به nginx اجازه دسترسی بدهید
mkdir -p certbot-webroot
sudo chown -R 101:101 certbot-webroot   # معمولاً nginx در آلپاین با uid 101 اجرا می‌شود؛ در صورت خطا با docker exec بررسی کنید

sudo certbot renew --webroot -w /path/to/new-haghighi/certbot-webroot
```

یا اگر ترجیح می‌دهید برای تمدید nginx را موقتاً متوقف کنید:

```bash
docker compose -f docker-compose.production.yml stop nginx
sudo certbot renew --standalone
docker compose -f docker-compose.production.yml start nginx
```

---

## خلاصه دستورات (از اول روی سرور)

```bash
# ۱) حذف nginx از روی سرور
sudo systemctl stop nginx && sudo systemctl disable nginx
sudo apt-get remove --purge nginx nginx-common nginx-full -y

# ۲) گواهی SSL (اگر نداری)
sudo certbot certonly --standalone -d manehaghighi.com -d www.manehaghighi.com --email admin@manehaghighi.com --agree-tos --no-eff-email
sudo certbot certonly --standalone -d admin.manehaghighi.com --email admin@manehaghighi.com --agree-tos --no-eff-email
sudo certbot certonly --standalone -d api.manehaghighi.com --email admin@manehaghighi.com --agree-tos --no-eff-email
sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048

# ۳) پروژه
cd /path/to/new-haghighi
cp .env.example .env
# ویرایش .env

# ۴) اجرا
docker compose -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.production.yml up -d
```

---

## عیب‌یابی

- **آپلود قطع می‌شود:** در کانفیگ nginx برای API و ادمین `proxy_send_timeout` و `proxy_read_timeout` روی ۷۲۰۰ ثانیه (۲ ساعت) گذاشته شده است. اگر هنوز قطع می‌شود، در همان فایل `conf.d/haghighi.conf` این مقادیر را بیشتر کنید.
- **CORS:** دامنه‌های مجاز در همان فایل در بلوک `map $http_origin $cors_origin` هستند؛ در صورت نیاز دامنه جدید اضافه کنید و کانتینر nginx را یک بار ریستارت کنید:  
  `docker compose -f docker-compose.production.yml restart nginx`
- **۵۰۲ Bad Gateway:** معمولاً یعنی backend یا frontend یا admin هنوز بالا نیامده‌اند. با `docker compose -f docker-compose.production.yml logs backend` و بقیه لاگ‌ها را چک کنید.
- **فایل ssl-dhparams.pem پیدا نمی‌شود:** روی سرور اجرا کنید:  
  `sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048`

با این مراحل، nginx فقط داخل Docker اجرا می‌شود و دیگر وابستگی به nginx نصب‌شده روی سرور ندارید.
