#!/bin/bash

# Master installation script
# This script runs all installation steps in order

set -e

echo "🚀 Starting complete server setup..."
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root or with sudo"
    exit 1
fi

# Step 1: Update Docker Compose
echo "📦 Step 1: Updating Docker Compose configuration..."
echo "⚠️  Make sure docker-compose.yml is updated to use localhost only"
read -p "Press Enter to continue..."

# Step 2: DNS Check
echo ""
echo "🌐 Step 2: DNS Records Check"
echo "⚠️  Make sure DNS records are configured (see dns/dns-records-guide.md)"
read -p "Have you configured DNS records? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please configure DNS records first"
    exit 1
fi

# Step 3: Install Nginx
echo ""
echo "📦 Step 3: Installing Nginx..."
"$SCRIPT_DIR/nginx/install-nginx.sh"

# Step 4: Install Mail Server
echo ""
echo "📧 Step 4: Installing Mail Server..."
"$SCRIPT_DIR/mail/install-mail-server.sh"

# Step 5: Install Rainloop
echo ""
echo "📬 Step 5: Installing Rainloop..."
"$SCRIPT_DIR/rainloop/install-rainloop.sh"

# Step 6: Install SSL Certificates
echo ""
echo "🔐 Step 6: Installing SSL Certificates..."
"$SCRIPT_DIR/ssl/install-certbot.sh"

# Step 7: Configure Firewall
echo ""
echo "🔥 Step 7: Configuring Firewall..."
"$SCRIPT_DIR/firewall/configure-firewall.sh"

echo ""
echo "✅ Complete server setup finished!"
echo ""
echo "📋 Next steps:"
echo "   1. Test all services"
echo "   2. Create email accounts"
echo "   3. Configure Rainloop"
echo "   4. Set up monitoring and backups"
echo ""
echo "For detailed information, see README.md"

