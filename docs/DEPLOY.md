# 🚀 راهنمای Deploy روی سرور

این راهنما برای deploy کردن پروژه روی سرور با IP مستقیم است.

## 📋 پیش‌نیازها

روی سرور باید نصب باشد:
- Docker
- Docker Compose
- Git

## 🔧 نصب Docker و Docker Compose (اگر نصب نیست)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

## 📥 Deploy کردن

### مرحله 1: Clone پروژه روی سرور

```bash
# SSH به سرور
ssh root@185.231.112.84

# Clone پروژه
git clone https://github.com/arashioz/man-haghighi-mono-repo.git
cd man-haghighi-mono-repo
```

### مرحله 2: تنظیم Environment

```bash
# کپی فایل environment
cp server.env .env

# ویرایش و تغییر IP سرور
nano .env
```

**تغییرات مهم در `.env`:**

```env
# IP سرور خودتون رو بذارید
REACT_APP_API_URL=http://YOUR_SERVER_IP:3000/api

# پسورد دیتابیس رو تغییر بدید
POSTGRES_PASSWORD=YourSecurePassword123!

# JWT Secret رو تغییر بدید
JWT_SECRET=YourSuperSecretKeyHere123!

# Environment را production کنید
NODE_ENV=production
```

### مرحله 3: ساخت پوشه uploads

```bash
mkdir -p uploads
chmod 777 uploads
```

### مرحله 4: اجرای Docker Compose

```bash
# Build و start
docker-compose up -d

# چک کردن وضعیت
docker-compose ps

# دیدن logs
docker-compose logs -f
```

### مرحله 5: باز کردن پورت‌ها (Firewall)

```bash
# اگر از UFW استفاده می‌کنید
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3000/tcp  # Backend
sudo ufw allow 3001/tcp  # Admin
sudo ufw allow 3002/tcp  # Frontend
sudo ufw enable

# چک کردن
sudo ufw status
```

### مرحله 6: تست

```bash
# تست local روی سرور
curl http://localhost:3000/api/health
curl http://localhost:3001/
curl http://localhost:3002/

# از کامپیوتر خودتون
curl http://YOUR_SERVER_IP:3000/api/health
```

## 🌐 دسترسی به برنامه

بعد از deploy موفق:

| سرویس | آدرس |
|-------|------|
| Frontend | `http://YOUR_SERVER_IP:3002` |
| Admin Panel | `http://YOUR_SERVER_IP:3001` |
| Backend API | `http://YOUR_SERVER_IP:3000/api` |
| API Docs | `http://YOUR_SERVER_IP:3000/api/docs` |

**مثال با IP نمونه:**
- Frontend: `http://185.231.112.84:3002`
- Admin: `http://185.231.112.84:3001`
- API: `http://185.231.112.84:3000/api`

## 🔄 به‌روزرسانی (Update)

```bash
# SSH به سرور
ssh root@185.231.112.84
cd man-haghighi-mono-repo

# Pull آخرین تغییرات
git pull origin master

# متوقف کردن containers
docker-compose down

# پاک کردن images قدیمی
docker rmi man-haghighi-mono-repo_frontend man-haghighi-mono-repo_admin man-haghighi-mono-repo_backend

# Build و start مجدد
docker-compose build --no-cache
docker-compose up -d

# چک logs
docker-compose logs -f
```

## 🛠️ دستورات مفید

### مشاهده لاگ‌ها
```bash
# همه
docker-compose logs -f

# فقط یکی
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f admin
```

### ری‌استارت
```bash
# همه
docker-compose restart

# فقط یکی
docker-compose restart backend
```

### متوقف کردن
```bash
docker-compose down
```

### شروع مجدد
```bash
docker-compose up -d
```

### دیدن وضعیت
```bash
docker-compose ps
docker ps
```

### دسترسی به shell container
```bash
docker exec -it haghighi_backend sh
docker exec -it haghighi_postgres sh
```

### دیدن استفاده منابع
```bash
docker stats
```

## 🐛 عیب‌یابی

### مشکل: پورت در حال استفاده است

```bash
# پیدا کردن process
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :3002

# کشتن process
sudo kill -9 <PID>
```

### مشکل: Container اجرا نمی‌شه

```bash
# دیدن لاگ
docker-compose logs backend

# ری‌بیلد
docker-compose build --no-cache backend
docker-compose up -d
```

### مشکل: دیتابیس وصل نمی‌شه

```bash
# چک لاگ دیتابیس
docker-compose logs postgres

# ری‌استارت
docker-compose restart postgres backend

# اگر کار نکرد، پاک کردن volume
docker-compose down -v
docker-compose up -d
```

### مشکل: API 404 می‌ده

- چک کنید `REACT_APP_API_URL` در `.env` با IP سرور تنظیم شده باشه
- باید **قبل از build** تنظیم بشه
- اگر بعد از build تغییر دادید، باید rebuild کنید:

```bash
docker-compose down
docker rmi man-haghighi-mono-repo_frontend man-haghighi-mono-repo_admin
docker-compose build --no-cache frontend admin
docker-compose up -d
```

### مشکل: فایل‌ها آپلود نمی‌شن

```bash
# دسترسی پوشه uploads
chmod -R 777 uploads
docker exec haghighi_backend chmod -R 777 /app/uploads
docker-compose restart backend
```

### مشکل: از بیرون دسترسی ندارم

1. چک کنید firewall باز باشه:
```bash
sudo ufw status
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp
```

2. چک کنید containers اجرا هستند:
```bash
docker-compose ps
```

3. تست local روی سرور کنید:
```bash
curl http://localhost:3002/
```

4. اگر local کار می‌کنه ولی از بیرون نه:
   - مشکل از Firewall hosting provider است
   - با support تماس بگیرید

## 🔒 نکات امنیتی

### 1. تغییر پسوردها (خیلی مهم!)

در فایل `.env`:
- `POSTGRES_PASSWORD` را تغییر دهید
- `JWT_SECRET` را تغییر دهید

### 2. Backup دیتابیس

```bash
# Backup
docker exec haghighi_postgres pg_dump -U haghighi_user haghighi_db > backup.sql

# Restore
docker exec -i haghighi_postgres psql -U haghighi_user haghighi_db < backup.sql
```

### 3. محدود کردن دسترسی

فقط پورت‌های لازم رو باز کنید:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp
sudo ufw enable
```

### 4. استفاده از HTTPS (توصیه می‌شه)

برای production واقعی، از Cloudflare یا Let's Encrypt استفاده کنید.

## 📊 مانیتورینگ

### چک کردن منظم

```bash
# فضای دیسک
df -h

# حافظه
free -h

# استفاده Docker
docker system df

# لاگ‌های اخیر
docker-compose logs --tail=100
```

### پاک کردن منظم

```bash
# پاک کردن images استفاده نشده
docker image prune -a

# پاک کردن volumes استفاده نشده
docker volume prune

# پاک کردن کامل (احتیاط!)
docker system prune -af
```

## ⚡ Automated Deployment (اختیاری)

می‌تونید یک cron job بذارید برای pull و deploy خودکار:

```bash
# باز کردن crontab
crontab -e

# اضافه کردن این خط برای هر روز ساعت 3 صبح
0 3 * * * cd /root/man-haghighi-mono-repo && git pull && docker-compose up -d --build
```

## 📞 پشتیبانی

اگر مشکلی داشتید:

1. لاگ‌ها رو ذخیره کنید:
```bash
docker-compose logs > logs.txt
docker-compose ps > status.txt
```

2. وضعیت سیستم رو چک کنید:
```bash
docker ps -a
docker images
docker volume ls
```

---

**نکته:** این setup برای production ساده مناسبه. برای production پیشرفته‌تر با SSL و domain، به تنظیمات بیشتری نیاز دارید.

**آخرین به‌روزرسانی:** 2025-10-28

