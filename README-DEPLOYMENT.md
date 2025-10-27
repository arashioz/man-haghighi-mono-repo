# 🚀 پلتفرم حقیقی - راهنمای دیپلوی

## 📖 فهرست محتوا

1. [نمای کلی](#نمای-کلی)
2. [دستورالعمل سریع](#دستورالعمل-سریع)
3. [فایل‌های مهم](#فایلهای-مهم)
4. [آدرس‌های دسترسی](#آدرسهای-دسترسی)
5. [عیب‌یابی](#عیبیابی)

---

## 🎯 نمای کلی

این پروژه شامل 3 بخش اصلی است:
- **Backend**: NestJS API (Port 3000)
- **Frontend**: React User Interface (Port 3002)
- **Admin Panel**: React Admin Dashboard (Port 3001)
- **Database**: PostgreSQL 15 (Port 5432)
- **Nginx**: Reverse Proxy (Port 80)

سرور: **185.231.112.84**

---

## ⚡ دستورالعمل سریع

### روی کامپیوتر محلی:

```bash
# 1. آپلود پروژه به سرور
cd /Users/arash/Desktop/new-haghighi
./upload-to-server.sh
```

### روی سرور:

```bash
# 2. اتصال به سرور
ssh root@185.231.112.84

# 3. رفتن به پوشه پروژه
cd /root/new-haghighi

# 4. پاک کردن داکر (اختیاری - برای دیپلوی از صفر)
./cleanup-docker.sh

# 5. دیپلوی
./deploy-from-scratch.sh

# 6. تست دیپلوی (اختیاری)
./test-deployment.sh
```

**تمام! ✨**

---

## 📁 فایل‌های مهم

| فایل | توضیحات |
|------|---------|
| `cleanup-docker.sh` | پاک کردن کامل همه منابع Docker |
| `deploy-from-scratch.sh` | اسکریپت دیپلوی خودکار از صفر |
| `upload-to-server.sh` | آپلود پروژه از کامپیوتر محلی به سرور |
| `test-deployment.sh` | تست سلامت دیپلوی |
| `docker-compose.prod.yml` | فایل Docker Compose برای production |
| `nginx.conf` | پیکربندی Nginx |
| `production.env` | متغیرهای محیطی production |
| `QUICK-START.md` | راهنمای سریع شروع |
| `SERVER-COMMANDS.md` | تمام دستورات مفید سرور |
| `DEPLOYMENT-GUIDE.md` | راهنمای کامل دیپلوی |

---

## 🌐 آدرس‌های دسترسی

بعد از دیپلوی موفق:

| سرویس | آدرس محلی | آدرس عمومی |
|-------|-----------|------------|
| Frontend | http://localhost:3002 | http://185.231.112.84/ |
| Admin Panel | http://localhost:3001 | http://185.231.112.84/admin/ |
| Backend API | http://localhost:3000/api | http://185.231.112.84/api/ |
| API Docs | http://localhost:3000/api/docs | http://185.231.112.84/api/docs/ |
| Uploads | - | http://185.231.112.84/uploads/ |

---

## 🔧 دستورات مفید

### مشاهده وضعیت

```bash
docker-compose -f docker-compose.prod.yml ps
```

### مشاهده لاگ‌ها

```bash
# همه سرویس‌ها
docker-compose -f docker-compose.prod.yml logs -f

# فقط backend
docker logs haghighi_backend_prod -f
```

### ری‌استارت

```bash
# همه سرویس‌ها
docker-compose -f docker-compose.prod.yml restart

# فقط یک سرویس
docker-compose -f docker-compose.prod.yml restart backend
```

### متوقف کردن

```bash
docker-compose -f docker-compose.prod.yml down
```

### شروع مجدد

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🐛 عیب‌یابی

### ❌ مشکل: اپلود فایل کار نمیکنه

**حل:**
```bash
chmod -R 777 /root/new-haghighi/uploads
docker exec haghighi_backend_prod chmod -R 777 /app/uploads
docker-compose -f docker-compose.prod.yml restart backend nginx
```

### ❌ مشکل: Backend وصل نمیشه

**حل:**
```bash
docker logs haghighi_backend_prod
docker-compose -f docker-compose.prod.yml restart backend
```

### ❌ مشکل: دیتابیس کار نمیکنه

**حل:**
```bash
docker logs haghighi_postgres_prod
docker exec haghighi_backend_prod npx prisma db push
docker-compose -f docker-compose.prod.yml restart postgres backend
```

### ❌ مشکل: Nginx ارور میده

**حل:**
```bash
docker exec haghighi_nginx_prod nginx -t
docker logs haghighi_nginx_prod
docker-compose -f docker-compose.prod.yml restart nginx
```

### ❌ همه چیز خراب شده!

**حل: شروع از صفر**
```bash
cd /root/new-haghighi
./cleanup-docker.sh
./deploy-from-scratch.sh
```

---

## 📚 مستندات بیشتر

- **شروع سریع**: [QUICK-START.md](QUICK-START.md)
- **دستورات سرور**: [SERVER-COMMANDS.md](SERVER-COMMANDS.md)
- **راهنمای کامل**: [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)

---

## 🔐 نکات امنیتی

⚠️ **حتماً قبل از استفاده در production:**

1. رمزهای موجود در `production.env` را تغییر دهید:
   ```env
   POSTGRES_PASSWORD=your-strong-password
   JWT_SECRET=your-super-secret-key
   ```

2. فایروال را فعال کنید:
   ```bash
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw allow 22/tcp
   ufw enable
   ```

3. از backup منظم استفاده کنید:
   ```bash
   # Backup دیتابیس
   docker exec haghighi_postgres_prod pg_dump -U haghighi_user haghighi_db > backup.sql
   
   # Backup فایل‌ها
   tar -czf uploads_backup.tar.gz /root/new-haghighi/uploads
   ```

---

## 📞 پشتیبانی

در صورت بروز مشکل:
1. لاگ‌ها را بررسی کنید: `docker-compose -f docker-compose.prod.yml logs -f`
2. اسکریپت تست را اجرا کنید: `./test-deployment.sh`
3. راهنمای عیب‌یابی را مطالعه کنید: [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)

---

✨ **موفق باشید!**

