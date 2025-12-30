# 🚀 راهنمای استقرار Production

## 📋 مراحل استقرار

### مرحله ۱: رفع مشکلات دیتابیس

```bash
# انتقال و اجرای اسکریپت رفع دیتابیس
scp production_db_fix_final.sh user@your-server:/path/to/project/
ssh user@your-server
cd /path/to/project
chmod +x production_db_fix_final.sh
./production_db_fix_final.sh
```

### مرحله ۲: بروزرسانی کد Backend

```bash
# انتقال فایل payments.controller.ts بروز شده
scp backend/src/payments/payments.controller.ts user@your-server:/path/to/backend/src/payments/payments.controller.ts

# یا اگر git استفاده می‌کنید:
git pull origin main
```

### مرحله ۳: Restart Backend

```bash
# Docker
docker-compose restart backend

# یا PM2
pm2 restart backend

# یا SystemD
systemctl restart your-backend-service
```

### مرحله ۴: تست API

```bash
# تست health
curl https://api.manehaghighi.com/api/health

# تست با token مدیر فروش (اگر token دارید)
curl -H "Authorization: Bearer YOUR_SALES_MANAGER_TOKEN" \
     https://api.manehaghighi.com/api/payments/links
```

---

## 🔧 تغییرات اعمال شده

### ۱. رفع مشکلات دیتابیس:
- ✅ اضافه کردن ستون `gatewayName` به `payment_links`
- ✅ اضافه کردن ستون‌های `resetOtp`, `resetOtpExpiresAt` به `users`
- ✅ اضافه کردن ستون‌های message template به `settings`

### ۲. بهبود منطق نمایش لینک‌های پرداخت:

#### برای فروشنده عادی (`SALES_PERSON`):
- نمایش فقط لینک‌های ساخته شده توسط خودش

#### برای مدیر فروش (`SALES_MANAGER`) و ادمین (`ADMIN`):
- نمایش همه فروشنده‌ها
- نمایش آمار هر فروشنده (کل لینک‌ها، پرداخت شده، نشده)
- نمایش لیست کامل لینک‌های هر فروشنده
- نمایش مبالغ کل و پرداخت شده

### ساختار پاسخ API جدید برای مدیر فروش:

```json
{
  "type": "sales_manager_view",
  "salesPersons": [
    {
      "salesPerson": {
        "id": "sales-1",
        "username": "salesperson1",
        "firstName": "علی",
        "lastName": "محمدی",
        "fullName": "علی محمدی",
        "user_phone": "+989123456789",
        "isActive": true
      },
      "statistics": {
        "totalLinks": 5,
        "paidLinks": 2,
        "unpaidLinks": 3,
        "totalAmount": 750000,
        "paidAmount": 300000
      },
      "links": [
        {
          "id": "link-1",
          "linkCode": "ABC123",
          "amount": 10000,
          "customerName": "مشتری ۱",
          "status": "PENDING",
          // ... سایر فیلدها
        }
      ]
    }
  ],
  "summary": {
    "totalSalesPersons": 3,
    "totalLinks": 15,
    "totalPaidLinks": 6,
    "totalUnpaidLinks": 9,
    "totalAmount": 2250000,
    "totalPaidAmount": 900000
  }
}
```

---

## ⚠️ نکات مهم

1. **Backup**: قبل از هر تغییری backup کامل بگیرید
2. **Testing**: ابتدا روی staging server تست کنید
3. **Monitoring**: پس از استقرار لاگ‌ها را monitor کنید
4. **Rollback**: اگر مشکل داشت، از backup استفاده کنید

---

## 🔍 عیب‌یابی

### اگر API همچنان 500 error می‌دهد:

```bash
# چک کردن لاگ‌های backend
docker-compose logs backend --tail 20

# چک کردن ساختار دیتابیس
docker-compose exec postgres psql -U haghighi_user -d haghighi_db -c "\d payment_links"
```

### اگر داده‌ها نمایش داده نمی‌شوند:

```bash
# چک کردن وجود داده‌ها
docker-compose exec postgres psql -U haghighi_user -d haghighi_db -c "SELECT COUNT(*) FROM users WHERE role = 'SALES_PERSON';"
docker-compose exec postgres psql -U haghighi_user -d haghighi_db -c "SELECT COUNT(*) FROM payment_links;"
```

---

## 📞 پشتیبانی

اگر مشکل دارید، این اطلاعات را ارسال کنید:
- خروجی `docker-compose logs backend`
- خروجی `docker-compose ps`
- نسخه API response
- لاگ‌های PostgreSQL اگر خطا وجود دارد
