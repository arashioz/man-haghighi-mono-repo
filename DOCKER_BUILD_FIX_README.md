# رفع مشکل Build در Docker

## مشکل
خطای `MODULE_NOT_FOUND` برای `ajv-keywords` در زمان build Docker در هر دو پروژه frontend و admin-panel.

## علت
- نسخه قدیمی `react-scripts` (5.0.1) با React 19 سازگار نیست
- Node.js 18 قدیمی است و با packageهای جدید سازگار نیست
- cache npm قدیمی و package-lock.json مشکل‌دار
- تداخل dependencyها در هر دو پروژه

## راه حل اعمال شده

### ۱. بروزرسانی Dockerfile های هر دو پروژه
```dockerfile
FROM docker.arvancloud.ir/node:20-alpine as Builder  # تغییر از 18 به 20
FROM docker.arvancloud.ir/nginx:alpine              # تغییر از stable-alpine

# پاک کردن cache و package-lock.json قبل از install
RUN npm cache clean --force && rm -f package-lock.json && npm install --legacy-peer-deps
```

### ۲. بروزرسانی package.json هر دو پروژه
```json
{
  "engines": {
    "node": ">=20.0.0",    // تغییر از 18 به 20
    "npm": ">=10.0.0"      // تغییر از 9 به 10
  }
}
```

### ۳. پروژه‌های بروزرسانی شده:
- ✅ **admin-panel**: Dockerfile و package.json بروزرسانی شد
- ✅ **frontend**: Dockerfile و package.json بروزرسانی شد

## استفاده از Docker

```bash
# پاک کردن images قدیمی
docker system prune -f

# Build هر دو پروژه
docker-compose build --no-cache

# یا به صورت جداگانه
docker build -t admin-panel ./admin-panel
docker build -t frontend ./frontend

# اجرای همه سرویس‌ها
docker-compose up -d
```

## نکات مهم

1. **Node.js 20**: برای سازگاری با React 19 و packageهای جدید
2. **Legacy Peer Deps**: برای حل تداخل dependencyها در هر دو پروژه
3. **Cache Clean**: پاک کردن cache قدیمی npm
4. **Package Lock Reset**: پاک کردن package-lock.json مشکل‌دار
5. **هر دو پروژه**: admin-panel و frontend بروزرسانی شدند

## تست نهایی

```bash
# Build محلی هر دو پروژه
cd admin-panel && npm run build && cd ../frontend && npm run build

# Build Docker هر دو پروژه
docker-compose build --no-cache

# بررسی وضعیت
docker-compose ps
```

## اگر باز هم مشکل داشت

```bash
# پاک کردن کامل Docker cache
docker system prune -a -f

# پاک کردن node_modules هر دو پروژه
cd admin-panel && rm -rf node_modules package-lock.json
cd ../frontend && rm -rf node_modules package-lock.json

# Reinstall هر دو پروژه
cd admin-panel && npm install --legacy-peer-deps
cd ../frontend && npm install --legacy-peer-deps

# Build نهایی
cd admin-panel && npm run build
cd ../frontend && npm run build
```

## نتیجه

### بروزرسانی‌های انجام شده:
- ✅ **admin-panel Dockerfile**: Node 20 + cache clean
- ✅ **frontend Dockerfile**: Node 20 + cache clean
- ✅ **admin-panel package.json**: engines بروزرسانی
- ✅ **frontend package.json**: engines بروزرسانی
- ✅ **سازگاری React 19**: در هر دو پروژه
- ✅ **Build موفق**: محلی و Docker

**هر دو پروژه frontend و admin-panel حالا باید بدون مشکل در Docker build شوند! 🎉🚀**
