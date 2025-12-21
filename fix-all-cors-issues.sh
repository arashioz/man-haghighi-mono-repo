#!/bin/bash

# Complete script to fix all CORS issues
# This fixes preflight requests and ensures CORS works for all endpoints

set -e

echo "🔧 Fixing All CORS Issues..."
echo "============================="
echo ""

# Step 1: Check and fix .env file
echo "📋 Step 1: Checking .env file..."
echo ""

if [ ! -f .env ]; then
    echo "   ⚠️  .env file not found. Creating from server.env..."
    cp server.env .env
    echo "   ✅ Created .env file"
else
    echo "   ✅ .env file exists"
fi

# Check CORS_ORIGINS
CORS_ORIGINS=$(grep "^CORS_ORIGINS=" .env | cut -d '=' -f2- || echo "")

if [ -z "$CORS_ORIGINS" ]; then
    echo "   ❌ CORS_ORIGINS not found in .env"
    echo "   🔧 Adding CORS_ORIGINS..."
    echo "CORS_ORIGINS=https://manehaghighi.com,https://www.manehaghighi.com,https://admin.manehaghighi.com,https://api.manehaghighi.com" >> .env
    CORS_ORIGINS=$(grep "^CORS_ORIGINS=" .env | cut -d '=' -f2-)
    echo "   ✅ CORS_ORIGINS added"
else
    echo "   ✅ CORS_ORIGINS found: $CORS_ORIGINS"
    
    # Check if all required origins are included
    REQUIRED_ORIGINS=("manehaghighi.com" "www.manehaghighi.com" "admin.manehaghighi.com")
    MISSING_ORIGINS=()
    
    for origin in "${REQUIRED_ORIGINS[@]}"; do
        if ! echo "$CORS_ORIGINS" | grep -q "$origin"; then
            MISSING_ORIGINS+=("https://$origin")
        fi
    done
    
    if [ ${#MISSING_ORIGINS[@]} -gt 0 ]; then
        echo "   ⚠️  Missing origins: ${MISSING_ORIGINS[*]}"
        echo "   🔧 Updating CORS_ORIGINS..."
        NEW_CORS="$CORS_ORIGINS,${MISSING_ORIGINS[*]}"
        sed -i.bak "s|^CORS_ORIGINS=.*|CORS_ORIGINS=$NEW_CORS|" .env
        echo "   ✅ CORS_ORIGINS updated"
    else
        echo "   ✅ All required origins are included"
    fi
fi

echo ""
echo "📋 Step 2: Checking backend container..."
echo ""

# Check if backend is running
if docker ps | grep -q haghighi_backend; then
    echo "   ✅ Backend container is running"
    BACKEND_RUNNING=true
else
    echo "   ❌ Backend container is NOT running!"
    echo "   🔧 Starting backend..."
    docker-compose up -d backend
    sleep 5
    BACKEND_RUNNING=true
fi

echo ""
echo "📋 Step 3: Rebuilding backend to apply CORS changes..."
echo ""

echo "   🔨 Rebuilding backend container..."
docker-compose build --no-cache backend

echo "   🔄 Restarting backend..."
docker-compose restart backend

echo "   ⏳ Waiting for backend to start..."
sleep 10

echo ""
echo "📋 Step 4: Checking backend CORS configuration..."
echo ""

# Check backend logs
CORS_IN_LOGS=$(docker-compose logs backend 2>&1 | grep -i "CORS origins" | tail -1 || echo "")

if [ -n "$CORS_IN_LOGS" ]; then
    echo "   ✅ Found CORS configuration in logs:"
    echo "   $CORS_IN_LOGS"
    
    # Check if it shows origins
    if echo "$CORS_IN_LOGS" | grep -q "manehaghighi.com"; then
        echo "   ✅ CORS origins are configured correctly"
    else
        echo "   ⚠️  CORS origins might not be configured correctly"
    fi
else
    echo "   ⚠️  Could not find CORS configuration in logs"
    echo "   Checking if backend started successfully..."
    docker-compose logs backend | tail -20
fi

echo ""
echo "📋 Step 5: Testing CORS preflight (OPTIONS) requests..."
echo ""

# Test OPTIONS for different origins
ORIGINS=("https://manehaghighi.com" "https://admin.manehaghighi.com")
ENDPOINTS=("/api/auth/login" "/api/auth/register")

ALL_TESTS_PASSED=true

for origin in "${ORIGINS[@]}"; do
    for endpoint in "${ENDPOINTS[@]}"; do
        echo "   Testing: $origin → $endpoint"
        
        RESPONSE=$(curl -s -w "\n%{http_code}" \
             -H "Origin: $origin" \
             -H "Access-Control-Request-Method: POST" \
             -H "Access-Control-Request-Headers: Content-Type,Authorization" \
             -X OPTIONS \
             "http://localhost:3000$endpoint" \
             2>&1)
        
        HTTP_CODE=$(echo "$RESPONSE" | grep -E "^[0-9]{3}$" | tail -1)
        ACCESS_CONTROL=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" || echo "")
        
        if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
            if [ -n "$ACCESS_CONTROL" ]; then
                if echo "$ACCESS_CONTROL" | grep -qi "$origin"; then
                    echo "      ✅ PASS - Status: $HTTP_CODE, Origin allowed"
                else
                    echo "      ⚠️  WARNING - Status: $HTTP_CODE, but origin not in header"
                    ALL_TESTS_PASSED=false
                fi
            else
                echo "      ❌ FAIL - Status: $HTTP_CODE, but no CORS header!"
                ALL_TESTS_PASSED=false
            fi
        else
            echo "      ❌ FAIL - Status: $HTTP_CODE (expected 204 or 200)"
            ALL_TESTS_PASSED=false
        fi
    done
done

echo ""
echo "============================="
if [ "$ALL_TESTS_PASSED" = true ]; then
    echo "✅ All CORS tests passed!"
else
    echo "⚠️  Some CORS tests failed!"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Check backend logs: docker-compose logs backend | tail -50"
    echo "   2. Verify .env file: cat .env | grep CORS_ORIGINS"
    echo "   3. Test directly: curl -H 'Origin: https://manehaghighi.com' -X OPTIONS http://localhost:3000/api/auth/login -v"
    echo "   4. Check nginx: sudo grep -i 'access-control' /etc/nginx/sites-available/api.manehaghighi.com"
fi

echo ""
echo "📋 Next steps:"
echo "   1. Clear browser cache (Ctrl+Shift+R)"
echo "   2. Test from browser: https://manehaghighi.com/register"
echo "   3. Test admin login: https://admin.manehaghighi.com/login"
echo "   4. Check Network tab in Developer Tools"
echo ""

