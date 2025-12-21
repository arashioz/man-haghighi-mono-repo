#!/bin/bash

# Script to fix CORS configuration issues
# This script ensures CORS_ORIGINS is properly configured and backend is restarted

set -e

echo "🔧 Fixing CORS Configuration..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from server.env..."
    cp server.env .env
    echo "✅ Created .env file"
    echo ""
fi

# Check current CORS_ORIGINS
CURRENT_CORS=$(grep "^CORS_ORIGINS=" .env | cut -d '=' -f2- || echo "")
echo "📋 Current CORS_ORIGINS: $CURRENT_CORS"
echo ""

# Expected CORS origins
EXPECTED_ORIGINS="https://manehaghighi.com,https://www.manehaghighi.com,https://admin.manehaghighi.com,https://api.manehaghighi.com"

# Check if CORS_ORIGINS needs updating
if [ -z "$CURRENT_CORS" ] || [ "$CURRENT_CORS" != "$EXPECTED_ORIGINS" ]; then
    echo "⚠️  CORS_ORIGINS needs to be updated"
    echo "   Current: $CURRENT_CORS"
    echo "   Expected: $EXPECTED_ORIGINS"
    echo ""
    
    # Update CORS_ORIGINS in .env
    if grep -q "^CORS_ORIGINS=" .env; then
        # Update existing line
        sed -i.bak "s|^CORS_ORIGINS=.*|CORS_ORIGINS=$EXPECTED_ORIGINS|" .env
        echo "✅ Updated CORS_ORIGINS in .env"
    else
        # Add new line
        echo "CORS_ORIGINS=$EXPECTED_ORIGINS" >> .env
        echo "✅ Added CORS_ORIGINS to .env"
    fi
else
    echo "✅ CORS_ORIGINS is correctly configured"
fi

echo ""
echo "🔄 Restarting backend container to apply changes..."
docker-compose restart backend

echo ""
echo "⏳ Waiting for backend to start..."
sleep 5

echo ""
echo "📋 Checking backend logs for CORS configuration..."
docker-compose logs backend 2>&1 | grep -i "CORS origins" | tail -1 || echo "⚠️  Could not find CORS origins in logs"

echo ""
echo "🧪 Testing CORS with curl..."
echo ""

# Test CORS for admin.manehaghighi.com
echo "Testing CORS for https://admin.manehaghighi.com:"
curl -s -o /dev/null -w "Status: %{http_code}\n" \
     -H "Origin: https://admin.manehaghighi.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     http://localhost:3000/api/health || echo "⚠️  CORS test failed"

echo ""
echo "Testing CORS for https://manehaghighi.com:"
curl -s -o /dev/null -w "Status: %{http_code}\n" \
     -H "Origin: https://manehaghighi.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     http://localhost:3000/api/health || echo "⚠️  CORS test failed"

echo ""
echo "✅ CORS configuration fix completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   2. Check browser console for CORS errors"
echo "   3. Verify requests are going to: https://api.manehaghighi.com/api"
echo ""
echo "📊 To check backend logs:"
echo "   docker-compose logs -f backend"
echo ""

