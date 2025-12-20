#!/bin/bash

# Script to clean Docker space and fix "No space left on device" error

echo "🧹 Cleaning Docker to free up space..."
echo ""

# Check disk space before
echo "📊 Disk space before cleanup:"
df -h / | tail -1

# Stop all containers (optional - comment out if you want to keep them running)
echo ""
echo "🛑 Stopping containers..."
docker-compose down 2>/dev/null || true

# Remove stopped containers
echo "🗑️  Removing stopped containers..."
docker container prune -f

# Remove unused images
echo "🗑️  Removing unused images..."
docker image prune -a -f

# Remove build cache
echo "🗑️  Removing build cache..."
docker builder prune -a -f

# Remove unused volumes (be careful with this!)
echo "🗑️  Removing unused volumes..."
docker volume prune -f

# Full system prune (most aggressive)
echo "🗑️  Full system cleanup..."
docker system prune -a -f --volumes 2>/dev/null || docker system prune -a -f

# Check disk space after
echo ""
echo "📊 Disk space after cleanup:"
df -h / | tail -1

echo ""
echo "✅ Docker cleanup complete!"
echo ""
echo "💡 Now you can rebuild:"
echo "   docker-compose build --no-cache backend"

