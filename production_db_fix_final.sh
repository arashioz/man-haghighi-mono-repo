#!/bin/bash

echo "🔧 رفع نهایی مشکلات دیتابیس - Production Server"
echo "📍 اجرا روی سرور production"

# تنظیم متغیرها
DB_HOST="localhost"
DB_USER="haghighi_user"
DB_NAME="haghighi_db"
DB_PASSWORD="ChangeThisPassword123!"

export PGPASSWORD="$DB_PASSWORD"

echo "⚠️  قبل از ادامه مطمئن شوید که backup گرفته‌اید!"
read -p "Backup گرفته‌اید؟ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ عملیات لغو شد!"
    exit 1
fi

echo ""
echo "🔍 وضعیت فعلی دیتابیس..."

# چک کردن وضعیت فعلی
echo "ستون gatewayName در payment_links:"
docker-compose exec postgres psql -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_links' AND column_name = 'gatewayName';" 2>/dev/null || echo "   ستون وجود ندارد!"

echo ""
echo "ستون‌های users:"
docker-compose exec postgres psql -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('resetOtp', 'resetOtpExpiresAt');" 2>/dev/null || echo "   ستون‌ها وجود ندارند!"

echo ""
echo "ستون‌های settings:"
docker-compose exec postgres psql -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'settings' AND column_name IN ('messageTemplateEnabled', 'messageTemplateText', 'whatsappTemplateText');" 2>/dev/null || echo "   ستون‌ها وجود ندارند!"

echo ""
echo "⚙️  اعمال تغییرات..."

# اعمال تغییرات
docker-compose exec postgres psql -U $DB_USER -d $DB_NAME -c "
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS gatewayName TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resetOtp TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resetOtpExpiresAt TIMESTAMP(3);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS messageTemplateEnabled BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS messageTemplateText TEXT DEFAULT 'سلام {name}\nمبلغ: {amount} تومان\nلینک پرداخت:\n{link}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsappTemplateText TEXT DEFAULT 'سلام {name}!\nلینک پرداخت شما آماده است:\n{link}\nمبلغ: {amount} تومان';
"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ تغییرات اعمال شد!"
    
    echo ""
    echo "🔍 تایید تغییرات..."
    
    docker-compose exec postgres psql -U $DB_USER -d $DB_NAME -c "
    SELECT 
        'payment_links: ' || column_name as result
    FROM information_schema.columns 
    WHERE table_name = 'payment_links' AND column_name = 'gatewayName'
    UNION ALL
    SELECT 'users.resetOtp: ' || column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'resetOtp'
    UNION ALL
    SELECT 'users.resetOtpExpiresAt: ' || column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'resetOtpExpiresAt'
    UNION ALL
    SELECT 'settings.messageTemplateEnabled: ' || column_name 
    FROM information_schema.columns 
    WHERE table_name = 'settings' AND column_name = 'messageTemplateEnabled'
    ;"
    
    echo ""
    echo "🚀 Backend را restart کنید:"
    echo "docker-compose restart backend"
    
else
    echo "❌ خطا در اعمال تغییرات!"
fi

unset PGPASSWORD
