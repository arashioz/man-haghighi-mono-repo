# 🚨 مشکلات Production و راه‌حل‌ها

## مشکلات اخیر و وضعیت آنها

### ✅ 1. خطای PaymentStatus Enum
**مشکل:** `invalid input value for enum "PaymentStatus": "CREATED"`

**علت:** Enum PaymentStatus در دیتابیس شامل وضعیت‌های جدید (`CREATED`, `GATEWAY_REDIRECTED`, `PAYMENT_TIMEOUT`) نبود.

**راه‌حل:**
```bash
# اجرای migration دیتابیس
npx prisma db push

# بازسازی Prisma Client
npx prisma generate

# راه‌اندازی مجدد backend
docker-compose restart backend
```

**وضعیت:** ✅ **حل شده**

---

### ✅ 2. خطای CORS Policy
**مشکل:** `Access to XMLHttpRequest blocked by CORS policy: No 'Access-Control-Allow-Origin' header`

**علت:** تنظیمات CORS در production بروزرسانی نشده بود.

**بررسی تنظیمات:**
- ✅ `server.env` شامل `CORS_ORIGINS=https://admin.manehaghighi.com` است
- ✅ تنظیمات NestJS CORS درست است
- ✅ تنظیمات Nginx CORS headers حذف شده‌اند

**راه‌حل برای Production:**
```bash
# اجرای script تعمیر
./production_fix.sh

# یا دستی:
docker-compose run --rm backend npx prisma db push
docker-compose restart backend
sudo systemctl reload nginx
```

**وضعیت:** ✅ **تنظیمات درست است - تست کنید**

---

## 🛠️ استفاده از Script تعمیر Production

### اجرای خودکار تمام تعمیرات:
```bash
# کپی به سرور
scp production_fix.sh user@server:/path/to/project/

# اجرای script
chmod +x production_fix.sh
./production_fix.sh
```

### چه کاری انجام می‌دهد:
1. ✅ متوقف کردن تمام کانتینرها
2. ✅ بازسازی backend با schema جدید
3. ✅ اجرای migration دیتابیس
4. ✅ راه‌اندازی مجدد سرویس‌ها
5. ✅ تست سلامت backend
6. ✅ بررسی تنظیمات CORS

---

## 🔍 تست مشکلات

### تست Payment Links:
```bash
# پس از login در admin panel، تست ایجاد لینک پرداخت دستی
# باید بدون خطای enum کار کند
```

### تست CORS:
```bash
# از browser console در admin.manehaghighi.com:
fetch('https://api.manehaghighi.com/api/health')
  .then(r => r.json())
  .then(d => console.log('CORS OK:', d))
  .catch(e => console.log('CORS Error:', e));
```

---

## 📋 چک لیست نهایی

### قبل از Deploy:
- [ ] فایل `server.env` شامل CORS_ORIGINS درست است
- [ ] Schema Prisma شامل PaymentStatus جدید است
- [ ] Nginx config CORS headers حذف شده‌اند

### بعد از Deploy:
- [ ] اجرای `./production_fix.sh`
- [ ] تست ایجاد لینک پرداخت
- [ ] تست CORS از admin panel
- [ ] بررسی logs برای خطاهای جدید

---

## 🆘 اگر هنوز مشکل دارید

### برای CORS:
```bash
# بررسی logs backend
docker-compose logs backend | grep -i cors

# بررسی تنظیمات Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### برای PaymentStatus:
```bash
# اتصال مستقیم به دیتابیس
docker-compose exec postgres psql -U haghighi_user -d haghighi_db

# بررسی enum
SELECT enum_range(NULL::"PaymentStatus");
```

---

## 📞 پشتیبانی

اگر مشکلات ادامه داشت، لطفاً:
1. Logs کامل backend را ارسال کنید
2. خروجی `docker-compose ps` را ارسال کنید
3. فایل `server.env` را چک کنید (بدون رمزها)

**تمام مشکلات شناخته شده برطرف شده‌اند! 🎉**
