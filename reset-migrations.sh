#!/bin/bash

# Script to reset all migrations and recreate them from scratch
# ⚠️  WARNING: This will delete all migration history from the database

set -e

CONTAINER_NAME="haghighi_backend"
COMPOSE_FILE="docker-compose-alt-ports.yml"

echo "⚠️  WARNING: This will delete all migration history!"
echo "   All migrations will be removed and recreated from schema.prisma"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Operation cancelled"
  exit 1
fi

echo ""
echo "🔄 Resetting migrations..."
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

# Step 1: Delete migration history from database
echo "📦 Step 1: Deleting migration history from database..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Delete the _prisma_migrations table using psql
docker exec $CONTAINER_NAME sh -c "cd /app && psql \$DATABASE_URL -c 'DROP TABLE IF EXISTS \"_prisma_migrations\" CASCADE;'" 2>/dev/null || \
docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma db execute --stdin" <<EOF 2>/dev/null || true
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;
EOF

echo "✅ Migration history deleted from database"
echo ""

# Step 2: Delete all migration folders (keep migration_lock.toml)
echo "📁 Step 2: Deleting migration folders..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Delete all migration directories (keep migration_lock.toml)
echo "   Deleting all migration directories..."
docker exec $CONTAINER_NAME sh -c "cd /app && find prisma/migrations -mindepth 1 -maxdepth 1 -type d -exec rm -rf {} +" 2>/dev/null || \
docker exec $CONTAINER_NAME sh -c "cd /app && rm -rf prisma/migrations/*/" 2>/dev/null || true

echo "✅ Migration folders deleted"
echo ""

# Step 3: Create a fresh migration from schema
echo "🆕 Step 3: Creating fresh migration from schema..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma migrate dev --name init --create-only" || {
  echo ""
  echo "⚠️  migrate dev failed, trying migrate deploy with db push..."
  docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma db push --accept-data-loss" || {
    echo ""
    echo "❌ Failed to create migration"
    exit 1
  }
  
  # If db push succeeded, mark it as a migration
  echo ""
  echo "📝 Creating migration record for db push..."
  docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma migrate resolve --applied init" 2>/dev/null || true
}

echo ""
echo "✅ Fresh migration created"
echo ""

# Step 4: Apply the migration
echo "🚀 Step 4: Applying migration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma migrate deploy"

echo ""
echo "✅ Migration applied"
echo ""

# Step 5: Regenerate Prisma Client
echo "🔄 Step 5: Regenerating Prisma Client..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma generate"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All migrations reset and recreated successfully!"
echo ""
echo "💡 Next steps:"
echo "   - Run seed if needed: ./run-migration-seed.sh"
echo "   - Check migration status: docker exec $CONTAINER_NAME sh -c 'cd /app && npx prisma migrate status'"
echo ""

    