#!/bin/bash

echo "🧹 پاک‌سازی کامل Docker Containerها و Volumeها..."
echo "=================================================="
echo ""

# توقف همه containerها
echo "🛑 توقف همه containerها..."
docker-compose down
echo "✅ انجام شد"
echo ""

# حذف همه containerهای مرتبط
echo "🗑️  حذف containerها..."
docker rm -f haghighi_postgres haghighi_backend haghighi_frontend haghighi_admin 2>/dev/null || true
echo "✅ انجام شد"
echo ""

# حذف همه volumeها (شامل اطلاعات دیتابیس)
echo "🗑️  حذف Volumeها (شامل اطلاعات دیتابیس)..."
docker-compose down -v
docker volume rm $(docker volume ls -q | grep haghighi) 2>/dev/null || true
docker volume rm postgres_data 2>/dev/null || true
echo "✅ انجام شد"
echo ""

# حذف imageهای مرتبط (اختیاری - اگر می‌خواهید imageها را هم پاک کنید، uncomment کنید)
echo "🗑️  حذف Imageهای قدیمی..."
docker rmi $(docker images | grep haghighi | awk '{print $3}') 2>/dev/null || true
echo "✅ انجام شد"
echo ""

# پاک‌سازی سیستم Docker (اختیاری)
echo "🧹 پاک‌سازی سیستم Docker..."
docker system prune -f
echo "✅ انجام شد"
echo ""

echo "=================================================="
echo "✅ پاک‌سازی کامل انجام شد!"
echo "=================================================="
echo ""

# بررسی آیا کاربر می‌خواهد از اول build کند
read -p "آیا می‌خواهید از اول build و اجرا کنید؟ (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔨 در حال build کردن از اول..."
    docker-compose build --no-cache
    
    echo ""
    echo "▶️  در حال اجرای containerها..."
    docker-compose up -d
    
    echo ""
    echo "⏳ صبر کنید تا سرویس‌ها راه‌اندازی شوند..."
    sleep 15
    
    echo ""
    echo "📊 وضعیت containerها:"
    docker-compose ps
    
    echo ""
    echo "=================================================="
    echo "✅ همه چیز آماده است!"
    echo "=================================================="
    echo ""
    echo "🌐 آدرس‌ها:"
    echo "   Frontend:    http://localhost:3002"
    echo "   Admin Panel: http://localhost:3001"
    echo "   Backend API: http://localhost:3000/api"
    echo ""
    echo "📝 برای مشاهده لاگ‌ها:"
    echo "   docker-compose logs -f"
fi

