#!/bin/bash

echo "🧹 Cleaning Docker resources..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Stop all containers
echo "Stopping containers..."
docker stop $(docker ps -aq) 2>/dev/null || echo "No containers to stop"

# Remove all containers
echo "Removing containers..."
docker rm $(docker ps -aq) 2>/dev/null || echo "No containers to remove"

# Remove all images
echo "Removing images..."
docker rmi $(docker images -q) 2>/dev/null || echo "No images to remove"

# Prune system (removes all unused data)
echo "Pruning Docker system..."
docker system prune -a --volumes -f

# Clean build cache
echo "Cleaning build cache..."
docker builder prune -a -f

echo ""
echo "✅ Docker cleanup complete!"
echo ""
echo "Current Docker disk usage:"
docker system df
