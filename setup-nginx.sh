#!/bin/bash

# Nginx Setup Script for Haghighi Platform
echo "🔧 Setting up Nginx for Haghighi Platform..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_error "This script should not be run as root!"
    print_status "Run it as a regular user with sudo privileges."
    exit 1
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    print_error "Nginx is not installed!"
    print_status "Installing nginx..."

    # Detect OS and install nginx
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt &> /dev/null; then
            sudo apt update
            sudo apt install -y nginx
        elif command -v yum &> /dev/null; then
            sudo yum install -y nginx
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y nginx
        else
            print_error "Could not detect package manager. Please install nginx manually."
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        print_status "On macOS, please install nginx using Homebrew:"
        print_status "brew install nginx"
        exit 1
    else
        print_error "Unsupported OS. Please install nginx manually."
        exit 1
    fi
fi

print_status "Nginx is installed"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found!"
    print_status "Using default values. For production, please create .env file."
fi

# Load environment variables or use defaults
API_BASE_URL=${API_BASE_URL:-http://localhost:3000}
DOMAIN_NAME=${DOMAIN_NAME:-localhost}

print_status "Configuring nginx for domain: $DOMAIN_NAME"

# Create nginx configuration
sudo tee /etc/nginx/sites-available/haghighi-platform << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Client max body size for file uploads
    client_max_body_size 100M;

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_buffering off;
    }

    # Static files (uploads)
    location /uploads/ {
        alias /var/www/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept";

        # Handle CORS preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;
        }
    }

    # Admin Panel
    location /admin {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Frontend (default)
    location / {
        proxy_pass http://127.0.0.1:3002/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Security: Block access to hidden files and directories
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Security: Block access to backup files
    location ~ ~\$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

print_status "Nginx configuration created"

# Remove default site if it exists
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    sudo rm /etc/nginx/sites-enabled/default
    print_status "Removed default nginx site"
fi

# Enable the site
sudo ln -sf /etc/nginx/sites-available/haghighi-platform /etc/nginx/sites-enabled/
print_status "Enabled haghighi-platform site"

# Create uploads directory
sudo mkdir -p /var/www/uploads
sudo chown -R www-data:www-data /var/www/uploads
sudo chmod -R 755 /var/www/uploads

print_status "Created uploads directory"

# Test nginx configuration
sudo nginx -t

if [ $? -eq 0 ]; then
    print_status "✅ Nginx configuration is valid!"

    # Reload nginx
    sudo systemctl reload nginx || sudo service nginx reload

    if [ $? -eq 0 ]; then
        print_status "✅ Nginx reloaded successfully!"
        echo ""
        echo "🌐 Your site should now be available at:"
        echo "   - Main Website: http://$DOMAIN_NAME"
        echo "   - Admin Panel: http://$DOMAIN_NAME/admin"
        echo "   - API: http://$DOMAIN_NAME/api"
        echo "   - Uploads: http://$DOMAIN_NAME/uploads/"
        echo ""
        print_status "Make sure your backend is running on port 3000"
        print_status "Make sure your admin panel is running on port 3001"
        print_status "Make sure your frontend is running on port 3002"
    else
        print_error "❌ Failed to reload nginx!"
        print_status "Try: sudo systemctl restart nginx"
    fi

else
    print_error "❌ Nginx configuration is invalid!"
    print_status "Check the configuration file for errors."
fi
