#!/bin/bash

# Script to rebuild admin panel with correct API URL
# This fixes the mixed content error by ensuring HTTPS is used

set -e

echo "🔧 Rebuilding Admin Panel with HTTPS API URL..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from server.env..."
    cp server.env .env
    echo "✅ Created .env file"
    echo ""
fi

# Check if REACT_APP_API_URL is set correctly
if grep -q "REACT_APP_API_URL=https://api.manehaghighi.com/api" .env; then
    echo "✅ REACT_APP_API_URL is correctly set to HTTPS domain"
else
    echo "⚠️  REACT_APP_API_URL might not be set correctly"
    echo "   Expected: REACT_APP_API_URL=https://api.manehaghighi.com/api"
    echo ""
fi

echo "📦 Rebuilding admin panel container..."
docker-compose build --no-cache admin

echo ""
echo "🔄 Restarting admin panel..."
docker-compose up -d admin

echo ""
echo "✅ Admin panel rebuilt and restarted!"
echo ""
echo "🧪 Testing..."
sleep 3
curl -I http://localhost:3001/ || echo "⚠️  Admin panel might not be ready yet"

echo ""
echo "📋 Next steps:"
echo "   1. Clear browser cache"
echo "   2. Visit https://admin.manehaghighi.com/login"
echo "   3. The mixed content error should be fixed"
echo ""

