#!/bin/bash

# Complete CORS Fix Script
# This script fixes all CORS issues including preflight requests

set -e

echo "🔧 Complete CORS Fix"
echo "==================="
echo ""

# Step 1: Ensure .env exists and has CORS_ORIGINS
echo "📋 Step 1: Checking .env file..."
echo ""

if [ ! -f .env ]; then
    echo "   ⚠️  .env not found. Creating from server.env..."
    cp server.env .env
    echo "   ✅ Created .env"
fi

# Ensure CORS_ORIGINS is set correctly
REQUIRED_CORS="https://manehaghighi.com,https://www.manehaghighi.com,https://admin.manehaghighi.com,https://api.manehaghighi.com"

if grep -q "^CORS_ORIGINS=" .env; then
    CURRENT_CORS=$(grep "^CORS_ORIGINS=" .env | cut -d '=' -f2-)
    echo "   Current CORS_ORIGINS: $CURRENT_CORS"
    
    # Check if all required origins are present
    if echo "$CURRENT_CORS" | grep -q "admin.manehaghighi.com" && \
       echo "$CURRENT_CORS" | grep -q "manehaghighi.com"; then
        echo "   ✅ CORS_ORIGINS is correctly configured"
    else
        echo "   ⚠️  CORS_ORIGINS missing some origins. Updating..."
        sed -i.bak "s|^CORS_ORIGINS=.*|CORS_ORIGINS=$REQUIRED_CORS|" .env
        echo "   ✅ CORS_ORIGINS updated"
    fi
else
    echo "   ⚠️  CORS_ORIGINS not found. Adding..."
    echo "CORS_ORIGINS=$REQUIRED_CORS" >> .env
    echo "   ✅ CORS_ORIGINS added"
fi

echo ""
echo "📋 Step 2: Rebuilding backend..."
echo ""

echo "   🔨 Building backend (this may take a few minutes)..."
docker-compose build --no-cache backend

echo ""
echo "   🔄 Restarting backend..."
docker-compose restart backend

echo ""
echo "   ⏳ Waiting for backend to start..."
sleep 10

echo ""
echo "📋 Step 3: Verifying backend CORS configuration..."
echo ""

# Check backend logs
echo "   Checking backend logs..."
CORS_LOG=$(docker-compose logs backend 2>&1 | grep -i "CORS" | tail -5 || echo "")

if [ -n "$CORS_LOG" ]; then
    echo "   Backend CORS logs:"
    echo "$CORS_LOG" | sed 's/^/      /'
    
    if echo "$CORS_LOG" | grep -qi "CORS enabled\|CORS origins"; then
        echo "   ✅ CORS is configured in backend"
    else
        echo "   ⚠️  Could not confirm CORS configuration"
    fi
else
    echo "   ⚠️  No CORS logs found. Checking if backend started..."
    docker-compose logs backend | tail -10
fi

echo ""
echo "📋 Step 4: Testing CORS preflight requests..."
echo ""

# Test OPTIONS for login
echo "   Testing OPTIONS for /api/auth/login..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
     -H "Origin: https://admin.manehaghighi.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     "http://localhost:3000/api/auth/login" \
     2>&1)

HTTP_CODE=$(echo "$RESPONSE" | grep -E "^[0-9]{3}$" | tail -1)
ACCESS_CONTROL=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" || echo "")

echo "   HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    if [ -n "$ACCESS_CONTROL" ]; then
        echo "   ✅ Preflight request successful!"
        echo "   CORS Header: $ACCESS_CONTROL"
    else
        echo "   ❌ Preflight returns $HTTP_CODE but no CORS header!"
        echo "   This indicates CORS is not properly configured"
    fi
else
    echo "   ❌ Preflight request failed with status $HTTP_CODE"
    echo "   Full response:"
    echo "$RESPONSE" | head -20
fi

echo ""
echo "📋 Step 5: Checking nginx configuration..."
echo ""

if command -v nginx &> /dev/null && [ "$EUID" -eq 0 ]; then
    NGINX_CORS=$(grep -i "access-control" /etc/nginx/sites-available/api.manehaghighi.com 2>/dev/null || echo "")
    
    if [ -n "$NGINX_CORS" ]; then
        echo "   ⚠️  Found CORS headers in nginx config!"
        echo "   This should be removed. Run:"
        echo "      sudo ./find-cors-headers-on-server.sh"
    else
        echo "   ✅ No CORS headers in nginx config (correct)"
    fi
else
    echo "   ⚠️  Cannot check nginx (need root or nginx not installed)"
fi

echo ""
echo "==================="
echo "✅ CORS fix completed!"
echo ""
echo "📋 Summary:"
echo "   - .env file: $(test -f .env && echo '✅ Exists' || echo '❌ Missing')"
echo "   - CORS_ORIGINS: $(grep "^CORS_ORIGINS=" .env | cut -d '=' -f2- | head -c 60)..."
echo "   - Backend status: $(docker ps | grep -q haghighi_backend && echo '✅ Running' || echo '❌ Not running')"
echo "   - Preflight test: $(if [ "$HTTP_CODE" = "204" ] && [ -n "$ACCESS_CONTROL" ]; then echo '✅ Passed'; else echo '❌ Failed'; fi)"
echo ""
echo "💡 Next steps:"
echo "   1. Clear browser cache (Ctrl+Shift+R)"
echo "   2. Test register: https://manehaghighi.com/register"
echo "   3. Test admin login: https://admin.manehaghighi.com/login"
echo "   4. If still having issues, check:"
echo "      - docker-compose logs backend | grep CORS"
echo "      - sudo ./find-cors-headers-on-server.sh"
echo ""

