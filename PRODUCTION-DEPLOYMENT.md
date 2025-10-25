# Production Deployment Guide

## فایل‌های ایجاد شده:

### 1. فایل‌های Environment
- `production.env` - تنظیمات محیط production
- `docker-compose.prod.yml` - کانفیگ Docker برای production

### 2. فایل‌های Nginx
- `nginx/nginx.conf` - کانفیگ اصلی Nginx
- `nginx/conf.d/default.conf` - کانفیگ سرور اصلی
- `frontend/nginx.conf` - کانفیگ Nginx برای frontend
- `admin-panel/nginx.conf` - کانفیگ Nginx برای admin panel

### 3. فایل‌های Docker Production
- `backend/Dockerfile.prod` - Dockerfile برای backend production
- `frontend/Dockerfile.prod` - Dockerfile برای frontend production
- `admin-panel/Dockerfile.prod` - Dockerfile برای admin panel production

### 4. اسکریپت Deploy
- `deploy-prod.sh` - اسکریپت خودکار deployment

## مراحل Deploy:

### مرحله 1: آماده‌سازی سرور
```bash
# روی سرور، پورت‌های مورد نیاز را باز کنید
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw allow 3001
sudo ufw allow 3002
sudo ufw allow 5432
```

### مرحله 2: کپی کردن فایل‌ها
```bash
# کپی کردن تمام فایل‌های پروژه به سرور
scp -r . user@YOUR_SERVER_IP:/path/to/project/
```

### مرحله 3: اجرای Deploy
```bash
# روی سرور
cd /path/to/project/
./deploy-prod.sh YOUR_SERVER_IP
```

## تنظیمات مهم:

### 1. تغییر IP در فایل‌ها
قبل از deploy، `YOUR_SERVER_IP` را با IP واقعی سرور جایگزین کنید:
- `production.env`
- `nginx/conf.d/default.conf`

### 2. تنظیمات امنیتی
- JWT_SECRET را تغییر دهید
- پسورد دیتابیس را قوی کنید
- SSL certificate اضافه کنید

### 3. حل مشکل عکس‌ها
کانفیگ Nginx شامل تنظیمات زیر برای عکس‌ها:
- CORS headers برای دسترسی cross-origin
- Cache headers برای بهبود عملکرد
- Security headers برای محافظت از فایل‌ها

## دسترسی‌ها:
- Frontend: `http://YOUR_SERVER_IP`
- Admin Panel: `http://YOUR_SERVER_IP/admin`
- API: `http://YOUR_SERVER_IP/api`
- API Docs: `http://YOUR_SERVER_IP/api/docs`
- Uploads: `http://YOUR_SERVER_IP/uploads/`

## نکات مهم:
1. فایل‌های upload در `/uploads` directory ذخیره می‌شوند
2. Nginx به عنوان reverse proxy عمل می‌کند
3. تمام سرویس‌ها در Docker container اجرا می‌شوند
4. PostgreSQL data در volume جداگانه ذخیره می‌شود

