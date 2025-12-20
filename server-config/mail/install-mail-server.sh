#!/bin/bash

# Script to install and configure Mail Server (Postfix + Dovecot)
# Run this script on your Ubuntu server

set -e

echo "🚀 Starting Mail Server installation and configuration..."

# Update system
echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install required packages
echo "📦 Installing Postfix, Dovecot, and MySQL support..."
sudo DEBIAN_FRONTEND=noninteractive apt install -y \
    postfix \
    postfix-mysql \
    dovecot-core \
    dovecot-imapd \
    dovecot-pop3d \
    dovecot-lmtpd \
    dovecot-mysql \
    mysql-client \
    dovecot-core

# Create vmail user and group
echo "👤 Creating vmail user..."
if ! id -u vmail >/dev/null 2>&1; then
    sudo groupadd -g 5000 vmail
    sudo useradd -g vmail -u 5000 vmail -d /var/mail
    sudo mkdir -p /var/mail/vhosts
    sudo chown -R vmail:vmail /var/mail
fi

# Create mail directories
echo "📁 Creating mail directories..."
sudo mkdir -p /var/mail/vhosts/manehaghighi.com
sudo chown -R vmail:vmail /var/mail

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ask for MySQL root password
echo ""
echo "⚠️  Please enter MySQL root password:"
read -s MYSQL_ROOT_PASSWORD

# Ask for mailuser password
echo ""
echo "⚠️  Please enter password for mailuser (will be used in Postfix and Dovecot configs):"
read -s MAILUSER_PASSWORD

# Create mail database
echo "🗄️  Creating mail database..."
mysql -u root -p"$MYSQL_ROOT_PASSWORD" < "$SCRIPT_DIR/create-mail-database.sql"

# Update password in SQL file and recreate
sed "s/CHANGE_THIS_PASSWORD/$MAILUSER_PASSWORD/g" "$SCRIPT_DIR/create-mail-database.sql" | \
    mysql -u root -p"$MYSQL_ROOT_PASSWORD"

# Copy Postfix MySQL config files
echo "📝 Configuring Postfix MySQL files..."
sudo cp "$SCRIPT_DIR/postfix-mysql-virtual-mailbox-domains.cf" /etc/postfix/
sudo cp "$SCRIPT_DIR/postfix-mysql-virtual-mailbox-maps.cf" /etc/postfix/
sudo cp "$SCRIPT_DIR/postfix-mysql-virtual-alias-maps.cf" /etc/postfix/

# Update passwords in Postfix config files
sudo sed -i "s/CHANGE_THIS_PASSWORD/$MAILUSER_PASSWORD/g" /etc/postfix/postfix-mysql-virtual-*.cf
sudo chmod 600 /etc/postfix/postfix-mysql-virtual-*.cf

# Merge Postfix main.cf (backup first)
echo "📝 Configuring Postfix main.cf..."
sudo cp /etc/postfix/main.cf /etc/postfix/main.cf.backup
cat "$SCRIPT_DIR/postfix-main.cf" | sudo tee -a /etc/postfix/main.cf

# Update master.cf for submission and smtps
echo "📝 Updating Postfix master.cf..."
if ! grep -q "submission inet" /etc/postfix/master.cf; then
    cat "$SCRIPT_DIR/postfix-main.cf" | grep -A 10 "^submission" | sudo tee -a /etc/postfix/master.cf
fi
if ! grep -q "smtps     inet" /etc/postfix/master.cf; then
    cat "$SCRIPT_DIR/postfix-main.cf" | grep -A 10 "^smtps" | sudo tee -a /etc/postfix/master.cf
fi

# Configure Dovecot
echo "📝 Configuring Dovecot..."
sudo cp "$SCRIPT_DIR/dovecot-auth-sql.conf.ext" /etc/dovecot/conf.d/
sudo cp "$SCRIPT_DIR/dovecot-sql.conf.ext" /etc/dovecot/
sudo sed -i "s/CHANGE_THIS_PASSWORD/$MAILUSER_PASSWORD/g" /etc/dovecot/dovecot-sql.conf.ext
sudo chmod 600 /etc/dovecot/dovecot-sql.conf.ext

# Merge Dovecot main config
sudo cp /etc/dovecot/dovecot.conf /etc/dovecot/dovecot.conf.backup
cat "$SCRIPT_DIR/dovecot.conf" | sudo tee -a /etc/dovecot/dovecot.conf

# Create dovecot log directory
sudo mkdir -p /var/log/dovecot
sudo chown dovecot:dovecot /var/log/dovecot

# Test Postfix configuration
echo "🧪 Testing Postfix configuration..."
if sudo postfix check; then
    echo "✅ Postfix configuration is valid"
else
    echo "❌ Postfix configuration has errors"
    exit 1
fi

# Test Dovecot configuration
echo "🧪 Testing Dovecot configuration..."
if sudo doveconf -n > /dev/null 2>&1; then
    echo "✅ Dovecot configuration is valid"
else
    echo "❌ Dovecot configuration has errors"
    exit 1
fi

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart postfix
sudo systemctl restart dovecot
sudo systemctl enable postfix
sudo systemctl enable dovecot

# Check service status
if sudo systemctl is-active --quiet postfix && sudo systemctl is-active --quiet dovecot; then
    echo "✅ Mail server services are running"
else
    echo "❌ Some mail server services failed to start"
    exit 1
fi

echo "✅ Mail Server installation and configuration completed!"
echo ""
echo "⚠️  IMPORTANT:"
echo "   1. Make sure SSL certificates are installed for mail.manehaghighi.com"
echo "   2. Update DNS records (MX, SPF, DKIM, DMARC)"
echo "   3. Create email accounts using the mail database"
echo ""
echo "To create a password hash for email accounts:"
echo "   doveadm pw -s SHA512-CRYPT"

