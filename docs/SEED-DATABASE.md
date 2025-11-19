# راهنمای Seed کردن دیتابیس

## 🎯 URL‌های مهم برای بررسی وضعیت

بعد از deploy، این URL‌ها را برای بررسی وضعیت استفاده کنید:

### صفحه وضعیت سیستم (HTML زیبا)
```
http://185.231.112.84:8080/api/health/status
```

### API وضعیت سیستم (JSON)
```
http://185.231.112.84:8080/api/health
```

---

## 📦 نحوه Seed کردن دیتابیس در کانتینر Backend

### روش 1: اجرای Seed به صورت دستی

```bash
# ورود به کانتینر backend
docker exec -it haghighi_backend sh

# اجرای seed
npx prisma db seed

# یا
npm run prisma:seed

# خروج از کانتینر
exit
```

### روش 2: Seed از بیرون کانتینر (یک خط)

```bash
docker exec -it haghighi_backend npx prisma db seed
```

### روش 3: Reset کامل دیتابیس + Seed

⚠️ **هشدار**: این دستور تمام داده‌های موجود را پاک می‌کند!

```bash
# ورود به کانتینر
docker exec -it haghighi_backend sh

# Reset و seed
npx prisma migrate reset --force

# خروج
exit
```

---

## 🔄 اجرای Seed موقع Deploy

اگر می‌خواهید seed به صورت خودکار موقع deploy اجرا شود، فایل `Dockerfile` را تغییر دهید:

### گزینه 1: Seed در CMD (توصیه نمی‌شود - فقط بار اول)

```dockerfile
CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && npm run start:prod"]
```

### گزینه 2: Script جداگانه

فایل `backend/start.sh` بسازید:

```bash
#!/bin/sh

# Push schema
npx prisma db push

# Check if database is empty, then seed
USER_COUNT=$(npx prisma db execute --stdin <<EOF
SELECT COUNT(*) FROM users;
EOF
)

if [ "$USER_COUNT" -eq "0" ]; then
  echo "🌱 Database is empty, running seed..."
  npx prisma db seed
else
  echo "✅ Database already has data, skipping seed"
fi

# Start application
npm run start:prod
```

سپس در `Dockerfile`:

```dockerfile
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh
CMD ["/app/start.sh"]
```

---

## 🔍 بررسی وضعیت Seed

### در مرورگر:
باز کنید: `http://185.231.112.84:8080/api/health/status`

### با cURL:
```bash
# JSON format
curl http://185.231.112.84:8080/api/health

# Pretty format
curl http://185.231.112.84:8080/api/health | json_pp
```

---

## 📊 داده‌های Seed شده

بعد از seed کردن، این داده‌ها ایجاد می‌شوند:

### 👤 کاربران:
- **Admin**: 
  - Email: `admin@haghighi.com`
  - Password: `admin123`
- **5 کاربر تست**: `user1@test.com` تا `user5@test.com`

### 📚 محتوا:
- 3 دوره
- 3 مقاله
- 2 پادکست
- 3 اسلایدر
- 2 کارگاه
- 3 ویدیو (متصل به دوره‌ها)
- 2 صوت (متصل به دوره‌ها)

---

## 🐛 عیب‌یابی

### خطا: "relation does not exist"

دیتابیس schema ایجاد نشده. اجرا کنید:

```bash
docker exec -it haghighi_backend npx prisma db push
```

### خطا: "Password authentication failed"

مشکل رمز عبور دیتابیس. چک کنید:

```bash
# بررسی متغیرهای محیطی
docker exec -it haghighi_backend env | grep DATABASE

# بررسی اتصال postgres
docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db -c "SELECT 1;"
```

### دیتابیس خالی است و seed اجرا نمی‌شود

```bash
# حذف volume و شروع مجدد
docker-compose -f docker-compose-alt-ports.yml down
docker volume rm man-haghighi-mono-repo_postgres_data
docker-compose -f docker-compose-alt-ports.yml up -d

# صبر کنید تا backend بالا بیاید (30 ثانیه)
# سپس seed کنید
docker exec -it haghighi_backend npx prisma db seed
```

---

## 📝 Logs مفید

```bash
# لاگ‌های backend
docker-compose -f docker-compose-alt-ports.yml logs -f backend

# لاگ‌های postgres
docker-compose -f docker-compose-alt-ports.yml logs -f postgres

# لاگ‌های همه سرویس‌ها
docker-compose -f docker-compose-alt-ports.yml logs -f

# 50 خط آخر
docker-compose -f docker-compose-alt-ports.yml logs --tail=50
```

---

## ✅ Checklist Deploy

- [ ] فایل `.env` در root پروژه موجود است
- [ ] Volume postgres حذف شده (اگر می‌خواهید از نو شروع کنید)
- [ ] `docker-compose up -d --build` اجرا شده
- [ ] Backend بالا آمده (چک کنید: `docker-compose ps`)
- [ ] Database متصل است (چک کنید: `/api/health/status`)
- [ ] Seed اجرا شده (تعداد users > 0)
- [ ] می‌توانید با `admin@haghighi.com` / `admin123` login کنید

---

## 🚀 دستور سریع Deploy کامل

```bash
cd /root/man-haghighi-mono-repo
git pull origin master
docker-compose -f docker-compose-alt-ports.yml down
docker volume rm man-haghighi-mono-repo_postgres_data
docker-compose -f docker-compose-alt-ports.yml up -d --build
sleep 30
docker exec -it haghighi_backend npx prisma db seed
echo "✅ Deploy completed! Check: http://185.231.112.84:8080/api/health/status"
```

