# 🔍 دستورات بررسی ویدیو و فایل‌ها

## 1️⃣ بررسی وضعیت Containerها

```bash
# بررسی وضعیت همه containerها
docker ps

# بررسی لاگ‌های backend
docker logs haghighi_backend --tail 100 -f

# بررسی لاگ‌های backend (فقط خطاها)
docker logs haghighi_backend 2>&1 | grep -i "video\|error\|404\|stream"
```

## 2️⃣ بررسی وجود ویدیو در دیتابیس

```bash
# ورود به دیتابیس PostgreSQL
docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db

# بررسی ویدیوها
SELECT id, title, "videoFile", "courseId", published, "createdAt" FROM videos LIMIT 10;

# بررسی ویدیو خاص با ID
SELECT id, title, "videoFile", "courseId", published FROM videos WHERE id = 'cmhfi89j40002ns29u6d97q8f';

# بررسی تعداد ویدیوها
SELECT COUNT(*) FROM videos;

# خروج از دیتابیس
\q
```

## 3️⃣ بررسی فایل‌های ویدیو در Container

```bash
# بررسی فایل‌های uploads در container backend
docker exec -it haghighi_backend ls -lah /app/uploads

# بررسی فایل‌های ویدیو
docker exec -it haghighi_backend ls -lah /app/uploads | grep -i "video\|mp4\|webm"

# بررسی حجم فایل‌ها
docker exec -it haghighi_backend du -sh /app/uploads/*

# بررسی مسیر فعلی در container
docker exec -it haghighi_backend pwd

# بررسی وجود یک فایل خاص
docker exec -it haghighi_backend test -f /app/uploads/VIDEO_FILENAME && echo "موجود است" || echo "وجود ندارد"
```

## 4️⃣ بررسی URL و Endpoint

```bash
# تست endpoint stream-url (با token)
TOKEN="YOUR_TOKEN_HERE"
curl -H "Authorization: Bearer $TOKEN" \
  http://185.231.112.84:8080/api/videos/cmhfi89j40002ns29u6d97q8f/stream-url

# تست endpoint stream (با token)
curl -H "Authorization: Bearer $TOKEN" \
  -H "Range: bytes=0-1023" \
  -I \
  http://185.231.112.84:8080/api/videos/cmhfi89j40002ns29u6d97q8f/stream?token=$TOKEN

# بررسی که آیا endpoint در دسترس است
curl -I http://185.231.112.84:8080/api/videos/cmhfi89j40002ns29u6d97q8f/stream-url
```

## 5️⃣ بررسی Environment Variables در Container

```bash
# بررسی متغیرهای محیطی backend
docker exec -it haghighi_backend env | grep -E "API_BASE_URL|SERVER_IP|EXTERNAL_PORT|PORT|DATABASE_URL"

# بررسی فایل .env در container
docker exec -it haghighi_backend cat .env 2>/dev/null || echo "فایل .env وجود ندارد"
```

## 6️⃣ بررسی Prisma Studio (دیتابیس GUI)

```bash
# اجرای Prisma Studio در container
docker exec -it haghighi_backend npx prisma studio --port 5555 --hostname 0.0.0.0 &

# یا اگر از docker-compose-alt-ports.yml استفاده می‌کنید:
# Prisma Studio روی http://185.231.112.84:5555 در دسترس است
```

## 7️⃣ بررسی مسیر فایل ویدیو در دیتابیس

```bash
# ورود به دیتابیس
docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db

# بررسی فایل ویدیو برای یک ویدیو خاص
SELECT id, title, "videoFile", 
       CASE 
         WHEN "videoFile" LIKE 'http%' THEN 'URL خارجی'
         WHEN "videoFile" LIKE '/%' THEN 'مسیر absolute'
         WHEN "videoFile" LIKE 'uploads/%' THEN 'شامل uploads'
         ELSE 'نام فایل ساده'
       END as file_type
FROM videos 
WHERE id = 'cmhfi89j40002ns29u6d97q8f';

# بررسی تمام ویدیوها و نوع فایل آنها
SELECT id, title, 
       LEFT("videoFile", 50) as video_file_preview,
       CASE 
         WHEN "videoFile" LIKE 'http%' THEN 'URL خارجی'
         WHEN "videoFile" LIKE '/%' THEN 'مسیر absolute'
         WHEN "videoFile" LIKE 'uploads/%' THEN 'شامل uploads'
         ELSE 'نام فایل ساده'
       END as file_type
FROM videos 
LIMIT 20;
```

## 8️⃣ بررسی فایل در مسیرهای مختلف

```bash
# بررسی فایل در مسیرهای مختلف
VIDEO_FILE="نام_فایل_از_دیتابیس"

# مسیر 1: /app/uploads/
docker exec -it haghighi_backend test -f /app/uploads/$VIDEO_FILE && echo "✓ موجود در /app/uploads/" || echo "✗ وجود ندارد"

# مسیر 2: /app/
docker exec -it haghighi_backend test -f /app/$VIDEO_FILE && echo "✓ موجود در /app/" || echo "✗ وجود ندارد"

# مسیر 3: اگر شامل uploads/ باشد
docker exec -it haghighi_backend test -f /app/$VIDEO_FILE && echo "✓ موجود" || echo "✗ وجود ندارد"

# لیست تمام فایل‌های ویدیو موجود
docker exec -it haghighi_backend find /app/uploads -type f \( -name "*.mp4" -o -name "*.webm" -o -name "*.mov" \) -ls
```

## 9️⃣ بررسی Backend Logs هنگام Request

```bash
# دیدن لاگ‌های زنده backend
docker logs haghighi_backend -f

# سپس در مرورگر سعی کنید ویدیو را پخش کنید
# در لاگ‌ها باید ببینید:
# - Streaming video ID: ...
# - videoFile: ...
# - Attempting to stream from path: ...
# - Video file size: ...
```

## 🔟 بررسی کامل یک ویدیو خاص

```bash
# جایگزین VIDEO_ID با ID ویدیو
VIDEO_ID="cmhfi89j40002ns29u6d97q8f"

echo "=== بررسی ویدیو: $VIDEO_ID ==="

# 1. بررسی در دیتابیس
echo "1. اطلاعات دیتابیس:"
docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db -c \
  "SELECT id, title, \"videoFile\", published FROM videos WHERE id = '$VIDEO_ID';"

# 2. گرفتن نام فایل از دیتابیس
VIDEO_FILE=$(docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db -t -c \
  "SELECT \"videoFile\" FROM videos WHERE id = '$VIDEO_ID';" | xargs)

echo "2. نام فایل در دیتابیس: $VIDEO_FILE"

# 3. بررسی وجود فایل
echo "3. بررسی وجود فایل:"
if [[ "$VIDEO_FILE" == http* ]]; then
  echo "   → این یک URL خارجی است: $VIDEO_FILE"
else
  # حذف /uploads/ از ابتدا اگر وجود دارد
  CLEAN_FILE=$(echo "$VIDEO_FILE" | sed 's|^uploads/||' | sed 's|^./uploads/||')
  echo "   → بررسی فایل: $CLEAN_FILE"
  
  docker exec -it haghighi_backend test -f "/app/uploads/$CLEAN_FILE" && \
    echo "   ✓ فایل در /app/uploads/$CLEAN_FILE موجود است" || \
    echo "   ✗ فایل در /app/uploads/$CLEAN_FILE وجود ندارد"
    
  docker exec -it haghighi_backend test -f "/app/$VIDEO_FILE" && \
    echo "   ✓ فایل در /app/$VIDEO_FILE موجود است" || \
    echo "   ✗ فایل در /app/$VIDEO_FILE وجود ندارد"
fi
```

## 🔧 راه حل سریع: Rebuild و Restart

```bash
# Rebuild فقط backend
docker-compose build backend

# Restart backend
docker-compose restart backend

# یا restart همه
docker-compose restart

# بررسی لاگ‌ها بعد از restart
docker logs haghighi_backend --tail 50 -f
```

