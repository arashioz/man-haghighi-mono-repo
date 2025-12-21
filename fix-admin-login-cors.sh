#!/bin/bash

# Script to fix CORS issue for admin login
# Run this on the server

set -e

echo "🔧 Fixing CORS for Admin Login..."
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from server.env..."
    cp server.env .env
    echo "✅ Created .env file"
    echo ""
fi

# Check CORS_ORIGINS
echo "📋 Step 1: Checking CORS_ORIGINS configuration..."
echo ""

CORS_ORIGINS=$(grep "^CORS_ORIGINS=" .env | cut -d '=' -f2- || echo "")

if [ -z "$CORS_ORIGINS" ]; then
    echo "   ❌ CORS_ORIGINS not found in .env"
    echo "   🔧 Adding CORS_ORIGINS..."
    echo "CORS_ORIGINS=https://manehaghighi.com,https://www.manehaghighi.com,https://admin.manehaghighi.com,https://api.manehaghighi.com" >> .env
    echo "   ✅ CORS_ORIGINS added"
else
    echo "   ✅ CORS_ORIGINS found: $CORS_ORIGINS"
    
    # Check if admin.manehaghighi.com is included
    if echo "$CORS_ORIGINS" | grep -q "admin.manehaghighi.com"; then
        echo "   ✅ admin.manehaghighi.com is included"
    else
        echo "   ⚠️  admin.manehaghighi.com is NOT included!"
        echo "   🔧 Adding admin.manehaghighi.com..."
        NEW_CORS="$CORS_ORIGINS,https://admin.manehaghighi.com"
        sed -i.bak "s|^CORS_ORIGINS=.*|CORS_ORIGINS=$NEW_CORS|" .env
        echo "   ✅ Updated CORS_ORIGINS"
    fi
fi

echo ""
echo "📋 Step 2: Checking backend container..."
echo ""

# Check if backend is running
if docker ps | grep -q haghighi_backend; then
    echo "   ✅ Backend container is running"
else
    echo "   ❌ Backend container is NOT running!"
    echo "   🔧 Starting backend..."
    docker-compose up -d backend
    sleep 5
fi

echo ""
echo "📋 Step 3: Checking backend logs for CORS configuration..."
echo ""

CORS_IN_LOGS=$(docker-compose logs backend 2>&1 | grep -i "CORS origins" | tail -1 || echo "")

if [ -n "$CORS_IN_LOGS" ]; then
    echo "   ✅ Found CORS configuration in logs:"
    echo "   $CORS_IN_LOGS"
    
    # Check if admin.manehaghighi.com is in the logs
    if echo "$CORS_IN_LOGS" | grep -q "admin.manehaghighi.com"; then
        echo "   ✅ admin.manehaghighi.com is configured in backend"
    else
        echo "   ⚠️  admin.manehaghighi.com is NOT in backend CORS configuration!"
        echo "   🔧 Rebuilding backend..."
        docker-compose build --no-cache backend
        docker-compose restart backend
        sleep 5
    fi
else
    echo "   ⚠️  Could not find CORS configuration in logs"
    echo "   🔧 Rebuilding backend to ensure CORS is configured..."
    docker-compose build --no-cache backend
    docker-compose restart backend
    sleep 5
fi

echo ""
echo "📋 Step 4: Testing CORS for admin.manehaghighi.com..."
echo ""

# Test OPTIONS request
echo "   Testing OPTIONS request (preflight)..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
     -H "Origin: https://admin.manehaghighi.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     http://localhost:3000/api/auth/login \
     2>&1)

HTTP_CODE=$(echo "$RESPONSE" | grep -E "^[0-9]{3}$" | tail -1)
ACCESS_CONTROL=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" || echo "")

echo "   HTTP Status: $HTTP_CODE"

if [ -n "$ACCESS_CONTROL" ]; then
    echo "   ✅ Access-Control-Allow-Origin header found:"
    echo "$ACCESS_CONTROL" | sed 's/^/      /'
    
    if echo "$ACCESS_CONTROL" | grep -qi "admin.manehaghighi.com"; then
        echo "   ✅ admin.manehaghighi.com is allowed!"
    else
        echo "   ⚠️  admin.manehaghighi.com is NOT in the header"
    fi
else
    echo "   ❌ No Access-Control-Allow-Origin header found!"
    echo "   This is the problem!"
fi

echo ""
echo "📋 Step 5: Checking nginx configuration..."
echo ""

# Check nginx for CORS headers
if command -v nginx &> /dev/null; then
    NGINX_CORS=$(sudo grep -i "access-control" /etc/nginx/sites-available/api.manehaghighi.com 2>/dev/null || echo "")
    
    if [ -n "$NGINX_CORS" ]; then
        echo "   ⚠️  Found CORS headers in nginx config!"
        echo "   This might be causing issues"
        echo "   Run: sudo ./check-nginx-cors-on-server.sh"
    else
        echo "   ✅ No CORS headers in nginx config (correct)"
    fi
else
    echo "   ⚠️  nginx not found or not accessible"
fi

echo ""
echo "=================================="
echo "✅ CORS fix check completed!"
echo ""
echo "📋 Summary:"
echo "   - CORS_ORIGINS in .env: $(grep "^CORS_ORIGINS=" .env | cut -d '=' -f2- | head -c 50)..."
echo "   - Backend running: $(docker ps | grep -q haghighi_backend && echo 'Yes' || echo 'No')"
echo ""
echo "💡 Next steps if still having issues:"
echo "   1. Rebuild backend: docker-compose build --no-cache backend"
echo "   2. Restart backend: docker-compose restart backend"
echo "   3. Check logs: docker-compose logs backend | grep CORS"
echo "   4. Test from browser: https://admin.manehaghighi.com/login"
echo "   5. Clear browser cache (Ctrl+Shift+R)"
echo ""

