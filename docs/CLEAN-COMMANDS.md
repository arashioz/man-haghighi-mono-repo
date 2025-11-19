# دستورات پاک‌سازی فایل‌ها

این فایل شامل دستورات مختلف برای پاک کردن فایل‌های build و uploads است.

## دستورات سریع

### پاک کردن فایل‌های build و uploads در بکند:
```bash
cd backend
npm run clean
```

یا به صورت دستی:
```bash
cd backend
./clean.sh
```

### پاک کردن فقط فایل‌های build:
```bash
cd backend
npm run clean:build
```

### پاک کردن فقط فایل‌های uploads:
```bash
cd backend
npm run clean:uploads
```

### پاک کردن همه (build + uploads):
```bash
cd backend
npm run clean:all
```

## پاک‌سازی کامل پروژه

برای پاک کردن فایل‌های build در تمام بخش‌های پروژه (backend, frontend, admin-panel):
```bash
./clean-all.sh
```

## پاک کردن با Docker

اگر از Docker استفاده می‌کنید:

### پاک کردن فایل‌های uploads در Container:
```bash
docker exec haghighi_backend rm -rf /app/uploads/*
```

### پاک کردن فایل‌های build در Container:
```bash
docker exec haghighi_backend rm -rf /app/dist
```

### پاک کردن هر دو در Container:
```bash
docker exec haghighi_backend sh -c "rm -rf /app/dist && rm -rf /app/uploads/*"
```

### پاک کردن volume اپلودها (اگر volume استفاده می‌کنید):
```bash
docker-compose down -v
# سپس volume را دوباره ایجاد کنید
docker-compose up -d
```

## پاک کردن node_modules (اختیاری)

**⚠️ توجه:** این دستور فقط در صورت نیاز استفاده شود:

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

## نکات مهم

1. **فایل‌های uploads**: پاک کردن این فایل‌ها باعث از دست رفتن تمام فایل‌های آپلود شده می‌شود. قبل از پاک کردن مطمئن شوید که backup گرفته‌اید.

2. **فایل‌های build**: این فایل‌ها با دستور `npm run build` دوباره ساخته می‌شوند.

3. **node_modules**: معمولاً نیازی به پاک کردن نیست مگر اینکه مشکل dependency داشته باشید.

4. **در Production**: در محیط production، فقط فایل‌های build را پاک کنید و فایل‌های uploads را نگه دارید.
