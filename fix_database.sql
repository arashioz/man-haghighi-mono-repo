-- اسکریپت رفع مشکلات دیتابیس برای production

-- اتصال به دیتابیس
\c haghighi_db;

-- اضافه کردن ستون gatewayName به جدول payment_links
ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "gatewayName" TEXT;

-- اضافه کردن ستون‌های resetOtp به جدول users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetOtp" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetOtpExpiresAt" TIMESTAMP(3);

-- اضافه کردن ستون‌های message template به جدول settings
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "messageTemplateEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "messageTemplateText" TEXT DEFAULT 'سلام {name}\nمبلغ: {amount} تومان\nلینک پرداخت:\n{link}';
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "whatsappTemplateText" TEXT DEFAULT 'سلام {name}!\nلینک پرداخت شما آماده است:\n{link}\nمبلغ: {amount} تومان';

-- چک کردن اینکه ستون‌ها اضافه شده‌اند
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'payment_links' AND column_name = 'gatewayName';

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('resetOtp', 'resetOtpExpiresAt');

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'settings' AND column_name IN ('messageTemplateEnabled', 'messageTemplateText', 'whatsappTemplateText');
