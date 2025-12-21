#!/bin/bash

# Script to test CORS headers and find duplicate issues

echo "🧪 Testing CORS Headers..."
echo "=========================="
echo ""

# Test URL
API_URL="${1:-https://api.manehaghighi.com/api/courses/homepage}"
ORIGIN="${2:-https://manehaghighi.com}"

echo "📋 Testing: $API_URL"
echo "📋 Origin: $ORIGIN"
echo ""

# Test OPTIONS request (preflight)
echo "🔍 Testing OPTIONS request (preflight):"
echo "--------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" \
     -H "Origin: $ORIGIN" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     "$API_URL" \
     -v 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | grep -E "^[0-9]{3}$" | tail -1)
ACCESS_CONTROL_HEADERS=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" | tr -d '\r')

echo ""
echo "📊 Results:"
echo "   HTTP Status: $HTTP_CODE"
echo ""

# Count Access-Control-Allow-Origin headers
HEADER_COUNT=$(echo "$ACCESS_CONTROL_HEADERS" | grep -c "access-control-allow-origin" || echo "0")

if [ "$HEADER_COUNT" -eq 0 ]; then
    echo "   ❌ No Access-Control-Allow-Origin header found!"
elif [ "$HEADER_COUNT" -eq 1 ]; then
    echo "   ✅ Only one Access-Control-Allow-Origin header found:"
    echo "$ACCESS_CONTROL_HEADERS" | sed 's/^/      /'
    
    # Check if it's wildcard
    if echo "$ACCESS_CONTROL_HEADERS" | grep -qi "\*"; then
        echo "   ⚠️  WARNING: Header contains wildcard (*)"
    fi
else
    echo "   ❌ Multiple Access-Control-Allow-Origin headers found ($HEADER_COUNT):"
    echo "$ACCESS_CONTROL_HEADERS" | sed 's/^/      /'
    echo ""
    echo "   🔴 This is the problem! Duplicate headers detected."
fi

echo ""
echo "🔍 Full response headers:"
echo "--------------------------------------"
echo "$RESPONSE" | grep -i "< " | head -20

echo ""
echo "📋 All CORS-related headers:"
echo "--------------------------------------"
echo "$RESPONSE" | grep -i "access-control" | sed 's/^/   /'

echo ""
echo "💡 To fix:"
echo "   1. Check nginx config: sudo grep -i 'access-control' /etc/nginx/sites-available/api.manehaghighi.com"
echo "   2. Remove CORS headers from nginx"
echo "   3. Reload nginx: sudo systemctl reload nginx"
echo "   4. Rebuild backend: docker-compose build --no-cache backend"
echo "   5. Restart backend: docker-compose restart backend"
echo ""

