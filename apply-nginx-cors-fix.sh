#!/bin/bash

# Script to apply nginx CORS fix on the server
# This removes duplicate CORS headers from nginx config

set -e

echo "🔧 Applying nginx CORS fix..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Check if nginx config exists
NGINX_API_CONFIG="/etc/nginx/sites-available/api.manehaghighi.com"

if [ ! -f "$NGINX_API_CONFIG" ]; then
    echo "⚠️  Nginx config not found at $NGINX_API_CONFIG"
    echo "   Looking for alternative locations..."
    
    # Try to find the config
    ALTERNATIVE=$(find /etc/nginx -name "*api*" -type f 2>/dev/null | head -1)
    if [ -n "$ALTERNATIVE" ]; then
        echo "   Found: $ALTERNATIVE"
        NGINX_API_CONFIG="$ALTERNATIVE"
    else
        echo "❌ Could not find nginx API config"
        echo "   Please manually update the nginx config file"
        exit 1
    fi
fi

echo "📋 Found nginx config: $NGINX_API_CONFIG"
echo ""

# Backup the config
BACKUP_FILE="${NGINX_API_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
echo "💾 Creating backup: $BACKUP_FILE"
cp "$NGINX_API_CONFIG" "$BACKUP_FILE"
echo "✅ Backup created"
echo ""

# Check if CORS headers exist
if grep -q "Access-Control-Allow-Origin" "$NGINX_API_CONFIG"; then
    echo "⚠️  Found CORS headers in nginx config"
    echo "   Removing duplicate CORS headers..."
    
    # Remove CORS headers and OPTIONS handling
    sed -i '/# CORS headers (if needed)/,/if ($request_method = OPTIONS)/d' "$NGINX_API_CONFIG"
    
    # Add comment instead
    sed -i '/proxy_connect_timeout 75s;/a\
        \
        # CORS headers are handled by the backend (NestJS)\
        # Do not add CORS headers here to avoid duplicate headers' "$NGINX_API_CONFIG"
    
    echo "✅ CORS headers removed from nginx config"
else
    echo "✅ No CORS headers found in nginx config (already fixed)"
fi

echo ""
echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
    echo ""
    echo "🔄 Reloading nginx..."
    systemctl reload nginx
    echo "✅ Nginx reloaded"
else
    echo "❌ Nginx configuration test failed!"
    echo "   Restoring backup..."
    cp "$BACKUP_FILE" "$NGINX_API_CONFIG"
    echo "   Backup restored. Please check the configuration manually."
    exit 1
fi

echo ""
echo "✅ Nginx CORS fix applied successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Restart backend container: docker-compose restart backend"
echo "   2. Clear browser cache (Ctrl+Shift+R)"
echo "   3. Test the API from browser"
echo ""
echo "🧪 To test CORS:"
echo "   curl -H 'Origin: https://manehaghighi.com' \\"
echo "        -H 'Access-Control-Request-Method: GET' \\"
echo "        -X OPTIONS \\"
echo "        https://api.manehaghighi.com/api/health -v"
echo ""

