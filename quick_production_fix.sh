#!/bin/bash

echo "🔧 رفع سریع مشکلات دیتابیس روی Production"

# اجرای مستقیم دستورات SQL
docker-compose exec postgres psql -U haghighi_user -d haghighi_db -c "
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS gatewayName TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resetOtp TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resetOtpExpiresAt TIMESTAMP(3);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS messageTemplateEnabled BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS messageTemplateText TEXT DEFAULT 'سلام {name}\nمبلغ: {amount} تومان\nلینک پرداخت:\n{link}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsappTemplateText TEXT DEFAULT 'سلام {name}!\nلینک پرداخت شما آماده است:\n{link}\nمبلغ: {amount} تومان';
"

if [ $? -eq 0 ]; then
    echo "✅ ستون‌ها اضافه شدند"
    
    # چک کردن
    docker-compose exec postgres psql -U haghighi_user -d haghighi_db -c "
    SELECT 'gatewayName exists' as check_result 
    FROM information_schema.columns 
    WHERE table_name = 'payment_links' AND column_name = 'gatewayName';
    "
    
    echo ""
    echo "🚀 Backend را restart کنید:"
    echo "docker-compose restart backend"
    
else
    echo "❌ خطا در اعمال تغییرات"
fi
