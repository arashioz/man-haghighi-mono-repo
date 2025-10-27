#!/bin/bash

echo "🧹 Cleaning up all Docker resources..."
echo "=================================="

# Stop all running containers
echo "🛑 Stopping all containers..."
docker stop $(docker ps -aq) 2>/dev/null || echo "No containers to stop"

# Remove all containers
echo "🗑️  Removing all containers..."
docker rm -f $(docker ps -aq) 2>/dev/null || echo "No containers to remove"

# Remove all images
echo "🖼️  Removing all images..."
docker rmi -f $(docker images -q) 2>/dev/null || echo "No images to remove"

# Remove project-specific volumes first
echo "💾 Removing project volumes..."
docker volume rm postgres_data_prod 2>/dev/null || true
docker volume rm new-haghighi_postgres_data_prod 2>/dev/null || true

# Remove all volumes
echo "💾 Removing all remaining volumes..."
docker volume rm $(docker volume ls -q) 2>/dev/null || echo "No volumes to remove"

# Remove all networks (except default ones)
echo "🌐 Removing all custom networks..."
docker network rm $(docker network ls -q) 2>/dev/null || echo "No custom networks to remove"

# Prune everything
echo "🔥 Running Docker system prune..."
docker system prune -a -f --volumes 2>/dev/null || echo "System prune completed"

# Clean up build cache
echo "🧽 Cleaning build cache..."
docker builder prune -a -f 2>/dev/null || echo "Build cache cleaned"

echo ""
echo "✅ Docker cleanup completed!"
echo "=================================="

exit 0

