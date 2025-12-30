#!/bin/bash

echo "🚀 Production Final Fix - Prisma Client & Database"

# انتقال فایل‌های بروز شده
echo "📁 انتقال فایل‌های بروز شده..."
scp .env user@185.231.112.84:/path/to/project/.env
scp backend/src/payments/payments.controller.ts user@185.231.112.84:/path/to/backend/src/payments/payments.controller.ts

# اجرای دستورات روی production
ssh user@185.231.112.84 << 'REMOTE_COMMANDS'
echo "🔧 اعمال تغییرات روی production..."

# اضافه کردن ستون gatewayName
echo "📊 اضافه کردن ستون gatewayName..."
docker-compose exec postgres psql -U haghighi_user -d haghighi_db -c "ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS gatewayName TEXT;"

# Regenerate Prisma client
echo "🔄 Regenerate Prisma client..."
cd /path/to/backend && npx prisma generate

# Rebuild backend
echo "🏗️ Rebuild backend..."
cd /path/to/project && docker-compose build backend

# Restart backend
echo "🚀 Restart backend..."
docker-compose restart backend

echo "✅ عملیات تکمیل شد!"
REMOTE_COMMANDS

echo "🎉 همه چیز آماده است!"
echo "🔍 تست کنید: curl https://api.manehaghighi.com/api/health"
