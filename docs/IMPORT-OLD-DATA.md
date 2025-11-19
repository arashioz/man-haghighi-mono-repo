# 📦 راهنمای Import داده‌های قدیمی

این راهنما نحوه import کاربران قدیمی از فایل `final_merged_data.json` را توضیح می‌دهد.

---

## 📊 اطلاعات فایل

**مسیر**: `moc-old-data/final_merged_data.json`

**آمار**:
- 📈 تعداد کل کاربران: **21,398**
- 🛒 کاربران با محصول: **11,277**
- 📦 تعداد محصولات: **1,472**

---

## 🚀 روش 1: اجرا در Development (روی کامپیوتر محلی)

### پیش‌نیاز:
```bash
cd /Users/arash/Desktop/new-haghighi/backend
npm install
```

### اجرای Import:
```bash
# اجرای script seed
npm run seed:old-users
```

این دستور:
- ✅ فایل `final_merged_data.json` را می‌خواند
- ✅ کاربران قدیمی را با `isOld: true` ایجاد می‌کند
- ✅ از رمز عبور `user123` برای همه استفاده می‌کند
- ✅ کاربران تکراری را skip می‌کند

---

## 🐋 روش 2: اجرا در Docker (روی سرور)

### گام 1: مطمئن شوید فایل در جای درست است

روی سرور:
```bash
cd /root/man-haghighi-mono-repo
ls -lh moc-old-data/final_merged_data.json
```

باید فایل را ببینید (حجم ~200MB)

### گام 2: کپی فایل به داخل کانتینر

```bash
# کپی فایل به داخل کانتینر backend
docker cp moc-old-data/final_merged_data.json haghighi_backend:/app/moc-old-data/final_merged_data.json
```

یا می‌توانید volume اضافه کنید به `docker-compose-alt-ports.yml`:

```yaml
backend:
  volumes:
    - ./uploads:/app/uploads
    - ./moc-old-data:/app/moc-old-data  # اضافه کنید
```

### گام 3: اجرای Import در کانتینر

```bash
# ورود به کانتینر
docker exec -it haghighi_backend sh

# اجرای import
npm run seed:old-users

# خروج
exit
```

یا به صورت یک خط:
```bash
docker exec -it haghighi_backend npm run seed:old-users
```

---

## 📋 خروجی دستور

```
🌱 Starting old data import from final_merged_data.json...

📂 Reading file: /app/moc-old-data/final_merged_data.json

📊 File Statistics:
   Total users: 21398
   Users with products: 11277
   Total products: 1472

🔄 Importing users...

   Progress: 1000/21398 (850 imported, 150 skipped, 0 errors)
   Progress: 2000/21398 (1720 imported, 280 skipped, 0 errors)
   ...
   Progress: 21000/21398 (18200 imported, 2800 skipped, 0 errors)

✅ Import completed!

📊 Summary:
   ✅ Successfully imported: 18500
   ⏭️  Skipped (duplicate or invalid): 2898
   ❌ Errors: 0

🔑 All old users can login with password: user123
```

---

## 🔍 بررسی کاربران Import شده

### از طریق psql:
```bash
docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db

-- تعداد کاربران قدیمی
SELECT COUNT(*) FROM users WHERE "isOld" = true;

-- لیست 10 کاربر اول
SELECT username, email, phone, "firstName", "lastName" 
FROM users 
WHERE "isOld" = true 
LIMIT 10;

-- خروج
\q
```

### از طریق صفحه Status:
```
http://185.231.112.84:8080/api/health/status
```

---

## 🔐 نحوه Login کاربران قدیمی

همه کاربران قدیمی با رمز عبور **`user123`** می‌توانند وارد شوند:

### Login با Email:
```bash
curl -X POST http://185.231.112.84:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"mojtabachi68@gmail.com","password":"user123"}'
```

### Login با شماره تلفن (اگر دارد):
```bash
curl -X POST http://185.231.112.84:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"09121234567","password":"user123"}'
```

---

## ⚙️ تنظیمات Script

فایل: `backend/prisma/seed-old-users.ts`

### ویژگی‌های Import:

1. **رمز عبور یکسان**: همه کاربران با `user123` import می‌شوند
2. **پاکسازی شماره تلفن**: فاصله‌ها و کاراکترهای اضافی حذف می‌شوند
3. **Username منحصر به فرد**: از email یا phone برای ساخت username استفاده می‌شود
4. **Skip کاربران تکراری**: اگر email یا phone قبلاً وجود دارد، skip می‌شود
5. **علامت‌گذاری**: همه کاربران با `isOld: true` علامت‌گذاری می‌شوند

### فیلدهای Import شده:
- `email`: از `user_email`
- `phone`: از `phone` یا `sms`
- `username`: از `user_login` یا ساخته شده از email/phone
- `firstName`: از `display_name`
- `lastName`: "قدیمی"
- `password`: "user123" (hashed)
- `role`: "USER"
- `isOld`: `true`

---

## 🐛 عیب‌یابی

### خطا: File not found

**مشکل**: فایل `final_merged_data.json` یافت نشد.

**راه حل**:
```bash
# در development
ls -la moc-old-data/final_merged_data.json

# در Docker
docker exec -it haghighi_backend ls -la /app/moc-old-data/
```

اگر فایل وجود ندارد، آن را کپی کنید:
```bash
docker cp moc-old-data/final_merged_data.json haghighi_backend:/app/moc-old-data/
```

### خطا: Cannot parse JSON

**مشکل**: فایل JSON معتبر نیست یا خراب شده.

**راه حل**: فایل را دوباره از منبع اصلی کپی کنید.

### خطا: Out of memory

**مشکل**: فایل بزرگ است (200MB+) و حافظه کافی نیست.

**راه حل 1**: افزایش حافظه Node.js:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run seed:old-users
```

**راه حل 2**: Import به صورت batch (نسخه بعدی script)

### کاربران Import نمی‌شوند

**علت‌های احتمالی**:
1. Email یا Phone خالی است → Skip می‌شود
2. کاربر قبلاً وجود دارد → Skip می‌شود
3. خطا در ساختار داده → Error log می‌شود

**بررسی**:
```bash
# بررسی logs
docker logs haghighi_backend --tail=100
```

---

## 📊 محدودیت‌ها و نکات

1. **محصولات**: در نسخه فعلی، فقط کاربران import می‌شوند. محصولات (products) import نمی‌شوند.
2. **تکرار**: اگر script را دوباره اجرا کنید، کاربران تکراری skip می‌شوند.
3. **حافظه**: Import کل 21K کاربر ممکن است 5-10 دقیقه طول بکشد.
4. **رمز عبور**: همه کاربران با `user123` import می‌شوند (نه رمز اصلی).

---

## 🔄 Import مجدد با حذف کاربران قدیمی

اگر می‌خواهید کاربران قدیمی را حذف و دوباره import کنید:

```bash
# حذف کاربران قدیمی
docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db -c "DELETE FROM users WHERE \"isOld\" = true;"

# Import مجدد
docker exec -it haghighi_backend npm run seed:old-users
```

---

## 📝 نسخه‌های آینده (Feature Request)

- [ ] Import محصولات و map کردن به دوره‌ها
- [ ] Import تاریخ ثبت‌نام اصلی
- [ ] Batch import برای کاهش استفاده از حافظه
- [ ] Resume قابلیت (اگر import قطع شد، از جایی که قطع شده ادامه دهد)
- [ ] گزارش دقیق‌تر (لیست کاربرانی که skip شدند)

---

## ✅ Checklist Import

- [ ] فایل `final_merged_data.json` موجود است
- [ ] Backend بالا است و به دیتابیس متصل است
- [ ] حافظه کافی برای import دارید (حداقل 2GB RAM)
- [ ] Backup از دیتابیس گرفتید (اختیاری اما توصیه می‌شود)
- [ ] Script را اجرا کردید: `npm run seed:old-users`
- [ ] خروجی را بررسی کردید
- [ ] تعداد کاربران را چک کردید
- [ ] با یک کاربر قدیمی تست login کردید

---

## 🚀 دستور سریع (یک خط)

```bash
# روی سرور با Docker
cd /root/man-haghighi-mono-repo && \
docker exec -it haghighi_backend npm run seed:old-users && \
docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db -c "SELECT COUNT(*) as old_users FROM users WHERE \"isOld\" = true;"
```

---

## 📞 پشتیبانی

اگر مشکلی داشتید:
1. Logs را بررسی کنید
2. فایل `final_merged_data.json` را چک کنید
3. اتصال به دیتابیس را تست کنید
4. در صورت نیاز، کاربران قدیمی را حذف و دوباره import کنید

