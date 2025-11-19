# 🔐 اطلاعات ورود (Login Credentials)

## 👨‍💼 ادمین

**Email**: `admin@haghighi.com`  
**Password**: `admin123`  
**نقش**: ADMIN

---

## 👥 کاربران تست با Email

تمام کاربران زیر با رمز عبور **`user123`** می‌توانند وارد شوند:

| Email | Username | نام | نقش |
|-------|----------|-----|-----|
| user1@test.com | user1 | کاربر تست 1 | USER |
| user2@test.com | user2 | کاربر تست 2 | USER |
| user3@test.com | user3 | کاربر تست 3 | USER |
| user4@test.com | user4 | کاربر تست 4 | USER |
| user5@test.com | user5 | کاربر تست 5 | USER |

**رمز عبور همه**: `user123`

---

## 📱 کاربران تست با شماره تلفن

تمام کاربران زیر با رمز عبور **`user123`** می‌توانند وارد شوند:

| شماره تلفن | Username | نام | نقش |
|-----------|----------|-----|-----|
| 09123456789 | phone_user1 | علی احمدی | USER |
| 09123456790 | phone_user2 | محمد محمدی | USER |
| **09123456791** | **phone_user3** | **رضا رضایی** | **USER** |
| 09123456792 | phone_user4 | حسین حسینی | USER |
| 09123456793 | phone_user5 | مهدی مهدوی | USER |

**رمز عبور همه**: `user123`

---

## 🔑 مثال‌های Login

### Login با Email:
```json
{
  "emailOrPhone": "user1@test.com",
  "password": "user123"
}
```

### Login با شماره تلفن:
```json
{
  "emailOrPhone": "09123456791",
  "password": "user123"
}
```

### Login ادمین:
```json
{
  "emailOrPhone": "admin@haghighi.com",
  "password": "admin123"
}
```

---

## 🌐 URL‌های Login

### Admin Panel:
```
http://185.231.112.84:8082/login
```
از admin یا هر کاربری برای ورود استفاده کنید.

### Frontend:
```
http://185.231.112.84:8081/login
```
فقط کاربران عادی (نه admin).

---

## ✅ تست Login از Terminal (cURL)

### تست با شماره تلفن:
```bash
curl -X POST http://185.231.112.84:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"09123456791","password":"user123"}'
```

### تست با Email:
```bash
curl -X POST http://185.231.112.84:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"user1@test.com","password":"user123"}'
```

### تست Admin:
```bash
curl -X POST http://185.231.112.84:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"admin@haghighi.com","password":"admin123"}'
```

**پاسخ موفق**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "phone_user3",
    "firstName": "رضا",
    "lastName": "رضایی",
    "role": "USER"
  }
}
```

**پاسخ خطا (401)**:
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

---

## 🐛 عیب‌یابی

### خطا: 401 Unauthorized

**علت‌های احتمالی**:
1. رمز عبور اشتباه است
2. کاربر در دیتابیس وجود ندارد (seed اجرا نشده)
3. کاربر غیرفعال است (`isActive: false`)

**راه حل**:
```bash
# بررسی کاربران در دیتابیس
docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db

# لیست کاربران
SELECT id, username, email, phone, role, "isActive" FROM users;

# خروج
\q

# اگر کاربری وجود ندارد، seed دوباره اجرا کنید
docker exec -it haghighi_backend npx prisma db seed
```

### خطا: Cannot connect to backend

**علت**: Backend در دسترس نیست.

**راه حل**:
```bash
# بررسی وضعیت
docker-compose -f docker-compose-alt-ports.yml ps

# بررسی logs
docker-compose -f docker-compose-alt-ports.yml logs backend

# تست health check
curl http://185.231.112.84:8080/api/health
```

---

## 📊 بررسی از صفحه Status

بعد از seed کردن، این صفحه را باز کنید:
```
http://185.231.112.84:8080/api/health/status
```

باید ببینید:
- ✅ **Users Total**: 11 (1 admin + 5 email users + 5 phone users)
- ✅ **Admins**: admin@haghighi.com
- ✅ **Database**: connected

---

## 🔄 تجدید Seed (اگر لازم است)

اگر می‌خواهید دیتابیس را از نو seed کنید:

```bash
cd /root/man-haghighi-mono-repo

# حذف volume و شروع مجدد
docker-compose -f docker-compose-alt-ports.yml down
docker volume rm man-haghighi-mono-repo_postgres_data
docker-compose -f docker-compose-alt-ports.yml up -d
sleep 30

# Seed
docker exec -it haghighi_backend npx prisma db seed

# بررسی
curl http://185.231.112.84:8080/api/health/status
```

---

## 📝 نکات امنیتی

⚠️ **مهم**: این اطلاعات فقط برای **محیط توسعه و تست** است!

در **production**:
1. رمزهای عبور قوی‌تر استفاده کنید
2. کاربران تست را حذف کنید
3. JWT_SECRET را تغییر دهید
4. تنها admin واقعی را نگه دارید

---

## ✅ خلاصه سریع

| نوع | شناسه | رمز عبور |
|-----|-------|----------|
| Admin | admin@haghighi.com | admin123 |
| کاربر (Email) | user1@test.com ... user5@test.com | user123 |
| کاربر (Phone) | 09123456789 ... 09123456793 | user123 |

**یادآوری**: برای اعمال تغییرات، حتماً seed را مجدداً اجرا کنید!

