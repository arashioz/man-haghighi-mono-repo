-- Add missing columns to existing tables

-- Add resetOtp and resetOtpExpiresAt to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetOtp" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetOtpExpiresAt" TIMESTAMP(3);

-- Add gatewayName to payment_links table
ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "gatewayName" TEXT;

-- Add message template columns to settings table
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "messageTemplateEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "messageTemplateText" TEXT DEFAULT 'سلام {name}
مبلغ: {amount} تومان
لینک پرداخت:
{link}';
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "whatsappTemplateText" TEXT DEFAULT 'سلام {name}!
لینک پرداخت شما آماده است:
{link}
مبلغ: {amount} تومان';
