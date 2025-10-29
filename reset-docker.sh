#!/bin/bash

# استفاده از docker-compose-alt-ports.yml برای سرور
COMPOSE_FILE="docker-compose-alt-ports.yml"

echo "🧹 پاک‌سازی کامل Docker Containerها و Volumeها..."
echo "=================================================="
echo "📋 استفاده از: $COMPOSE_FILE"
echo ""

# توقف همه containerها
echo "🛑 توقف همه containerها..."
docker-compose -f $COMPOSE_FILE down
echo "✅ انجام شد"
echo ""

# حذف همه containerهای مرتبط
echo "🗑️  حذف containerها..."
docker rm -f haghighi_postgres haghighi_backend haghighi_frontend haghighi_admin 2>/dev/null || true
echo "✅ انجام شد"
echo ""

# حذف همه volumeها (شامل اطلاعات دیتابیس)
echo "🗑️  حذف Volumeها (شامل اطلاعات دیتابیس)..."
docker-compose -f $COMPOSE_FILE down -v
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
    docker-compose -f $COMPOSE_FILE build --no-cache
    
    echo ""
    echo "▶️  در حال اجرای containerها..."
    docker-compose -f $COMPOSE_FILE up -d
    
    echo ""
    echo "⏳ صبر کنید تا سرویس‌ها راه‌اندازی شوند..."
    echo "   (در حال انتظار برای آماده شدن backend و postgres)..."
    
    # صبر برای آماده شدن postgres
    echo "   🔍 بررسی آماده بودن Postgres..."
    for i in {1..30}; do
        if docker exec haghighi_postgres pg_isready -U $(grep POSTGRES_USER .env | cut -d '=' -f2) >/dev/null 2>&1; then
            echo "   ✅ Postgres آماده است!"
            break
        fi
        echo "   ⏳ منتظر Postgres... ($i/30)"
        sleep 2
    done
    
    # صبر برای آماده شدن backend
    echo "   🔍 بررسی آماده بودن Backend..."
    for i in {1..30}; do
        if docker exec haghighi_backend sh -c "test -f /app/dist/src/main.js" >/dev/null 2>&1; then
            echo "   ✅ Backend آماده است!"
            break
        fi
        echo "   ⏳ منتظر Backend... ($i/30)"
        sleep 2
    done
    
    echo ""
    echo "=================================================="
    echo "📊 وضعیت containerها:"
    echo "=================================================="
    docker-compose -f $COMPOSE_FILE ps
    echo ""
    
    # اجرای مایگریشن
    echo "=================================================="
    echo "🔄 اجرای مایگریشن‌های دیتابیس..."
    echo "=================================================="
    echo ""
    
    echo "📦 در حال اجرای Prisma Migrate..."
    docker exec -it haghighi_backend npx prisma migrate deploy || {
        echo "⚠️  migrate deploy خطا داشت، در حال اجرای db push..."
        docker exec -it haghighi_backend npx prisma db push --accept-data-loss
    }
    echo "✅ مایگریشن‌ها انجام شد"
    echo ""
    
    # اجرای seed
    echo "=================================================="
    echo "🌱 اجرای Seed داده‌های اولیه..."
    echo "=================================================="
    echo ""
    
    echo "🌱 در حال Seed کردن داده‌های اولیه..."
    docker exec -it haghighi_backend npx prisma db seed
    echo "✅ Seed داده‌های اولیه انجام شد"
    echo ""
    
    # اجرای seed old data
    echo "=================================================="
    echo "📦 اجرای Seed داده‌های قدیمی..."
    echo "=================================================="
    echo ""
    
    read -p "آیا می‌خواهید داده‌های قدیمی (old users) را هم import کنید؟ (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📥 در حال Import کردن کاربران قدیمی..."
        docker exec -it haghighi_backend npm run seed:old-users
        echo "✅ Import کاربران قدیمی انجام شد"
        echo ""
    else
        echo "⏭️  Import کاربران قدیمی رد شد"
        echo ""
    fi
    
    echo ""
    echo "=================================================="
    echo "✅ همه چیز آماده است!"
    echo "=================================================="
    echo ""
    # تشخیص IP سرور
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}' || echo "YOUR_SERVER_IP")
    
    echo "🌐 آدرس‌ها:"
    echo "   Frontend:    http://${SERVER_IP}:8081"
    echo "   Admin Panel: http://${SERVER_IP}:8082"
    echo "   Backend API: http://${SERVER_IP}:8080/api"
    echo "   API Docs:    http://${SERVER_IP}:8080/api/docs"
    echo "   Health Check: http://${SERVER_IP}:8080/api/health"
    echo ""
    echo "📝 برای مشاهده لاگ‌ها:"
    echo "   docker-compose -f $COMPOSE_FILE logs -f"
    echo ""
    echo "🔍 بررسی وضعیت:"
    echo "   docker-compose -f $COMPOSE_FILE ps"
    echo "   curl http://${SERVER_IP}:8080/api/health"
fi

