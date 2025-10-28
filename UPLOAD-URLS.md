# 📤 راهنمای URL‌های آپلود

## مشکل: URL‌های آپلود شده به پورت اشتباه اشاره می‌کنند

وقتی فایلی را آپلود می‌کنید (مثل تصویر اسلایدر)، URL ذخیره شده در دیتابیس باید به **پورت صحیح** اشاره کند.

### ❌ مشکل قبلی:
```
http://194.180.11.193:3000/uploads/image-123456.jpg
```
(پورت 3000 در دسترس نیست!)

### ✅ راه حل:
```
http://194.180.11.193:8080/uploads/image-123456.jpg
```
(پورت 8080 که backend روی آن اجرا می‌شود)

---

## 🔧 تنظیمات `.env` روی سرور

فایل `.env` در root پروژه روی سرور باید این متغیرها را داشته باشد:

```env
# Database
POSTGRES_DB=haghighi_db
POSTGRES_USER=haghighi_user
POSTGRES_PASSWORD=YourSecurePassword123!

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Backend
PORT=3000
NODE_ENV=production
MAX_FILE_SIZE=10737418240
UPLOAD_PATH=/app/uploads

# Server Configuration (برای URL‌های داینامیک)
SERVER_IP=185.231.112.84
EXTERNAL_PORT=8080

# API Base URL برای فایل‌های آپلود شده
API_BASE_URL=http://185.231.112.84:8080

# Database URL
DATABASE_URL=postgresql://haghighi_user:YourSecurePassword123!@postgres:5432/haghighi_db?schema=public

# API URL برای React apps
REACT_APP_API_URL=http://185.231.112.84:8080/api
```

---

## 📝 توضیح متغیرها

### `API_BASE_URL`
**مهم‌ترین متغیر!** این URL برای ساخت آدرس فایل‌های آپلود شده استفاده می‌شود.

- **Production**: `http://185.231.112.84:8080`
- **Local Development**: `http://localhost:3000`

### `SERVER_IP`
IP سرور شما. اگر `API_BASE_URL` تنظیم نشده باشد، از این استفاده می‌شود.

### `EXTERNAL_PORT`
پورتی که backend از بیرون (از internet) در دسترس است.

- برای `docker-compose-alt-ports.yml`: **8080**
- برای `docker-compose.yml`: **3000**

---

## 🔄 نحوه اعمال تغییرات روی سرور

### گام 1: بروزرسانی کد
```bash
cd /root/man-haghighi-mono-repo
git pull origin master
```

### گام 2: بروزرسانی فایل `.env`
```bash
nano .env
```

اضافه کردن این خطوط:
```env
SERVER_IP=185.231.112.84
EXTERNAL_PORT=8080
API_BASE_URL=http://185.231.112.84:8080
```

ذخیره: `Ctrl+X` → `Y` → `Enter`

### گام 3: Rebuild و اجرا
```bash
# توقف کانتینرها
docker-compose -f docker-compose-alt-ports.yml down

# Rebuild backend (حتماً با --no-cache)
docker-compose -f docker-compose-alt-ports.yml build --no-cache backend

# اجرا
docker-compose -f docker-compose-alt-ports.yml up -d

# بررسی logs
docker-compose -f docker-compose-alt-ports.yml logs -f backend
```

---

## ✅ بررسی تنظیمات

### 1. چک کردن متغیرهای محیطی در کانتینر:
```bash
docker exec -it haghighi_backend env | grep -E "API_BASE_URL|SERVER_IP|EXTERNAL_PORT"
```

خروجی باید این باشد:
```
API_BASE_URL=http://185.231.112.84:8080
SERVER_IP=185.231.112.84
EXTERNAL_PORT=8080
```

### 2. تست آپلود یک فایل:
- به Admin Panel بروید: `http://185.231.112.84:8082`
- یک اسلایدر جدید بسازید و تصویر آپلود کنید
- URL تصویر باید با `http://185.231.112.84:8080/uploads/...` شروع شود

### 3. بررسی صفحه Status:
```
http://185.231.112.84:8080/api/health/status
```

---

## 🐛 عیب‌یابی

### مشکل: هنوز URL‌ها به پورت 3000 اشاره می‌کنند

**علت**: Backend با کد قدیمی build شده است.

**راه حل**:
```bash
docker-compose -f docker-compose-alt-ports.yml down
docker-compose -f docker-compose-alt-ports.yml build --no-cache backend
docker-compose -f docker-compose-alt-ports.yml up -d
```

### مشکل: فایل‌های قدیمی هنوز URL اشتباه دارند

**علت**: فایل‌هایی که قبلاً آپلود شده‌اند در دیتابیس با URL قدیمی ذخیره شده‌اند.

**راه حل 1**: حذف و آپلود مجدد فایل‌ها

**راه حل 2**: بروزرسانی دستی URL‌ها در دیتابیس (پیشرفته):
```bash
docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db

# تغییر URL‌های اسلایدر
UPDATE sliders 
SET image = REPLACE(image, ':3000', ':8080')
WHERE image LIKE '%:3000%';

# تغییر URL‌های دوره
UPDATE courses 
SET thumbnail = REPLACE(thumbnail, ':3000', ':8080')
WHERE thumbnail LIKE '%:3000%';

# خروج
\q
```

---

## 📚 فایل‌های مرتبط

- `backend/src/common/services/url.service.ts` - کلاسی که URL‌ها را می‌سازد
- `server.env` - تمپلیت تنظیمات production
- `local.env` - تمپلیت تنظیمات development
- `.env` - فایل واقعی روی سرور (باید خودتان بسازید)

---

## 🚀 دستور سریع Deploy با تنظیمات صحیح

```bash
cd /root/man-haghighi-mono-repo
git pull origin master

# ویرایش .env
cat > .env << 'EOF'
POSTGRES_DB=haghighi_db
POSTGRES_USER=haghighi_user
POSTGRES_PASSWORD=YourSecurePassword123!
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=production
MAX_FILE_SIZE=10737418240
UPLOAD_PATH=/app/uploads
SERVER_IP=185.231.112.84
EXTERNAL_PORT=8080
API_BASE_URL=http://185.231.112.84:8080
DATABASE_URL=postgresql://haghighi_user:YourSecurePassword123!@postgres:5432/haghighi_db?schema=public
REACT_APP_API_URL=http://185.231.112.84:8080/api
EOF

# Deploy
docker-compose -f docker-compose-alt-ports.yml down
docker-compose -f docker-compose-alt-ports.yml up -d --build --no-cache

echo "✅ Done! Test upload URLs at: http://185.231.112.84:8082"
```

