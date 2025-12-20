#!/bin/bash

# Quick fix script to create missing Let's Encrypt SSL files
# Run this on the server to fix nginx -t errors

set -e

echo "🔐 Creating missing Let's Encrypt SSL configuration files..."

# Create /etc/letsencrypt directory structure
sudo mkdir -p /etc/letsencrypt/live/admin.manehaghighi.com
sudo mkdir -p /etc/letsencrypt/live/manehaghighi.com
sudo mkdir -p /etc/letsencrypt/live/api.manehaghighi.com
sudo mkdir -p /etc/letsencrypt/live/mail.manehaghighi.com

# Create options-ssl-nginx.conf
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

# Create ssl-dhparams.pem if it doesn't exist
if [ ! -f /etc/letsencrypt/ssl-dhparams.pem ]; then
    echo "📝 Generating SSL DH parameters (this may take 2-3 minutes)..."
    sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
else
    echo "✅ ssl-dhparams.pem already exists"
fi

# Create placeholder self-signed certificates (for nginx -t to pass)
# These will be replaced by Certbot when you run it
echo "📝 Creating placeholder self-signed certificates..."
for domain in admin.manehaghighi.com manehaghighi.com api.manehaghighi.com mail.manehaghighi.com; do
    CERT_DIR="/etc/letsencrypt/live/$domain"
    if [ ! -f "$CERT_DIR/fullchain.pem" ] || [ ! -f "$CERT_DIR/privkey.pem" ]; then
        echo "   Generating self-signed certificate for $domain..."
        sudo openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
            -keyout "$CERT_DIR/privkey.pem" \
            -out "$CERT_DIR/fullchain.pem" \
            -subj "/CN=$domain" \
            -addext "subjectAltName=DNS:$domain" 2>/dev/null || \
        sudo openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
            -keyout "$CERT_DIR/privkey.pem" \
            -out "$CERT_DIR/fullchain.pem" \
            -subj "/CN=$domain"
    else
        echo "   Certificate files already exist for $domain"
    fi
done

echo ""
echo "✅ SSL configuration files created!"
echo ""
echo "⚠️  Note: The certificate files are placeholders."
echo "   nginx -t should now pass, but nginx won't start with real SSL until you run Certbot."
echo ""
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration test passed!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Make sure DNS is configured for your domains"
    echo "   2. Run Certbot to get real certificates:"
    echo "      sudo certbot --nginx -d manehaghighi.com -d www.manehaghighi.com"
    echo "      sudo certbot --nginx -d admin.manehaghighi.com"
    echo "      sudo certbot --nginx -d api.manehaghighi.com"
    echo "      sudo certbot --nginx -d mail.manehaghighi.com"
else
    echo "❌ Nginx configuration test still has errors"
    exit 1
fi

