# 🔧 حل مشکل Routing Admin Panel

## ❌ مشکل:

```
GET http://185.231.112.84:3001/admin/static/js/main.a39f6b5b.js 
net::ERR_ABORTED 404 (Not Found)
```

## 📝 علت:

Admin panel در `package.json` دارای `"homepage": "/admin"` است که برای استفاده با Nginx طراحی شده.

وقتی مستقیم به پورت 3001 دسترسی داری (بدون Nginx)، نباید prefix `/admin/` داشته باشه.

## ✅ راه‌حل:

### حالت 1: دیپلوی بدون Nginx (توصیه شده!)

```bash
cd /root/new-haghighi

# استفاده از اسکریپت مخصوص
./deploy-no-nginx.sh

# این اسکریپت خودکار:
# - Dockerfile.no-nginx استفاده میکنه
# - homepage رو در build time حذف میکنه
# - همه چیز رو درست setup میکنه
```

### حالت 2: دیپلوی با Nginx

```bash
cd /root/new-haghighi

# استفاده از اسکریپت عادی
./simple-deploy.sh

# این اسکریپت:
# - Dockerfile.prod استفاده میکنه
# - homepage: "/admin" رو نگه میداره
# - Nginx routing رو setup میکنه
```

## 🔍 تفاوت Dockerfile‌ها:

### Dockerfile.prod (با Nginx):
- Homepage: `/admin` رو نگه میداره
- برای استفاده پشت Nginx
- فایل‌های static: `/admin/static/...`

### Dockerfile.no-nginx (بدون Nginx):
- Homepage رو حذف میکنه (`npm pkg delete homepage`)
- برای دسترسی مستقیم
- فایل‌های static: `/static/...`

## 📊 بررسی وضعیت:

```bash
# چک کن از کدوم Dockerfile استفاده شده
docker inspect haghighi_admin_prod | grep -i image

# چک کن admin روی چه پورتی هست
docker ps | grep admin

# تست کردن مستقیم
curl -I http://185.231.112.84:3001/
```

## 🔄 تغییر از یکی به دیگری:

### از بدون Nginx به با Nginx:

```bash
# متوقف کردن
docker-compose -f docker-compose-no-nginx.yml down

# دیپلوی با Nginx
./simple-deploy.sh
```

### از با Nginx به بدون Nginx:

```bash
# متوقف کردن
docker-compose -f docker-compose.prod.yml down

# دیپلوی بدون Nginx
./deploy-no-nginx.sh
```

## 🆘 اگر همچنان مشکل داری:

```bash
# پاک کردن کامل
./cleanup-docker.sh

# دیپلوی مجدد بدون Nginx
./deploy-no-nginx.sh

# چک کردن لاگ admin
docker logs haghighi_admin_prod -f
```

---

✨ **نکته**: همیشه از اسکریپت مناسب (با یا بدون Nginx) استفاده کن!


