#!/bin/sh

echo "🔄 Running migrations before seed..."
npx prisma migrate deploy || {
  echo "⚠️  Migration deploy failed, trying db push as fallback..."
  npx prisma db push --accept-data-loss || true
}

echo "🔄 Regenerating Prisma Client..."
npx prisma generate

echo "🌱 Running seed..."
npm run prisma:seed

