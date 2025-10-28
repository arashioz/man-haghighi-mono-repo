# 🗑️ راهنمای حذف Nginx و دیپلوی بدون آن

این راهنما برای حذف کامل Nginx از سرور و دیپلوی برنامه بدون استفاده از Nginx است.

---

## 🎯 چرا بدون Nginx؟

### مزایا:
✅ ساده‌تر - پیکربندی کمتر  
✅ سریع‌تر - یک لایه کمتر  
✅ مستقیم - دسترسی مستقیم به هر سرویس  
✅ دیباگ آسان‌تر - مشکلات راحت‌تر پیدا می‌شن  

### معایب:
❌ بدون SSL/HTTPS (باید با Cloudflare یا Let's Encrypt حل کنید)  
❌ بدون Load Balancing  
❌ بدون Caching  

---

## 🚀 روش استفاده

### روش 1: حذف و دیپلوی همزمان (توصیه می‌شه!)

این روش همه چیز رو یکجا انجام می‌ده:

```bash
# روی سرور:
cd /root/new-haghighi
sudo ./full-cleanup-and-deploy.sh
```

**این اسکریپت:**
- ✅ Nginx رو کامل پاک می‌کنه
- ✅ Docker رو تمیز می‌کنه
- ✅ برنامه رو بدون Nginx دیپلوی می‌کنه
- ✅ Firewall رو تنظیم می‌کنه
- ✅ همه چیز رو تست می‌کنه

---

### روش 2: مرحله به مرحله

#### مرحله 1: فقط حذف Nginx

```bash
cd /root/new-haghighi
sudo ./remove-nginx.sh
```

این اسکریپت:
- متوقف کردن Nginx service
- غیرفعال کردن auto-start
- حذف Nginx package
- پاک کردن فایل‌های کانفیگ
- آزاد کردن پورت 80

#### مرحله 2: دیپلوی بدون Nginx

```bash
cd /root/new-haghighi
./deploy-no-nginx.sh
```

یا با اسکریپت fix:

```bash
./fix-and-redeploy.sh
```

---

## 📋 دستورات دستی

اگر می‌خواید خودتون مرحله به مرحله انجام بدید:

### 1. حذف Nginx

```bash
# متوقف کردن
sudo systemctl stop nginx
sudo systemctl disable nginx

# حذف package
sudo apt-get remove --purge nginx nginx-common nginx-full -y
sudo apt-get autoremove -y

# حذف فایل‌ها
sudo rm -rf /etc/nginx
sudo rm -rf /var/log/nginx
sudo rm -rf /var/lib/nginx

# کشتن process‌ها
sudo pkill -9 nginx
```

### 2. پاک کردن Docker

```bash
# متوقف کردن
docker-compose -f docker-compose-no-nginx.yml down

# پاک کردن images
docker rmi new-haghighi_frontend new-haghighi_admin-panel new-haghighi_backend

# پاک کردن کامل
docker system prune -af --volumes
```

### 3. دیپلوی مجدد

```bash
# Build
docker-compose -f docker-compose-no-nginx.yml \
  --env-file production-no-nginx.env \
  build --no-cache

# Start
docker-compose -f docker-compose-no-nginx.yml \
  --env-file production-no-nginx.env \
  up -d

# Database
sleep 15
docker exec haghighi_backend_prod npx prisma db push

# Permissions
chmod -R 777 uploads
docker exec haghighi_backend_prod chmod -R 777 /app/uploads
```

### 4. تنظیم Firewall

```bash
sudo ufw allow 3000/tcp  # Backend
sudo ufw allow 3001/tcp  # Admin
sudo ufw allow 3002/tcp  # Frontend
sudo ufw status
```

---

## 🧪 تست و بررسی

### روی خود سرور:

```bash
# تست local endpoints
curl http://localhost:3000/api/health
curl http://localhost:3001/
curl http://localhost:3002/

# چک کردن nginx حذف شده
nginx -v  # باید خطا بده

# چک کردن service
systemctl status nginx  # باید not found بده

# چک کردن پورت 80
sudo lsof -i :80  # نباید چیزی نشون بده
```

### از بیرون سرور:

```bash
# از کامپیوتر خودت
curl http://185.231.112.84:3000/api/health
curl http://185.231.112.84:3001/
curl http://185.231.112.84:3002/
```

⚠️ **نکته مهم:** اگر از بیرون خطای NKK2 می‌گیرید، مشکل فایروال ISP یا شبکه است، نه سرور!

---

## 🌐 آدرس‌های دسترسی

بعد از دیپلوی بدون Nginx:

| سرویس | پورت | آدرس |
|-------|------|------|
| Frontend | 3002 | http://SERVER_IP:3002/ |
| Admin Panel | 3001 | http://SERVER_IP:3001/ |
| Backend API | 3000 | http://SERVER_IP:3000/api/ |
| API Docs | 3000 | http://SERVER_IP:3000/api/docs/ |

**جایگزین کنید SERVER_IP با IP واقعی سرورتون (مثلاً 185.231.112.84)**

---

## 🔧 دستورات مدیریت

### مشاهده وضعیت:
```bash
docker-compose -f docker-compose-no-nginx.yml ps
```

### مشاهده لاگ‌ها:
```bash
# همه
docker-compose -f docker-compose-no-nginx.yml logs -f

# فقط یکی
docker logs haghighi_frontend_prod -f
docker logs haghighi_admin_prod -f
docker logs haghighi_backend_prod -f
```

### ری‌استارت:
```bash
# همه
docker-compose -f docker-compose-no-nginx.yml restart

# فقط یکی
docker-compose -f docker-compose-no-nginx.yml restart frontend
```

### متوقف کردن:
```bash
docker-compose -f docker-compose-no-nginx.yml down
```

### شروع مجدد:
```bash
docker-compose -f docker-compose-no-nginx.yml up -d
```

---

## ❌ عیب‌یابی

### مشکل: Nginx هنوز هست!

```bash
# پیدا کردن process
ps aux | grep nginx

# کشتن دستی
sudo pkill -9 nginx

# حذف کامل
sudo apt-get purge nginx* -y
```

### مشکل: پورت 80 هنوز گرفته شده

```bash
# پیدا کردن چی داره استفاده می‌کنه
sudo lsof -i :80

# کشتن process
sudo kill -9 <PID>
```

### مشکل: Docker build نمی‌شه

```bash
# پاک کردن کامل
docker system prune -af --volumes

# Build مجدد
docker-compose -f docker-compose-no-nginx.yml build --no-cache
```

### مشکل: خطای NKK2 از بیرون

این **مشکل فایروال ISP** است، نه سرور!

**راه‌حل:**
1. تست کنید روی سرور با `curl http://localhost:3002/`
2. از VPN استفاده کنید
3. با hosting provider تماس بگیرید
4. از Cloudflare استفاده کنید (مخفی کردن IP واقعی)

### مشکل: Container اجرا نمی‌شه

```bash
# چک لاگ
docker logs haghighi_frontend_prod

# ری‌بیلد
docker-compose -f docker-compose-no-nginx.yml up -d --build frontend
```

---

## 🔒 نکات امنیتی

### 1. تغییر پسوردها

فایل `production-no-nginx.env` رو ویرایش کنید:

```bash
nano production-no-nginx.env
```

حتماً این‌ها رو تغییر بدید:
- `POSTGRES_PASSWORD`
- `JWT_SECRET`

### 2. تنظیم Firewall

```bash
# فقط پورت‌های لازم رو باز کنید
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3000/tcp  # Backend
sudo ufw allow 3001/tcp  # Admin
sudo ufw allow 3002/tcp  # Frontend
sudo ufw enable
```

### 3. استفاده از Cloudflare (توصیه می‌شه!)

برای SSL و امنیت بیشتر:
1. Domain رو به Cloudflare اضافه کنید
2. Proxy رو فعال کنید (نارنجی)
3. SSL/TLS = Full
4. Firewall Rules تنظیم کنید

---

## 📊 مقایسه: با Nginx vs بدون Nginx

| ویژگی | با Nginx | بدون Nginx |
|-------|---------|-----------|
| پورت‌ها | 80, 443 | 3000, 3001, 3002 |
| SSL | ✅ آسان | ❌ نیاز به کار اضافی |
| پیکربندی | پیچیده | ساده |
| دیباگ | سخت‌تر | آسان‌تر |
| Performance | بهتر (caching) | خوب |
| Load Balancing | ✅ | ❌ |
| برای Production | ✅ توصیه می‌شه | ✅ قابل قبول |
| برای Development | ⚠️ بیش از حد | ✅ عالی |

---

## 🎯 توصیه نهایی

### برای Production:
✅ **با Cloudflare** → بدون Nginx خوبه  
✅ **با SSL خودتون** → با Nginx بهتره  
✅ **فقط تست** → بدون Nginx سریع‌تره  

### برای حل مشکل NKK2:
1. ✅ اول nginx رو حذف کنید: `sudo ./remove-nginx.sh`
2. ✅ دیپلوی بدون nginx: `./full-cleanup-and-deploy.sh`
3. ✅ روی سرور تست کنید: `curl http://localhost:3002/`
4. ✅ از VPN یا Cloudflare استفاده کنید

---

## 📞 پشتیبانی

اگر مشکلی داشتید:

```bash
# گرفتن لاگ کامل
docker-compose -f docker-compose-no-nginx.yml logs > deployment.log

# چک وضعیت
docker-compose -f docker-compose-no-nginx.yml ps > status.log

# بررسی firewall
sudo ufw status > firewall.log

# بررسی ports
sudo netstat -tlnp > ports.log
```

سپس این فایل‌ها رو بررسی کنید یا ارسال کنید.

---

## ✅ چک‌لیست نهایی

بعد از اجرای اسکریپت، این‌ها رو چک کنید:

- [ ] `nginx -v` خطا می‌ده؟ (باید خطا بده)
- [ ] `systemctl status nginx` not found می‌ده؟
- [ ] `docker ps` سه container اجراست؟ (backend, frontend, admin)
- [ ] `curl http://localhost:3002/` کار می‌کنه؟
- [ ] `curl http://localhost:3001/` کار می‌کنه؟
- [ ] `curl http://localhost:3000/api/health` کار می‌کنه؟
- [ ] `sudo lsof -i :80` خالیه؟ (nginx نباید باشه)
- [ ] Firewall پورت‌های 3000-3002 رو باز کرده؟

اگر همه ✅ بودند، تبریک! دیپلوی موفق بود! 🎉

---

**آخرین به‌روزرسانی:** 2025-10-28  
**نسخه:** 1.0

