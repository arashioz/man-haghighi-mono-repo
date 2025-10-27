#!/bin/bash

echo "🔧 Fixing PostgreSQL version conflict..."
echo "========================================="
echo ""

# Stop all services
echo "1️⃣ Stopping all services..."
docker-compose -f docker-compose.prod.yml down

# Remove specifically the postgres volume
echo "2️⃣ Removing PostgreSQL volume..."
docker volume rm postgres_data_prod 2>/dev/null || true
docker volume rm new-haghighi_postgres_data_prod 2>/dev/null || true

# List and remove any volumes with postgres in name
echo "3️⃣ Removing all PostgreSQL-related volumes..."
docker volume ls -q | grep postgres | xargs docker volume rm 2>/dev/null || true

# Remove all volumes to be safe
echo "4️⃣ Removing all project volumes..."
docker volume prune -f

echo ""
echo "✅ PostgreSQL volumes cleaned!"
echo ""
echo "Now run: ./simple-deploy.sh"
echo ""

