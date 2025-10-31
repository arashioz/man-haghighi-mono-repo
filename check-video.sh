#!/bin/bash

# Script برای بررسی وضعیت ویدیو و فایل‌ها
# استفاده: ./check-video.sh [VIDEO_ID]

VIDEO_ID=${1:-"cmhfi89j40002ns29u6d97q8f"}

echo "=================================================="
echo "🔍 بررسی ویدیو: $VIDEO_ID"
echo "=================================================="
echo ""

# بررسی وضعیت containerها
echo "1️⃣ بررسی وضعیت Containerها:"
echo "--------------------------------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAME|haghighi"
echo ""

# بررسی اطلاعات ویدیو در دیتابیس
echo "2️⃣ اطلاعات ویدیو در دیتابیس:"
echo "--------------------------------------------------"
docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db -c \
  "SELECT id, title, \"videoFile\", published, \"createdAt\" FROM videos WHERE id = '$VIDEO_ID';" 2>/dev/null || \
  echo "⚠️ خطا در اتصال به دیتابیس"
echo ""

# گرفتن نام فایل از دیتابیس
echo "3️⃣ گرفتن نام فایل از دیتابیس:"
echo "--------------------------------------------------"
VIDEO_FILE=$(docker exec -it haghighi_postgres psql -U haghighi_user -d haghighi_db -t -c \
  "SELECT \"videoFile\" FROM videos WHERE id = '$VIDEO_ID';" 2>/dev/null | xargs | tr -d '\r\n')

if [ -z "$VIDEO_FILE" ]; then
  echo "❌ ویدیو با این ID در دیتابیس پیدا نشد!"
  exit 1
fi

echo "📁 نام فایل: $VIDEO_FILE"
echo ""

# بررسی نوع فایل
echo "4️⃣ نوع فایل:"
echo "--------------------------------------------------"
if [[ "$VIDEO_FILE" == http* ]]; then
  echo "🌐 این یک URL خارجی است"
  echo "   URL: $VIDEO_FILE"
elif [[ "$VIDEO_FILE" == /* ]]; then
  echo "📂 مسیر absolute"
  echo "   مسیر: $VIDEO_FILE"
elif [[ "$VIDEO_FILE" == uploads/* ]] || [[ "$VIDEO_FILE" == ./uploads/* ]]; then
  echo "📁 شامل uploads/"
  CLEAN_FILE=$(echo "$VIDEO_FILE" | sed 's|^./uploads/||' | sed 's|^uploads/||')
  echo "   فایل خالص: $CLEAN_FILE"
else
  echo "📄 نام فایل ساده"
  echo "   فایل: $VIDEO_FILE"
fi
echo ""

# بررسی وجود فایل در container
echo "5️⃣ بررسی وجود فایل در Container:"
echo "--------------------------------------------------"

if [[ "$VIDEO_FILE" == http* ]]; then
  echo "✓ این یک URL خارجی است، فایل محلی نیست"
else
  # تمیز کردن نام فایل
  if [[ "$VIDEO_FILE" == uploads/* ]] || [[ "$VIDEO_FILE" == ./uploads/* ]]; then
    CLEAN_FILE=$(echo "$VIDEO_FILE" | sed 's|^./uploads/||' | sed 's|^uploads/||')
    CHECK_PATH="/app/uploads/$CLEAN_FILE"
  elif [[ "$VIDEO_FILE" == /* ]]; then
    CHECK_PATH="$VIDEO_FILE"
  else
    CLEAN_FILE="$VIDEO_FILE"
    CHECK_PATH="/app/uploads/$CLEAN_FILE"
  fi
  
  echo "🔍 بررسی مسیر: $CHECK_PATH"
  
  if docker exec haghighi_backend test -f "$CHECK_PATH" 2>/dev/null; then
    FILE_SIZE=$(docker exec haghighi_backend stat -c%s "$CHECK_PATH" 2>/dev/null)
    FILE_SIZE_MB=$((FILE_SIZE / 1024 / 1024))
    echo "✅ فایل موجود است!"
    echo "   حجم: ${FILE_SIZE_MB} MB ($FILE_SIZE bytes)"
  else
    echo "❌ فایل موجود نیست!"
    echo ""
    echo "🔍 بررسی مسیرهای جایگزین:"
    
    # بررسی مسیرهای دیگر
    ALT_PATHS=(
      "/app/uploads/$VIDEO_FILE"
      "/app/$VIDEO_FILE"
      "/app/uploads/$(basename "$VIDEO_FILE")"
    )
    
    for alt_path in "${ALT_PATHS[@]}"; do
      if docker exec haghighi_backend test -f "$alt_path" 2>/dev/null; then
        echo "   ✅ پیدا شد در: $alt_path"
      else
        echo "   ❌ وجود ندارد: $alt_path"
      fi
    done
  fi
fi
echo ""

# بررسی فایل‌های موجود در uploads
echo "6️⃣ لیست فایل‌های ویدیو در /app/uploads:"
echo "--------------------------------------------------"
VIDEO_COUNT=$(docker exec haghighi_backend find /app/uploads -type f \( -name "*.mp4" -o -name "*.webm" -o -name "*.mov" \) 2>/dev/null | wc -l)
echo "📹 تعداد فایل‌های ویدیو: $VIDEO_COUNT"

if [ "$VIDEO_COUNT" -gt 0 ]; then
  echo ""
  echo "📋 نمونه فایل‌ها (5 مورد اول):"
  docker exec haghighi_backend find /app/uploads -type f \( -name "*.mp4" -o -name "*.webm" -o -name "*.mov" \) -ls 2>/dev/null | head -5
fi
echo ""

# بررسی URL endpoint
echo "7️⃣ تست Endpoint Stream URL:"
echo "--------------------------------------------------"
echo "🔗 تست: http://185.231.112.84:8080/api/videos/$VIDEO_ID/stream-url"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer test" \
  http://185.231.112.84:8080/api/videos/$VIDEO_ID/stream-url 2>/dev/null)

if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "401" ] || [ "$RESPONSE" == "403" ]; then
  echo "✅ Endpoint در دسترس است (Status: $RESPONSE)"
else
  echo "❌ Endpoint در دسترس نیست (Status: $RESPONSE)"
fi
echo ""

# بررسی Environment Variables
echo "8️⃣ بررسی Environment Variables مهم:"
echo "--------------------------------------------------"
docker exec haghighi_backend sh -c 'echo "API_BASE_URL: $API_BASE_URL"; echo "SERVER_IP: $SERVER_IP"; echo "EXTERNAL_PORT: $EXTERNAL_PORT"; echo "PORT: $PORT"' 2>/dev/null
echo ""

echo "=================================================="
echo "✅ بررسی کامل شد!"
echo "=================================================="

