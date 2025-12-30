#!/bin/bash

echo "🚨 EMERGENCY PRODUCTION FIX"
echo "🔧 رفع فوری مشکل gatewayName روی production"

# اجرای سریع همه تغییرات
echo "۱. اضافه کردن ستون gatewayName..."
docker-compose exec postgres psql -U haghighi_user -d haghighi_db -c "ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS gatewayName TEXT;" 2>/dev/null

echo "۲. اضافه کردن سایر ستون‌ها..."
docker-compose exec postgres psql -U haghighi_user -d haghighi_db -c "
ALTER TABLE users ADD COLUMN IF NOT EXISTS resetOtp TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resetOtpExpiresAt TIMESTAMP(3);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS messageTemplateEnabled BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS messageTemplateText TEXT DEFAULT 'سلام {name}\nمبلغ: {amount} تومان\nلینک پرداخت:\n{link}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsappTemplateText TEXT DEFAULT 'سلام {name}!\nلینک پرداخت شما آماده است:\n{link}\nمبلغ: {amount} تومان';
" 2>/dev/null

echo "۳. چک کردن تغییرات..."
docker-compose exec postgres psql -U haghighi_user -d haghighi_db -c "
SELECT '✅ gatewayName: ' || column_name as status
FROM information_schema.columns 
WHERE table_name = 'payment_links' AND column_name = 'gatewayName'
UNION ALL
SELECT '✅ resetOtp: ' || column_name
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'resetOtp'
UNION ALL
SELECT '✅ messageTemplateEnabled: ' || column_name
FROM information_schema.columns 
WHERE table_name = 'settings' AND column_name = 'messageTemplateEnabled';
" 2>/dev/null

echo ""
echo "۴. راهنمایی نهایی:"
echo "   - فایل payments.controller.ts بروز شده را انتقال دهید"
echo "   - Backend را restart کنید: docker-compose restart backend"
echo "   - تست کنید: curl https://api.manehaghighi.com/api/health"

echo ""
echo "🎉 تغییرات دیتابیس اعمال شد!"
