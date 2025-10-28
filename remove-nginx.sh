#!/bin/bash

# Script to completely remove and disable Nginx from server
# Usage: sudo ./remove-nginx.sh

echo "🗑️  Removing Nginx completely from server..."
echo "=============================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root or with sudo"
    echo "Usage: sudo ./remove-nginx.sh"
    exit 1
fi

# Step 1: Stop Nginx service
echo "1️⃣  Stopping Nginx service..."
systemctl stop nginx 2>/dev/null || service nginx stop 2>/dev/null || true
echo "   ✅ Nginx service stopped"
echo ""

# Step 2: Disable Nginx from starting on boot
echo "2️⃣  Disabling Nginx from auto-start..."
systemctl disable nginx 2>/dev/null || true
echo "   ✅ Nginx auto-start disabled"
echo ""

# Step 3: Stop any Docker nginx containers
echo "3️⃣  Stopping Docker nginx containers..."
docker stop $(docker ps -a | grep nginx | awk '{print $1}') 2>/dev/null || true
docker rm $(docker ps -a | grep nginx | awk '{print $1}') 2>/dev/null || true
echo "   ✅ Docker nginx containers stopped and removed"
echo ""

# Step 4: Remove Nginx package
echo "4️⃣  Removing Nginx package..."
apt-get remove --purge nginx nginx-common nginx-full -y 2>/dev/null || \
yum remove nginx -y 2>/dev/null || \
dnf remove nginx -y 2>/dev/null || true
echo "   ✅ Nginx package removed"
echo ""

# Step 5: Remove Nginx configuration files
echo "5️⃣  Removing Nginx configuration files..."
rm -rf /etc/nginx
rm -rf /var/log/nginx
rm -rf /var/lib/nginx
rm -rf /usr/share/nginx
echo "   ✅ Nginx config files removed"
echo ""

# Step 6: Clean up any remaining nginx processes
echo "6️⃣  Killing any remaining nginx processes..."
pkill -9 nginx 2>/dev/null || true
echo "   ✅ All nginx processes killed"
echo ""

# Step 7: Check if port 80 is now free
echo "7️⃣  Checking if port 80 is free..."
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   ⚠️  Port 80 is still in use by:"
    lsof -Pi :80 -sTCP:LISTEN
    echo ""
    echo "   You may need to stop the above process manually"
else
    echo "   ✅ Port 80 is now free"
fi
echo ""

# Step 8: Clean up apt/yum cache
echo "8️⃣  Cleaning up package cache..."
apt-get autoremove -y 2>/dev/null || yum autoremove -y 2>/dev/null || true
apt-get autoclean -y 2>/dev/null || yum clean all 2>/dev/null || true
echo "   ✅ Cache cleaned"
echo ""

# Step 9: Verify removal
echo "9️⃣  Verifying Nginx removal..."
if command -v nginx &> /dev/null; then
    echo "   ⚠️  Warning: nginx command still exists at: $(which nginx)"
    echo "   You may need to manually remove it"
else
    echo "   ✅ Nginx completely removed"
fi
echo ""

# Step 10: Check service status
echo "🔟  Final status check..."
systemctl status nginx 2>/dev/null || echo "   ✅ No nginx service found"
echo ""

echo "=============================================="
echo "✅ Nginx removal complete!"
echo ""
echo "📊 Summary:"
echo "   - Nginx service stopped and disabled"
echo "   - Nginx package removed"
echo "   - Configuration files deleted"
echo "   - Docker nginx containers removed"
echo "   - All nginx processes killed"
echo ""
echo "🔍 Useful commands to verify:"
echo "   nginx -v                    # Should show 'command not found'"
echo "   systemctl status nginx      # Should show 'not found'"
echo "   sudo lsof -i :80            # Should show nothing"
echo "   docker ps | grep nginx      # Should show nothing"
echo ""
echo "💡 Next steps:"
echo "   1. Deploy your app without nginx: ./deploy-no-nginx.sh"
echo "   2. Or use docker-compose directly:"
echo "      docker-compose -f docker-compose-no-nginx.yml up -d"
echo ""

