#!/bin/bash

# Script to install Certbot and obtain SSL certificates
# Run this script on your Ubuntu server

set -e

echo "🚀 Starting Certbot installation and SSL certificate setup..."

# Update system
echo "📦 Updating system packages..."
sudo apt update

# Install Certbot
echo "📦 Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Check if Nginx is running
if ! sudo systemctl is-active --quiet nginx; then
    echo "❌ Nginx is not running. Please start Nginx first."
    exit 1
fi

# Get domain names
echo ""
echo "⚠️  Please enter your domain name (e.g., manehaghighi.com):"
read DOMAIN

# Get email for Let's Encrypt
echo ""
echo "⚠️  Please enter your email address for Let's Encrypt notifications:"
read EMAIL

# Obtain certificates
echo ""
echo "🔐 Obtaining SSL certificates..."

# Frontend (main domain + www)
echo "📜 Getting certificate for $DOMAIN and www.$DOMAIN..."
sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect

# Admin panel
echo "📜 Getting certificate for admin.$DOMAIN..."
sudo certbot --nginx -d "admin.$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect

# API
echo "📜 Getting certificate for api.$DOMAIN..."
sudo certbot --nginx -d "api.$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect

# Mail panel
echo "📜 Getting certificate for mail.$DOMAIN..."
sudo certbot --nginx -d "mail.$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect

# Test renewal
echo "🧪 Testing certificate renewal..."
if sudo certbot renew --dry-run; then
    echo "✅ Certificate renewal test passed"
else
    echo "⚠️  Certificate renewal test failed - check logs"
fi

# Setup auto-renewal cron job (if not exists)
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    echo "📅 Setting up auto-renewal cron job..."
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -
    echo "✅ Auto-renewal cron job added"
fi

echo "✅ SSL certificates installation completed!"
echo ""
echo "📋 Certificates obtained for:"
echo "   - $DOMAIN"
echo "   - www.$DOMAIN"
echo "   - admin.$DOMAIN"
echo "   - api.$DOMAIN"
echo "   - mail.$DOMAIN"
echo ""
echo "⚠️  Certificates will auto-renew. Check renewal with:"
echo "   sudo certbot renew --dry-run"

