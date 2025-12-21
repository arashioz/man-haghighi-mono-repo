#!/bin/bash

# Complete script to fix all CORS duplicate headers issues
# This checks both nginx and backend

set -e

echo "🔧 Fixing All CORS Duplicate Headers Issues..."
echo "=============================================="
echo ""

# Check if running as root for nginx operations
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Some operations require root. Running what we can..."
    SUDO=""
else
    SUDO=""
fi

# 1. Check nginx config on server
echo "📋 Step 1: Checking nginx configuration..."
echo ""

NGINX_API_CONFIG="/etc/nginx/sites-available/api.manehaghighi.com"
NGINX_ENABLED="/etc/nginx/sites-enabled/api.manehaghighi.com"

if [ -f "$NGINX_API_CONFIG" ] || [ -f "$NGINX_ENABLED" ]; then
    CONFIG_FILE="$([ -f "$NGINX_API_CONFIG" ] && echo "$NGINX_API_CONFIG" || echo "$NGINX_ENABLED")"
    echo "   Found nginx config: $CONFIG_FILE"
    
    if grep -q "Access-Control-Allow-Origin" "$CONFIG_FILE" 2>/dev/null; then
        echo "   ⚠️  Found CORS headers in nginx config!"
        echo "   📝 Creating backup..."
        $SUDO cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        
        echo "   🔧 Removing CORS headers from nginx..."
        $SUDO sed -i '/Access-Control-Allow-Origin/d' "$CONFIG_FILE"
        $SUDO sed -i '/Access-Control-Allow-Methods/d' "$CONFIG_FILE"
        $SUDO sed -i '/Access-Control-Allow-Headers/d' "$CONFIG_FILE"
        $SUDO sed -i '/if ($request_method = OPTIONS)/,/return 204;/d' "$CONFIG_FILE"
        
        echo "   ✅ CORS headers removed from nginx"
        
        if [ -n "$SUDO" ]; then
            echo "   🧪 Testing nginx configuration..."
            if $SUDO nginx -t 2>/dev/null; then
                echo "   ✅ Nginx config is valid"
                echo "   🔄 Reloading nginx..."
                $SUDO systemctl reload nginx
                echo "   ✅ Nginx reloaded"
            else
                echo "   ❌ Nginx config test failed! Restoring backup..."
                $SUDO cp "${CONFIG_FILE}.backup."* "$CONFIG_FILE" 2>/dev/null || true
            fi
        fi
    else
        echo "   ✅ No CORS headers found in nginx config"
    fi
else
    echo "   ⚠️  Nginx config not found (may be in different location)"
    echo "   💡 Please manually check: /etc/nginx/sites-available/ or /etc/nginx/conf.d/"
fi

echo ""
echo "📋 Step 2: Checking backend code..."
echo ""

# Check if we're in the project directory
if [ ! -f "backend/src/main.ts" ]; then
    echo "   ⚠️  Not in project root. Skipping backend check."
else
    # Check for any remaining CORS headers with * in backend
    if grep -r "Access-Control-Allow-Origin.*\*" backend/src/ 2>/dev/null | grep -v ".backup" | grep -v "node_modules"; then
        echo "   ⚠️  Found CORS headers with * in backend code!"
        echo "   Please check and remove them manually"
    else
        echo "   ✅ No CORS headers with * found in backend code"
    fi
fi

echo ""
echo "📋 Step 3: Rebuilding and restarting backend..."
echo ""

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    echo "   🔨 Rebuilding backend container..."
    docker-compose build --no-cache backend
    
    echo "   🔄 Restarting backend..."
    docker-compose restart backend
    
    echo "   ⏳ Waiting for backend to start..."
    sleep 5
    
    echo "   📊 Checking backend logs..."
    docker-compose logs backend 2>&1 | grep -i "CORS origins" | tail -1 || echo "   ⚠️  Could not find CORS origins in logs"
else
    echo "   ⚠️  docker-compose not found. Please rebuild manually:"
    echo "      docker-compose build --no-cache backend"
    echo "      docker-compose restart backend"
fi

echo ""
echo "📋 Step 4: Testing CORS..."
echo ""

# Test CORS
echo "   Testing CORS for https://manehaghighi.com..."
RESPONSE=$(curl -s -H "Origin: https://manehaghighi.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     http://localhost:3000/api/health \
     -v 2>&1)

ACCESS_CONTROL_COUNT=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" | wc -l)

if [ "$ACCESS_CONTROL_COUNT" -eq 1 ]; then
    echo "   ✅ Only one Access-Control-Allow-Origin header found"
elif [ "$ACCESS_CONTROL_COUNT" -gt 1 ]; then
    echo "   ❌ Multiple Access-Control-Allow-Origin headers found!"
    echo "   Headers:"
    echo "$RESPONSE" | grep -i "access-control-allow-origin"
else
    echo "   ⚠️  No Access-Control-Allow-Origin header found"
fi

echo ""
echo "=============================================="
echo "✅ CORS fix completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Clear browser cache (Ctrl+Shift+R)"
echo "   2. Test from browser: https://manehaghighi.com"
echo "   3. Check Network tab in Developer Tools"
echo "   4. Verify only one Access-Control-Allow-Origin header"
echo ""
echo "🔍 To check nginx config manually:"
echo "   sudo grep -i 'access-control' /etc/nginx/sites-available/api.manehaghighi.com"
echo ""
echo "🔍 To check backend logs:"
echo "   docker-compose logs -f backend"
echo ""

