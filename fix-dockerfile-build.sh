#!/bin/bash

# Script to fix Docker build cache issues

echo "🔍 Checking for merge conflicts in Dockerfiles..."

# Check all Dockerfiles for merge conflicts
CONFLICTS=$(grep -l "^<<<<<<< HEAD\|^=======\|^>>>>>>>" backend/Dockerfile admin-panel/Dockerfile frontend/Dockerfile 2>/dev/null)

if [ -n "$CONFLICTS" ]; then
    echo "❌ Found merge conflicts in:"
    echo "$CONFLICTS"
    echo ""
    echo "Please resolve merge conflicts first!"
    exit 1
fi

echo "✅ No merge conflicts found in Dockerfiles"
echo ""

# Clear Docker build cache
echo "🧹 Clearing Docker build cache..."
docker builder prune -a -f

# Clear any cached build stages
echo "🧹 Clearing build cache for backend..."
docker build --no-cache -t temp-backend-test -f backend/Dockerfile backend/ 2>&1 | head -20 || echo "Build test failed (expected)"

# Remove temp image
docker rmi temp-backend-test 2>/dev/null || true

echo ""
echo "✅ Cache cleared!"
echo ""
echo "🚀 Now try building again:"
echo "   docker-compose build --no-cache backend"

