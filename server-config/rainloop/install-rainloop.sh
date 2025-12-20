#!/bin/bash

# Script to install and configure Rainloop Webmail
# Run this script on your Ubuntu server

set -e

echo "🚀 Starting Rainloop installation and configuration..."

# Update system
echo "📦 Updating system packages..."
sudo apt update

# Install required packages
echo "📦 Installing PHP and required extensions..."
sudo apt install -y \
    php8.1 \
    php8.1-fpm \
    php8.1-cli \
    php8.1-common \
    php8.1-mysql \
    php8.1-zip \
    php8.1-gd \
    php8.1-mbstring \
    php8.1-curl \
    php8.1-xml \
    php8.1-bcmath \
    php8.1-json \
    unzip \
    wget

# Create web directory
echo "📁 Creating web directory..."
sudo mkdir -p /var/www/rainloop
cd /var/www/rainloop

# Download Rainloop
echo "📥 Downloading Rainloop..."
if [ ! -f rainloop-community-latest.zip ]; then
    sudo wget -O rainloop-community-latest.zip https://www.rainloop.net/repository/webmail/rainloop-community-latest.zip
fi

# Extract Rainloop
echo "📦 Extracting Rainloop..."
if [ ! -d "rainloop" ]; then
    sudo unzip -q rainloop-community-latest.zip
    sudo mv rainloop/* .
    sudo rm -rf rainloop
fi

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R www-data:www-data /var/www/rainloop
sudo chmod -R 755 /var/www/rainloop
sudo chmod -R 777 /var/www/rainloop/data

# Configure PHP-FPM
echo "⚙️  Configuring PHP-FPM..."
sudo sed -i 's/;cgi.fix_pathinfo=1/cgi.fix_pathinfo=0/' /etc/php/8.1/fpm/php.ini
sudo sed -i 's/upload_max_filesize = 2M/upload_max_filesize = 50M/' /etc/php/8.1/fpm/php.ini
sudo sed -i 's/post_max_size = 8M/post_max_size = 50M/' /etc/php/8.1/fpm/php.ini

# Restart PHP-FPM
echo "🔄 Restarting PHP-FPM..."
sudo systemctl restart php8.1-fpm
sudo systemctl enable php8.1-fpm

# Check PHP-FPM status
if sudo systemctl is-active --quiet php8.1-fpm; then
    echo "✅ PHP-FPM is running"
else
    echo "❌ PHP-FPM failed to start"
    exit 1
fi

echo "✅ Rainloop installation completed!"
echo ""
echo "⚠️  IMPORTANT:"
echo "   1. Make sure Nginx is configured for mail.manehaghighi.com"
echo "   2. Make sure SSL certificate is installed"
echo "   3. Access Rainloop at: https://mail.manehaghighi.com"
echo "   4. Default admin credentials:"
echo "      - Email: admin"
echo "      - Password: 12345"
echo "      (Change immediately after first login!)"
echo ""
echo "To configure Rainloop:"
echo "   1. Access https://mail.manehaghighi.com"
echo "   2. Login with admin credentials"
echo "   3. Go to Settings > Domains"
echo "   4. Add your mail server settings"

