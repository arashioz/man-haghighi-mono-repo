#!/bin/bash

# Startup script for Haghighi Backend
# This script starts the application and runs database seeding

set -e  # Exit on any error

echo "🚀 Starting Haghighi Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ Database is ready');
    process.exit(0);
  })
  .catch((err) => {
    console.log('⏳ Database not ready yet, waiting...');
    process.exit(1);
  });
" 2>/dev/null; then
    break
  fi
  
  attempt=$((attempt + 1))
  echo "Attempt $attempt/$max_attempts - Database not ready, waiting 2 seconds..."
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ Database connection timeout after $max_attempts attempts"
  exit 1
fi

# Run database migrations
echo "📋 Running database migrations..."
npx prisma migrate deploy || {
  echo "⚠️ Migration failed, but continuing..."
}

# Run database seeding (only if no users exist)
echo "🌱 Checking if database needs seeding..."
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count()
  .then(count => {
    console.log(count);
    process.exit(0);
  })
  .catch(() => {
    console.log('0');
    process.exit(0);
  });
" 2>/dev/null)

if [ "$USER_COUNT" -eq 0 ]; then
  echo "🌱 Database is empty, running seeding..."
  node dist/prisma/seed.js || {
    echo "⚠️ Seeding failed, but continuing..."
  }
else
  echo "✅ Database already has data, skipping seeding..."
fi

# Start the application
echo "🎉 Starting NestJS application..."
exec npm run start:prod
