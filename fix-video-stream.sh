#!/bin/bash

echo "=================================================="
echo "🔧 Fix Video Stream - Rebuild و Restart Backend"
echo "=================================================="
echo ""

# بررسی وضعیت containerها
echo "1️⃣ بررسی وضعیت Containerها:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|haghighi_backend"
echo ""

# Rebuild backend
echo "2️⃣ Rebuild Backend (این ممکن است چند دقیقه طول بکشد)..."
docker-compose build backend
echo ""

# Restart backend
echo "3️⃣ Restart Backend..."
docker-compose restart backend
echo ""

# صبر برای آماده شدن backend
echo "4️⃣ صبر برای آماده شدن Backend..."
sleep 5

# بررسی لاگ‌ها
echo "5️⃣ بررسی لاگ‌های Backend (10 خط آخر):"
docker logs haghighi_backend --tail 10
echo ""

# بررسی endpoint
echo "6️⃣ تست Endpoint:"
echo "--------------------------------------------------"
curl -I http://185.231.112.84:8080/api/health 2>/dev/null | head -1
echo ""

echo "=================================================="
echo "✅ Backend rebuild و restart شد!"
echo "=================================================="
echo ""
echo "⚠️  نکته: Frontend را هم باید rebuild کنید:"
echo "   docker-compose build frontend"
echo "   docker-compose restart frontend"
echo ""

