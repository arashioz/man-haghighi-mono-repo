#!/bin/bash

# Script to run seed with migration on the server (outside Docker container)
# This script runs the seed inside the Docker container

CONTAINER_NAME="haghighi_backend"

echo "🐳 Checking if Docker container '$CONTAINER_NAME' is running..."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Error: Docker container '$CONTAINER_NAME' is not running."
  echo "   Please start the container first:"
  echo "   docker-compose up -d backend"
  exit 1
fi

echo "✅ Container found. Running seed with migration inside container..."
echo ""

docker exec $CONTAINER_NAME sh -c "
  echo '🔄 Running migrations before seed...'
  npx prisma migrate deploy || {
    echo '⚠️  Migration deploy failed, trying db push as fallback...'
    npx prisma db push --accept-data-loss || true
  }
  
  echo '🔄 Regenerating Prisma Client...'
  npx prisma generate
  
  echo '🌱 Running seed...'
  npm run prisma:seed
"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Seed completed successfully!"
else
  echo ""
  echo "❌ Seed failed with exit code: $EXIT_CODE"
  exit $EXIT_CODE
fi

