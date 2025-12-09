#!/bin/bash

# Script to update application on server
# Usage: ./update-on-server.sh

set -e

COMPOSE_FILE="docker-compose-alt-ports.yml"

echo "🔄 Starting update process..."
echo ""

# Check if we're in the right directory
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ Error: $COMPOSE_FILE not found!"
  echo "   Please run this script from the project root directory"
  exit 1
fi

# Step 1: Pull latest changes
echo "📥 Step 1: Pulling latest changes from git..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git pull origin master || {
  echo "⚠️  Git pull failed. Continuing anyway..."
}
echo ""

# Step 2: Stop containers
echo "🐳 Step 2: Stopping containers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose -f $COMPOSE_FILE down
echo ""

# Step 3: Build images
echo "🔨 Step 3: Building Docker images..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose -f $COMPOSE_FILE build --no-cache
echo ""

# Step 4: Start containers
echo "🚀 Step 4: Starting containers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose -f $COMPOSE_FILE up -d
echo ""

# Step 5: Wait for services to be ready
echo "⏳ Step 5: Waiting for services to start..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 15
echo ""

# Step 6: Run migrations
echo "📦 Step 6: Running database migrations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec haghighi_backend sh -c "cd /app && npx prisma migrate deploy" || {
  echo "⚠️  Migration failed. Check logs: docker-compose -f $COMPOSE_FILE logs backend"
}
echo ""

# Step 7: Generate Prisma Client
echo "🔄 Step 7: Regenerating Prisma Client..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec haghighi_backend sh -c "cd /app && npx prisma generate" || {
  echo "⚠️  Prisma generate failed. Check logs: docker-compose -f $COMPOSE_FILE logs backend"
}
echo ""

# Step 8: Check status
echo "📊 Step 8: Checking container status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose -f $COMPOSE_FILE ps
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Update completed!"
echo ""
echo "💡 Next steps:"
echo "   - Check logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "   - Test the application: http://185.231.112.84:8081"
echo ""

