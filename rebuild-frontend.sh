#!/bin/bash

# Script to rebuild frontend with correct HTTPS API URL

echo "🔨 Rebuilding frontend with HTTPS API URL..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "💡 Make sure you have copied server.env to .env"
    exit 1
fi

# Check REACT_APP_API_URL in .env
REACT_APP_API_URL=$(grep "^REACT_APP_API_URL=" .env | cut -d '=' -f2)
echo "📋 Current REACT_APP_API_URL in .env: $REACT_APP_API_URL"

if [[ ! "$REACT_APP_API_URL" == *"https://"* ]]; then
    echo "⚠️  WARNING: REACT_APP_API_URL does not use HTTPS!"
    echo "💡 Update server.env and copy it to .env"
fi

# Rebuild frontend container
echo ""
echo "🔨 Rebuilding frontend container..."
docker-compose build --no-cache frontend

echo ""
echo "✅ Frontend rebuild complete!"
echo "🚀 Starting frontend container..."
docker-compose up -d frontend

echo ""
echo "📝 Check logs:"
echo "   docker-compose logs -f frontend"

