#!/bin/bash

# Script to fix failed migrations (P3009 error)
# This resolves the failed migration and allows new migrations to be applied

set -e

CONTAINER_NAME="haghighi_backend"
FAILED_MIGRATION="20250115000000_add_otp_fields"

echo "🔧 Fixing failed migration: $FAILED_MIGRATION"
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Error: Docker container '$CONTAINER_NAME' is not running."
  echo "   Please start the container first:"
  echo "   docker-compose -f docker-compose-alt-ports.yml up -d backend"
  exit 1
fi

echo "✅ Container found: $CONTAINER_NAME"
echo ""

# Step 1: Check migration status
echo "📊 Checking migration status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma migrate status"
echo ""

# Step 2: Resolve the failed migration
echo "🔧 Resolving failed migration: $FAILED_MIGRATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   This will mark the migration as rolled-back so new migrations can be applied."
echo ""

# Try to resolve as rolled-back (if migration was rolled back)
docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma migrate resolve --rolled-back $FAILED_MIGRATION" || {
  echo ""
  echo "⚠️  Could not resolve as rolled-back. Trying to resolve as applied..."
  # If rolled-back doesn't work, try to resolve as applied (if migration actually succeeded)
  docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma migrate resolve --applied $FAILED_MIGRATION" || {
    echo ""
    echo "❌ Could not resolve migration automatically."
    echo ""
    echo "💡 Manual resolution options:"
    echo "   1. If the migration was rolled back, run:"
    echo "      docker exec $CONTAINER_NAME sh -c \"cd /app && npx prisma migrate resolve --rolled-back $FAILED_MIGRATION\""
    echo ""
    echo "   2. If the migration actually succeeded, run:"
    echo "      docker exec $CONTAINER_NAME sh -c \"cd /app && npx prisma migrate resolve --applied $FAILED_MIGRATION\""
    echo ""
    exit 1
  }
}

echo ""
echo "✅ Migration resolved successfully!"
echo ""

# Step 3: Try to apply migrations again
echo "🔄 Applying migrations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec $CONTAINER_NAME sh -c "cd /app && npx prisma migrate deploy"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Failed migration fixed and new migrations applied!"
echo ""

