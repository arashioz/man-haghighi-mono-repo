#!/bin/bash

# Simple script to reset migrations - just deletes migration history and recreates

set -e

CONTAINER_NAME="haghighi_backend"

echo "🔄 Resetting migrations (simple method)..."
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Error: Docker container '$CONTAINER_NAME' is not running."
  exit 1
fi

# Step 1: Delete _prisma_migrations table
echo "📦 Deleting migration history from database..."
# Get database credentials from backend container
DB_USER=$(docker exec $CONTAINER_NAME sh -c "cd /app && printenv POSTGRES_USER" | tr -d '\r')
DB_NAME=$(docker exec $CONTAINER_NAME sh -c "cd /app && printenv POSTGRES_DB" | tr -d '\r')
DB_PASS=$(docker exec $CONTAINER_NAME sh -c "cd /app && printenv POSTGRES_PASSWORD" | tr -d '\r')

# Use postgres container to drop the table
docker exec haghighi_postgres psql -U "$DB_USER" -d "$DB_NAME" -c 'DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;' 2>/dev/null || {
  # Fallback: use backend container with DATABASE_URL
  docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma db execute --schema prisma/schema.prisma --stdin" <<EOF 2>/dev/null || true
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;
EOF
}

echo "✅ Migration history deleted"
echo ""

# Step 2: Delete all migration folders
echo "📁 Deleting migration folders..."
docker exec $CONTAINER_NAME sh -c "cd /app && rm -rf prisma/migrations/*/" 2>/dev/null || true
echo "✅ Migration folders deleted"
echo ""

# Step 3: Create and apply fresh migration
echo "🆕 Creating fresh migration..."
docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma migrate dev --name init" || {
  echo "⚠️  Using db push as fallback..."
  docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma db push --accept-data-loss"
}

echo ""
echo "✅ Migrations reset and recreated!"
echo ""

