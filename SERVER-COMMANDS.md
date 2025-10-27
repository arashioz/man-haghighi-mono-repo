# 🖥️ دستورات سرور - Server Commands

این فایل شامل تمام دستوراتی است که باید **روی سرور** اجرا شوند.

## 📦 نصب پیش‌نیازها (فقط یک بار)

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Install other useful tools
apt install -y curl wget git nano htop
```

## 🚀 دیپلوی اولیه

```bash
# 1. رفتن به دایرکتوری پروژه
cd /root/new-haghighi

# 2. پاک کردن همه چیز داکر
chmod +x cleanup-docker.sh
./cleanup-docker.sh

# 3. دیپلوی از صفر
chmod +x deploy-from-scratch.sh
./deploy-from-scratch.sh
```

## 🔄 آپدیت پروژه

```bash
# 1. دریافت فایل‌های جدید (از کامپیوتر محلی)
# (این دستور را روی کامپیوتر محلی اجرا کنید)
# rsync -avz ./ root@185.231.112.84:/root/new-haghighi/

# 2. متوقف کردن سرویس‌ها
cd /root/new-haghighi
docker-compose -f docker-compose.prod.yml down

# 3. پاک کردن ایمیج‌های قدیمی
docker system prune -af

# 4. بیلد و راه‌اندازی مجدد
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 5. بررسی وضعیت
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

## 📊 مشاهده وضعیت و لاگ‌ها

```bash
# وضعیت تمام سرویس‌ها
docker-compose -f docker-compose.prod.yml ps

# لاگ همه سرویس‌ها (live)
docker-compose -f docker-compose.prod.yml logs -f

# لاگ یک سرویس خاص
docker logs haghighi_backend_prod -f
docker logs haghighi_frontend_prod -f
docker logs haghighi_admin_prod -f
docker logs haghighi_nginx_prod -f
docker logs haghighi_postgres_prod -f

# 100 خط آخر لاگ
docker logs haghighi_backend_prod --tail 100

# استفاده از منابع
docker stats
```

## 🔧 ری‌استارت سرویس‌ها

```bash
# ری‌استارت همه سرویس‌ها
docker-compose -f docker-compose.prod.yml restart

# ری‌استارت یک سرویس خاص
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart nginx
docker-compose -f docker-compose.prod.yml restart frontend
docker-compose -f docker-compose.prod.yml restart admin-panel
```

## 🛑 متوقف و شروع مجدد

```bash
# متوقف کردن همه سرویس‌ها
docker-compose -f docker-compose.prod.yml stop

# شروع مجدد
docker-compose -f docker-compose.prod.yml start

# متوقف و حذف (بدون حذف volume‌ها)
docker-compose -f docker-compose.prod.yml down

# شروع مجدد
docker-compose -f docker-compose.prod.yml up -d
```

## 🗄️ مدیریت دیتابیس

```bash
# اتصال به PostgreSQL
docker exec -it haghighi_postgres_prod psql -U haghighi_user -d haghighi_db

# Backup دیتابیس
docker exec haghighi_postgres_prod pg_dump -U haghighi_user haghighi_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore دیتابیس
cat backup_file.sql | docker exec -i haghighi_postgres_prod psql -U haghighi_user -d haghighi_db

# اعمال Schema جدید
docker exec haghighi_backend_prod npx prisma db push

# Seed کردن دیتا
docker exec haghighi_backend_prod npm run seed
```

## 📁 مدیریت Uploads

```bash
# بررسی دسترسی‌ها
ls -la /root/new-haghighi/uploads

# تنظیم دسترسی‌ها
chmod -R 777 /root/new-haghighi/uploads

# تنظیم دسترسی داخل کانتینر
docker exec haghighi_backend_prod chmod -R 777 /app/uploads

# بررسی فضای استفاده شده
du -sh /root/new-haghighi/uploads

# Backup uploads
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz /root/new-haghighi/uploads
```

## 🐛 عیب‌یابی

### مشکل در Backend

```bash
# مشاهده لاگ با جزئیات
docker logs haghighi_backend_prod -f

# ری‌استارت backend
docker-compose -f docker-compose.prod.yml restart backend

# دسترسی به shell backend
docker exec -it haghighi_backend_prod sh

# بررسی متغیرهای محیطی
docker exec haghighi_backend_prod env

# تست اتصال به دیتابیس
docker exec haghighi_backend_prod npx prisma db pull
```

### مشکل در Nginx

```bash
# تست کانفیگ Nginx
docker exec haghighi_nginx_prod nginx -t

# مشاهده لاگ Nginx
docker logs haghighi_nginx_prod -f

# ری‌استارت Nginx
docker-compose -f docker-compose.prod.yml restart nginx

# بررسی فایل کانفیگ
cat /root/new-haghighi/nginx.conf
```

### مشکل در اپلود فایل‌ها

```bash
# بررسی دسترسی‌ها
ls -la /root/new-haghighi/uploads

# تنظیم مجدد دسترسی‌ها
chmod -R 777 /root/new-haghighi/uploads
docker exec haghighi_backend_prod chmod -R 777 /app/uploads

# ری‌استارت backend و nginx
docker-compose -f docker-compose.prod.yml restart backend nginx

# تست اپلود با curl
curl -X POST -F "file=@test.jpg" http://localhost:3000/api/upload
```

### مشکل در Frontend/Admin

```bash
# بررسی لاگ‌ها
docker logs haghighi_frontend_prod
docker logs haghighi_admin_prod

# ری‌بیلد کامل
docker-compose -f docker-compose.prod.yml up -d --build frontend admin-panel

# بررسی متغیرهای محیطی
docker exec haghighi_frontend_prod env
```

## 🧹 پاک‌سازی

```bash
# پاک کردن لاگ‌ها
truncate -s 0 $(docker inspect --format='{{.LogPath}}' haghighi_backend_prod)

# پاک کردن ایمیج‌های استفاده نشده
docker image prune -a

# پاک کردن volume‌های استفاده نشده
docker volume prune

# پاک کردن کامل سیستم
docker system prune -a --volumes

# پاک کردن کامل و شروع مجدد
cd /root/new-haghighi
./cleanup-docker.sh
./deploy-from-scratch.sh
```

## 🔐 امنیت

```bash
# تغییر رمز عبور دیتابیس
nano /root/new-haghighi/production.env
# POSTGRES_PASSWORD را تغییر دهید
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# بررسی پورت‌های باز
netstat -tulpn | grep LISTEN

# تنظیم فایروال
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
ufw status
```

## 📈 مانیتورینگ

```bash
# بررسی استفاده از CPU و RAM
htop

# بررسی استفاده از دیسک
df -h

# بررسی استفاده Docker
docker system df

# بررسی استفاده هر کانتینر
docker stats --no-stream

# بررسی Health
curl http://localhost:3000/api/health
curl http://185.231.112.84/api/health
```

## 🔄 Cron Jobs (برای Backup خودکار)

```bash
# ویرایش crontab
crontab -e

# اضافه کردن این خطوط:
# Backup روزانه دیتابیس (ساعت 2 بامداد)
0 2 * * * docker exec haghighi_postgres_prod pg_dump -U haghighi_user haghighi_db > /root/backups/db_$(date +\%Y\%m\%d).sql

# Backup هفتگی uploads (یکشنبه ساعت 3 بامداد)
0 3 * * 0 tar -czf /root/backups/uploads_$(date +\%Y\%m\%d).tar.gz /root/new-haghighi/uploads

# پاک کردن backup‌های قدیمی (بیش از 30 روز)
0 4 * * * find /root/backups -name "*.sql" -mtime +30 -delete
0 4 * * * find /root/backups -name "*.tar.gz" -mtime +30 -delete
```

---

💡 **نکته**: همیشه قبل از اعمال تغییرات مهم، یک backup تهیه کنید!

