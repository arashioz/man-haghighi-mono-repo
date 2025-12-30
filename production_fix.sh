#!/bin/bash

echo "🔧 اسکریپت رفع مشکلات دیتابیس برای سرور Production"
echo "⚠️  مطمئن شوید که از دیتابیس backup گرفته‌اید!"

# تنظیم متغیرهای production (بر اساس server.env)
PRODUCTION_HOST="185.231.112.84"  # از SERVER_IP در server.env
PRODUCTION_USER="root"  # تغییر دهید به یوزر واقعی SSH
DB_PASSWORD="ChangeThisPassword123!"  # از server.env

echo "🔗 اتصال به سرور production..."

# اجرای دستورات روی سرور production
ssh $PRODUCTION_USER@$PRODUCTION_HOST << REMOTE_COMMANDS
echo "📡 اتصال به دیتابیس production..."

# تنظیم پسورد دیتابیس
export PGPASSWORD="$DB_PASSWORD"

# اجرای دستورات SQL
psql -h localhost -U haghighi_user -d haghighi_db -c "
ALTER TABLE \"payment_links\" ADD COLUMN IF NOT EXISTS \"gatewayName\" TEXT;
ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"resetOtp\" TEXT;
ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"resetOtpExpiresAt\" TIMESTAMP(3);
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"messageTemplateEnabled\" BOOLEAN DEFAULT true;
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"messageTemplateText\" TEXT DEFAULT 'سلام {name}\nمبلغ: {amount} تومان\nلینک پرداخت:\n{link}';
ALTER TABLE \"settings\" ADD COLUMN IF NOT EXISTS \"whatsappTemplateText\" TEXT DEFAULT 'سلام {name}!\nلینک پرداخت شما آماده است:\n{link}\nمبلغ: {amount} تومان';
"

if [ \$? -eq 0 ]; then
    echo "✅ دیتابیس production بروزرسانی شد!"
    echo "🔄 Restart کردن backend..."
    
    # Restart backend (بسته به اینکه چگونه اجرا می‌شود)
    docker-compose restart backend 2>/dev/null || pm2 restart backend 2>/dev/null || systemctl restart your-backend-service 2>/dev/null || echo "⚠️  لطفا backend را دستی restart کنید"
    
    echo "🎉 عملیات تکمیل شد!"
else
    echo "❌ خطا در بروزرسانی دیتابیس!"
fi

unset PGPASSWORD
REMOTE_COMMANDS

echo "✅ عملیات روی production server تکمیل شد!"
