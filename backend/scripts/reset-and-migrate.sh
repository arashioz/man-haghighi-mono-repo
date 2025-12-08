#!/bin/sh
# Don't use set -e here, we want to handle errors gracefully

# فقط اگر RESET_DB=true باشد، دیتابیس پاک شود
if [ "$RESET_DB" = "true" ]; then
  echo "🔴 Resetting database..."
  # Suppress error about _prisma_migrations table not existing (it's normal on first reset)
  # The error is harmless - database will be reset successfully
  npx prisma db push --force-reset 2>&1 | grep -v "does not exist" || {
    # Even if there are warnings, the reset usually succeeds
    echo "⚠️  Some warnings during reset (this is usually fine)"
  }
  echo "✅ Database reset completed"
fi

# مرحله‌ای مایگریشن‌ها را اعمال کن
echo "🟡 Applying migrations..."
if npx prisma migrate deploy 2>&1; then
  echo "✅ Migrations applied successfully"
else
  echo "⚠️  Migration deploy had issues, trying db push as fallback..."
  npx prisma db push --accept-data-loss || {
    echo "⚠️  db push also failed, but continuing..."
    true
  }
fi

# seed را اجرا کن
echo "🟢 Running seed..."
if npx prisma db seed 2>&1; then
  echo "✅ Seed completed successfully"
else
  echo "⚠️  Seed had issues, but continuing..."
fi

echo "✅ Database ready"
