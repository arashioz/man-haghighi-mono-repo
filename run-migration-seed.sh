#!/bin/bash

# Script to run migration and seed on the server
# Works with docker-compose-alt-ports.yml

set -e

CONTAINER_NAME="haghighi_backend"
COMPOSE_FILE="docker-compose-alt-ports.yml"

echo "🚀 Running migration and seed on server..."
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Error: Docker container '$CONTAINER_NAME' is not running."
  echo "   Please start the container first:"
  echo "   docker-compose -f $COMPOSE_FILE up -d backend"
  exit 1
fi

echo "✅ Container found: $CONTAINER_NAME"
echo ""

# Step 1: Run migrations
echo "📦 Step 1: Running database migrations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec $CONTAINER_NAME sh -c "
  cd /app && \
  npx prisma migrate deploy
"

MIGRATION_EXIT=$?
if [ $MIGRATION_EXIT -ne 0 ]; then
  echo ""
  echo "⚠️  Migration deploy failed, trying migrate.sh script..."
  docker exec $CONTAINER_NAME sh -c "cd /app && sh scripts/migrate.sh"
fi

echo ""
echo "✅ Migrations completed"
echo ""

# Step 2: Regenerate Prisma Client
echo "🔄 Step 2: Regenerating Prisma Client..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma generate"

echo ""
echo "✅ Prisma Client regenerated"
echo ""

# Step 3: Run seed
echo "🌱 Step 3: Running database seed..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec $CONTAINER_NAME sh -c "cd /app && npm run prisma:seed"

SEED_EXIT=$?
if [ $SEED_EXIT -ne 0 ]; then
  echo ""
  echo "⚠️  Seed failed with exit code: $SEED_EXIT"
  exit $SEED_EXIT
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Migration and seed completed successfully!"
echo ""

