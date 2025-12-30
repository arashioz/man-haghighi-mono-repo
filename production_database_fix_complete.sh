#!/bin/bash

# =====================================================
# 🛠️  DATABASE FIX SCRIPT FOR PRODUCTION
# رفع مشکلات دیتابیس برای production server
# =====================================================

echo "🔧 Production Database Fix Script"
echo "📊 اطلاعات دیتابیس از server.env:"
echo "   - Host: localhost (یا postgres container)"
echo "   - Port: 5432"  
echo "   - User: haghighi_user"
echo "   - Database: haghighi_db"
echo "   - Password: ChangeThisPassword123!"
echo ""

# تنظیم متغیرها
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="haghighi_user"
DB_NAME="haghighi_db"
DB_PASSWORD="ChangeThisPassword123!"

# تنظیم پسورد
export PGPASSWORD="$DB_PASSWORD"

echo "⚠️  قبل از ادامه، مطمئن شوید که از دیتابیس backup گرفته‌اید!"
read -p "آیا backup گرفته‌اید؟ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ عملیات لغو شد. لطفا ابتدا backup بگیرید."
    exit 1
fi

echo ""
echo "📡 تست اتصال به دیتابیس..."

# تست اتصال
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ اتصال به دیتابیس ناموفق!"
    echo "   - بررسی کنید که PostgreSQL اجرا باشد"
    echo "   - بررسی کنید که credentials درست باشند"
    echo "   - اگر در Docker هستید، از این دستور استفاده کنید:"
    echo "     docker-compose exec postgres psql -U $DB_USER -d $DB_NAME"
    exit 1
fi

echo "✅ اتصال به دیتابیس موفق!"

echo ""
echo "🔍 چک کردن ستون‌های موجود قبل از اعمال تغییرات..."

# چک کردن ستون‌ها قبل از تغییر
echo "payment_links.gatewayName:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'payment_links' AND column_name = 'gatewayName';" 2>/dev/null || echo "   ستون وجود ندارد"

echo ""
echo "users.resetOtp:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'resetOtp';" 2>/dev/null || echo "   ستون وجود ندارد"

echo ""
echo "users.resetOtpExpiresAt:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'resetOtpExpiresAt';" 2>/dev/null || echo "   ستون وجود ندارد"

echo ""
echo "settings.messageTemplateEnabled:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'settings' AND column_name = 'messageTemplateEnabled';" 2>/dev/null || echo "   ستون وجود ندارد"

echo ""
echo "⚙️  اعمال تغییرات دیتابیس..."

# اجرای SQL commands
SQL_COMMANDS="
-- اضافه کردن ستون gatewayName به payment_links
ALTER TABLE \"payment_links\" ADD COLUMN IF NOT EXISTS \"gatewayName\" TEXT;

-- اضافه کردن ستون‌های resetOtp به users  
ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"resetOtp\" TEXT;
ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"resetOtpExpiresAt\" TIMESTAMP(3);

-- اضافه کردن ستون‌های message template به settings
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"messageTemplateEnabled\" BOOLEAN DEFAULT true;
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"messageTemplateText\" TEXT DEFAULT 'سلام {name}\nمبلغ: {amount} تومان\nلینک پرداخت:\n{link}';
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"whatsappTemplateText\" TEXT DEFAULT 'سلام {name}!\nلینک پرداخت شما آماده است:\n{link}\nمبلغ: {amount} تومان';
"

echo "$SQL_COMMANDS" | psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ تغییرات دیتابیس با موفقیت اعمال شد!"
    
    echo ""
    echo "🔍 چک کردن ستون‌های اضافه شده..."
    
    echo "payment_links.gatewayName:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'payment_links' AND column_name = 'gatewayName';" 2>/dev/null || echo "   هنوز وجود ندارد!"
    
    echo ""
    echo "users.resetOtp:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'resetOtp';" 2>/dev/null || echo "   هنوز وجود ندارد!"
    
    echo ""
    echo "users.resetOtpExpiresAt:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'resetOtpExpiresAt';" 2>/dev/null || echo "   هنوز وجود ندارد!"
    
    echo ""
    echo "settings.messageTemplateEnabled:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'settings' AND column_name = 'messageTemplateEnabled';" 2>/dev/null || echo "   هنوز وجود ندارد!"
    
    echo ""
    echo "🚀 مراحل بعدی:"
    echo "   1. Backend را restart کنید:"
    echo "      docker-compose restart backend"
    echo "      یا"
    echo "      pm2 restart backend"
    echo "      یا"  
    echo "      systemctl restart your-backend-service"
    echo ""
    echo "   2. APIها را تست کنید:"
    echo "      curl https://api.manehaghighi.com/api/health"
    echo "      curl https://api.manehaghighi.com/api/payments/links \\"
    echo "           -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'"
    echo ""
    echo "🎉 عملیات تکمیل شد!"
    
else
    echo ""
    echo "❌ خطا در اعمال تغییرات دیتابیس!"
    echo "   - لاگ‌های بیشتری را چک کنید"
    echo "   - اتصال دیتابیس را بررسی کنید"
    echo "   - مطمئن شوید که کاربر دیتابیس دسترسی لازم را دارد"
    exit 1
fi

# پاک کردن متغیر پسورد
unset PGPASSWORD

echo ""
echo "📋 یادداشت‌های مهم:"
echo "   - اگر از Docker استفاده می‌کنید، ممکن است نیاز به اجرای اسکریپت داخل container باشد:"
echo "     docker-compose exec postgres /path/to/script.sh"
echo "   - اگر خطا دارید، لاگ‌های PostgreSQL را چک کنید:"
echo "     docker-compose logs postgres"
echo "   - برای rollback، از backup استفاده کنید"
