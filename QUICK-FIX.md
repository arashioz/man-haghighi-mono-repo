# ⚡ حل سریع مشکل PostgreSQL Version

## ❌ مشکل:
```
FATAL: database files are incompatible with server
The data directory was initialized by PostgreSQL version 14, 
which is not compatible with this version 15
```

## ✅ راه‌حل:

### گزینه 1️⃣: اسکریپت خودکار (توصیه میشه!)

```bash
cd /root/new-haghighi

# حذف volume قدیمی و دیپلوی مجدد
./fix-postgres-version.sh
./simple-deploy.sh
```

### گزینه 2️⃣: دستی

```bash
cd /root/new-haghighi

# متوقف کردن سرویس‌ها
docker-compose -f docker-compose.prod.yml down

# حذف volume‌های PostgreSQL
docker volume rm postgres_data_prod
docker volume rm new-haghighi_postgres_data_prod

# پاک کردن همه volume‌ها
docker volume prune -f

# دیپلوی مجدد
./simple-deploy.sh
```

### گزینه 3️⃣: پاک کردن کامل از صفر

```bash
cd /root/new-haghighi

# پاک کردن کامل
./cleanup-docker.sh

# دیپلوی جدید
./simple-deploy.sh
```

---

## 📝 توضیح:

دیتابیس قبلی با **PostgreSQL 14** ساخته شده بود.  
الان داریم **PostgreSQL 15** استفاده میکنیم.  
باید volume قدیمی رو پاک کنیم تا دیتابیس جدید از صفر ساخته بشه.

⚠️ **توجه**: اگر دیتای مهمی داری، اول backup بگیر!

```bash
# Backup قبل از پاک کردن (اگر دیتا داری)
docker exec haghighi_postgres_prod pg_dump -U haghighi_user haghighi_db > backup.sql
```

---

✨ **بعد از اجرای این دستورات، مشکل حل میشه!**

