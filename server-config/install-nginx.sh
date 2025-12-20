#!/bin/bash

# Script to install and configure Nginx for Haghighi Platform
# Run this script on your Ubuntu server

set -e

echo "🚀 Starting Nginx installation and configuration..."

# Update system
echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install nginx -y

# Enable and start Nginx
echo "🔄 Enabling and starting Nginx..."
sudo systemctl enable nginx
sudo systemctl start nginx

# Check Nginx status
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx failed to start"
    exit 1
fi

# Copy configuration files
echo "📝 Copying Nginx configuration files..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

sudo cp "$SCRIPT_DIR/nginx/frontend.conf" /etc/nginx/sites-available/frontend.conf
sudo cp "$SCRIPT_DIR/nginx/admin.conf" /etc/nginx/sites-available/admin.conf
sudo cp "$SCRIPT_DIR/nginx/api.conf" /etc/nginx/sites-available/api.conf
sudo cp "$SCRIPT_DIR/nginx/mail.conf" /etc/nginx/sites-available/mail.conf

# Create symbolic links
echo "🔗 Creating symbolic links..."
sudo ln -sf /etc/nginx/sites-available/frontend.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/admin.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/api.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/mail.conf /etc/nginx/sites-enabled/

# Remove default Nginx site
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "🗑️  Removing default Nginx site..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# Reload Nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Nginx installation and configuration completed!"
echo ""
echo "⚠️  IMPORTANT: Before accessing the sites, you need to:"
echo "   1. Configure DNS records for your domains"
echo "   2. Install SSL certificates with Certbot"
echo "   3. Make sure Docker containers are running on ports 3000, 3001, and 3002"
echo ""
echo "Next steps:"
echo "   - Run: sudo certbot --nginx -d manehaghighi.com -d www.manehaghighi.com"
echo "   - Run: sudo certbot --nginx -d admin.manehaghighi.com"
echo "   - Run: sudo certbot --nginx -d api.manehaghighi.com"
echo "   - Run: sudo certbot --nginx -d mail.manehaghighi.com"

