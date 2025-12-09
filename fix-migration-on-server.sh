#!/bin/bash

# Script to fix migration issue on server
# Run this on the server after deploying the updated code

set -e

echo "🔧 Fixing migration issue on server..."

# Step 1: Stop the backend container to prevent restart loop
echo "Step 1: Stopping backend container..."
docker stop haghighi_backend || true

# Step 2: Remove old migration folder from container (if it exists in a running container)
echo "Step 2: Removing old migration folder..."
docker start haghighi_backend 2>/dev/null || true
sleep 2
docker exec haghighi_backend rm -rf /app/prisma/migrations/20250101000000_add_podcast_thumbnail 2>/dev/null || true
docker stop haghighi_backend 2>/dev/null || true

# Step 3: Clean up failed migration records from database
echo "Step 3: Cleaning up failed migration records from database..."
docker exec haghighi_postgres psql -U haghighi_user -d haghighi_db -c "DELETE FROM _prisma_migrations WHERE migration_name = '20250101000000_add_podcast_thumbnail';" 2>&1 || {
    echo "⚠️  Could not connect to database. Make sure postgres container is running."
}

# Step 4: Rebuild the backend image with updated migrations
echo "Step 4: Rebuilding backend image..."
docker-compose -f docker-compose-alt-ports.yml build backend

# Step 5: Start the backend container
echo "Step 5: Starting backend container..."
docker-compose -f docker-compose-alt-ports.yml up -d backend

# Step 6: Wait a bit and check logs
echo "Step 6: Checking migration status..."
sleep 5
docker logs haghighi_backend --tail 30

echo ""
echo "✅ Fix completed!"
echo ""
echo "⚠️  IMPORTANT: After verifying everything works, change restart policy back to 'unless-stopped' in docker-compose-alt-ports.yml"



