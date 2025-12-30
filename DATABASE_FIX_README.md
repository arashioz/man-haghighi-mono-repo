# 🛠️ Database Fix Scripts

## 📋 شرح مشکل

خطاهای دیتابیس زیر در production رخ داده بود:
- `column "gatewayName" of relation "payment_links" does not exist`
- `column "resetOtp" of relation "users" does not exist` 
- `column "messageTemplateEnabled" of relation "settings" does not exist`

## 🔧 راه حل

اسکریپت‌های زیر برای رفع این مشکلات ایجاد شده‌اند:

### 📁 فایل‌های موجود:

1. **`production_database_fix_complete.sh`** ⭐ **توصیه می‌شود**
   - کامل‌ترین اسکریپت با تست‌های ایمنی
   - چک کردن اتصال دیتابیس
   - نمایش وضعیت قبل و بعد از تغییرات
   - راهنمایی‌های کامل

2. **`server_fix.sh`**
   - اسکریپت ساده برای اجرای مستقیم روی سرور

3. **`production_fix.sh`** 
   - اسکریپت برای اجرای از راه دور via SSH

4. **`fix_database_production.sh`**
   - نسخه قدیمی (استفاده نکنید)

## 🚀 نحوه استفاده

### روش ۱: اجرای کامل (توصیه می‌شود)

```bash
# اتصال به سرور production
ssh user@your-server.com
cd /path/to/your/project

# اجرای اسکریپت کامل
./production_database_fix_complete.sh
```

### روش ۲: اجرای مستقیم SQL

```bash
# اتصال به سرور
ssh user@your-server.com

# اجرای مستقیم دستورات SQL
psql -h localhost -U haghighi_user -d haghighi_db -c "
ALTER TABLE \"payment_links\" ADD COLUMN IF NOT EXISTS \"gatewayName\" TEXT;
ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"resetOtp\" TEXT;
ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"resetOtpExpiresAt\" TIMESTAMP(3);
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"messageTemplateEnabled\" BOOLEAN DEFAULT true;
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"messageTemplateText\" TEXT DEFAULT 'سلام {name}\nمبلغ: {amount} تومان\nلینک پرداخت:\n{link}';
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"whatsappTemplateText\" TEXT DEFAULT 'سلام {name}!\nلینک پرداخت شما آماده است:\n{link}\nمبلغ: {amount} تومان';
"
```

### روش ۳: اجرای داخل Docker

```bash
# اگر از Docker استفاده می‌کنید
docker-compose exec postgres psql -U haghighi_user -d haghighi_db -c "
ALTER TABLE \"payment_links\" ADD COLUMN IF NOT EXISTS \"gatewayName\" TEXT;
ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"resetOtp\" TEXT;
ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"resetOtpExpiresAt\" TIMESTAMP(3);
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"messageTemplateEnabled\" BOOLEAN DEFAULT true;
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"messageTemplateText\" TEXT DEFAULT 'سلام {name}\nمبلغ: {amount} تومان\nلینک پرداخت:\n{link}';
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"whatsappTemplateText\" TEXT DEFAULT 'سلام {name}!\nلینک پرداخت شما آماده است:\n{link}\nمبلغ: {amount} تومان';
"
```

## ⚠️ نکات مهم

### قبل از اجرا:
- ✅ **Backup از دیتابیس بگیرید**
- ✅ مطمئن شوید که اتصال به دیتابیس ممکن است
- ✅ اگر ممکن است، ابتدا روی staging server تست کنید

### اطلاعات دیتابیس (از server.env):
```
Host: localhost (یا postgres container)
Port: 5432
User: haghighi_user
Database: haghighi_db
Password: ChangeThisPassword123!
```

### پس از اجرا:
1. **Backend را restart کنید:**
   ```bash
   docker-compose restart backend
   # یا
   pm2 restart backend
   ```

2. **APIها را تست کنید:**
   ```bash
   curl https://api.manehaghighi.com/api/health
   curl https://api.manehaghighi.com/api/payments/links \
        -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
   ```

## 🔍 عیب‌یابی

### اگر اتصال به دیتابیس ناموفق بود:
```bash
# چک کردن وضعیت PostgreSQL
sudo systemctl status postgresql

# یا اگر Docker است:
docker-compose ps postgres
docker-compose logs postgres
```

### اگر ستون‌ها اضافه نشدند:
```bash
# چک کردن ستون‌های جدول
psql -h localhost -U haghighi_user -d haghighi_db -c "\d payment_links"
psql -h localhost -U haghighi_user -d haghighi_db -c "\d users"
psql -h localhost -U haghighi_user -d haghighi_db -c "\d settings"
```

### اگر backend error دارد:
```bash
# چک کردن لاگ‌های backend
docker-compose logs backend --tail 50
```

## 📞 پشتیبانی

اگر مشکل دارید، این اطلاعات را ارسال کنید:
- خروجی کامل اجرای اسکریپت
- لاگ‌های PostgreSQL: `docker-compose logs postgres`
- لاگ‌های backend: `docker-compose logs backend`
- نسخه PostgreSQL: `psql -c "SELECT version();"`
