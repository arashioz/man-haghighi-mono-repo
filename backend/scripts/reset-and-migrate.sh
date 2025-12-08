#!/bin/sh
set -e

# فقط اگر RESET_DB=true باشد، دیتابیس پاک شود
if [ "$RESET_DB" = "true" ]; then
  echo "🔴 Resetting database..."
  npx prisma db push --force-reset
fi

# مرحله‌ای مایگریشن‌ها را اعمال کن
echo "🟡 Applying migrations..."
npx prisma migrate deploy

# seed را اجرا کن
echo "🟢 Running seed..."
npx prisma db seed

echo "✅ Database ready"
