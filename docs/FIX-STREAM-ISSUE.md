# 🔧 راهنمای حل مشکل Video Stream

## 🚨 مشکلات شناسایی شده:

1. **Backend rebuild نشده** - کد جدید با `/api` prefix اجرا نمی‌شود
2. **Frontend rebuild نشده** - از URL قدیمی استفاده می‌کند
3. **خطای 401** - مشکل authentication

## 📋 دستورات Fix (به ترتیب):

### 1️⃣ Rebuild Backend (مهم!)

```bash
# روی سرور
cd /path/to/new-haghighi

# Pull آخرین تغییرات
git pull origin master

# Rebuild backend
docker-compose build backend

# Restart backend
docker-compose restart backend

# بررسی لاگ‌ها
docker logs haghighi_backend --tail 50 -f
```

### 2️⃣ Rebuild Frontend

```bash
# Rebuild frontend
docker-compose build frontend

# Restart frontend
docker-compose restart frontend

# بررسی لاگ‌ها
docker logs haghighi_frontend --tail 50 -f
```

### 3️⃣ بررسی اینکه Backend کد جدید را اجرا می‌کند

```bash
# بررسی کد داخل container
docker exec haghighi_backend cat /app/dist/src/videos/videos.controller.js | grep -A 5 "streamUrl"

# باید این را ببینید:
# const streamUrl = `${baseUrl}/api/videos/${id}/stream?token=${encodedToken}`;
```

### 4️⃣ بررسی دیتابیس و فایل‌ها

```bash
# بررسی ویدیو در دیتابیس
docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db -c \
  "SELECT id, title, \"videoFile\" FROM videos WHERE id = 'cmhfi89j40002ns29u6d97q8f';"

# بررسی وجود فایل
VIDEO_FILE="نام_فایل_از_دیتابیس"
docker exec haghighi_backend test -f "/app/uploads/$VIDEO_FILE" && echo "✓ موجود" || echo "✗ وجود ندارد"
```

### 5️⃣ تست Endpoint بعد از Rebuild

```bash
# تست با curl (باید token واقعی بدهید)
TOKEN="your_token_here"

# تست stream-url endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://185.231.112.84:8080/api/videos/cmhfi89j40002ns29u6d97q8f/stream-url

# باید URL با /api برگرداند
```

## 🔍 بررسی مشکل 401 (Unauthorized)

اگر بعد از rebuild هنوز 401 می‌دهد:

### بررسی Token:

```bash
# بررسی JWT_SECRET در container
docker exec haghighi_backend env | grep JWT_SECRET

# بررسی اینکه token در query parameter decode می‌شود
# این در لاگ‌های backend باید دیده شود
```

### Debug JWT Strategy:

می‌توانید لاگ به JWT strategy اضافه کنیم:

```typescript
// backend/src/auth/jwt.strategy.ts
jwtFromRequest: ExtractJwt.fromExtractors([
  ExtractJwt.fromAuthHeaderAsBearerToken(),
  (request: any) => {
    const token = request?.query?.token as string;
    console.log('JWT Strategy - Token from query:', token ? 'exists' : 'missing');
    return token ? decodeURIComponent(token) : null;
  },
]),
```

## 🚀 دستور کامل Fix (یکجا):

```bash
#!/bin/bash

echo "🔄 Rebuild و Restart همه چیز..."

# Pull تغییرات
git pull origin master

# Rebuild backend
echo "📦 Rebuilding backend..."
docker-compose build backend

# Rebuild frontend  
echo "📦 Rebuilding frontend..."
docker-compose build frontend

# Restart همه
echo "🔄 Restarting containers..."
docker-compose restart

# صبر برای آماده شدن
echo "⏳ Waiting for services to be ready..."
sleep 10

# بررسی وضعیت
echo "✅ Status:"
docker-compose ps

# بررسی لاگ‌های backend
echo "📋 Backend logs:"
docker logs haghighi_backend --tail 20
```

## 🎯 نکات مهم:

1. **حتماً backend را rebuild کنید** - بدون rebuild تغییرات اعمال نمی‌شود
2. **Frontend را هم rebuild کنید** - برای استفاده از URL صحیح
3. **Token را بررسی کنید** - اگر 401 می‌دهد، token منقضی شده یا مشکل دارد
4. **لاگ‌ها را بررسی کنید** - بعد از rebuild، باید `/api/videos/...` در لاگ‌ها ببینید

## 🔍 پس از Rebuild بررسی کنید:

```bash
# 1. بررسی که endpoint درست کار می‌کند
curl -I http://185.231.112.84:8080/api/videos/cmhfi89j40002ns29u6d97q8f/stream-url

# 2. بررسی لاگ‌ها هنگام درخواست
docker logs haghighi_backend -f

# 3. بررسی console در browser
# باید این URL را ببینید:
# http://185.231.112.84:8080/api/videos/.../stream?token=...
```

