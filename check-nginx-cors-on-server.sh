#!/bin/bash

# Script to check and fix nginx CORS headers on the server
# Run this ON THE SERVER

set -e

echo "🔍 Checking nginx CORS Configuration on Server..."
echo "================================================="
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Find nginx config files
echo "📋 Step 1: Finding nginx configuration files..."
echo ""

NGINX_CONFIGS=(
    "/etc/nginx/sites-available/api.manehaghighi.com"
    "/etc/nginx/sites-enabled/api.manehaghighi.com"
    "/etc/nginx/conf.d/api.manehaghighi.com.conf"
)

FOUND_CONFIG=""

for config in "${NGINX_CONFIGS[@]}"; do
    if [ -f "$config" ]; then
        echo "   ✅ Found: $config"
        FOUND_CONFIG="$config"
        break
    fi
done

if [ -z "$FOUND_CONFIG" ]; then
    echo "   ⚠️  Standard config files not found. Searching..."
    FOUND_CONFIG=$(find /etc/nginx -name "*api*" -type f 2>/dev/null | head -1)
    if [ -n "$FOUND_CONFIG" ]; then
        echo "   ✅ Found: $FOUND_CONFIG"
    else
        echo "   ❌ Could not find nginx API config"
        echo "   Please check manually:"
        echo "      sudo find /etc/nginx -name '*.conf' -exec grep -l 'api.manehaghighi.com' {} \\;"
        exit 1
    fi
fi

echo ""
echo "📋 Step 2: Checking for CORS headers in $FOUND_CONFIG"
echo ""

# Check for CORS headers
CORS_FOUND=$(grep -i "access-control" "$FOUND_CONFIG" || echo "")

if [ -z "$CORS_FOUND" ]; then
    echo "   ✅ No CORS headers found in nginx config"
    echo "   This is correct - CORS should be handled by backend only"
else
    echo "   ❌ Found CORS headers in nginx config:"
    echo "$CORS_FOUND" | sed 's/^/      /'
    echo ""
    echo "   🔧 Fixing..."
    
    # Backup
    BACKUP="${FOUND_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$FOUND_CONFIG" "$BACKUP"
    echo "   💾 Backup created: $BACKUP"
    
    # Remove CORS headers
    sed -i '/Access-Control-Allow-Origin/d' "$FOUND_CONFIG"
    sed -i '/Access-Control-Allow-Methods/d' "$FOUND_CONFIG"
    sed -i '/Access-Control-Allow-Headers/d' "$FOUND_CONFIG"
    sed -i '/Access-Control-Allow-Credentials/d' "$FOUND_CONFIG"
    sed -i '/if ($request_method = OPTIONS)/,/return 204;/d' "$FOUND_CONFIG"
    
    # Add comment
    if ! grep -q "CORS headers are handled by the backend" "$FOUND_CONFIG"; then
        sed -i '/proxy_connect_timeout/a\
        \
        # CORS headers are handled by the backend (NestJS)\
        # Do not add CORS headers here to avoid duplicate headers' "$FOUND_CONFIG"
    fi
    
    echo "   ✅ CORS headers removed"
fi

echo ""
echo "📋 Step 3: Testing nginx configuration..."
echo ""

if nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Nginx configuration is valid"
    echo ""
    echo "   🔄 Reloading nginx..."
    systemctl reload nginx
    echo "   ✅ Nginx reloaded"
else
    echo "   ❌ Nginx configuration test failed!"
    echo "   Restoring backup..."
    if [ -n "$BACKUP" ] && [ -f "$BACKUP" ]; then
        cp "$BACKUP" "$FOUND_CONFIG"
        echo "   ✅ Backup restored"
    fi
    echo "   Please check the configuration manually:"
    echo "      sudo nginx -t"
    exit 1
fi

echo ""
echo "📋 Step 4: Checking main nginx.conf for global CORS..."
echo ""

MAIN_NGINX="/etc/nginx/nginx.conf"
if [ -f "$MAIN_NGINX" ]; then
    MAIN_CORS=$(grep -i "access-control" "$MAIN_NGINX" || echo "")
    if [ -n "$MAIN_CORS" ]; then
        echo "   ⚠️  Found CORS headers in main nginx.conf:"
        echo "$MAIN_CORS" | sed 's/^/      /'
        echo "   💡 You may need to remove these as well"
    else
        echo "   ✅ No CORS headers in main nginx.conf"
    fi
fi

echo ""
echo "================================================="
echo "✅ Nginx CORS check completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Rebuild backend: docker-compose build --no-cache backend"
echo "   2. Restart backend: docker-compose restart backend"
echo "   3. Test CORS: ./test-cors.sh"
echo ""

