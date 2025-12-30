#!/bin/bash

echo "🔧 اجرای مستقیم روی سرور - رفع مشکلات دیتابیس"
echo "⚠️  مطمئن شوید که در دایرکتوری backend هستید!"

# تنظیم متغیرهای محیطی (تغییر دهید)
DB_PASSWORD="ChangeThisPassword123!"  # پسورد واقعی دیتابیس خود را وارد کنید

export PGPASSWORD="$DB_PASSWORD"

echo "📡 بروزرسانی دیتابیس..."

# اجرای دستورات SQL
psql -h localhost -U haghighi_user -d haghighi_db -c "
-- اضافه کردن ستون gatewayName
ALTER TABLE \"payment_links\" ADD COLUMN IF NOT EXISTS \"gatewayName\" TEXT;

-- اضافه کردن ستون‌های resetOtp
ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"resetOtp\" TEXT;
ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"resetOtpExpiresAt\" TIMESTAMP(3);

-- اضافه کردن ستون‌های message template
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"messageTemplateEnabled\" BOOLEAN DEFAULT true;
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"messageTemplateText\" TEXT DEFAULT 'سلام {name}\nمبلغ: {amount} تومان\nلینک پرداخت:\n{link}';
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"whatsappTemplateText\" TEXT DEFAULT 'سلام {name}!\nلینک پرداخت شما آماده است:\n{link}\nمبلغ: {amount} تومان';
"

if [ $? -eq 0 ]; then
    echo "✅ دیتابیس بروزرسانی شد!"
    
    echo "🔍 چک کردن ستون‌ها..."
    psql -h localhost -U haghighi_user -d haghighi_db -c "
    SELECT 'payment_links.gatewayName:' as check, column_name FROM information_schema.columns 
    WHERE table_name = 'payment_links' AND column_name = 'gatewayName'
    UNION ALL
    SELECT 'users.resetOtp:', column_name FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'resetOtp'
    UNION ALL
    SELECT 'users.resetOtpExpiresAt:', column_name FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'resetOtpExpiresAt'
    UNION ALL
    SELECT 'settings.messageTemplateEnabled:', column_name FROM information_schema.columns 
    WHERE table_name = 'settings' AND column_name = 'messageTemplateEnabled';
    "
    
    echo ""
    echo "🚀 حالا backend را restart کنید:"
    echo "docker-compose restart backend"
    echo "یا"
    echo "pm2 restart backend"
    
else
    echo "❌ خطا در بروزرسانی دیتابیس!"
    exit 1
fi

unset PGPASSWORD
