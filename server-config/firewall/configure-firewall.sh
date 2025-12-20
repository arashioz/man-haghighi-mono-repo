#!/bin/bash

# Script to configure UFW firewall
# Run this script on your Ubuntu server

set -e

echo "🚀 Starting firewall configuration..."

# Check if UFW is installed
if ! command -v ufw &> /dev/null; then
    echo "📦 Installing UFW..."
    sudo apt update
    sudo apt install -y ufw
fi

# Reset UFW to defaults (optional - uncomment if you want to start fresh)
# echo "🔄 Resetting UFW..."
# sudo ufw --force reset

# Set default policies
echo "⚙️  Setting default policies..."
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (IMPORTANT - do this first!)
echo "🔐 Allowing SSH..."
sudo ufw allow 22/tcp comment 'SSH'

# Allow HTTP and HTTPS
echo "🌐 Allowing HTTP and HTTPS..."
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Allow Mail Server ports
echo "📧 Allowing Mail Server ports..."
sudo ufw allow 25/tcp comment 'SMTP'
sudo ufw allow 587/tcp comment 'SMTP Submission'
sudo ufw allow 465/tcp comment 'SMTPS'
sudo ufw allow 143/tcp comment 'IMAP'
sudo ufw allow 993/tcp comment 'IMAPS'
sudo ufw allow 110/tcp comment 'POP3'
sudo ufw allow 995/tcp comment 'POP3S'

# Enable UFW
echo "🔄 Enabling UFW..."
sudo ufw --force enable

# Show status
echo ""
echo "📊 Firewall status:"
sudo ufw status verbose

echo ""
echo "✅ Firewall configuration completed!"
echo ""
echo "⚠️  IMPORTANT: Make sure SSH (port 22) is accessible before closing your connection!"
echo "   If you get locked out, you may need to access the server via console/KVM"

