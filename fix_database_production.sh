#!/bin/bash

echo "🔧 شروع رفع مشکلات دیتابیس..."

# تنظیم متغیرها
DB_HOST="localhost"
DB_PORT="5433"
DB_USER="haghighi_user"
DB_NAME="haghighi_db"
DB_PASSWORD="password"  # تغییر دهید به پسورد واقعی

export PGPASSWORD="$DB_PASSWORD"

echo "📡 اتصال به دیتابیس..."

# اجرای اسکریپت SQL
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f fix_database.sql

if [ $? -eq 0 ]; then
    echo "✅ دیتابیس با موفقیت بروزرسانی شد!"
    echo ""
    echo "🔍 چک کردن ستون‌های اضافه شده..."
    
    # چک کردن payment_links
    echo "جدول payment_links:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'payment_links' AND column_name = 'gatewayName';"
    
    # چک کردن users
    echo "جدول users:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('resetOtp', 'resetOtpExpiresAt');"
    
    # چک کردن settings
    echo "جدول settings:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'settings' AND column_name IN ('messageTemplateEnabled', 'messageTemplateText', 'whatsappTemplateText');"
    
    echo ""
    echo "🚀 حالا می‌توانید backend را restart کنید:"
    echo "docker-compose restart backend"
    
else
    echo "❌ خطا در بروزرسانی دیتابیس!"
    exit 1
fi

unset PGPASSWORD
