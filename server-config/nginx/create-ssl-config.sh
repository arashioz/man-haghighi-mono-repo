#!/bin/bash

# Script to create Let's Encrypt SSL configuration files
# These files are normally created by Certbot, but we need them for nginx -t to pass

set -e

echo "🔐 Creating Let's Encrypt SSL configuration files..."

# Create /etc/letsencrypt directory if it doesn't exist
sudo mkdir -p /etc/letsencrypt

# Create options-ssl-nginx.conf with standard SSL settings
sudo tee /etc/letsencrypt/options-ssl-nginx.conf > /dev/null <<'EOF'
# This file contains important security parameters.
# Obtained from https://mozilla.github.io/server-side-tls/ssl-config-generator/

ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;

ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;

ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
EOF

# Create ssl-dhparams.pem (2048-bit DH parameters)
# This is a standard DH parameter file for SSL
echo "📝 Generating SSL DH parameters (this may take a few minutes)..."
if [ ! -f /etc/letsencrypt/ssl-dhparams.pem ]; then
    sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
else
    echo "✅ ssl-dhparams.pem already exists, skipping generation"
fi

echo "✅ SSL configuration files created successfully!"
echo ""
echo "⚠️  Note: SSL certificate files will be created when you run Certbot."
echo "   The configuration files above are just placeholders for nginx -t to pass."

