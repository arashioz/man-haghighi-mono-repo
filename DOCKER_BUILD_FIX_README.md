# رفع مشکل Build در Docker

## مشکل
خطای `MODULE_NOT_FOUND` برای `ajv-keywords` در زمان build Docker.

## علت
- نسخه قدیمی `react-scripts` (5.0.1) با React 19 سازگار نیست
- Node.js 18 قدیمی است و با packageهای جدید سازگار نیست
- cache npm قدیمی و package-lock.json مشکل‌دار

## راه حل اعمال شده

### ۱. بروزرسانی Dockerfile
```dockerfile
FROM docker.arvancloud.ir/node:20-alpine as Builder  # تغییر از 18 به 20
FROM docker.arvancloud.ir/nginx:alpine             # تغییر از stable-alpine

# پاک کردن cache و package-lock.json قبل از install
RUN npm cache clean --force && rm -f package-lock.json && npm install --legacy-peer-deps
```

### ۲. بروزرسانی package.json
```json
{
  "engines": {
    "node": ">=20.0.0",    // تغییر از 18 به 20
    "npm": ">=10.0.0"      // تغییر از 9 به 10
  }
}
```

## استفاده از Docker

```bash
# پاک کردن images قدیمی
docker system prune -f

# Build جدید
docker build -t admin-panel .

# یا با docker-compose
docker-compose build --no-cache admin-panel
```

## نکات مهم

1. **Node.js 20**: برای سازگاری با React 19 و packageهای جدید
2. **Legacy Peer Deps**: برای حل تداخل dependencyها
3. **Cache Clean**: پاک کردن cache قدیمی npm
4. **Package Lock Reset**: پاک کردن package-lock.json مشکل‌دار

## تست

```bash
# Build محلی
npm run build

# Build Docker
docker build -t admin-panel .
```

## اگر باز هم مشکل داشت

```bash
# پاک کردن کامل Docker cache
docker system prune -a -f

# پاک کردن node_modules و reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Build
npm run build
```

## نتیجه

- ✅ سازگاری با React 19
- ✅ Node.js 20 برای performance بهتر
- ✅ رفع تداخل dependencyها
- ✅ Build موفق در Docker

**Docker build حالا باید بدون مشکل کار کند! 🚀**
