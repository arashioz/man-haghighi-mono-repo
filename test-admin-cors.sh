#!/bin/bash

# Script to test CORS for admin login endpoint
# Run this on the server

echo "🧪 Testing CORS for Admin Login..."
echo "==================================="
echo ""

API_URL="${1:-http://localhost:3000/api/auth/login}"
ORIGIN="${2:-https://admin.manehaghighi.com}"

echo "📋 Testing: $API_URL"
echo "📋 Origin: $ORIGIN"
echo ""

# Test 1: OPTIONS request (preflight)
echo "🔍 Test 1: OPTIONS Request (Preflight)"
echo "--------------------------------------"
RESPONSE1=$(curl -s -w "\n%{http_code}" \
     -H "Origin: $ORIGIN" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     "$API_URL" \
     -v 2>&1)

HTTP_CODE1=$(echo "$RESPONSE1" | grep -E "^[0-9]{3}$" | tail -1)
echo "   HTTP Status: $HTTP_CODE1"

ACCESS_CONTROL1=$(echo "$RESPONSE1" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$ACCESS_CONTROL1" ]; then
    echo "   ✅ Access-Control-Allow-Origin:"
    echo "$ACCESS_CONTROL1" | sed 's/^/      /'
else
    echo "   ❌ No Access-Control-Allow-Origin header!"
fi

ALLOW_METHODS=$(echo "$RESPONSE1" | grep -i "access-control-allow-methods" || echo "")
if [ -n "$ALLOW_METHODS" ]; then
    echo "   ✅ Access-Control-Allow-Methods:"
    echo "$ALLOW_METHODS" | sed 's/^/      /'
fi

ALLOW_HEADERS=$(echo "$RESPONSE1" | grep -i "access-control-allow-headers" || echo "")
if [ -n "$ALLOW_HEADERS" ]; then
    echo "   ✅ Access-Control-Allow-Headers:"
    echo "$ALLOW_HEADERS" | sed 's/^/      /'
fi

echo ""
echo "🔍 Test 2: POST Request (Actual Login)"
echo "--------------------------------------"
RESPONSE2=$(curl -s -w "\n%{http_code}" \
     -H "Origin: $ORIGIN" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{"email":"test@test.com","password":"test"}' \
     "$API_URL" \
     -v 2>&1)

HTTP_CODE2=$(echo "$RESPONSE2" | grep -E "^[0-9]{3}$" | tail -1)
echo "   HTTP Status: $HTTP_CODE2"

ACCESS_CONTROL2=$(echo "$RESPONSE2" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$ACCESS_CONTROL2" ]; then
    echo "   ✅ Access-Control-Allow-Origin:"
    echo "$ACCESS_CONTROL2" | sed 's/^/      /'
else
    echo "   ❌ No Access-Control-Allow-Origin header!"
fi

echo ""
echo "==================================="
echo "📊 Summary:"
echo ""

if [ "$HTTP_CODE1" = "204" ] || [ "$HTTP_CODE1" = "200" ]; then
    if [ -n "$ACCESS_CONTROL1" ]; then
        echo "   ✅ Preflight (OPTIONS) is working"
    else
        echo "   ❌ Preflight (OPTIONS) returns but no CORS headers!"
    fi
else
    echo "   ❌ Preflight (OPTIONS) failed with status $HTTP_CODE1"
fi

echo ""
echo "💡 If preflight is failing:"
echo "   1. Check backend is running: docker-compose ps backend"
echo "   2. Check backend logs: docker-compose logs backend | tail -20"
echo "   3. Check CORS_ORIGINS in .env: grep CORS_ORIGINS .env"
echo "   4. Rebuild backend: docker-compose build --no-cache backend"
echo "   5. Restart backend: docker-compose restart backend"
echo ""

