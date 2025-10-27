# 🚀 راهنمای کامل دیپلوی پروژه Haghighi

## 📋 پیش‌نیازها

قبل از شروع، مطمئن شوید که موارد زیر روی سرور نصب شده‌اند:

```bash
# نصب Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# نصب Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# بررسی نصب
docker --version
docker-compose --version
```

## 🎯 مراحل دیپلوی

### مرحله 1: انتقال پروژه به سرور

```bash
# از روی کامپیوتر محلی
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  /Users/arash/Desktop/new-haghighi/ root@185.231.112.84:/root/new-haghighi/
```

یا با استفاده از Git:

```bash
# روی سرور
cd /root
git clone YOUR_REPO_URL new-haghighi
cd new-haghighi
```

### مرحله 2: پاک کردن همه چیز داکر (اختیاری)

اگر میخواهید از صفر شروع کنید:

```bash
cd /root/new-haghighi
chmod +x cleanup-docker.sh
./cleanup-docker.sh
```

این دستور:
- همه کانتینرها را متوقف و حذف می‌کند
- همه ایمیج‌ها را حذف می‌کند
- همه Volume‌ها را حذف می‌کند
- همه Network‌های سفارشی را حذف می‌کند
- کش Docker را پاک می‌کند

### مرحله 3: بررسی و ویرایش فایل محیط

```bash
nano production.env
```

مطمئن شوید که IP سرور صحیح است:
```env
API_BASE_URL=http://185.231.112.84/api
REACT_APP_API_URL=http://185.231.112.84/api
CORS_ORIGIN=http://185.231.112.84
STATIC_FILES_URL=http://185.231.112.84/uploads
```

### مرحله 4: اجرای اسکریپت دیپلوی

```bash
chmod +x deploy-from-scratch.sh
./deploy-from-scratch.sh
```

این اسکریپت به صورت خودکار:
1. ✅ پیش‌نیازها را بررسی می‌کند
2. 🧹 منابع قدیمی Docker را پاک می‌کند
3. 📁 دایرکتوری‌های لازم را می‌سازد
4. ⚙️ فایل محیط را پیکربندی می‌کند
5. 🏗️ تصاویر Docker را می‌سازد
6. 🚀 سرویس‌ها را راه‌اندازی می‌کند
7. 💾 دیتابیس را راه‌اندازی می‌کند
8. 🌐 Nginx را پیکربندی می‌کند
9. 📁 دسترسی‌های uploads را تنظیم می‌کند
10. ✅ سلامت سرویس‌ها را بررسی می‌کند

## 🌐 آدرس‌های دسترسی

بعد از دیپلوی موفق:

- **سایت اصلی**: http://185.231.112.84/
- **پنل ادمین**: http://185.231.112.84/admin/
- **API**: http://185.231.112.84/api/
- **مستندات API**: http://185.231.112.84/api/docs/
- **فایل‌های آپلود شده**: http://185.231.112.84/uploads/

## 📊 دستورات مفید

### مشاهده وضعیت سرویس‌ها

```bash
docker-compose -f docker-compose.prod.yml ps
```

### مشاهده لاگ‌ها

```bash
# همه سرویس‌ها
docker-compose -f docker-compose.prod.yml logs -f

# فقط backend
docker logs haghighi_backend_prod -f

# فقط nginx
docker logs haghighi_nginx_prod -f
```

### ری‌استارت سرویس‌ها

```bash
# همه سرویس‌ها
docker-compose -f docker-compose.prod.yml restart

# فقط یک سرویس خاص
docker-compose -f docker-compose.prod.yml restart backend
```

### متوقف کردن سرویس‌ها

```bash
docker-compose -f docker-compose.prod.yml down
```

### شروع مجدد سرویس‌ها

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### دسترسی به shell کانتینر

```bash
# Backend
docker exec -it haghighi_backend_prod sh

# Database
docker exec -it haghighi_postgres_prod psql -U haghighi_user -d haghighi_db
```

### بررسی استفاده از منابع

```bash
docker stats
```

## 🔧 عیب‌یابی

### مشکل در اپلود فایل‌ها

```bash
# اطمینان از دسترسی‌های صحیح
chmod -R 777 /root/new-haghighi/uploads
docker exec haghighi_backend_prod chmod -R 777 /app/uploads
docker-compose -f docker-compose.prod.yml restart backend nginx
```

### مشکل در اتصال به دیتابیس

```bash
# بررسی وضعیت دیتابیس
docker logs haghighi_postgres_prod

# ری‌استارت دیتابیس
docker-compose -f docker-compose.prod.yml restart postgres

# اعمال مجدد schema
docker exec haghighi_backend_prod npx prisma db push
```

### مشکل در Nginx

```bash
# بررسی کانفیگ Nginx
docker exec haghighi_nginx_prod nginx -t

# مشاهده لاگ‌های Nginx
docker logs haghighi_nginx_prod

# ری‌استارت Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### پاک کردن و شروع مجدد کامل

```bash
# متوقف و حذف همه چیز
docker-compose -f docker-compose.prod.yml down -v

# پاک کردن کامل
./cleanup-docker.sh

# دیپلوی مجدد
./deploy-from-scratch.sh
```

## 🔐 نکات امنیتی

1. **تغییر رمزهای پیش‌فرض**: حتماً در فایل `production.env` رمزهای زیر را تغییر دهید:
   ```env
   POSTGRES_PASSWORD=your-strong-password-here
   JWT_SECRET=your-super-secret-jwt-key-here
   ```

2. **فایروال**: پورت‌های غیرضروری را ببندید:
   ```bash
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw allow 22/tcp
   ufw enable
   ```

3. **Backup منظم**:
   ```bash
   # Backup دیتابیس
   docker exec haghighi_postgres_prod pg_dump -U haghighi_user haghighi_db > backup_$(date +%Y%m%d).sql
   
   # Backup فایل‌های آپلود
   tar -czf uploads_backup_$(date +%Y%m%d).tar.gz /root/new-haghighi/uploads
   ```

## 📈 مانیتورینگ

### بررسی Health سرویس‌ها

```bash
# Backend health
curl http://localhost:3000/api/health

# Frontend
curl http://localhost:3002/

# Admin
curl http://localhost:3001/
```

### بررسی فضای دیسک

```bash
df -h
docker system df
```

### پاک‌سازی منابع استفاده نشده

```bash
docker system prune -a --volumes
```

## 📞 پشتیبانی

در صورت بروز مشکل، لاگ‌های زیر را بررسی کنید:
- لاگ Backend: `docker logs haghighi_backend_prod`
- لاگ Nginx: `docker logs haghighi_nginx_prod`
- لاگ Database: `docker logs haghighi_postgres_prod`

---

✨ **موفق باشید!**

