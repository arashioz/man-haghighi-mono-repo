# Production Deployment Guide

این راهنما برای اجرای اپلیکیشن Haghighi روی سرور production است.

## فایل‌های ایجاد شده برای Production

- `docker-compose.prod.yml` - تنظیمات Docker Compose برای production
- `production.env` - متغیرهای محیطی production
- `backend/Dockerfile.prod` - Dockerfile بهینه شده برای backend
- `frontend/Dockerfile.prod` - Dockerfile بهینه شده برای frontend
- `admin-panel/Dockerfile.prod` - Dockerfile بهینه شده برای admin panel
- `deploy-prod.sh` - اسکریپت خودکار deployment

## مراحل اجرا

### 1. آماده‌سازی سرور

```bash
# نصب Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# نصب Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. کپی کردن پروژه

```bash
# کپی کردن کل پروژه به سرور
scp -r /Users/arash/Desktop/new-haghighi user@YOUR_SERVER_IP:/path/to/destination/
```

### 3. تنظیم متغیرهای محیطی

فایل `production.env` را ویرایش کنید:

```bash
# Database Configuration
POSTGRES_DB=haghighi_db
POSTGRES_USER=haghighi_user
POSTGRES_PASSWORD=your_secure_database_password_here

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here_change_this_in_production
JWT_EXPIRES_IN=7d

# API Configuration
API_BASE_URL=http://YOUR_SERVER_IP:3000
REACT_APP_API_URL=http://YOUR_SERVER_IP:3000

# File Upload Configuration
MAX_FILE_SIZE=10485760

# Server IP - Replace with your actual server IP
SERVER_IP=YOUR_SERVER_IP
```

### 4. اجرای خودکار

```bash
# اجرای اسکریپت deployment
./deploy-prod.sh YOUR_SERVER_IP
```

### 5. اجرای دستی

```bash
# اجرای دستی
docker-compose -f docker-compose.prod.yml --env-file production.env up -d --build
```

## پورت‌های مورد نیاز

- **3000**: Backend API
- **3001**: Admin Panel
- **3002**: Frontend
- **5432**: PostgreSQL Database
- **6379**: Redis

## تنظیمات فایروال

```bash
# Ubuntu/Debian
sudo ufw allow 3000
sudo ufw allow 3001
sudo ufw allow 3002

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=3002/tcp
sudo firewall-cmd --reload
```

## دستورات مفید

```bash
# مشاهده لاگ‌ها
docker-compose -f docker-compose.prod.yml logs -f

# مشاهده وضعیت سرویس‌ها
docker-compose -f docker-compose.prod.yml ps

# متوقف کردن سرویس‌ها
docker-compose -f docker-compose.prod.yml down

# راه‌اندازی مجدد سرویس‌ها
docker-compose -f docker-compose.prod.yml restart

# پاک کردن تمام containers و volumes
docker-compose -f docker-compose.prod.yml down -v
```

## نکات امنیتی

1. **تغییر رمزهای عبور**: حتماً رمزهای پیش‌فرض را تغییر دهید
2. **JWT Secret**: یک کلید امن و منحصر به فرد برای JWT استفاده کنید
3. **فایروال**: فقط پورت‌های مورد نیاز را باز کنید
4. **SSL**: برای امنیت بیشتر، SSL certificate اضافه کنید
5. **Backup**: برای دیتابیس PostgreSQL backup تنظیم کنید

## عیب‌یابی

```bash
# بررسی وضعیت containers
docker ps

# بررسی لاگ‌های backend
docker logs haghighi_backend_prod

# بررسی لاگ‌های frontend
docker logs haghighi_frontend_prod

# بررسی لاگ‌های admin panel
docker logs haghighi_admin_prod

# بررسی وضعیت دیتابیس
docker exec -it haghighi_postgres_prod psql -U haghighi_user -d haghighi_db
```

## بهینه‌سازی‌های اعمال شده

- استفاده از multi-stage builds برای کاهش حجم images
- استفاده از nginx برای serving static files
- اضافه کردن health checks
- تنظیم proper caching headers
- استفاده از non-root users برای امنیت
- اضافه کردن security headers
- بهینه‌سازی gzip compression
